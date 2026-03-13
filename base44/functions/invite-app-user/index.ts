import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Check admin or admin_member
    const isAdmin = user.role === "admin";
    const isAdminMember = (user.app_role || user.data?.app_role) === "admin_member";
    if (!isAdmin && !isAdminMember) {
      return Response.json({ ok: false, error: "権限がありません" }, { status: 403 });
    }

    const body = await req.json();
    const email = (body?.email || "").trim();
    const role = body?.role || "user";

    if (!email) {
      return Response.json({ ok: false, error: "メールアドレスが必要です" }, { status: 400 });
    }

    if (role !== "user" && role !== "admin") {
      return Response.json({ ok: false, error: "roleはuserまたはadminのみ有効です" }, { status: 400 });
    }

    await base44.asServiceRole.users.inviteUser(email, role);

    return Response.json({ ok: true, email });
  } catch (error: any) {
    console.error("[invite-app-user]", error);
    const msg = (error?.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("exist") || msg.includes("duplicate")) {
      return Response.json({ ok: false, error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }
    return Response.json({ ok: false, error: "招待の送信に失敗しました" }, { status: 500 });
  }
});
