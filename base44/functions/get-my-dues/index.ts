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

    // Find the member linked to this user
    const members = await base44.asServiceRole.entities.Member.filter({ user_id: user.id });

    if (!members || members.length === 0) {
      return Response.json({ ok: true, found: false });
    }

    const member = members[0];

    // Fetch dues for this member
    const dues = await base44.asServiceRole.entities.Due.filter({ member_id: member.id });

    return Response.json({ ok: true, found: true, member_id: member.id, dues: dues || [] });
  } catch (error) {
    console.error("[get-my-dues]", error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
