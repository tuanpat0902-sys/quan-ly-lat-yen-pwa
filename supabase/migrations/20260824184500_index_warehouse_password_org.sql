-- Cover the organization foreign key for protected-warehouse lookups and
-- organization cleanup. Kept idempotent because the base migration also
-- includes this index for fresh installations.
create index if not exists idx_ly_warehouse_passwords_org_id
on ly_private.ly_warehouse_passwords(org_id);
