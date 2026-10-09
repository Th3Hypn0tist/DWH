import fs from 'node:fs/promises';

const audit = JSON.parse(
  await fs.readFile(new URL('../data/metamodule-event-audit.json', import.meta.url), 'utf8')
);
const catalog = JSON.parse(
  await fs.readFile(new URL('../../../php/data/metamodule-catalog.json', import.meta.url), 'utf8')
);

function fail(message) {
  throw new Error(message);
}

const allowed = new Set([
  'EVENTS_PROVEN',
  'EVENT_REVIEW_REQUIRED',
  'EVENT_CONFLICT',
  'NOT_EVENT_OWNER',
]);

if (!Array.isArray(audit.entries) || audit.entries.length !== 43) {
  fail(`expected 43 Universal Event audit entries, got ${audit.entries?.length}`);
}

for (const entry of audit.entries) {
  if (!allowed.has(entry.event_status)) {
    fail(`unknown Event status for ${entry.semantic_identity}: ${entry.event_status}`);
  }

  if (entry.event_status !== 'EVENT_REVIEW_REQUIRED') {
    fail(`Universal ${entry.semantic_identity} must remain EVENT_REVIEW_REQUIRED until explicit Events are reviewed`);
  }

  if (entry.declared_event_count !== 0) {
    fail(`Universal ${entry.semantic_identity} declared_event_count must be 0 in current audited source`);
  }

  if (!Array.isArray(entry.evidence?.behavior_events) || entry.evidence.behavior_events.length !== 0) {
    fail(`Universal ${entry.semantic_identity} Event evidence must preserve explicit empty behavior.events`);
  }
}

const catalogUniversalNames = new Set(
  catalog.families.flatMap(family => family.members)
);
const auditedUniversalNames = new Set(audit.entries.map(entry => entry.semantic_identity));

for (const name of catalogUniversalNames) {
  if (!auditedUniversalNames.has(name)) {
    fail(`catalog Universal missing from Event audit: ${name}`);
  }
}

for (const name of auditedUniversalNames) {
  if (!catalogUniversalNames.has(name)) {
    fail(`Event audit contains non-catalog Universal: ${name}`);
  }
}

const expectedGroups = new Set(['BusinessSuite', 'Strategy', 'Everyday']);
const groups = audit.compositions?.groups ?? [];

if (groups.length !== expectedGroups.size) {
  fail('Composition grouping Event audit count mismatch');
}

for (const group of groups) {
  if (!expectedGroups.has(group.identity)) {
    fail(`unexpected grouping abstraction in Event audit: ${group.identity}`);
  }
  if (group.event_status !== 'NOT_EVENT_OWNER') {
    fail(`grouping abstraction ${group.identity} must be NOT_EVENT_OWNER`);
  }
}

if (audit.compositions?.editor?.event_status !== 'EVENT_REVIEW_REQUIRED') {
  fail('Editor must remain EVENT_REVIEW_REQUIRED until explicit Events are reviewed');
}

const expectedUnresolved = new Set(['ERP', 'CRM', 'HRM', 'WMS', 'Projects']);
const unresolved = audit.compositions?.unresolved_actual_members ?? [];

if (unresolved.length !== expectedUnresolved.size) {
  fail('unresolved actual Composition Event audit count mismatch');
}

for (const item of unresolved) {
  if (!expectedUnresolved.has(item.display_name)) {
    fail(`unexpected unresolved Composition label: ${item.display_name}`);
  }
  if (item.event_status !== 'EVENT_REVIEW_REQUIRED') {
    fail(`${item.display_name} must remain EVENT_REVIEW_REQUIRED`);
  }
}

const proven = audit.entries.filter(entry => entry.event_status === 'EVENTS_PROVEN');
if (proven.length !== 0) {
  fail('current Universal Event audit must not contain EVENTS_PROVEN without explicit source Events');
}

console.log(
  `OK: ${audit.entries.length} Universals pending Event review; ${groups.length} groups NOT_EVENT_OWNER`
);
