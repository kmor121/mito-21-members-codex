import { createClientFromRequest } from "npm:@base44/sdk";

const VALID_APP_ROLES = ["admin_member", "manager", "member"];

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    const isAdmin = caller?.role === "admin";
    const callerAppRole = caller?.app_role || caller?.data?.app_role || "";
    const isAdminMember = callerAppRole === "admin_member";
    if (!isAdmin && !isAdminMember) {
      return Response.json({ ok: false, error: "権限がありません" }, { status: 403 });
    }

    const body = await req.json();
    const { member_id, app_role } = body;

    if (!member_id || !app_role) {
      return Response.json({ ok: false, error: "member_id と app_role が必要です" }, { status: 400 });
    }

    if (!VALID_APP_ROLES.includes(app_role)) {
      return Response.json({ ok: false, error: "無効なロールです" }, { status: 400 });
    }

    // Membersのapp_roleを更新
    await base44.asServiceRole.entities.Member.update(member_id, { app_role });

    // 紐付け済みユーザーがいる場合、Userのapp_roleも同期を試みる
    const member = await base44.asServiceRole.entities.Member.get(member_id);
    if (member?.user_id) {
      try {
        await base44.asServiceRole.entities.User.update(member.user_id, { app_role });
      } catch (e: any) {
        console.warn("User.update failed (non-critical):", e.message);
        // Userの更新が失敗してもMembersは更新済みなのでOK
      }
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("update-user-role error:", error);
    return Response.json({ ok: false, error: error.message || "ロール変更に失敗しました" }, { status: 500 });
  }
});
