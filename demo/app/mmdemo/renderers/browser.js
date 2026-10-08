import {
  loadMetaModuleCatalog,
  resolveInstancePath,
} from '../../../lib/webengine/webengine.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function euro(value) {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value) {
  return new Intl.NumberFormat('fi-FI', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  return response.json();
}

function flattenGroupMembers(group) {
  if (Array.isArray(group.members)) return group.members;

  return Object.entries(group.members ?? {}).flatMap(([bucket, members]) =>
    members.map(member => ({ bucket, member }))
  );
}

function renderGroup(group) {
  const members = flattenGroupMembers(group);

  const chips = members.map(entry => {
    if (typeof entry === 'string') {
      return `<span class="chip">${esc(entry)}</span>`;
    }

    const member = entry.member;
    if (typeof member === 'string') {
      return `<span class="chip" title="${esc(entry.bucket)}">${esc(member)}</span>`;
    }

    return `<span class="chip" title="${esc(entry.bucket)}">UNRESOLVED · ${esc(member.gap_id)}</span>`;
  }).join('');

  const search = group.label + ' ' + members.map(entry => {
    if (typeof entry === 'string') return entry;
    if (typeof entry.member === 'string') return entry.member;
    return entry.member.gap_id;
  }).join(' ');

  return `
    <article class="card searchable" data-search="${esc(search)}">
      <h3>${esc(group.label)}</h3>
      <div class="meta">${esc(group.kind)} · ${group.member_count} members · ${esc(group.event_status)}</div>
      <div class="meta">identity: ${esc(group.status)}</div>
      <div class="chips">${chips || '<span class="meta">Exact current member identities unresolved.</span>'}</div>
    </article>
  `;
}

function renderFamily(family) {
  return `
    <article class="card searchable" data-search="${esc(family.label + ' ' + family.members.join(' '))}">
      <h3>${esc(family.label)}</h3>
      <div class="meta">${family.member_count} members · ${esc(family.status)}</div>
      <div class="chips">${family.members.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
    </article>
  `;
}

function renderMonthlyRows(monthly) {
  return monthly.map(month => `
    <tr>
      <td>${esc(month.month)}</td>
      <td>${euro(month.sales_net)}</td>
      <td>${euro(month.gross_margin)}</td>
      <td>${month.sales_orders}</td>
      <td>${month.shipments}</td>
      <td>${month.service_projects}</td>
      <td>${euro(month.ending_inventory_value)}</td>
    </tr>
  `).join('');
}

function flowNodes(flow) {
  return Object.entries(flow).map(([kind, record], index, all) => {
    const node = `
      <div class="flow-node">
        <strong>${esc(kind)}</strong><br>
        <code>${esc(record.id)}</code><br>
        <span class="meta">${esc(record.status ?? '')}</span>
      </div>
    `;

    return node + (index < all.length - 1 ? '<span class="flow-arrow">→</span>' : '');
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
      ${strategy.objectives.map(item => `
        <article class="card">
          <strong>${esc(item.name)}</strong>
          <div class="meta"><code>${esc(item.id)}</code></div>
          <div class="meta">target: ${esc(item.target)}</div>
        </article>
      `).join('')}
    </div>

    <h3>Capital cases</h3>
    <div class="grid">
      ${strategy.capital_cases.map(item => `
        <article class="card">
          <strong>${esc(item.name)}</strong>
          <div class="meta">${euro(item.requested)} · ${esc(item.status)} · ${esc(item.decision_date)}</div>
          <code>${esc(item.id)}</code>
        </article>
      `).join('')}
    </div>

    <h3>Technology radar</h3>
    <div class="chips">
      ${strategy.technology_radar.map(item => `<span class="chip">${esc(item.name)} · ${esc(item.ring)}</span>`).join('')}
    </div>
  `;
}

export async function mount(target, projection, context) {
  if (!context?.dwh) {
    throw new Error('MMDemo browser renderer requires DWH adapter context');
  }

  if (typeof projection?.companyData !== 'string' || !projection.companyData.startsWith('/')) {
    throw new Error('MMDemo browser projector requires logical companyData path');
  }

  const companyPath = resolveInstancePath(projection.companyData);

  const [catalogEnvelope, company] = await Promise.all([
    loadMetaModuleCatalog(context.dwh, {
      surface: projection.surface ?? 'mmdemo',
    }),
    fetchJson(companyPath),
  ]);

  const catalog = catalogEnvelope.data;
  const computed = {
    sales: company.monthly.reduce((sum, item) => sum + item.sales_net, 0),
    margin: company.monthly.reduce((sum, item) => sum + item.gross_margin, 0),
    inventory: company.monthly.at(-1).ending_inventory_value,
  };

  target.classList.add('mmdemo-browser');
  target.innerHTML = `
    <nav class="demo-nav" aria-label="MMDemo sections">
      <a href="#overview">Overview</a>
      <a href="#groups">Composition groups</a>
      <a href="#universals">Universals</a>
      <a href="#operations">Operations</a>
      <a href="#flows">Flows</a>
      <a href="#strategy">Strategy</a>
      <a href="#gaps">Coverage gaps</a>
    </nav>

    <section id="overview" class="panel">
      <h2>Overview</h2>
      <p>
        This renderer consumes canonical DWH projections plus isolated
        <code>mmdemo.*</code> synthetic company data.
      </p>
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
      <input class="search" type="search" placeholder="Filter modules and display names…" aria-label="Filter MetaModules">
      <div class="grid">${catalog.groups.map(renderGroup).join('')}</div>
    </section>

    <section id="universals" class="panel">
      <h2>Universal MetaModules</h2>
      <div class="grid">${catalog.families.map(renderFamily).join('')}</div>
    </section>

    <section id="operations" class="panel">
      <h2>Q3/2026 operations</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Sales</th>
              <th>Gross margin</th>
              <th>Orders</th>
              <th>Shipments</th>
              <th>Service projects</th>
              <th>Ending inventory</th>
            </tr>
          </thead>
          <tbody>${renderMonthlyRows(company.monthly)}</tbody>
        </table>
      </div>
    </section>

    <section id="flows" class="panel">
      <h2>Traversable demo flows</h2>
      <h3>Commercial</h3>
      <div class="flow">${flowNodes(company.sampleCommercialFlow)}</div>
      <h3>Supply</h3>
      <div class="flow">${flowNodes(company.sampleSupplyFlow)}</div>
      <h3>Service</h3>
      <div class="flow">${flowNodes(company.sampleServiceFlow)}</div>
    </section>

    <section id="strategy" class="panel">
      <h2>Strategy projections</h2>
      <p class="warn">
        Strategy demo labels are projections over the same operational data.
        They do not mint unresolved canonical member IDs.
      </p>
      ${renderStrategy(company.strategy, computed)}
    </section>

    <section id="gaps" class="panel">
      <h2>Coverage gaps</h2>
      <div class="grid">
        ${catalog.gaps.map(gap => `
          <article class="card">
            <h3>${esc(gap.id)}</h3>
            <div class="meta">${esc(gap.severity)} · ${esc(gap.status)}</div>
            <p><strong>Known:</strong> ${esc(gap.known)}</p>
            <p><strong>Unknown:</strong> ${esc(gap.unknown)}</p>
            <p class="warn">${esc(gap.rule)}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;

  const search = target.querySelector('.search');
  const handler = () => {
    const query = search.value.trim().toLowerCase();

    target.querySelectorAll('.searchable').forEach(element => {
      element.hidden = Boolean(
        query && !element.dataset.search.toLowerCase().includes(query)
      );
    });
  };

  search.addEventListener('input', handler);

  return {
    state: 'ready',
    destroy() {
      search.removeEventListener('input', handler);
    },
  };
}
