/**
 * Self-contained HTML dashboard template.
 * Inline CSS + JS, no external assets.
 * Auto-refreshes every 10s via fetch().
 * When schemasEnabled is true, adds an "API Docs" tab with Swagger-like schema rendering.
 */
export function buildHtmlDashboard(mountPath: string, schemasEnabled = false): string {
  const metricsUrl = `${mountPath}/metrics`;
  const resetUrl = `${mountPath}/reset`;
  const schemasUrl = `${mountPath}/schemas`;

  const schemaCss = schemasEnabled ? `
  .nav-bar { display: flex; gap: 2px; margin-bottom: 24px; background: #1e293b; border-radius: 8px; padding: 4px; width: fit-content; }
  .nav-btn { background: transparent; border: none; color: #94a3b8; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.15s; }
  .nav-btn:hover { color: #e2e8f0; }
  .nav-btn.active { background: #3b82f6; color: #fff; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  /* Swagger-like schema styles */
  .schema-header-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .schema-title { font-size: 1.25rem; color: #f8fafc; font-weight: 700; }
  .schema-count { color: #64748b; font-size: 0.8rem; }
  .schema-search { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; padding: 8px 14px; border-radius: 6px; font-size: 0.8rem; width: 260px; outline: none; transition: border-color 0.15s; }
  .schema-search:focus { border-color: #3b82f6; }
  .schema-search::placeholder { color: #475569; }

  .schema-group { margin-bottom: 16px; }
  .schema-group-header { display: flex; align-items: center; gap: 8px; padding: 10px 0; cursor: pointer; user-select: none; }
  .schema-group-header:hover .schema-group-title { color: #f8fafc; }
  .schema-group-chevron { color: #475569; font-size: 0.6rem; transition: transform 0.2s; display: inline-block; }
  .schema-group.open .schema-group-chevron { transform: rotate(90deg); }
  .schema-group-title { color: #94a3b8; font-size: 0.85rem; font-weight: 600; font-family: 'SF Mono', 'Fira Code', monospace; }
  .schema-group-badge { color: #64748b; font-size: 0.7rem; background: #1e293b; padding: 2px 8px; border-radius: 10px; }
  .schema-group-items { display: none; padding-left: 0; }
  .schema-group.open .schema-group-items { display: flex; flex-direction: column; gap: 4px; }

  .schema-endpoint { border: 1px solid #334155; border-radius: 8px; overflow: hidden; transition: border-color 0.15s; }
  .schema-endpoint.open { border-color: #475569; }
  .schema-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; user-select: none; transition: background 0.15s; }
  .schema-row:hover { background: rgba(255,255,255,0.02); }

  .schema-method { font-weight: 700; font-size: 0.7rem; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; min-width: 65px; text-align: center; letter-spacing: 0.03em; }
  .schema-method-GET { background: #065f46; color: #6ee7b7; }
  .schema-method-POST { background: #1e3a5f; color: #93c5fd; }
  .schema-method-PUT { background: #713f12; color: #fcd34d; }
  .schema-method-PATCH { background: #581c87; color: #d8b4fe; }
  .schema-method-DELETE { background: #7f1d1d; color: #fca5a5; }
  .schema-method-OPTIONS { background: #1e293b; color: #94a3b8; }
  .schema-method-HEAD { background: #1e293b; color: #94a3b8; }

  .schema-path { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.85rem; color: #e2e8f0; flex: 1; }
  .schema-path .param { color: #f59e0b; }
  .schema-samples { color: #64748b; font-size: 0.7rem; white-space: nowrap; }
  .schema-chevron { color: #475569; font-size: 0.6rem; transition: transform 0.2s; display: inline-block; }
  .schema-endpoint.open .schema-chevron { transform: rotate(90deg); }

  .schema-detail { display: none; border-top: 1px solid #334155; background: #0c1629; }
  .schema-endpoint.open .schema-detail { display: block; }
  .schema-detail-inner { padding: 20px; }

  .schema-params { margin-bottom: 20px; }
  .schema-params-title { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 10px; }
  .schema-param-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #1e293b; font-size: 0.8rem; }
  .schema-param-name { color: #e2e8f0; font-family: 'SF Mono', 'Fira Code', monospace; font-weight: 600; }
  .schema-param-in { color: #64748b; font-size: 0.7rem; font-style: italic; }
  .schema-param-type { color: #34d399; font-size: 0.75rem; }
  .schema-param-required { color: #f87171; font-size: 0.65rem; font-weight: 600; }

  .schema-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .schema-sections { grid-template-columns: 1fr; } }
  .schema-section { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; }
  .schema-section-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #0c1322; border-bottom: 1px solid #1e293b; }
  .schema-section-title { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .schema-section-badge { font-size: 0.65rem; color: #64748b; background: #1e293b; padding: 2px 8px; border-radius: 10px; }
  .schema-pre { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 0.78rem; line-height: 1.8; padding: 14px; margin: 0; overflow-x: auto; color: #e2e8f0; background: transparent; border: none; white-space: pre; }
  .schema-pre .sk { color: #93c5fd; }
  .schema-pre .st { color: #34d399; }
  .schema-pre .so { color: #f97316; font-size: 0.65rem; font-weight: 600; padding: 1px 5px; background: rgba(249,115,22,0.1); border-radius: 3px; }
  .schema-pre .sr { color: #f87171; font-size: 0.65rem; font-weight: 600; padding: 1px 5px; background: rgba(248,113,113,0.1); border-radius: 3px; }
  .schema-pre .sb { color: #94a3b8; }
  .schema-pre .sc { color: #475569; }
  .schema-none { color: #64748b; font-size: 0.8rem; font-style: italic; padding: 24px 14px; text-align: center; }

  .schema-list-empty { text-align: center; padding: 60px 20px; color: #64748b; }
  .schema-list-empty-icon { font-size: 2rem; margin-bottom: 12px; opacity: 0.4; }
  .schema-list-empty-text { font-size: 0.9rem; }
  .schema-list-empty-hint { font-size: 0.75rem; margin-top: 6px; color: #475569; }` : '';

  const navBarHtml = schemasEnabled ? `
<div class="nav-bar">
  <button class="nav-btn active" onclick="switchTab('metrics')">Metrics</button>
  <button class="nav-btn" onclick="switchTab('schemas')">API Docs</button>
</div>` : '';

  const schemaPanelHtml = schemasEnabled
    ? `<div id="panel-schemas" class="tab-panel">
  <div class="schema-header-bar">
    <div><span class="schema-title">API Documentation</span><span class="schema-count" id="schema-count"></span></div>
    <input type="text" class="schema-search" id="schema-search" placeholder="Filter endpoints..." oninput="filterSchemas(this.value)">
  </div>
  <div id="schema-list"></div>
</div>`
    : '';

  const schemaJs = schemasEnabled ? `
var schemasUrl = '${schemasUrl}';
var schemaListEl = document.getElementById('schema-list');
var schemaCountEl = document.getElementById('schema-count');
var allSchemaEndpoints = [];

function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach(function(b) {
    b.classList.toggle('active', b.textContent.trim() === (tab === 'metrics' ? 'Metrics' : 'API Docs'));
  });
  document.getElementById('panel-metrics').classList.toggle('active', tab === 'metrics');
  document.getElementById('panel-schemas').classList.toggle('active', tab === 'schemas');
  if (tab === 'schemas') loadSchemas();
}

function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function highlightParams(pattern) {
  return esc(pattern).replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="param">:$1</span>');
}

function extractParams(pattern) {
  var matches = pattern.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  if (!matches) return [];
  return matches.map(function(m) { return m.slice(1); });
}

function renderField(field, indent) {
  if (!field) return '';
  indent = indent || 0;
  var pad = '  '.repeat(indent);
  var nextPad = '  '.repeat(indent + 1);

  if (field.type.includes('object') && field.properties) {
    var keys = Object.keys(field.properties);
    if (keys.length === 0) return '<span class="sb">{}</span>';
    var lines = ['<span class="sb">{</span>'];
    keys.forEach(function(k, idx) {
      var f = field.properties[k];
      var reqMark = f.required === false ? ' <span class="so">optional</span>' : ' <span class="sr">required</span>';
      var valStr;
      if ((f.type.includes('object') && f.properties) || (f.type.includes('array') && f.items)) {
        valStr = renderField(f, indent + 1);
      } else {
        valStr = '<span class="st">' + esc(f.type) + '</span>';
      }
      var comma = idx < keys.length - 1 ? '<span class="sc">,</span>' : '';
      lines.push(nextPad + '<span class="sk">' + esc(k) + '</span>' + reqMark + '<span class="sc">:</span> ' + valStr + comma);
    });
    lines.push(pad + '<span class="sb">}</span>');
    return lines.join('\\n');
  }

  if (field.type.includes('array')) {
    if (field.items) {
      var inner = renderField(field.items, indent + 1);
      return '<span class="sb">[</span>\\n' + nextPad + inner + '\\n' + pad + '<span class="sb">]</span>';
    }
    return '<span class="st">array</span>';
  }

  return '<span class="st">' + esc(field.type) + '</span>';
}

function toggleEndpoint(el) {
  el.closest('.schema-endpoint').classList.toggle('open');
}

function toggleGroup(el) {
  el.closest('.schema-group').classList.toggle('open');
}

function groupEndpoints(endpoints) {
  var groups = {};
  var order = [];
  endpoints.forEach(function(e) {
    var parts = e.pattern.split('/').filter(Boolean);
    var prefix = '/' + (parts.length > 1 ? parts.slice(0, 2).join('/') : (parts[0] || ''));
    if (!groups[prefix]) { groups[prefix] = []; order.push(prefix); }
    groups[prefix].push(e);
  });
  // Sort endpoints within each group: method order then path
  var methodOrder = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4, OPTIONS: 5, HEAD: 6 };
  order.forEach(function(prefix) {
    groups[prefix].sort(function(a, b) {
      var pa = a.pattern.localeCompare(b.pattern);
      if (pa !== 0) return pa;
      return (methodOrder[a.method] || 99) - (methodOrder[b.method] || 99);
    });
  });
  return { groups: groups, order: order };
}

function renderEndpoints(endpoints) {
  if (endpoints.length === 0) {
    schemaListEl.innerHTML = '<div class="schema-list-empty">' +
      '<div class="schema-list-empty-icon">&#128203;</div>' +
      '<div class="schema-list-empty-text">No schemas captured yet</div>' +
      '<div class="schema-list-empty-hint">Send some API requests to start capturing schemas</div>' +
    '</div>';
    schemaCountEl.textContent = '';
    return;
  }

  schemaCountEl.textContent = ' \\u00b7 ' + endpoints.length + ' endpoints';
  var grouped = groupEndpoints(endpoints);
  var html = '';

  grouped.order.forEach(function(prefix) {
    var eps = grouped.groups[prefix];
    html += '<div class="schema-group open">' +
      '<div class="schema-group-header" onclick="toggleGroup(this)">' +
        '<span class="schema-group-chevron">&#9654;</span>' +
        '<span class="schema-group-title">' + esc(prefix) + '</span>' +
        '<span class="schema-group-badge">' + eps.length + '</span>' +
      '</div>' +
      '<div class="schema-group-items">';

    eps.forEach(function(e) {
      var params = extractParams(e.pattern);
      var paramsHtml = '';
      if (params.length > 0) {
        paramsHtml = '<div class="schema-params">' +
          '<div class="schema-params-title">Path Parameters</div>' +
          params.map(function(p) {
            return '<div class="schema-param-row">' +
              '<span class="schema-param-name">' + esc(p) + '</span>' +
              '<span class="schema-param-in">path</span>' +
              '<span class="schema-param-type">string</span>' +
              '<span class="schema-param-required">required</span>' +
            '</div>';
          }).join('') +
        '</div>';
      }

      var reqHtml = e.requestBody
        ? '<pre class="schema-pre">' + renderField(e.requestBody, 0) + '</pre>'
        : '<div class="schema-none">No request body</div>';
      var resHtml = e.responseBody
        ? '<pre class="schema-pre">' + renderField(e.responseBody, 0) + '</pre>'
        : '<div class="schema-none">No response body captured</div>';

      html += '<div class="schema-endpoint">' +
        '<div class="schema-row" onclick="toggleEndpoint(this)">' +
          '<span class="schema-chevron">&#9654;</span>' +
          '<span class="schema-method schema-method-' + e.method + '">' + e.method + '</span>' +
          '<span class="schema-path">' + highlightParams(e.pattern) + '</span>' +
          '<span class="schema-samples">' + e.requestSampleCount + ' req \\u00b7 ' + e.responseSampleCount + ' res</span>' +
        '</div>' +
        '<div class="schema-detail"><div class="schema-detail-inner">' +
          paramsHtml +
          '<div class="schema-sections">' +
            '<div class="schema-section">' +
              '<div class="schema-section-header"><span class="schema-section-title">Request Body</span><span class="schema-section-badge">' + e.requestSampleCount + ' samples</span></div>' +
              reqHtml +
            '</div>' +
            '<div class="schema-section">' +
              '<div class="schema-section-header"><span class="schema-section-title">Response Body</span><span class="schema-section-badge">' + e.responseSampleCount + ' samples</span></div>' +
              resHtml +
            '</div>' +
          '</div>' +
        '</div></div>' +
      '</div>';
    });

    html += '</div></div>';
  });

  schemaListEl.innerHTML = html;
}

function filterSchemas(query) {
  if (!query) {
    renderEndpoints(allSchemaEndpoints);
    return;
  }
  var q = query.toLowerCase();
  var filtered = allSchemaEndpoints.filter(function(e) {
    return e.pattern.toLowerCase().includes(q) || e.method.toLowerCase().includes(q);
  });
  renderEndpoints(filtered);
}

async function loadSchemas() {
  try {
    var res = await fetch(schemasUrl);
    var data = await res.json();
    allSchemaEndpoints = data.endpoints || [];
    renderEndpoints(allSchemaEndpoints);
  } catch (err) {
    schemaListEl.innerHTML = '<div class="schema-list-empty">Error loading schemas: ' + esc(err.message) + '</div>';
  }
}
` : '';

  // Wrap existing content in a panel div when tabs are enabled
  const metricsOpenTag = schemasEnabled ? '<div id="panel-metrics" class="tab-panel active">' : '';
  const metricsCloseTag = schemasEnabled ? '</div>' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Observatory</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
  h1 { font-size: 1.5rem; margin-bottom: 8px; color: #f8fafc; }
  .subtitle { color: #94a3b8; margin-bottom: 20px; font-size: 0.875rem; }
  .controls { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
  .controls button { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
  .controls button:hover { background: #334155; }
  .controls .status { color: #64748b; font-size: 0.75rem; margin-left: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th { background: #1e293b; color: #94a3b8; text-align: left; padding: 10px 12px; font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; border-bottom: 1px solid #334155; }
  td { padding: 10px 12px; border-bottom: 1px solid #1e293b; }
  tr:hover { background: #1e293b; }
  .method { font-weight: 700; font-size: 0.7rem; padding: 2px 6px; border-radius: 3px; }
  .method-GET { color: #34d399; }
  .method-POST { color: #60a5fa; }
  .method-PUT { color: #fbbf24; }
  .method-PATCH { color: #c084fc; }
  .method-DELETE { color: #f87171; }
  .lat-green { color: #34d399; }
  .lat-yellow { color: #fbbf24; }
  .lat-red { color: #f87171; }
  .err-green { color: #34d399; }
  .err-yellow { color: #fbbf24; }
  .err-red { color: #f87171; }
  .mono { font-family: 'SF Mono', 'Fira Code', monospace; }
  .right { text-align: right; }
  .empty { text-align: center; padding: 40px; color: #64748b; }${schemaCss}
</style>
</head>
<body>
<h1>API Observatory</h1>
<p class="subtitle">Real-time API traffic metrics &amp; latency percentiles</p>${navBarHtml}
<div class="controls">
  <button onclick="refresh()">Refresh</button>
  <button onclick="resetMetrics()">Reset</button>
  <span class="status" id="status">Loading...</span>
</div>
${metricsOpenTag}<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Pattern</th>
      <th class="right">Count</th>
      <th class="right">p50</th>
      <th class="right">p95</th>
      <th class="right">p99</th>
      <th class="right">Avg</th>
      <th class="right">Err%</th>
      <th class="right">Req/s</th>
    </tr>
  </thead>
  <tbody id="tbody"></tbody>
</table>${metricsCloseTag}
${schemaPanelHtml}
<script>
var metricsUrl = '${metricsUrl}';
var resetUrl = '${resetUrl}';
var tbody = document.getElementById('tbody');
var status = document.getElementById('status');

function latClass(ms) { return ms < 100 ? 'lat-green' : ms < 500 ? 'lat-yellow' : 'lat-red'; }
function errClass(rate) { return rate < 0.01 ? 'err-green' : rate < 0.05 ? 'err-yellow' : 'err-red'; }
function fmt(n) { return typeof n === 'number' ? n.toFixed(1) : '0'; }
function fmtPct(n) { return typeof n === 'number' ? (n * 100).toFixed(1) + '%' : '0%'; }

async function refresh() {
  try {
    var res = await fetch(metricsUrl);
    var data = await res.json();
    var eps = data.endpoints || [];
    if (eps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty">No metrics recorded yet</td></tr>';
    } else {
      tbody.innerHTML = eps.map(function(e) { return '<tr>' +
        '<td><span class="method method-' + e.method + '">' + e.method + '</span></td>' +
        '<td class="mono">' + e.pattern + '</td>' +
        '<td class="right">' + e.count + '</td>' +
        '<td class="right mono ' + latClass(e.latency.p50) + '">' + fmt(e.latency.p50) + '</td>' +
        '<td class="right mono ' + latClass(e.latency.p95) + '">' + fmt(e.latency.p95) + '</td>' +
        '<td class="right mono ' + latClass(e.latency.p99) + '">' + fmt(e.latency.p99) + '</td>' +
        '<td class="right mono">' + fmt(e.latency.avg) + '</td>' +
        '<td class="right ' + errClass(e.errorRate.total) + '">' + fmtPct(e.errorRate.total) + '</td>' +
        '<td class="right">' + fmt(e.throughput) + '</td>' +
      '</tr>'; }).join('');
    }
    status.textContent = 'Updated ' + new Date().toLocaleTimeString() + ' \\u00b7 ' + eps.length + ' endpoints';
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
}

async function resetMetrics() {
  if (!confirm('Reset all metrics and schemas?')) return;
  await fetch(resetUrl, { method: 'POST' });
  refresh();
}
${schemaJs}
refresh();
setInterval(refresh, 10000);
</script>
</body>
</html>`;
}
