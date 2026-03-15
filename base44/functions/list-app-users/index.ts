import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const isAdmin = user?.role === "admin";
    const appRole = user?.app_role || user?.data?.app_role || "";
    const isAdminMember = appRole === "admin_member";
    if (!isAdmin && !isAdminMember) {
      return Response.json({ ok: false, error: "権限がありません" }, { status: 403 });
    }

    const allMembers = await base44.asServiceRole.entities.Member.list();

    const result = (allMembers || []).map((m: any) => ({
      member_id: m.id || m._id,
      name: `${m.last_name || ""} ${m.first_name || ""}`.trim(),
      email: m.email || "",
      app_role: m.app_role || "member",
      user_id: m.user_id || "",
      has_account: !!m.user_id,
    }));

    // adminユーザー（自分自身）も先頭に追加
    result.unshift({
      member_id: "",
      name: user.full_name || user.email || "Admin",
      email: user.email || "",
      app_role: "admin",
      user_id: user.id || user._id || "",
      has_account: true,
      is_platform_admin: true,
    });

    return Response.json({ ok: true, users: result });
  } catch (error: any) {
    console.error("list-app-users error:", error);
    return Response.json({ ok: false, error: error.message || "エラーが発生しました" }, { status: 500 });
  }
});
