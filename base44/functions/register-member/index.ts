import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";
    const full_name = (body?.full_name || "").trim();

    if (!email || !password || !full_name) {
      return Response.json({ ok: false, error: "全ての項目を入力してください" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ ok: false, error: "パスワードは8文字以上で入力してください" }, { status: 400 });
    }

    // Check if email exists in Members entity (service role for full access)
    const members = await base44.asServiceRole.entities.Members.filter({ email });
    if (!members || members.length === 0) {
      return Response.json({
        ok: false,
        error: "このメールアドレスは会員として登録されていません。管理者にお問い合わせください。",
      }, { status: 403 });
    }

    const member = members[0];

    // Check if member already has a linked user
    if (member.user_id) {
      return Response.json({
        ok: false,
        error: "この会員は既にアカウントが紐付けられています。ログインしてください。",
      }, { status: 409 });
    }

    // Register the user account
    await base44.auth.register({ email, password, full_name });

    // Get the newly created user to link
    const newUser = await base44.auth.me();

    if (newUser?.id) {
      // Link member to user
      try {
        await base44.asServiceRole.entities.Members.update(member.id, { user_id: newUser.id });
      } catch (linkErr) {
        console.error("[register-member] link error:", linkErr);
        // Registration succeeded even if linking fails
      }
    }

    return Response.json({ ok: true, registered: true });
  } catch (error) {
    console.error("[register-member]", error);
    const msg = (error?.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("exist") || msg.includes("duplicate")) {
      return Response.json({ ok: false, error: "このメールアドレスは既にアカウント登録済みです。ログインしてください。" }, { status: 409 });
    }
    return Response.json({ ok: false, error: error?.message || "登録に失敗しました" }, { status: 500 });
  }
});
