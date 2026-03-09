import { createClientFromRequest } from "npm:@base44/sdk";

function toQueryValue(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
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
    const id = toQueryValue(url.searchParams.get("id"));

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(id);

    if (!member) {
      return Response.json(
        { ok: false, error: "Member not found" },
        { status: 404 }
      );
    }

    const [referrer1Matches, referrer2Matches] = await Promise.all([
      member.referrer_1
        ? base44.asServiceRole.entities.Member.filter(
            {
              name_kanji: member.referrer_1,
              approval_status: "承認済"
            },
            "name_kanji",
            20,
            0
          )
        : Promise.resolve([]),
      member.referrer_2
        ? base44.asServiceRole.entities.Member.filter(
            {
              name_kanji: member.referrer_2,
              approval_status: "承認済"
            },
            "name_kanji",
            20,
            0
          )
        : Promise.resolve([])
    ]);

    return Response.json({
      ok: true,
      member,
      referrer_matches: {
        referrer_1: referrer1Matches,
        referrer_2: referrer2Matches
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
