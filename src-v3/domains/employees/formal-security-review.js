export const EMPLOYEES_FORMAL_SECURITY_REVIEW=Object.freeze({
  domain:'employees',
  wave:'V3-6',
  status:'blocked',
  reviewedAt:'2026-08-27',
  currentAuthority:'legacy-local',
  productionSchemaPresent:false,
  migrationAllowed:false,
  repositoryAllowed:false,
  productionActivation:false,
  cloudWrites:0,
  findings:Object.freeze({
    warehouseOrgIntegrity:Object.freeze({
      severity:'pass',
      pass:true,
      finding:'review-only DDL adds ly_warehouses(id, org_id) uniqueness and binds employee warehouse_id + org_id through a composite foreign key',
      evidence:'ly_warehouses_id_org_uniq + ly_employees_warehouse_org_fkey'
    }),
    childWarehouseIntegrity:Object.freeze({
      severity:'pass',
      pass:true,
      finding:'attendance/payroll bind employee_id + org_id + warehouse_id to the exact employee tenant tuple',
      evidence:'ly_employee_attendance_employee_tenant_fkey + ly_employee_payroll_employee_tenant_fkey'
    }),
    authorizationHelper:Object.freeze({
      severity:'pass',
      pass:true,
      finding:'review-only DDL introduces an employee-scoped ly_is_org_admin(org_id) helper based on auth.uid() + org membership role, with no fixed-email dependency and no replacement of the existing cross-domain helper',
      evidence:'ly_private.ly_is_org_admin(uuid) + authenticated-only execute grant + org-scoped RLS policies'
    }),
    sensitiveProjection:Object.freeze({
      severity:'review-required',
      pass:false,
      finding:'table-level SELECT exposes full employee rows to an authorized admin; restricted/default-list field separation is currently an application projection rather than a database-enforced projection',
      requiredResolution:'approve-admin-full-row-read-or-design-a-db-enforced-safe-list-projection'
    }),
    writeSurface:Object.freeze({
      severity:'pass',
      pass:true,
      finding:'review package grants no INSERT/UPDATE/DELETE permissions and creates no mutation policies'
    }),
    anonymousAccess:Object.freeze({
      severity:'pass',
      pass:true,
      finding:'review package grants no anonymous table access'
    }),
    rlsCoverage:Object.freeze({
      severity:'pass',
      pass:true,
      finding:'review package enables RLS for all three employee candidate tables'
    })
  }),
  nextGate:'resolve-sensitive-projection-before-migration'
});

export function evaluateEmployeesFormalSecurityReview(review=EMPLOYEES_FORMAL_SECURITY_REVIEW){
  const findings=Object.values(review?.findings||{});
  const blockers=findings.filter(item=>item?.severity==='blocker'&&item?.pass!==true);
  const unresolved=findings.filter(item=>item?.pass!==true);
  const pass=review?.status==='approved'&&blockers.length===0&&unresolved.length===0;
  return Object.freeze({
    pass,
    blockers:blockers.length,
    unresolved:unresolved.length,
    migrationAllowed:pass&&review?.migrationAllowed===true,
    repositoryAllowed:pass&&review?.repositoryAllowed===true,
    authoritative:false,
    recommendation:pass?'eligible-for-migration-generation-review':blockers.length>0?'keep-legacy-local-and-resolve-security-review-blockers':'keep-legacy-local-and-resolve-sensitive-projection'
  });
}
