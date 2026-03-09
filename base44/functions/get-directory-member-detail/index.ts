import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: string | null) {
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
    const id = normalize(url.searchParams.get("id"));

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(id);

    if (
      !member ||
      member.approval_status !== "承認済" ||
      member.status !== "活動中"
    ) {
      return Response.json(
        { ok: false, error: "Directory member not found" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      member: {
        id: member.id,
        name_kanji: member.name_kanji || "",
        member_type: member.member_type || "",
        company_name: member.show_company_in_directory ? member.company_name || "" : "",
        company_position: member.show_company_in_directory ? member.company_position || "" : "",
        industry: member.show_company_in_directory ? member.industry || "" : "",
        email: member.show_email_in_directory ? member.email || "" : "",
        mobile_phone: member.show_mobile_in_directory ? member.mobile_phone || "" : ""
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
