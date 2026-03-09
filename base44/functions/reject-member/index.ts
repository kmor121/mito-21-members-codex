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
    const rejectionReason =
      typeof body?.rejection_reason === "string"
        ? body.rejection_reason.trim()
        : "";

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    if (!rejectionReason) {
      return Response.json(
        { ok: false, error: "rejection_reason is required" },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(id);

    if (!member) {
      return Response.json(
        { ok: false, error: "Member not found" },
        { status: 404 }
      );
    }

    if (member.approval_status !== "申請中") {
      return Response.json(
        { ok: false, error: "Only pending members can be rejected" },
        { status: 409 }
      );
    }

    const updatedMember = await base44.asServiceRole.entities.Member.update(id, {
      approval_status: "却下",
      rejection_reason: rejectionReason
    });

    // Future hook: invoke sendApprovalEmail with rejection notice if needed.
    return Response.json({
      ok: true,
      member: updatedMember
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
