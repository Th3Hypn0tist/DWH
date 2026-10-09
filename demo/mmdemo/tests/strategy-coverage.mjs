import fs from 'node:fs/promises';

const coverage = JSON.parse(
  await fs.readFile(new URL('../data/metamodule-coverage-q3-2026.json', import.meta.url), 'utf8')
);
const profile = JSON.parse(
  await fs.readFile(new URL('../data/strategy-business-universal-composition.json', import.meta.url), 'utf8')
);

function fail(message) {
  throw new Error(message);
}

const members = coverage.compositions?.strategy?.members ?? [];
const known = members.filter(member => member.display_name);
const unresolved = members.filter(member => !member.display_name);

if (profile.entries.filter(entry => entry.display_name).length !== 27) {
  fail('Strategy composition profile must contain 27 known display labels');
}
if (profile.entries.filter(entry => !entry.display_name).length !== 1) {
  fail('Strategy composition profile must contain exactly one unresolved member');
}

if (known.length !== 27) {
  fail(`expected 27 known Strategy coverage rows, got ${known.length}`);
}
if (unresolved.length !== 1) {
  fail(`expected 1 unresolved Strategy coverage row, got ${unresolved.length}`);
}

for (const member of known) {
  if (member.status !== 'EXERCISED') {
    fail(`Strategy member not fully exercised: ${member.display_name} -> ${member.status}`);
  }

  const required = member.evidence?.required_business_universals ?? [];
  const statuses = member.evidence?.business_universal_status ?? {};

  if (required.length === 0) {
    fail(`Strategy member has no Business Universal composition requirements: ${member.display_name}`);
  }

  for (const semanticIdentity of required) {
    if (statuses[semanticIdentity] !== 'EXERCISED') {
      fail(`Strategy ${member.display_name} depends on non-exercised ${semanticIdentity}`);
    }
  }

  if ((member.evidence?.missing_business_universals ?? []).length !== 0) {
    fail(`Strategy member has missing Business Universals: ${member.display_name}`);
  }
}

if (unresolved[0].status !== 'UNRESOLVED_ID') {
  fail('unresolved Strategy member must remain UNRESOLVED_ID');
}

if (coverage.summary?.strategy_members?.EXERCISED !== 27) {
  fail('Strategy summary must report 27 EXERCISED');
}
if (coverage.summary?.strategy_members?.UNRESOLVED_ID !== 1) {
  fail('Strategy summary must report 1 UNRESOLVED_ID');
}

console.log('OK: Strategy coverage = 27 EXERCISED + 1 UNRESOLVED_ID via Business Universal composition');
