import fs from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);

const catalog = JSON.parse(
  await fs.readFile(new URL('../../../php/data/metamodule-catalog.json', import.meta.url), 'utf8')
);
const graph = JSON.parse(
  await fs.readFile(new URL('../data/relation-graph-q3-2026.json', import.meta.url), 'utf8')
);
const company = JSON.parse(
  await fs.readFile(new URL('../data/company-q3-2026.json', import.meta.url), 'utf8')
);

const entityCounts = new Map();
const entitySamples = new Map();

for (const entity of graph.entities) {
  entityCounts.set(entity.type, (entityCounts.get(entity.type) ?? 0) + 1);
  if (!entitySamples.has(entity.type)) entitySamples.set(entity.type, []);
  if (entitySamples.get(entity.type).length < 5) entitySamples.get(entity.type).push(entity.id);
}

const relationCounts = new Map();
for (const relation of graph.relations) {
  relationCounts.set(
    relation.relation,
    (relationCounts.get(relation.relation) ?? 0) + 1
  );
}

const businessFamily = catalog.families.find(family => family.id === 'Universal/Business');
const platformFamily = catalog.families.find(family => family.id === 'Universal/Platform');
const guiFamily = catalog.families.find(family => family.id === 'Universal/GUI');
const strategyGroup = catalog.groups.find(group => group.id === 'Strategy');
const everydayGroup = catalog.groups.find(group => group.id === 'Everyday');

function typeEvidence(type) {
  const count = entityCounts.get(type) ?? 0;
  return {
    status: count > 0 ? 'EXERCISED' : 'NOT_YET_EXERCISED',
    evidence: count > 0 ? {
      entity_type: type,
      entity_count: count,
      sample_entity_ids: entitySamples.get(type) ?? [],
    } : {
      entity_type: type,
      entity_count: 0,
    },
  };
}

const businessUniversals = businessFamily.members.map(semanticIdentity => ({
  semantic_identity: semanticIdentity,
  identity_status: 'CANONICAL_CONFIRMED',
  ...typeEvidence(semanticIdentity),
}));

const platformEvidence = {
  DWH: {
    status: 'EXERCISED',
    evidence: {
      implementation: 'PHP ProjectionEngine + DWH projection API',
      contracts: ['#WEB', '#SITE', '#METAMODULE:CATALOG', '#PROJECTOR:*', '#CONTENT:*', '#ACTION:*'],
    },
  },
  nanoCMSStructure: {
    status: 'EXERCISED',
    evidence: {
      implementation: 'recursive Page + placements source',
      source: 'php/data/web-structure.json',
      projections: ['#WEB', '#SITE'],
    },
  },
};

const platformUniversals = platformFamily.members.map(semanticIdentity => ({
  semantic_identity: semanticIdentity,
  identity_status: 'CANONICAL_CONFIRMED',
  ...(platformEvidence[semanticIdentity] ?? {
    status: 'NOT_YET_EXERCISED',
    evidence: null,
  }),
}));

const guiUniversals = guiFamily.members.map(semanticIdentity => ({
  semantic_identity: semanticIdentity,
  identity_status: 'CANONICAL_CONFIRMED',
  status: 'NOT_YET_EXERCISED',
  evidence: null,
}));

const compositionRules = {
  ERP: {
    required_types: ['Order', 'Invoice', 'Settlement', 'StockMovement', 'Project', 'BalanceTransaction'],
    required_relations: ['mmdemo.rel.billed_by', 'mmdemo.rel.settled_by', 'mmdemo.rel.posts_stock_movement'],
  },
  CRM: {
    required_types: ['Identity', 'Opportunity', 'Quote', 'Order'],
    required_relations: ['mmdemo.rel.customer', 'mmdemo.rel.has_quote', 'mmdemo.rel.converted_to'],
  },
  HRM: {
    required_types: ['Identity', 'Measurement', 'BalanceTransaction'],
    required_relations: ['mmdemo.rel.employs', 'mmdemo.rel.payroll_transaction'],
  },
  WMS: {
    required_types: ['Location', 'StockMovement', 'Shipment'],
    required_relations: ['mmdemo.rel.received_by', 'mmdemo.rel.posts_stock_movement', 'mmdemo.rel.location'],
  },
  Projects: {
    required_types: ['Project', 'Identity'],
    required_relations: ['mmdemo.rel.assigned_to'],
  },
  Editor: {
    required_types: [],
    required_relations: [],
    force_status: 'NOT_YET_EXERCISED',
  },
};

function evaluateRule(rule) {
  if (rule.force_status) {
    return {
      status: rule.force_status,
      missing_types: [],
      missing_relations: [],
    };
  }

  const missingTypes = rule.required_types.filter(type => (entityCounts.get(type) ?? 0) === 0);
  const missingRelations = rule.required_relations.filter(relation => (relationCounts.get(relation) ?? 0) === 0);

  return {
    status: missingTypes.length === 0 && missingRelations.length === 0
      ? 'EXERCISED'
      : 'PARTIAL',
    missing_types: missingTypes,
    missing_relations: missingRelations,
  };
}

const compositionExamples = catalog.known_actual_composition_examples.map(item => {
  const rule = compositionRules[item.display_name] ?? {
    required_types: [],
    required_relations: [],
    force_status: 'NOT_YET_EXERCISED',
  };
  const evaluation = evaluateRule(rule);

  return {
    display_name: item.display_name,
    identity_status: item.identity_status,
    status: evaluation.status,
    evidence: {
      required_types: rule.required_types,
      type_counts: Object.fromEntries(rule.required_types.map(type => [type, entityCounts.get(type) ?? 0])),
      required_relations: rule.required_relations,
      relation_counts: Object.fromEntries(rule.required_relations.map(relation => [relation, relationCounts.get(relation) ?? 0])),
      missing_types: evaluation.missing_types,
      missing_relations: evaluation.missing_relations,
    },
  };
});

const strategyEvidence = {
  OKR: {
    status: 'PARTIAL',
    evidence: {
      reason: 'demo has explicit objectives + targets, but no explicit Objective/Key Result hierarchy',
      entity_ids: company.strategy.objectives.map(item => item.id),
    },
  },
  'Balanced Scorecard': {
    status: 'NOT_YET_EXERCISED',
    evidence: null,
  },
  'Decision Matrix': {
    status: 'PARTIAL',
    evidence: {
      reason: 'capital cases have decisions/status/date but no explicit weighted criteria matrix',
      entity_ids: company.strategy.capital_cases.map(item => item.id),
    },
  },
  Roadmap: {
    status: 'PARTIAL',
    evidence: {
      reason: 'Technology Radar evidence exists, but no explicit roadmap timeline/dependency model',
      entity_ids: company.strategy.technology_radar.map(item => item.id),
    },
  },
  Board: {
    status: 'PARTIAL',
    evidence: {
      reason: 'capital decisions exist, but current demo does not model Board membership/session semantics',
      entity_ids: company.strategy.capital_cases.map(item => item.id),
    },
  },
  Portfolio: {
    status: 'PARTIAL',
    evidence: {
      reason: 'multiple projects/capital cases exist, but no explicit portfolio object is modeled',
      entity_types: ['Project', 'Assessment'],
    },
  },
  Decision: {
    status: 'EXERCISED',
    evidence: {
      entity_ids: company.strategy.capital_cases.map(item => item.id),
      fields: ['status', 'decision_date'],
    },
  },
  'Investor/Management Reporting': {
    status: 'EXERCISED',
    evidence: {
      measurements: [
        'q3_sales_net',
        'q3_gross_margin',
        'q3_gross_margin_pct',
        'september_run_rate',
        'inventory_value_end',
      ],
    },
  },
  'Management System': {
    status: 'PARTIAL',
    evidence: {
      reason: 'operational measurements, projects and decisions are linked, but no explicit Management System member identity is resolved',
    },
  },
  CEO: {
    status: 'EXERCISED',
    evidence: {
      reason: 'company-wide Q3 operational and strategy measurements are present',
    },
  },
  COO: {
    status: 'EXERCISED',
    evidence: {
      entity_types: ['Order', 'Shipment', 'StockMovement', 'Project', 'Case'],
    },
  },
  CFO: {
    status: 'EXERCISED',
    evidence: {
      entity_types: ['Invoice', 'Settlement', 'BalanceTransaction', 'Measurement'],
    },
  },
  'CTO/CIO': {
    status: 'EXERCISED',
    evidence: {
      entity_ids: company.strategy.technology_radar.map(item => item.id),
    },
  },
  CHRO: {
    status: 'EXERCISED',
    evidence: {
      relation_ids: ['mmdemo.rel.employs', 'mmdemo.rel.payroll_transaction'],
      measurement_kind: 'employee_hours',
    },
  },
  CSO: {
    status: 'NOT_YET_EXERCISED',
    evidence: {
      reason: 'display label is known but its current 1.5 semantics/identity are unresolved; demo does not infer acronym meaning',
    },
  },
};

function flattenGroupMembers(group) {
  if (Array.isArray(group.members)) {
    return group.members.map(displayName => ({
      bucket: null,
      display_name: typeof displayName === 'string' ? displayName : displayName.display_name,
      unresolved: typeof displayName === 'object' ? displayName : null,
    }));
  }

  return Object.entries(group.members).flatMap(([bucket, members]) =>
    members.map(member => ({
      bucket,
      display_name: typeof member === 'string' ? member : member.display_name,
      unresolved: typeof member === 'object' ? member : null,
    }))
  );
}

const strategyMembers = flattenGroupMembers(strategyGroup).map(member => {
  if (member.unresolved) {
    return {
      bucket: member.bucket,
      display_name: null,
      identity_status: 'UNRESOLVED',
      status: 'UNRESOLVED_ID',
      gap_id: member.unresolved.gap_id,
      evidence: null,
    };
  }

  return {
    bucket: member.bucket,
    display_name: member.display_name,
    identity_status: 'DISPLAY_NAME_ONLY',
    ...(strategyEvidence[member.display_name] ?? {
      status: 'NOT_YET_EXERCISED',
      evidence: null,
    }),
  };
});

const everydayMembers = flattenGroupMembers(everydayGroup).map(member => ({
  bucket: member.bucket,
  display_name: member.display_name,
  identity_status: 'DISPLAY_NAME_ONLY',
  status: 'NOT_YET_EXERCISED',
  evidence: {
    reason: 'business demo data is not promoted into Everyday semantics by name similarity',
  },
}));

function countStatuses(entries) {
  const out = {};
  for (const entry of entries) {
    out[entry.status] = (out[entry.status] ?? 0) + 1;
  }
  return out;
}

const coverage = {
  dataset: 'mmdemo.coverage.mmdemo_industries.2026q3',
  version: '0.3.0',
  authority: 'synthetic_demo_evidence_only',
  sources: {
    catalog: '#METAMODULE:CATALOG',
    relation_graph: graph.dataset,
    company: company.dataset,
  },
  status_model: [
    'EXERCISED',
    'PARTIAL',
    'NOT_YET_EXERCISED',
    'UNRESOLVED_ID',
  ],
  universals: {
    business: businessUniversals,
    platform: platformUniversals,
    gui: guiUniversals,
  },
  compositions: {
    known_examples: compositionExamples,
    strategy: {
      group_identity: 'Strategy',
      group_event_status: 'NOT_EVENT_OWNER',
      member_count: strategyGroup.member_count,
      members: strategyMembers,
    },
    everyday: {
      group_identity: 'Everyday',
      group_event_status: 'NOT_EVENT_OWNER',
      member_count: everydayGroup.member_count,
      members: everydayMembers,
    },
    business_suite: {
      group_identity: 'BusinessSuite',
      group_event_status: 'NOT_EVENT_OWNER',
      member_count: catalog.groups.find(group => group.id === 'BusinessSuite').member_count,
      identity_status: 'UNRESOLVED',
      status: 'UNRESOLVED_ID',
      evidence: {
        known_actual_composition_examples: compositionExamples.map(item => item.display_name),
      },
    },
  },
  summary: {
    business_universals: countStatuses(businessUniversals),
    platform_universals: countStatuses(platformUniversals),
    gui_universals: countStatuses(guiUniversals),
    known_compositions: countStatuses(compositionExamples),
    strategy_members: countStatuses(strategyMembers),
    everyday_members: countStatuses(everydayMembers),
  },
  rules: [
    'coverage evidence never creates canonical semantic identity',
    'exact Business Universal coverage requires exact graph entity.type match',
    'Composition/Strategy/Everyday labels remain display labels when current 1.5 identity is unresolved',
    'PARTIAL means evidence exists but the full named semantics are not explicitly modeled',
    'NOT_YET_EXERCISED is not a model failure; it is a demo coverage gap',
    'UNRESOLVED_ID is an identity/evidence gap and must not be guessed',
  ],
};

const json = JSON.stringify(coverage, null, 2) + '\n';
const output = new URL('../data/metamodule-coverage-q3-2026.json', import.meta.url);

if (process.argv.includes('--check')) {
  const existing = await fs.readFile(output, 'utf8');
  if (existing !== json) {
    const expectedLines = json.split('\n');
    const actualLines = existing.split('\n');
    const max = Math.max(expectedLines.length, actualLines.length);
    let firstDiff = 0;

    while (
      firstDiff < max &&
      expectedLines[firstDiff] === actualLines[firstDiff]
    ) {
      firstDiff += 1;
    }

    const line = firstDiff + 1;
    console.error(`coverage mismatch at line ${line}`);
    console.error(`expected: ${expectedLines[firstDiff] ?? '<EOF>'}`);
    console.error(`actual:   ${actualLines[firstDiff] ?? '<EOF>'}`);

    throw new Error('MMDemo MetaModule coverage file is stale; rebuild with build-coverage.mjs');
  }
  console.log('OK: MetaModule coverage file matches current catalog/graph/company sources');
} else {
  await fs.writeFile(output, json);
  console.log('WROTE', output.pathname);
}
