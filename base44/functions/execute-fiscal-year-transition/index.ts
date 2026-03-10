import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const newFiscalYearId = normalize(body?.new_fiscal_year_id);
    const copyOrganizations = body?.copy_organizations === true;
    const generateDues = body?.generate_dues !== false; // default true
    const resetIsNew = body?.reset_is_new !== false; // default true

    if (!newFiscalYearId) {
      return Response.json({ ok: false, error: "new_fiscal_year_id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const newFiscalYear = await base44.asServiceRole.entities.FiscalYear.get(newFiscalYearId);

    if (!newFiscalYear) {
      return Response.json({ ok: false, error: "Fiscal year not found" }, { status: 404 });
    }

    if (newFiscalYear.is_current === true) {
      return Response.json({ ok: false, error: "This fiscal year is already current" }, { status: 400 });
    }

    const log: string[] = [];

    // 1. Find previous current fiscal year
    const allFiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
    const previousCurrent = allFiscalYears.find((fy) => fy.is_current === true);
    const previousFiscalYearId = previousCurrent?.id || "";

    // 2. Copy organizations from previous year if requested
    let orgsCopied = 0;
    let assignmentsCopied = 0;

    if (copyOrganizations && previousFiscalYearId) {
      const previousOrgs = await base44.asServiceRole.entities.Organization.filter({
        fiscal_year_id: previousFiscalYearId
      });

      const existingNewOrgs = await base44.asServiceRole.entities.Organization.filter({
        fiscal_year_id: newFiscalYearId
      });

      if (existingNewOrgs.length === 0) {
        const orgIdMap = new Map<string, string>();

        for (const org of previousOrgs) {
          const newOrg = await base44.asServiceRole.entities.Organization.create({
            fiscal_year_id: newFiscalYearId,
            org_name: String(org.org_name || ""),
            org_type: String(org.org_type || ""),
            sort_order: Number(org.sort_order || 0)
          });
          orgIdMap.set(org.id, newOrg.id);
          orgsCopied++;
        }

        for (const org of previousOrgs) {
          if (org.parent_id) {
            const newId = orgIdMap.get(org.id);
            const newParentId = orgIdMap.get(String(org.parent_id));
            if (newId && newParentId) {
              await base44.asServiceRole.entities.Organization.update(newId, {
                fiscal_year_id: newFiscalYearId,
                org_name: String(org.org_name || ""),
                parent_id: newParentId
              });
            }
          }
        }

        const previousAssignments = await base44.asServiceRole.entities.OrgAssignment.filter({
          fiscal_year_id: previousFiscalYearId
        });

        for (const assignment of previousAssignments) {
          const newOrgId = orgIdMap.get(String(assignment.organization_id || ""));
          if (newOrgId) {
            await base44.asServiceRole.entities.OrgAssignment.create({
              fiscal_year_id: newFiscalYearId,
              organization_id: newOrgId,
              member_id: String(assignment.member_id || ""),
              role: String(assignment.role || ""),
              sort_order: Number(assignment.sort_order || 0)
            });
            assignmentsCopied++;
          }
        }

        log.push(`組織 ${orgsCopied} 件、配属 ${assignmentsCopied} 件をコピーしました`);
      } else {
        log.push("新年度にはすでに組織が存在するため、コピーをスキップしました");
      }
    }

    // 3. Generate dues for new fiscal year using new DueSetting schema
    let duesGenerated = 0;

    if (generateDues) {
      const dueSettings = await base44.asServiceRole.entities.DueSetting.filter({
        fiscal_year_id: newFiscalYearId
      });

      if (dueSettings.length > 0) {
        const setting = dueSettings[0];
        // New schema: single record with named fee fields
        const regularFee = Number(setting.regular_annual_fee || 0);
        const associateFee = Number(setting.associate_annual_fee || 0);

        if (regularFee > 0 || associateFee > 0) {
          const allMembers = await base44.asServiceRole.entities.Member.list();
          const eligibleMembers = allMembers.filter(
            (m) =>
              m.approval_status === "承認済" &&
              m.status === "活動中" &&
              (m.member_type === "正会員" || m.member_type === "賛助会員")
          );

          const existingDues = await base44.asServiceRole.entities.Due.filter({
            fiscal_year_id: newFiscalYearId
          });
          const existingMemberIds = new Set(existingDues.map((d) => String(d.member_id || "")));

          for (const member of eligibleMembers) {
            if (existingMemberIds.has(member.id)) continue;

            const amount = member.member_type === "正会員" ? regularFee : associateFee;
            if (amount > 0) {
              await base44.asServiceRole.entities.Due.create({
                fiscal_year_id: newFiscalYearId,
                member_id: member.id,
                amount,
                due_type: "年会費",
                status: "未納"
              });
              duesGenerated++;
            }
          }

          log.push(`会費 ${duesGenerated} 件を生成しました`);
        } else {
          log.push("会費金額が0のため、会費生成をスキップしました");
        }
      } else {
        log.push("会費金額設定がないため、会費生成をスキップしました");
      }
    }

    // 4. Reset is_new flags
    let isNewReset = 0;

    if (resetIsNew) {
      const allMembers = await base44.asServiceRole.entities.Member.list();
      const newMembers = allMembers.filter((m) => m.is_new === true);

      for (const member of newMembers) {
        await base44.asServiceRole.entities.Member.update(member.id, {
          name_kanji: String(member.name_kanji || ""),
          name_kana: String(member.name_kana || ""),
          birthday: String(member.birthday || ""),
          email: String(member.email || ""),
          mobile_phone: String(member.mobile_phone || ""),
          referrer_1: String(member.referrer_1 || ""),
          referrer_2: String(member.referrer_2 || ""),
          approval_status: String(member.approval_status || ""),
          applied_at: String(member.applied_at || ""),
          is_new: false
        });
        isNewReset++;
      }

      if (isNewReset > 0) {
        log.push(`新入会員フラグ ${isNewReset} 件をリセットしました`);
      }
    }

    // 5. Switch current fiscal year
    for (const fy of allFiscalYears) {
      if (fy.is_current === true) {
        await base44.asServiceRole.entities.FiscalYear.update(fy.id, {
          year: Number(fy.year),
          start_date: String(fy.start_date || ""),
          end_date: String(fy.end_date || ""),
          is_current: false
        });
      }
    }

    await base44.asServiceRole.entities.FiscalYear.update(newFiscalYearId, {
      year: Number(newFiscalYear.year),
      start_date: String(newFiscalYear.start_date || ""),
      end_date: String(newFiscalYear.end_date || ""),
      is_current: true
    });

    log.push(`${newFiscalYear.year}年度を現在年度に切り替えました`);

    return Response.json({
      ok: true,
      log,
      summary: {
        orgs_copied: orgsCopied,
        assignments_copied: assignmentsCopied,
        dues_generated: duesGenerated,
        is_new_reset: isNewReset,
        new_fiscal_year_id: newFiscalYearId,
        previous_fiscal_year_id: previousFiscalYearId
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
