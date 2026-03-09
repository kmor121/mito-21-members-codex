import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const base44 = createClientFromRequest(req);
    const members = await base44.asServiceRole.entities.Member.list(
      "-created_date"
    );

    return Response.json({
      ok: true,
      members
    });
  } catch (_error) {
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
