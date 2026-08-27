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
      severity:'blocker',
      pass:false,
      finding:'warehouse_id and org_id are independently referenced; the proposed schema does not structurally prove that the warehouse belongs to the same org',
      requiredResolution:'approve-and-implement-a-warehouse-org-integrity-strategy-before-ddl'
    }),
    childWarehouseIntegrity:Object.freeze({
      severity:'blocker',
      pass:false,
      finding:'attendance/payroll bind employee_id + org_id but do not structurally prove child warehouse_id matches the employee warehouse_id',
      requiredResolution:'approve-and-implement-child-employee-warehouse-integrity-before-ddl'
    }),
    authorizationHelper:Object.freeze({
      severity:'blocker',
      pass:false,
      finding:'current admin authorization is coupled to the existing ly_private.ly_is_admin helper whose production implementation identifies the administrator by a fixed email',
      requiredResolution:'explicitly-approve-or-replace-admin-authorization-assumption-before-sensitive-production-read'
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
  nextGate:'resolve-formal-security-review-blockers-before-migration'
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
    recommendation:pass?'eligible-for-migration-generation-review':'keep-legacy-local-and-resolve-security-review-blockers'
  });
}
