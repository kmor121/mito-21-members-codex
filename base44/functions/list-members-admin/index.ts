import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function matchesQuery(member: Record<string, unknown>, query: string) {
  if (!query) {
    return true;
  }

  const haystacks = [
    member.name_kanji,
    member.company_name,
    member.email
  ]
    .filter((value) => typeof value === "string")
    .map((value) => String(value).toLowerCase());

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
    const status = normalize(url.searchParams.get("status"));
    const memberType = normalize(url.searchParams.get("member_type"));
    const approvalStatus = normalize(url.searchParams.get("approval_status"));

    const base44 = createClientFromRequest(req);
    const allMembers = await base44.asServiceRole.entities.Member.list();

    const members = allMembers
      .filter((member) => matchesQuery(member, query))
      .filter((member) => !status || member.status === status)
      .filter((member) => !memberType || member.member_type === memberType)
      .filter(
        (member) => !approvalStatus || member.approval_status === approvalStatus
      )
      .sort((left, right) => {
        const leftName = String(left.name_kanji || "");
        const rightName = String(right.name_kanji || "");
        return leftName.localeCompare(rightName, "ja");
      });

    return Response.json({
      ok: true,
      sort: "name_kanji_asc",
      members
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
