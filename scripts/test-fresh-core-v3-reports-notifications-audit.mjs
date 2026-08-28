import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {REPORTS_NOTIFICATIONS_CONTRACT as CONTRACT,REPORTS_NOTIFICATIONS_MIGRATION_GUARD as GUARD} from '../src-v3/domains/reports-notifications/reports-notifications-contract.js';

const baseline=JSON.parse(await fs.readFile(new URL('../src-v3/domains/reports-notifications/production-baseline.json',import.meta.url),'utf8'));
const reports=await fs.readFile(new URL('../ly-reports.js',import.meta.url),'utf8');
const specialReports=await fs.readFile(new URL('../ly-special-reports.js',import.meta.url),'utf8');
const center=await fs.readFile(new URL('../ly-notification-center.js',import.meta.url),'utf8');
const delivery=await fs.readFile(new URL('../ly-data-notifications.js',import.meta.url),'utf8');

assert.equal(CONTRACT.status,'source-of-truth-audited-notification-delivery-dependency-locked');
assert.equal(CONTRACT.currentAuthority,'v2');
assert.equal(CONTRACT.productionActivation,false);
assert.equal(CONTRACT.dualWrite,false);
assert.equal(CONTRACT.cloudReads,0);
assert.equal(CONTRACT.cloudWrites,0);
assert.equal(CONTRACT.reports.calculationAuthority,'legacy-core');
assert.equal(CONTRACT.reports.dedicatedPersistenceTable,false);
assert.equal(CONTRACT.reports.readOnlyRenderers,true);
assert.equal(CONTRACT.notifications.activityRows,63005);
assert.equal(CONTRACT.notifications.deviceRows,32);
assert.equal(CONTRACT.notifications.rlsVerifiedBothTables,true);
assert.equal(CONTRACT.notifications.realtimeSource,'ly_activity_events');
assert.equal(CONTRACT.notifications.pollingFallback,true);
assert.equal(CONTRACT.notifications.deviceTelemetry,true);
assert.equal(CONTRACT.notifications.deliveryBehaviorProtected,true);
assert.equal(CONTRACT.repositoryImplemented,false);
assert.equal(CONTRACT.serviceImplemented,false);
assert.equal(CONTRACT.shadowImplemented,false);

assert.equal(baseline.notifications.ly_activity_events.rls,true);
assert.equal(baseline.notifications.ly_activity_events.orgScoped,true);
assert.equal(baseline.notifications.ly_activity_events.eventTypeRestricted,true);
assert.equal(baseline.notifications.ly_notification_devices.rls,true);
assert.equal(baseline.notifications.ly_notification_devices.orgScoped,true);
assert.equal(baseline.runtime.reportFormulaChanged,false);
assert.equal(baseline.runtime.notificationDeliveryChanged,false);
assert.equal(baseline.runtime.notificationTelemetryChanged,false);

assert.match(reports,/Report calculations\/charts remain in Legacy core/);
assert.match(specialReports,/Read-only report renderers/);
assert.match(center,/from\('ly_activity_events'\)/);
assert.match(delivery,/table:'ly_activity_events'/);
assert.match(delivery,/from\('ly_activity_events'\)/);
assert.match(delivery,/from\('ly_notification_devices'\)\.upsert/);
assert.match(delivery,/HEALTH_POLL_MS=60000/);
assert.match(delivery,/DISCONNECTED_POLL_MS=6000/);

assert.deepEqual(GUARD.requireDependencies,['V3-5','V3-7']);
assert.equal(GUARD.requireExistingRealtimeDeliveryPreserved,true);
assert.equal(GUARD.requireExistingPollingFallbackPreserved,true);
assert.equal(GUARD.requireExistingTelemetryPreserved,true);
assert.equal(GUARD.allowReportFormulaChanges,false);
assert.equal(GUARD.allowNotificationDeliveryChanges,false);
assert.equal(GUARD.allowNotificationTelemetryChanges,false);
assert.equal(GUARD.allowWrites,false);
assert.equal(GUARD.allowDualWrite,false);
assert.equal(GUARD.allowAutoPromotion,false);
assert.equal(GUARD.currentAuthority,'v2');

console.log('Fresh Core V3-8 reports/notifications source-of-truth audit: PASS');
