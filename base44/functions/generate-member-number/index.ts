import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const [fiscalYears, allMembers] = await Promise.all([
      base44.asServiceRole.entities.FiscalYear.list(),
      base44.asServiceRole.entities.Member.list()
    ]);

    const currentFy = fiscalYears.find((fy) => fy.is_current === true);
    const currentYear = currentFy ? Number(currentFy.year) : new Date().getFullYear();
    const prefix = String(currentYear).slice(-2);

    const pattern = new RegExp(`^${prefix}(\\d{3})$`);
    let maxSeq = 0;
    for (const member of allMembers) {
      const num = String(member.member_number || "");
      const match = num.match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, "0");
    const suggestedNumber = `${prefix}${nextSeq}`;

    return Response.json({
      ok: true,
      suggested_number: suggestedNumber,
      fiscal_year: currentYear,
      prefix,
      next_sequence: maxSeq + 1
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
