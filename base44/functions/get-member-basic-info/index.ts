import { createClientFromRequest } from "npm:@base44/sdk";

const SECTION_ORDER = [
  { key: "business_plan", label: "事業計画" },
  { key: "vision", label: "団体理念・活動方針" },
  { key: "rules", label: "会則・規約" },
  { key: "schedule", label: "年間スケジュール" }
] as const;

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDocType(value: unknown, title: unknown) {
  const source = `${String(value || "")} ${String(title || "")}`.trim();

  if (source.includes("事業計画")) {
    return "business_plan";
  }

  if (
    source.includes("団体理念") ||
    source.includes("活動方針") ||
    source.includes("理念")
  ) {
    return "vision";
  }

  if (
    source.includes("会則・規約") ||
    source.includes("会則") ||
    source.includes("規約")
  ) {
    return "rules";
  }

  if (
    source.includes("年間スケジュール") ||
    source.includes("年間予定") ||
    source.includes("スケジュール")
  ) {
    return "schedule";
  }

  return "";
}

function toAttachment(attachment: unknown) {
  if (typeof attachment === "string") {
    return {
      url: attachment,
      label: "添付ファイル"
    };
  }

  if (attachment && typeof attachment === "object") {
    const record = attachment as Record<string, unknown>;
    const url = String(record.url || record.download_url || record.src || "");

    if (url) {
      return {
        url,
        label: String(record.name || record.filename || "添付ファイル")
      };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const url = new URL(req.url);
    const requestedFiscalYearId = normalize(url.searchParams.get("fiscalYearId"));
    const base44 = createClientFromRequest(req);

    const [fiscalYears, orgDocuments] = await Promise.all([
      base44.asServiceRole.entities.FiscalYear.list(),
      base44.asServiceRole.entities.OrgDocument.list()
    ]);

    const years = fiscalYears
      .map((fiscalYear) => ({
        id: fiscalYear.id,
        year: Number(fiscalYear.year || 0),
        start_date: String(fiscalYear.start_date || ""),
        end_date: String(fiscalYear.end_date || ""),
        is_current: fiscalYear.is_current === true
      }))
      .filter((fiscalYear) => fiscalYear.year > 0)
      .sort((left, right) => right.year - left.year);

    const currentFiscalYear = years.find((fiscalYear) => fiscalYear.is_current) || years[0] || null;
    const selectedFiscalYear =
      years.find((fiscalYear) => fiscalYear.id === requestedFiscalYearId) ||
      currentFiscalYear;

    const selectedFiscalYearId = selectedFiscalYear?.id || "";

    const publishedDocuments = orgDocuments
      .filter((document) => document.published === true)
      .map((document) => ({
        id: document.id,
        fiscal_year_id: String(document.fiscal_year_id || ""),
        normalized_doc_type: normalizeDocType(document.doc_type, document.title),
        raw_doc_type: String(document.doc_type || ""),
        title: String(document.title || ""),
        content: String(document.content || ""),
        attachment: toAttachment(document.attachment),
        sort_order: Number(document.sort_order || 0),
        updated_at: String(document.updated_at || document.updated_date || "")
      }))
      .filter((document) => Boolean(document.normalized_doc_type));

    const sections = SECTION_ORDER.map((section) => {
      const yearSpecific = publishedDocuments
        .filter(
          (document) =>
            document.normalized_doc_type === section.key &&
            document.fiscal_year_id === selectedFiscalYearId
        )
        .sort((left, right) => left.sort_order - right.sort_order || right.updated_at.localeCompare(left.updated_at));

      const evergreen = publishedDocuments
        .filter(
          (document) =>
            document.normalized_doc_type === section.key &&
            !document.fiscal_year_id
        )
        .sort((left, right) => left.sort_order - right.sort_order || right.updated_at.localeCompare(left.updated_at));

      const activeDocuments = yearSpecific.length > 0 ? yearSpecific : evergreen;

      return {
        key: section.key,
        label: section.label,
        documents: activeDocuments.map((document) => ({
          id: document.id,
          doc_type: document.raw_doc_type,
          title: document.title,
          content: document.content,
          attachment: document.attachment,
          updated_at: document.updated_at
        }))
      };
    });

    return Response.json({
      ok: true,
      current_fiscal_year_id: currentFiscalYear?.id || "",
      fiscal_years: years,
      selected_fiscal_year: selectedFiscalYear,
      sections
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
