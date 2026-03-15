import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Get all member IDs
    const allMembers = await svc.entities.Member.list();
    const memberIds = new Set(allMembers.map((m: any) => m.id));

    // Clean orphaned OrgAssignments
    const allAssignments = await svc.entities.OrgAssignment.list();
    let orphanAssignments = 0;
    for (const a of allAssignments) {
      if (a.member_id && !memberIds.has(a.member_id)) {
        await svc.entities.OrgAssignment.delete(a.id);
        orphanAssignments++;
      }
    }

    // Clean orphaned Dues
    const allDues = await svc.entities.Due.list();
    let orphanDues = 0;
    for (const d of allDues) {
      if (d.member_id && !memberIds.has(d.member_id)) {
        await svc.entities.Due.delete(d.id);
        orphanDues++;
      }
    }

    // Clean orphaned MemberChangeLogs
    const allLogs = await svc.entities.MemberChangeLog.list();
    let orphanLogs = 0;
    for (const l of allLogs) {
      if (l.member_id && !memberIds.has(l.member_id)) {
        await svc.entities.MemberChangeLog.delete(l.id);
        orphanLogs++;
      }
    }

    return Response.json({
      ok: true,
      total_members: allMembers.length,
      deleted: {
        orphan_assignments: orphanAssignments,
        orphan_dues: orphanDues,
        orphan_logs: orphanLogs,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});
