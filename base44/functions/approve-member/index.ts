import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_MEMBER_TYPES = ["正会員", "賛助会員"];

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
    const memberType =
      typeof body?.member_type === "string" ? body.member_type.trim() : "";
    const memberNumber =
      typeof body?.member_number === "string" ? body.member_number.trim() : "";

    if (!id) {
      return Response.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MEMBER_TYPES.includes(memberType)) {
      return Response.json(
        { ok: false, error: "member_type is invalid" },
        { status: 400 }
      );
    }

    if (!memberNumber) {
      return Response.json(
        { ok: false, error: "member_number is required" },
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
        { ok: false, error: "Only pending members can be approved" },
        { status: 409 }
      );
    }

    const duplicateMembers = await base44.asServiceRole.entities.Member.filter({
      member_number: memberNumber
    });
    const hasDuplicateNumber = duplicateMembers.some(
      (duplicateMember) => duplicateMember.id !== id
    );

    if (hasDuplicateNumber) {
      return Response.json(
        { ok: false, error: "member_number already exists" },
        { status: 409 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const updatedMember = await base44.asServiceRole.entities.Member.update(id, {
      member_type: memberType,
      member_number: memberNumber,
      approval_status: "承認済",
      status: "活動中",
      is_new: true,
      join_date: today,
      rejection_reason: ""
    });

    // Future hook: invoke sendApprovalEmail after approval is finalized.
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
