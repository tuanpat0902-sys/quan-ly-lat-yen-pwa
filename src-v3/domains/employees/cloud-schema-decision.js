export const EMPLOYEES_CLOUD_SCHEMA_DECISION=Object.freeze({
  domain:'employees',
  wave:'V3-6',
  status:'approved',
  approvalScope:'migration-generation-only',
  approvedAt:'2026-08-27',
  currentAuthority:'legacy-local',
  approvalRequired:true,
  migrationAllowed:true,
  repositoryAllowed:false,
  productionActivation:false,
  dualWrite:false,
  cloudWrites:0,
  sourceEvidence:Object.freeze({
    employeeStorageKey:'lat_yen_employees_v1',
    attendanceStorageKey:'lat_yen_employee_attendance_v1',
    payrollStorageKey:'lat_yen_employee_payroll_v1',
    attendanceKeyShape:'warehouse_id|employee_id|date',
    payrollKeyShape:'warehouse_id|employee_id|month',
    legacyEmployeeIdType:'opaque-text-not-guaranteed-uuid'
  }),
  identity:Object.freeze({
    cloudPrimaryKey:'uuid-generated-in-cloud',
    legacyMigrationKey:'legacy_id-text',
    preserveLegacyId:true,
    childImportMapping:'resolve-employee-uuid-by-org-warehouse-legacy_id',
    reason:'legacy employee ids may be non-UUID and are embedded in attendance/payroll keys'
  }),
  tenancy:Object.freeze({
    requiredColumns:Object.freeze(['org_id','warehouse_id']),
    employeeOwnership:'org-and-warehouse',
    childOwnership:'employee-with-org-and-warehouse-defense-in-depth'
  }),
  candidates:Object.freeze({
    employees:Object.freeze({
      candidateName:'ly_employees',
      approved:true,
      primaryKey:'id uuid',
      legacyKey:'legacy_id text',
      uniqueKeys:Object.freeze([
        Object.freeze(['org_id','warehouse_id','legacy_id']),
        Object.freeze(['org_id','warehouse_id','code'])
      ]),
      columns:Object.freeze({
        id:'uuid not null',org_id:'uuid not null',warehouse_id:'uuid not null',legacy_id:'text not null',
        code:'text not null',name:'text not null',role:'text',phone:'text',hire_date:'date',shift:'text',
        attendance_mode:'text',base_salary:'numeric',hourly_rate:'numeric',standard_days:'numeric',address:'text',
        emergency_contact:'text',note:'text',bank_account:'text',id_number:'text',active:'boolean not null',
        created_at:'timestamptz not null',updated_at:'timestamptz not null'
      })
    }),
    attendance:Object.freeze({
      candidateName:'ly_employee_attendance',
      approved:true,
      primaryKey:'id uuid',
      foreignKey:'employee_id uuid -> ly_employees.id',
      uniqueKeys:Object.freeze([Object.freeze(['org_id','warehouse_id','employee_id','work_date'])]),
      columns:Object.freeze({
        id:'uuid not null',org_id:'uuid not null',warehouse_id:'uuid not null',employee_id:'uuid not null',
        work_date:'date not null',status:'text not null',full_day:'numeric',time_slots:'jsonb',hours:'numeric',
        overtime_slots:'jsonb',overtime_hours:'numeric',pay_type:'text',pay_multiplier:'numeric',
        overtime_multiplier:'numeric',daily_bonus:'numeric',daily_penalty:'numeric',note:'text',
        created_at:'timestamptz not null',updated_at:'timestamptz not null'
      })
    }),
    payroll:Object.freeze({
      candidateName:'ly_employee_payroll',
      approved:true,
      primaryKey:'id uuid',
      foreignKey:'employee_id uuid -> ly_employees.id',
      uniqueKeys:Object.freeze([Object.freeze(['org_id','warehouse_id','employee_id','payroll_month'])]),
      columns:Object.freeze({
        id:'uuid not null',org_id:'uuid not null',warehouse_id:'uuid not null',employee_id:'uuid not null',
        payroll_month:'date not null',allowance:'numeric',bonus:'numeric',deduction:'numeric',note:'text',
        created_at:'timestamptz not null',updated_at:'timestamptz not null'
      })
    })
  }),
  sensitiveDataPolicy:Object.freeze({
    status:'approved-for-safe-directory-only',
    restrictedFields:Object.freeze(['bank_account','id_number']),
    confidentialFields:Object.freeze(['phone','address','emergency_contact','base_salary','hourly_rate']),
    payrollFields:Object.freeze(['allowance','bonus','deduction','daily_bonus','daily_penalty']),
    defaultListProjection:Object.freeze(['id','warehouse_id','code','name','role','shift','attendance_mode','active']),
    requirements:Object.freeze([
      'row-level-security-required-before-any-production-read',
      'no-anonymous-access',
      'restricted-fields-excluded-from-default-list-projection',
      'explicit-role-review-required-before-sensitive-field-read',
      'audit-sensitive-writes-before-enabling-mutations'
    ])
  }),
  migrationSequence:Object.freeze([
    'approve-schema-and-sensitive-data-policy',
    'create-ddl-and-rls-migration-in-review-only-branch',
    'verify-schema-with-zero-business-data-writes',
    'implement-read-only-repository',
    'run-local-v2-v3-parity-without-authority-change',
    'approve-controlled-shadow-read',
    'design-explicit-import-or-dual-write-plan-separately'
  ]),
  nextGate:'generate-and-review-schema-only-migration-before-apply'
});

export function evaluateEmployeesSchemaDecision(decision=EMPLOYEES_CLOUD_SCHEMA_DECISION){
  const candidates=Object.values(decision?.candidates||{});
  const identityReady=decision?.identity?.cloudPrimaryKey==='uuid-generated-in-cloud'&&
    decision?.identity?.legacyMigrationKey==='legacy_id-text'&&
    decision?.identity?.preserveLegacyId===true;
  const approved=decision?.status==='approved'&&
    decision?.approvalRequired===true&&
    decision?.approvalScope==='migration-generation-only'&&
    identityReady&&
    candidates.length===3&&
    candidates.every(table=>table?.approved===true)&&
    decision?.sensitiveDataPolicy?.status==='approved-for-safe-directory-only'&&
    decision?.sensitiveDataPolicy?.requirements?.length>=5;
  return Object.freeze({
    approved,
    identityReady,
    migrationAllowed:approved&&decision?.migrationAllowed===true,
    repositoryAllowed:approved&&decision?.repositoryAllowed===true,
    authoritative:false,
    recommendation:approved?'eligible-for-schema-only-migration-generation':'keep-legacy-local-and-block-cloud-repository'
  });
}
