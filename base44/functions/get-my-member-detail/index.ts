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
    const memberId = normalize(url.searchParams.get("memberId"));

    if (!memberId) {
      return Response.json(
        { ok: false, error: "memberId is required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(memberId);

    if (!member) {
      return Response.json(
        { ok: false, error: "Member not found" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      member: {
        id: member.id,
        name_kanji: member.name_kanji || "",
        name_kana: member.name_kana || "",
        birthday: member.birthday || "",
        company_name: member.company_name || "",
        company_position: member.company_position || "",
        industry: member.industry || "",
        email: member.email || "",
        mobile_phone: member.mobile_phone || "",
        company_phone: member.company_phone || "",
        company_fax: member.company_fax || "",
        company_address: member.company_address || "",
        member_number: member.member_number || "",
        member_type: member.member_type || "",
        status: member.status || "",
        show_email_in_directory: member.show_email_in_directory === true,
        show_company_in_directory: member.show_company_in_directory === true,
        show_mobile_in_directory: member.show_mobile_in_directory === true
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
