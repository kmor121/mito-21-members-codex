import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id || !user?.email) {
      return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // Search for a Member with matching email
    const members = await base44.asServiceRole.entities.Member.filter({ email: user.email });

    if (!members || members.length === 0) {
      return Response.json({ ok: true, linked: false, reason: "no_member_found" });
    }

    if (members.length > 1) {
      console.warn(`[link-user-to-member] Multiple members found for email ${user.email}: ${members.map((m: any) => m.id).join(", ")}. Using first.`);
    }

    const member = members[0];
    const memberAppRole = member.app_role || "member";

    // Link if not yet linked
    if (!member.user_id) {
      await base44.asServiceRole.entities.Member.update(member.id, { user_id: user.id });
    } else if (member.user_id !== user.id) {
      return Response.json({ ok: true, linked: false, reason: "linked_to_other" });
    }

    // Always sync User.data.app_role from Member.app_role
    try {
      await base44.auth.updateMe({ member_id: member.id, app_role: memberAppRole });
    } catch (e: any) {
      console.warn("[link-user-to-member] updateMe failed (non-critical):", e.message);
    }

    return Response.json({ ok: true, linked: true, member_id: member.id, app_role: memberAppRole });
  } catch (error: any) {
    console.error("[link-user-to-member]", error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
