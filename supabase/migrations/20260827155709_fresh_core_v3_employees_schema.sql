-- Fresh Core V3-6 Employees schema-only migration.
-- Approval scope: migration generation only. Applying this file to production requires a separate review.
-- No employee business-data import/backfill, no mutation grants/policies, no authority switch.

alter table public.ly_warehouses
  add constraint ly_warehouses_id_org_uniq unique (id, org_id);

create or replace function ly_private.ly_is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists(
    select 1
    from public.ly_org_members m
    where m.user_id = auth.uid()
      and m.org_id = p_org_id
      and lower(m.role) = 'admin'
  );
$function$;

revoke all on function ly_private.ly_is_org_admin(uuid) from public, anon, authenticated;

create table public.ly_employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.ly_organizations(id),
  warehouse_id uuid not null,
  legacy_id text not null,
  code text not null,
  name text not null,
  role text,
  phone text,
  hire_date date,
  shift text,
  attendance_mode text,
  base_salary numeric,
  hourly_rate numeric,
  standard_days numeric,
  address text,
  emergency_contact text,
  note text,
  bank_account text,
  id_number text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ly_employees_warehouse_org_fkey
    foreign key (warehouse_id, org_id) references public.ly_warehouses(id, org_id),
  constraint ly_employees_legacy_id_uniq unique (org_id, warehouse_id, legacy_id),
  constraint ly_employees_code_uniq unique (org_id, warehouse_id, code),
  constraint ly_employees_id_org_warehouse_uniq unique (id, org_id, warehouse_id),
  constraint ly_employees_attendance_mode_check check (attendance_mode is null or attendance_mode in ('day','hour')),
  constraint ly_employees_nonnegative_pay_check check (
    (base_salary is null or base_salary >= 0) and
    (hourly_rate is null or hourly_rate >= 0) and
    (standard_days is null or standard_days >= 0)
  )
);

create table public.ly_employee_attendance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.ly_organizations(id),
  warehouse_id uuid not null,
  employee_id uuid not null,
  work_date date not null,
  status text not null,
  full_day numeric,
  time_slots jsonb,
  hours numeric,
  overtime_slots jsonb,
  overtime_hours numeric,
  pay_type text,
  pay_multiplier numeric,
  overtime_multiplier numeric,
  daily_bonus numeric,
  daily_penalty numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ly_employee_attendance_employee_tenant_fkey
    foreign key (employee_id, org_id, warehouse_id)
    references public.ly_employees(id, org_id, warehouse_id) on delete cascade,
  constraint ly_employee_attendance_day_uniq unique (org_id, warehouse_id, employee_id, work_date),
  constraint ly_employee_attendance_nonnegative_check check (
    (full_day is null or full_day >= 0) and
    (hours is null or hours >= 0) and
    (overtime_hours is null or overtime_hours >= 0) and
    (pay_multiplier is null or pay_multiplier >= 0) and
    (overtime_multiplier is null or overtime_multiplier >= 0) and
    (daily_bonus is null or daily_bonus >= 0) and
    (daily_penalty is null or daily_penalty >= 0)
  )
);

create table public.ly_employee_payroll (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.ly_organizations(id),
  warehouse_id uuid not null,
  employee_id uuid not null,
  payroll_month date not null,
  allowance numeric,
  bonus numeric,
  deduction numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ly_employee_payroll_employee_tenant_fkey
    foreign key (employee_id, org_id, warehouse_id)
    references public.ly_employees(id, org_id, warehouse_id) on delete cascade,
  constraint ly_employee_payroll_month_uniq unique (org_id, warehouse_id, employee_id, payroll_month),
  constraint ly_employee_payroll_nonnegative_check check (
    (allowance is null or allowance >= 0) and
    (bonus is null or bonus >= 0) and
    (deduction is null or deduction >= 0)
  )
);

create index ly_employees_org_warehouse_active_idx
  on public.ly_employees(org_id, warehouse_id, active);
create index ly_employee_attendance_employee_date_idx
  on public.ly_employee_attendance(org_id, warehouse_id, employee_id, work_date desc);
create index ly_employee_payroll_employee_month_idx
  on public.ly_employee_payroll(org_id, warehouse_id, employee_id, payroll_month desc);

alter table public.ly_employees enable row level security;
alter table public.ly_employee_attendance enable row level security;
alter table public.ly_employee_payroll enable row level security;

revoke all on table public.ly_employees from public, anon, authenticated;
revoke all on table public.ly_employee_attendance from public, anon, authenticated;
revoke all on table public.ly_employee_payroll from public, anon, authenticated;

create or replace function public.ly_list_employee_directory(
  p_org_id uuid,
  p_warehouse_id uuid
)
returns table (
  id uuid,
  warehouse_id uuid,
  code text,
  name text,
  role text,
  shift text,
  attendance_mode text,
  active boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    e.id,
    e.warehouse_id,
    e.code,
    e.name,
    e.role,
    e.shift,
    e.attendance_mode,
    e.active
  from public.ly_employees e
  where ly_private.ly_is_org_admin(p_org_id)
    and e.org_id = p_org_id
    and e.warehouse_id = p_warehouse_id
  order by e.name, e.code;
$function$;

revoke all on function public.ly_list_employee_directory(uuid, uuid) from public, anon, authenticated;
grant execute on function public.ly_list_employee_directory(uuid, uuid) to authenticated;
