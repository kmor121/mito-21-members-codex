import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const allMembers = await base44.asServiceRole.entities.Member.list();

    const approvedMembers = allMembers
      .filter((m) => String(m.approval_status || "") === "承認済")
      .map((m) => ({
        id: m.id,
        name_kanji: String(m.name_kanji || ""),
        email: String(m.email || ""),
        member_number: String(m.member_number || ""),
        member_type: String(m.member_type || ""),
        role: String(m.role || "member"),
        status: String(m.status || "")
      }))
      .sort((a, b) => {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (a.role !== "admin" && b.role === "admin") return 1;
        return a.name_kanji.localeCompare(b.name_kanji, "ja");
      });

    return Response.json({
      ok: true,
      members: approvedMembers,
      admin_count: approvedMembers.filter((m) => m.role === "admin").length
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
