import {
  createHttpDwhAdapter,
  loadMetaModuleCatalog,
} from '../lib/webengine/webengine.js';

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const statusEl = $('#runtime-status');
$('#route-label').textContent = location.pathname;

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function euro(value) {
  return new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function percent(value) {
  return new Intl.NumberFormat('fi-FI', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const catalogAdapter = createHttpDwhAdapter({
  endpoint: '../app/dwh/api/project.php',
});

function flattenGroupMembers(group) {
  if (Array.isArray(group.members)) return group.members;
  return Object.entries(group.members ?? {}).flatMap(([bucket, members]) =>
    members.map((member) => ({ bucket, member }))
  );
}

function renderGroup(group) {
  const members = flattenGroupMembers(group);
  const chips = members.map((entry) => {
    if (typeof entry === 'string') return `<span class="chip">${esc(entry)}</span>`;
    const member = entry.member;
    if (typeof member === 'string') return `<span class="chip" title="${esc(entry.bucket)}">${esc(member)}</span>`;
    return `<span class="chip" title="${esc(entry.bucket)}">UNRESOLVED · ${esc(member.gap_id)}</span>`;
  }).join('');

  return `
    <article class="card searchable" data-search="${esc(group.label + ' ' + members.map(x => typeof x === 'string' ? x : typeof x.member === 'string' ? x.member : x.member.gap_id).join(' '))}">
      <h3>${esc(group.label)}</h3>
      <div class="meta">${esc(group.kind)} · ${group.member_count} members · ${esc(group.event_status)}</div>
      <div class="meta">identity: ${esc(group.status)}</div>
      <div class="chips">${chips || '<span class="meta">Exact current member identities unresolved.</span>'}</div>
    </article>`;
}

function renderFamily(family) {
  return `
    <article class="card searchable" data-search="${esc(family.label + ' ' + family.members.join(' '))}">
      <h3>${esc(family.label)}</h3>
      <div class="meta">${family.member_count} members · ${esc(family.status)}</div>
      <div class="chips">${family.members.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
    </article>`;
}

function renderMonthlyRows(monthly) {
  return monthly.map(m => `
    <tr>
      <td>${esc(m.month)}</td>
      <td>${euro(m.sales_net)}</td>
      <td>${euro(m.gross_margin)}</td>
      <td>${m.sales_orders}</td>
      <td>${m.shipments}</td>
      <td>${m.service_projects}</td>
      <td>${euro(m.ending_inventory_value)}</td>
    </tr>
  `).join('');
}

function flowNodes(flow) {
  return Object.entries(flow).map(([kind, record], i, all) => {
    const node = `<div class="flow-node"><strong>${esc(kind)}</strong><br><code>${esc(record.id)}</code><br><span class="meta">${esc(record.status ?? '')}</span></div>`;
    return node + (i < all.length - 1 ? '<span class="flow-arrow">→</span>' : '');
  }).join('');
}

function renderStrategy(strategy, computed) {
  return `
    <div class="kpis">
      <div class="kpi"><strong>${euro(computed.sales)}</strong><span>Q3 sales from monthly operational data</span></div>
      <div class="kpi"><strong>${euro(computed.margin)}</strong><span>Q3 gross margin from monthly operational data</span></div>
      <div class="kpi"><strong>${percent(computed.margin / computed.sales)}</strong><span>Computed gross margin %</span></div>
      <div class="kpi"><strong>${euro(computed.inventory)}</strong><span>September ending inventory</span></div>
    </div>
    <h3>Demo objectives</h3>
    <div class="grid">
      ${strategy.objectives.map(x => `<article class="card"><strong>${esc(x.name)}</strong><div class="meta"><code>${esc(x.id)}</code></div><div class="meta">target: ${esc(x.target)}</div></article>`).join('')}
    </div>
    <h3>Capital cases</h3>
    <div class="grid">
      ${strategy.capital_cases.map(x => `<article class="card"><strong>${esc(x.name)}</strong><div class="meta">${euro(x.requested)} · ${esc(x.status)} · ${esc(x.decision_date)}</div><code>${esc(x.id)}</code></article>`).join('')}
    </div>
    <h3>Technology radar</h3>
    <div class="chips">
      ${strategy.technology_radar.map(x => `<span class="chip">${esc(x.name)} · ${esc(x.ring)}</span>`).join('')}
    </div>
  `;
}

function installSearch() {
  const input = $('#catalog-search');
  input?.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('.searchable').forEach(el => {
      el.hidden = q && !el.dataset.search.toLowerCase().includes(q);
    });
  });
}

async function main() {
  try {
    const [catalogEnvelope, company] = await Promise.all([
      loadMetaModuleCatalog(catalogAdapter, { surface: 'mmdemo' }),
      fetchJson('./data/company-q3-2026.json'),
    ]);
    const catalog = catalogEnvelope.data;
    const computed = {
      sales: company.monthly.reduce((sum, x) => sum + x.sales_net, 0),
      margin: company.monthly.reduce((sum, x) => sum + x.gross_margin, 0),
      inventory: company.monthly.at(-1).ending_inventory_value,
    };

    app.innerHTML = `
      <section id="overview" class="panel">
        <h2>Overview</h2>
        <p>This surface is a non-authoritative browser over canonical MetaModule catalog projections plus isolated <code>mmdemo.*</code> company data.</p>
        <div class="kpis">
          <div class="kpi"><strong>${company.company.employees}</strong><span>employees</span></div>
          <div class="kpi"><strong>${company.customers.length}</strong><span>customers</span></div>
          <div class="kpi"><strong>${company.suppliers.length}</strong><span>suppliers</span></div>
          <div class="kpi"><strong>${company.catalog.length}</strong><span>catalog items/services</span></div>
          <div class="kpi"><strong>${euro(computed.sales)}</strong><span>Q3 sales</span></div>
        </div>
      </section>

      <section id="groups" class="panel">
        <h2>Composition groups</h2>
        <p class="warn">BusinessSuite, Strategy and Everyday are grouping abstractions. They are not Event owners.</p>
        <input id="catalog-search" class="search" type="search" placeholder="Filter modules and display names…">
        <div class="grid">${catalog.groups.map(renderGroup).join('')}</div>
      </section>

      <section id="universals" class="panel">
        <h2>Universal MetaModules</h2>
        <div class="grid">${catalog.families.map(renderFamily).join('')}</div>
      </section>

      <section id="operations" class="panel">
        <h2>Q3/2026 operations</h2>
        <table>
          <thead><tr><th>Month</th><th>Sales</th><th>Gross margin</th><th>Orders</th><th>Shipments</th><th>Service projects</th><th>Ending inventory</th></tr></thead>
          <tbody>${renderMonthlyRows(company.monthly)}</tbody>
        </table>
      </section>

      <section id="flows" class="panel">
        <h2>Traversable demo flows</h2>
        <h3>Commercial</h3><div class="flow">${flowNodes(company.sampleCommercialFlow)}</div>
        <h3>Supply</h3><div class="flow">${flowNodes(company.sampleSupplyFlow)}</div>
        <h3>Service</h3><div class="flow">${flowNodes(company.sampleServiceFlow)}</div>
      </section>

      <section id="strategy" class="panel">
        <h2>Strategy projections</h2>
        <p class="warn">Strategy demo labels are projections over the same operational data. They do not mint unresolved canonical member IDs.</p>
        ${renderStrategy(company.strategy, computed)}
      </section>

      <section id="gaps" class="panel">
        <h2>Coverage gaps</h2>
        <div class="grid">
          ${catalog.gaps.map(g => `<article class="card"><h3>${esc(g.id)}</h3><div class="meta">${esc(g.severity)} · ${esc(g.status)}</div><p><strong>Known:</strong> ${esc(g.known)}</p><p><strong>Unknown:</strong> ${esc(g.unknown)}</p><p class="warn">${esc(g.rule)}</p></article>`).join('')}
        </div>
      </section>
    `;

    installSearch();
    statusEl.textContent = 'ready';
    statusEl.className = 'status ready';
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'error';
    statusEl.className = 'status error';
    app.innerHTML = `<section class="panel"><h2>MMDemo failed closed</h2><pre class="error-box">${esc(error?.stack ?? error)}</pre></section>`;
  }
}

main();
