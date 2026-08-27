export const EMPLOYEES_FORMAL_SECURITY_REVIEW=Object.freeze({
  domain:'employees',wave:'V3-6',status:'approved',approvalScope:'migration-generation-only',reviewedAt:'2026-08-27',approvedAt:'2026-08-27',appliedAt:'2026-08-27',
  currentAuthority:'legacy-local',productionSchemaPresent:true,productionMigrationVersion:'20260827155709',migrationAllowed:false,repositoryAllowed:false,productionActivation:false,cloudWrites:0,
  findings:Object.freeze({
    warehouseOrgIntegrity:Object.freeze({severity:'pass',pass:true,finding:'production schema enforces ly_warehouses(id, org_id) uniqueness and binds employee warehouse_id + org_id through a composite foreign key',evidence:'ly_warehouses_id_org_uniq + ly_employees_warehouse_org_fkey'}),
    childWarehouseIntegrity:Object.freeze({severity:'pass',pass:true,finding:'attendance/payroll bind employee_id + org_id + warehouse_id to the exact employee tenant tuple',evidence:'ly_employee_attendance_employee_tenant_fkey + ly_employee_payroll_employee_tenant_fkey'}),
    authorizationHelper:Object.freeze({severity:'pass',pass:true,finding:'employee-scoped ly_is_org_admin(org_id) uses auth.uid() + org membership role with no fixed-email dependency; direct client execution is revoked',evidence:'ly_private.ly_is_org_admin(uuid) internal-only + public safe RPC authorization check'}),
    sensitiveProjection:Object.freeze({severity:'pass',pass:true,finding:'authenticated has no direct SELECT on employee base tables; the only client read surface is an org/warehouse-scoped safe directory function returning the approved allowlist',evidence:'public.ly_list_employee_directory(uuid,uuid) + no base-table SELECT grants + no attendance/payroll read functions'}),
    writeSurface:Object.freeze({severity:'pass',pass:true,finding:'production schema grants no INSERT/UPDATE/DELETE permissions and creates no mutation policies'}),
    anonymousAccess:Object.freeze({severity:'pass',pass:true,finding:'production schema grants no anonymous table or function access'}),
    rlsCoverage:Object.freeze({severity:'pass',pass:true,finding:'RLS is enabled on all three employee tables as defense in depth while direct table reads remain revoked'})
  }),
  nextGate:'implement-read-only-repository-against-safe-rpc'
});

export function evaluateEmployeesFormalSecurityReview(review=EMPLOYEES_FORMAL_SECURITY_REVIEW){
  const findings=Object.values(review?.findings||{});
  const blockers=findings.filter(item=>item?.severity==='blocker'&&item?.pass!==true);
  const unresolved=findings.filter(item=>item?.pass!==true);
  const reviewApproved=review?.status==='approved'&&review?.approvalScope==='migration-generation-only';
  const pass=reviewApproved&&blockers.length===0&&unresolved.length===0;
  return Object.freeze({
    pass,technicalReviewComplete:blockers.length===0&&unresolved.length===0,blockers:blockers.length,unresolved:unresolved.length,
    migrationAllowed:pass&&review?.migrationAllowed===true,repositoryAllowed:pass&&review?.repositoryAllowed===true,authoritative:false,
    recommendation:pass&&review?.productionSchemaPresent===true?'schema-applied-await-read-only-repository-review':pass?'eligible-for-schema-only-migration-generation':blockers.length>0?'keep-legacy-local-and-resolve-security-review-blockers':unresolved.length>0?'keep-legacy-local-and-resolve-security-review-findings':'await-explicit-schema-and-sensitive-data-policy-approval'
  });
}
