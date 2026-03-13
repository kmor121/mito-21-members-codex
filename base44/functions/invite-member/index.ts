import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // 呼び出し元ユーザーの権限チェック
    const user = await base44.auth.me();
    const isAdmin = user?.role === "admin";
    const isAdminMember = (user?.app_role || user?.data?.app_role) === "admin_member";
    if (!isAdmin && !isAdminMember) {
      return Response.json({ ok: false, error: "権限がありません" }, { status: 403 });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ ok: false, error: "email is required" }, { status: 400 });
    }

    // admin権限で直接inviteUser呼び出し（asServiceRoleではなく）
    await base44.auth.inviteUser(email, "user");

    return Response.json({ ok: true, invited: true });
  } catch (error) {
    console.error("invite-member error:", error);
    return Response.json({ ok: false, error: error.message || "Failed to invite" }, { status: 500 });
  }
});
