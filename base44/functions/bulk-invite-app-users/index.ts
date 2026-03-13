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
    const emails: string[] = Array.isArray(body?.emails) ? body.emails : [];

    if (emails.length === 0) {
      return Response.json({ ok: false, error: "メールアドレスが必要です" }, { status: 400 });
    }

    const success: string[] = [];
    const failed: { email: string; reason: string }[] = [];

    for (const rawEmail of emails) {
      const email = (rawEmail || "").trim();
      if (!email) {
        failed.push({ email: rawEmail, reason: "メールアドレスが空です" });
        continue;
      }
      try {
        await base44.asServiceRole.users.inviteUser(email, "user");
        success.push(email);
      } catch (error: any) {
        const msg = (error?.message || "").toLowerCase();
        let reason = "招待に失敗しました";
        if (msg.includes("already") || msg.includes("exist") || msg.includes("duplicate")) {
          reason = "既に登録済みです";
        }
        failed.push({ email, reason });
      }
    }

    return Response.json({ ok: true, success, failed });
  } catch (error) {
    console.error("[bulk-invite-app-users]", error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
