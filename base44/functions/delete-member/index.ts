import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Verify member exists
    const member = await svc.entities.Member.get(id);
    if (!member) {
      return Response.json(
        { ok: false, error: "Member not found" },
        { status: 404 }
      );
    }

    // Record linked user_id before deletion for auth cleanup
    const linkedUserId = member.user_id || null;

    // 1. Delete all OrgAssignment records
    const assignments = await svc.entities.OrgAssignment.filter({ member_id: id });
    for (const a of assignments) {
      await svc.entities.OrgAssignment.delete(a.id);
    }

    // 2. Delete all Due records
    const dues = await svc.entities.Due.filter({ member_id: id });
    for (const d of dues) {
      await svc.entities.Due.delete(d.id);
    }

    // 3. Delete all MemberChangeLog records
    const logs = await svc.entities.MemberChangeLog.filter({ member_id: id });
    for (const l of logs) {
      await svc.entities.MemberChangeLog.delete(l.id);
    }

    // 4. If member was linked to a user, clear the user's member_id/app_role
    //    so their next auth check will fail member linkage
    if (linkedUserId) {
      try {
        // Clear the link on the User record so link-user-to-member won't re-link
        // We update the member's user_id to empty before deleting, which prevents
        // any race condition with concurrent auth checks
        await svc.entities.Member.update(id, { user_id: "" });
      } catch {
        // Non-critical: member is about to be deleted anyway
      }
    }

    // 5. Delete the Member record itself
    await svc.entities.Member.delete(id);

    return Response.json({
      ok: true,
      success: true,
      deleted: {
        assignments: assignments.length,
        dues: dues.length,
        logs: logs.length,
      },
      unlinked_user_id: linkedUserId,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
