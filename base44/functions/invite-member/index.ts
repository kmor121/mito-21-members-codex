import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ ok: false, error: "email is required" }, { status: 400 });
    }

    // inviteUser は auth モジュールにある
    await base44.asServiceRole.auth.inviteUser(email, "user");

    return Response.json({ ok: true, invited: true });
  } catch (error) {
    console.error("invite-member error:", error);
    return Response.json({ ok: false, error: error.message || "Failed to invite" }, { status: 500 });
  }
});
