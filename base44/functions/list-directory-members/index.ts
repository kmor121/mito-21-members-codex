import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function matchesQuery(member: Record<string, unknown>, query: string) {
  if (!query) {
    return true;
  }

  const visibleCompanyName = member.show_company_in_directory
    ? String(member.company_name || "")
    : "";

  const haystacks = [String(member.name_kanji || ""), visibleCompanyName]
    .map((value) => value.toLowerCase())
    .filter(Boolean);

  return haystacks.some((value) => value.includes(query));
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
    const query = normalize(url.searchParams.get("q")).toLowerCase();
    const base44 = createClientFromRequest(req);

    const members = await base44.asServiceRole.entities.Member.filter(
      {
        approval_status: "承認済",
        status: "活動中"
      },
      "name_kanji",
      500,
      0
    );

    const directoryMembers = members
      .filter((member) => matchesQuery(member, query))
      .sort((left, right) => {
        const leftName = String(left.name_kanji || "");
        const rightName = String(right.name_kanji || "");
        return leftName.localeCompare(rightName, "ja");
      })
      .map((member) => ({
        id: member.id,
        name_kanji: member.name_kanji || "",
        member_type: member.member_type || "",
        company_name: member.show_company_in_directory ? member.company_name || "" : "",
        email: member.show_email_in_directory ? member.email || "" : "",
        mobile_phone: member.show_mobile_in_directory ? member.mobile_phone || "" : ""
      }));

    return Response.json({
      ok: true,
      sort: "name_kanji_asc",
      members: directoryMembers
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
