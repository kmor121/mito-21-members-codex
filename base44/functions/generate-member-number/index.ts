import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const allMembers = await base44.asServiceRole.entities.Member.list();

    // Find the maximum numeric member_number across all members
    let maxNum = 0;
    for (const member of allMembers) {
      const num = parseInt(String(member.member_number || ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }

    const nextNum = maxNum + 1;
    const suggestedNumber = String(nextNum).padStart(4, "0");

    return Response.json({
      ok: true,
      suggested_number: suggestedNumber,
      current_max: maxNum,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
