import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeDocType(value: unknown) {
  const source = String(value || "").trim();

  if (source === "団体理念・活動方針" || source === "活動方針") {
    return "団体理念";
  }
  if (source === "会則" || source === "規約") {
    return "会則・規約";
  }
  if (source === "年間予定" || source === "スケジュール") {
    return "年間スケジュール";
  }
  if (source === "マニュアル" || source === "手順書") {
    return "運用マニュアル";
  }
  return source;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const [documents, fiscalYears] = await Promise.all([
      base44.asServiceRole.entities.OrgDocument.list(),
      base44.asServiceRole.entities.FiscalYear.list()
    ]);

    const fiscalYearMap = new Map(
      fiscalYears.map((fiscalYear) => [
        fiscalYear.id,
        {
          id: fiscalYear.id,
          year: Number(fiscalYear.year || 0),
          is_current: fiscalYear.is_current === true
        }
      ])
    );

    const orgDocuments = documents
      .map((document) => {
        const fiscalYearId = String(document.fiscal_year_id || "");
        const fiscalYear = fiscalYearMap.get(fiscalYearId);

        return {
          id: document.id,
          title: String(document.title || ""),
          doc_type: normalizeDocType(document.doc_type),
          fiscal_year_id: fiscalYearId,
          fiscal_year_label: fiscalYear?.year ? `${fiscalYear.year}年度` : "常設",
          fiscal_year_is_current: fiscalYear?.is_current === true,
          category: String(document.category || ""),
          published: document.published === true,
          sort_order: Number(document.sort_order || 0),
          updated_at: String(document.updated_at || document.updated_date || "")
        };
      })
      .sort((left, right) => {
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        if (left.updated_at !== right.updated_at) {
          return right.updated_at.localeCompare(left.updated_at);
        }
        return left.title.localeCompare(right.title, "ja");
      });

    return Response.json({ ok: true, documents: orgDocuments });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
