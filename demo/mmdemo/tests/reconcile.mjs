import fs from 'node:fs/promises';

const company = JSON.parse(
  await fs.readFile(new URL('../data/company-q3-2026.json', import.meta.url), 'utf8')
);
const graph = JSON.parse(
  await fs.readFile(new URL('../data/relation-graph-q3-2026.json', import.meta.url), 'utf8')
);

function fail(message) {
  throw new Error(message);
}

function sum(records, selector) {
  return records.reduce((total, record) => total + selector(record), 0);
}

function byMonth(type, month, predicate = () => true) {
  return graph.entities.filter(entity =>
    entity.type === type &&
    entity.data?.month === month &&
    predicate(entity)
  );
}

if (graph.entity_count !== graph.entities.length) {
  fail('entity_count does not match entities.length');
}
if (graph.relation_count !== graph.relations.length) {
  fail('relation_count does not match relations.length');
}

const ids = new Set();
for (const entity of graph.entities) {
  if (typeof entity.id !== 'string' || !entity.id.startsWith('mmdemo.')) {
    fail(`non-mmdemo entity id: ${entity.id}`);
  }
  if (ids.has(entity.id)) fail(`duplicate entity id: ${entity.id}`);
  ids.add(entity.id);
}

for (const relation of graph.relations) {
  if (!ids.has(relation.source)) fail(`relation source missing: ${relation.source}`);
  if (!ids.has(relation.target)) fail(`relation target missing: ${relation.target}`);
  if (typeof relation.relation !== 'string' || !relation.relation.startsWith('mmdemo.rel.')) {
    fail(`invalid demo relation id: ${relation.relation}`);
  }
}

const opening = graph.entities.find(entity =>
  entity.id === 'mmdemo.measurement.inventory.2026-06'
)?.data?.value;

if (!Number.isFinite(opening)) fail('opening inventory measurement missing');

let runningInventory = opening;

for (const month of company.monthly) {
  const key = month.month;

  const opportunities = byMonth('Opportunity', key);
  const openedOpportunities = opportunities.filter(entity => entity.data.opened != null);
  const quotes = byMonth('Quote', key);
  const salesOrders = byMonth('Order', key, entity => entity.data.kind === 'sales');
  const purchaseOrders = byMonth('Order', key, entity => entity.data.kind === 'purchase');
  const shipments = byMonth('Shipment', key);
  const customerInvoices = byMonth('Invoice', key, entity => entity.data.direction === 'out');
  const supplierInvoices = byMonth('Invoice', key, entity => entity.data.direction === 'in');
  const customerCases = byMonth('Case', key, entity => entity.data.kind === 'customer_service');
  const rmas = byMonth('Case', key, entity => entity.data.kind === 'rma');
  const serviceProjects = byMonth('Project', key, entity => entity.data.kind === 'field_service');
  const assemblyProjects = byMonth('Project', key, entity => entity.data.kind === 'assembly');
  const cashIn = byMonth('Settlement', key, entity => entity.data.direction === 'in');
  const cashOut = byMonth('Settlement', key, entity => entity.data.direction === 'out');
  const time = byMonth('Measurement', key, entity => entity.data.kind === 'employee_hours');
  const payroll = byMonth('BalanceTransaction', key, entity => entity.data.kind === 'payroll_gross');
  const stock = byMonth('StockMovement', key);

  const checks = [
    ['leads', opportunities.length, month.leads],
    ['opportunities_opened', openedOpportunities.length, month.opportunities_opened],
    ['quotes', quotes.length, month.quotes],
    ['sales_orders', salesOrders.length, month.sales_orders],
    ['purchase_orders', purchaseOrders.length, month.purchase_orders],
    ['shipments', shipments.length, month.shipments],
    ['invoices_out', customerInvoices.length, month.invoices_out],
    ['invoices_in', supplierInvoices.length, month.invoices_in],
    ['customer_cases', customerCases.length, month.customer_cases],
    ['rmas', rmas.length, month.rmas],
    ['service_projects', serviceProjects.length, month.service_projects],
    ['assembly_projects', assemblyProjects.length, month.assembly_projects],
    ['sales_net', sum(salesOrders, entity => entity.data.net), month.sales_net],
    ['cogs', sum(salesOrders, entity => entity.data.cogs), month.cogs],
    ['gross_margin',
      sum(salesOrders, entity => entity.data.net - entity.data.cogs),
      month.gross_margin
    ],
    ['purchases_net', sum(purchaseOrders, entity => entity.data.net), month.purchases_net],
    ['cash_in', sum(cashIn, entity => entity.data.amount), month.cash_in],
    ['cash_out', sum(cashOut, entity => entity.data.amount), month.cash_out],
    ['employee_hours', sum(time, entity => entity.data.value), month.employee_hours],
    ['payroll_gross', sum(payroll, entity => entity.data.amount), month.payroll_gross],
  ];

  for (const [name, actual, expected] of checks) {
    if (actual !== expected) {
      fail(`${key} ${name}: graph=${actual} summary=${expected}`);
    }
  }

  runningInventory += sum(stock, entity => entity.data.value);

  if (runningInventory !== month.ending_inventory_value) {
    fail(
      `${key} inventory bridge: graph=${runningInventory} summary=${month.ending_inventory_value}`
    );
  }

  const valuation = graph.entities.find(entity =>
    entity.id === `mmdemo.measurement.inventory.${key.replace('-', '')}`
  )?.data?.value;

  if (valuation !== month.ending_inventory_value) {
    fail(`${key} inventory measurement mismatch`);
  }
}

const q3Sales = sum(
  graph.entities.filter(entity =>
    entity.type === 'Order' && entity.data?.kind === 'sales'
  ),
  entity => entity.data.net
);

const q3Margin = sum(
  graph.entities.filter(entity =>
    entity.type === 'Order' && entity.data?.kind === 'sales'
  ),
  entity => entity.data.net - entity.data.cogs
);

if (q3Sales !== company.strategy.measurements.q3_sales_net) {
  fail('strategy q3_sales_net does not reconcile to graph');
}
if (q3Margin !== company.strategy.measurements.q3_gross_margin) {
  fail('strategy q3_gross_margin does not reconcile to graph');
}

console.log(
  `OK: ${graph.entities.length} entities, ${graph.relations.length} relations, Q3 sales ${q3Sales}`
);
