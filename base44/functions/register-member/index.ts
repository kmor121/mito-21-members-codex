import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = (body?.email || "").trim().toLowerCase();

    if (!email) {
      return Response.json({ ok: false, error: "メールアドレスが必要です" }, { status: 400 });
    }

    // service roleでMemberテーブルを検索（認証不要で実行可能）
    const members = await base44.asServiceRole.entities.Member.filter({ email });

    if (!members || members.length === 0) {
      return Response.json({
        ok: false,
        exists: false,
        error: "このメールアドレスは会員として登録されていません。管理者にお問い合わせください。"
      }, { status: 403 });
    }

    // 会員名を返す（フロントでregister時のfull_nameに使う）
    const member = members[0];
    const displayName = `${member.last_name || ""} ${member.first_name || ""}`.trim();
    return Response.json({
      ok: true,
      exists: true,
      member_name: displayName,
      member_id: member.id
    });
  } catch (error) {
    console.error("register-member error:", error);
    return Response.json({ ok: false, error: error.message || "エラーが発生しました" }, { status: 500 });
  }
});
