import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = normalizeString(body?.id);

    if (!id) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const fiscalYear = await base44.asServiceRole.entities.FiscalYear.get(id);

    if (!fiscalYear) {
      return Response.json({ ok: false, error: "Fiscal year not found" }, { status: 404 });
    }

    if (fiscalYear.is_current) {
      return Response.json({ ok: false, error: "現在年度は削除できません。" }, { status: 400 });
    }

    // Delete related data in parallel batches
    const [organizations, dues, dueSettings] = await Promise.all([
      base44.asServiceRole.entities.Organization.filter({ fiscal_year_id: id }),
      base44.asServiceRole.entities.Due.filter({ fiscal_year_id: id }),
      base44.asServiceRole.entities.DueSetting.filter({ fiscal_year_id: id }),
    ]);

    // Delete org assignments for each organization
    const deleteAssignmentPromises: Promise<void>[] = [];
    for (const org of organizations) {
      const assignments = await base44.asServiceRole.entities.OrgAssignment.filter({ organization_id: org.id });
      for (const a of assignments) {
        deleteAssignmentPromises.push(base44.asServiceRole.entities.OrgAssignment.delete(a.id));
      }
    }
    await Promise.all(deleteAssignmentPromises);

    // Delete organizations
    await Promise.all(organizations.map((o: any) => base44.asServiceRole.entities.Organization.delete(o.id)));

    // Delete dues
    await Promise.all(dues.map((d: any) => base44.asServiceRole.entities.Due.delete(d.id)));

    // Delete due settings
    await Promise.all(dueSettings.map((s: any) => base44.asServiceRole.entities.DueSetting.delete(s.id)));

    // Delete the fiscal year itself
    await base44.asServiceRole.entities.FiscalYear.delete(id);

    return Response.json({
      ok: true,
      id,
      deleted: {
        organizations: organizations.length,
        dues: dues.length,
        due_settings: dueSettings.length,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
});
