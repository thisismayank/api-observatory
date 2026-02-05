/**
 * Self-contained HTML dashboard template.
 * Inline CSS + JS, no external assets.
 * Auto-refreshes every 10s via fetch().
 *
 * Tabs:
 *  - Metrics (always)
 *  - API Docs (when schemasEnabled)
 *  - Guide (always — Q&A about metrics and API optimisation)
 */
export function buildHtmlDashboard(mountPath: string, schemasEnabled = false): string {
  const metricsUrl = `${mountPath}/metrics`;
  const resetUrl = `${mountPath}/reset`;
  const schemasUrl = `${mountPath}/schemas`;

  // --- Tab names for nav ---
  const tabs: Array<{ id: string; label: string }> = [
    { id: 'metrics', label: 'Metrics' },
  ];
  if (schemasEnabled) tabs.push({ id: 'schemas', label: 'API Docs' });
  tabs.push({ id: 'guide', label: 'Guide' });

  const tabLabelsJson = JSON.stringify(tabs);

  // --- CSS ---
  const schemaCss = schemasEnabled ? `
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

  // --- Schema panel HTML ---
  const schemaPanelHtml = schemasEnabled
    ? `<div id="panel-schemas" class="tab-panel">
  <div class="schema-header-bar">
    <div><span class="schema-title">API Documentation</span><span class="schema-count" id="schema-count"></span></div>
    <input type="text" class="schema-search" id="schema-search" placeholder="Filter endpoints..." oninput="filterSchemas(this.value)">
  </div>
  <div id="schema-list"></div>
</div>`
    : '';

  // --- Schema JS ---
  const schemaJs = schemasEnabled ? `
var schemasUrl = '${schemasUrl}';
var schemaListEl = document.getElementById('schema-list');
var schemaCountEl = document.getElementById('schema-count');
var allSchemaEndpoints = [];

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

  // --- Nav bar buttons ---
  const navButtons = tabs.map((t, i) =>
    `<button class="nav-btn${i === 0 ? ' active' : ''}" data-tab="${t.id}" onclick="switchTab('${t.id}')">${t.label}</button>`
  ).join('\n    ');

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

  /* Nav bar & tabs — always present */
  .nav-bar { display: flex; gap: 2px; margin-bottom: 24px; background: #1e293b; border-radius: 8px; padding: 4px; width: fit-content; }
  .nav-btn { background: transparent; border: none; color: #94a3b8; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.15s; }
  .nav-btn:hover { color: #e2e8f0; }
  .nav-btn.active { background: #3b82f6; color: #fff; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

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
  .empty { text-align: center; padding: 40px; color: #64748b; }

  /* Guide / Q&A styles */
  .guide-header { font-size: 1.25rem; color: #f8fafc; font-weight: 700; margin-bottom: 6px; }
  .guide-subtitle { color: #64748b; font-size: 0.8rem; margin-bottom: 28px; }
  .guide-section { margin-bottom: 32px; }
  .guide-section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #3b82f6; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #1e293b; }
  .qa-item { background: #1e293b; border: 1px solid #334155; border-radius: 8px; margin-bottom: 6px; overflow: hidden; transition: border-color 0.15s; }
  .qa-item.open { border-color: #475569; }
  .qa-q { display: flex; align-items: center; gap: 10px; padding: 14px 16px; cursor: pointer; user-select: none; transition: background 0.15s; }
  .qa-q:hover { background: #243044; }
  .qa-chevron { color: #475569; font-size: 0.6rem; transition: transform 0.2s; display: inline-block; flex-shrink: 0; }
  .qa-item.open .qa-chevron { transform: rotate(90deg); }
  .qa-q-text { color: #e2e8f0; font-size: 0.88rem; font-weight: 600; }
  .qa-a { display: none; padding: 0 16px 16px 42px; }
  .qa-item.open .qa-a { display: block; }
  .qa-a p { color: #94a3b8; font-size: 0.82rem; line-height: 1.7; margin-bottom: 10px; }
  .qa-a p:last-child { margin-bottom: 0; }
  .qa-a code { background: #0f172a; color: #93c5fd; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.78rem; }
  .qa-a ul { color: #94a3b8; font-size: 0.82rem; line-height: 1.7; margin: 0 0 10px 18px; }
  .qa-a li { margin-bottom: 4px; }
  .qa-a strong { color: #e2e8f0; }
  .qa-tip { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 6px; padding: 10px 14px; margin-top: 8px; }
  .qa-tip-label { color: #60a5fa; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .qa-tip p { color: #94a3b8; font-size: 0.78rem; margin-bottom: 0; }
${schemaCss}
</style>
</head>
<body>
<h1>API Observatory</h1>
<p class="subtitle">Real-time API traffic metrics &amp; latency percentiles</p>
<div class="nav-bar">
    ${navButtons}
</div>
<div id="panel-metrics" class="tab-panel active">
  <div class="controls">
    <button onclick="refresh()">Refresh</button>
    <button onclick="resetMetrics()">Reset</button>
    <span class="status" id="status">Loading...</span>
  </div>
  <table>
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
  </table>
</div>
${schemaPanelHtml}
<div id="panel-guide" class="tab-panel">
  <div class="guide-header">Guide</div>
  <div class="guide-subtitle">Understanding your API metrics and how to act on them</div>

  <div class="guide-section">
    <div class="guide-section-title">Understanding the Metrics</div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">What does P50 / P95 / P99 latency mean?</span></div>
      <div class="qa-a">
        <p>Percentile latencies tell you how fast your API responds for a given proportion of requests:</p>
        <ul>
          <li><strong>P50 (median)</strong> &mdash; 50% of requests are faster than this value. This is your &ldquo;typical&rdquo; response time.</li>
          <li><strong>P95</strong> &mdash; 95% of requests are faster. The remaining 5% are slower. This captures the experience of your slower users.</li>
          <li><strong>P99</strong> &mdash; 99% of requests are faster. Only 1 in 100 requests is slower. This is your tail latency and often reveals database lock contention, cold caches, or GC pauses.</li>
        </ul>
        <div class="qa-tip">
          <div class="qa-tip-label">Why it matters</div>
          <p>Averages hide outliers. An endpoint with 50ms average can have a P99 of 2 seconds, meaning 1% of your users experience a 2-second wait. Always monitor P95/P99 alongside averages.</p>
        </div>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">What does the error rate (Err%) represent?</span></div>
      <div class="qa-a">
        <p>The error rate is the percentage of responses with 4xx or 5xx HTTP status codes within the retention window.</p>
        <ul>
          <li><strong>4xx errors</strong> &mdash; Client errors (bad request, not found, unauthorized). Some are expected (404 on missing resources), but a high rate may indicate broken clients or incorrect API usage.</li>
          <li><strong>5xx errors</strong> &mdash; Server errors (internal server error, bad gateway). These always indicate problems &mdash; bugs, crashed dependencies, or resource exhaustion.</li>
        </ul>
        <p>Color coding: <strong style="color:#34d399">&lt;1% green</strong>, <strong style="color:#fbbf24">1-5% yellow</strong>, <strong style="color:#f87171">&gt;5% red</strong>.</p>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">What is throughput (Req/s)?</span></div>
      <div class="qa-a">
        <p>Throughput measures how many requests per second an endpoint receives, calculated over the time span between the oldest and newest recorded request.</p>
        <p>Use it to identify your hottest endpoints. High throughput endpoints deserve the most optimization attention since even small improvements have large aggregate impact.</p>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">What does the latency color coding mean?</span></div>
      <div class="qa-a">
        <p>Latency values are color-coded to help you spot problems at a glance:</p>
        <ul>
          <li><strong style="color:#34d399">Green (&lt;100ms)</strong> &mdash; Fast. Good performance for most API endpoints.</li>
          <li><strong style="color:#fbbf24">Yellow (100-500ms)</strong> &mdash; Moderate. Acceptable for complex queries, but investigate if this is a simple CRUD endpoint.</li>
          <li><strong style="color:#f87171">Red (&gt;500ms)</strong> &mdash; Slow. Users will notice. Prioritize optimization.</li>
        </ul>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">How long is data retained?</span></div>
      <div class="qa-a">
        <p>By default, metrics are retained for <strong>1 hour</strong> (configurable via the <code>retentionMs</code> option). Records older than the retention window are automatically evicted.</p>
        <p>Each endpoint stores up to <strong>10,000 records</strong> (configurable via <code>maxPerEndpoint</code>) in a circular buffer. When full, the oldest record is overwritten.</p>
        <p>All data is in-memory. Restarting the server clears all metrics and schemas.</p>
      </div>
    </div>
  </div>

  <div class="guide-section">
    <div class="guide-section-title">Acting on Your Metrics</div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">My P99 is much higher than P50. What should I investigate?</span></div>
      <div class="qa-a">
        <p>A large gap between P50 and P99 (e.g., P50=30ms, P99=1200ms) indicates tail latency caused by intermittent slowdowns. Common causes:</p>
        <ul>
          <li><strong>Database query variability</strong> &mdash; Unindexed queries that are fast on small result sets but slow on large ones. Check for missing indexes or N+1 queries.</li>
          <li><strong>Cold caches</strong> &mdash; Requests that miss the cache hit a slow backend (database, external API). Check cache hit rates.</li>
          <li><strong>Garbage collection pauses</strong> &mdash; Node.js GC can cause 50-200ms pauses. Monitor with <code>--trace-gc</code> flag.</li>
          <li><strong>Connection pool exhaustion</strong> &mdash; When all DB connections are in use, requests queue. Increase pool size or optimize query duration.</li>
          <li><strong>External API latency</strong> &mdash; Third-party APIs with variable response times. Add timeouts and circuit breakers.</li>
        </ul>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">Which endpoints should I optimize first?</span></div>
      <div class="qa-a">
        <p>Prioritize by <strong>impact = throughput &times; latency</strong>. An endpoint with 100 req/s at 200ms has more impact than one with 1 req/s at 2 seconds.</p>
        <ul>
          <li>Sort by <strong>Req/s</strong> to find your most-called endpoints</li>
          <li>Look for <strong>red latency</strong> values in high-throughput endpoints</li>
          <li>Check <strong>error rates</strong> &mdash; a 10% error rate on a busy endpoint means many failed user experiences</li>
        </ul>
        <div class="qa-tip">
          <div class="qa-tip-label">Quick wins</div>
          <p>Start with the endpoint that has the highest combination of request count and latency. A 50% improvement on your busiest endpoint saves more total time than a 90% improvement on a rarely-used one.</p>
        </div>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">How can I reduce API response times?</span></div>
      <div class="qa-a">
        <p>Common strategies, roughly ordered by effort:</p>
        <ul>
          <li><strong>Add database indexes</strong> &mdash; Use <code>EXPLAIN</code> on slow queries. Missing indexes are the #1 cause of slow APIs.</li>
          <li><strong>Reduce payload size</strong> &mdash; Only return fields the client needs. Use sparse fieldsets or GraphQL-style field selection.</li>
          <li><strong>Add caching</strong> &mdash; Cache frequently-read, rarely-written data. Use Redis, in-memory LRU, or HTTP cache headers (<code>ETag</code>, <code>Cache-Control</code>).</li>
          <li><strong>Fix N+1 queries</strong> &mdash; If fetching a list triggers one query per item, use eager loading, joins, or batch queries.</li>
          <li><strong>Parallelize work</strong> &mdash; If an endpoint calls 3 independent services sequentially, use <code>Promise.all()</code> to call them concurrently.</li>
          <li><strong>Paginate large results</strong> &mdash; Never return unbounded lists. Use cursor-based pagination for stable performance.</li>
          <li><strong>Compress responses</strong> &mdash; Enable gzip/brotli compression middleware to reduce transfer time for large JSON payloads.</li>
        </ul>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">What causes high error rates and how do I fix them?</span></div>
      <div class="qa-a">
        <p><strong>High 4xx rates:</strong></p>
        <ul>
          <li>Malformed client requests &mdash; add input validation with clear error messages</li>
          <li>Stale client code hitting removed endpoints &mdash; use API versioning</li>
          <li>Authentication failures &mdash; check token expiry, CORS config, and auth middleware order</li>
        </ul>
        <p><strong>High 5xx rates:</strong></p>
        <ul>
          <li>Unhandled exceptions &mdash; add proper error handling middleware</li>
          <li>Database connection failures &mdash; check pool health and connection limits</li>
          <li>Downstream service outages &mdash; add circuit breakers and fallback responses</li>
          <li>Memory/CPU exhaustion &mdash; profile your application and check for memory leaks</li>
        </ul>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">I see OPTIONS requests everywhere. Should I worry?</span></div>
      <div class="qa-a">
        <p><strong>OPTIONS</strong> requests are CORS preflight checks sent automatically by browsers before cross-origin requests. They are normal and expected when your frontend and API are on different domains.</p>
        <p>If they have high latency, your CORS middleware may be doing unnecessary work. Make sure it short-circuits early:</p>
        <ul>
          <li>Mount CORS middleware before authentication and body parsing</li>
          <li>Set <code>Access-Control-Max-Age</code> header to cache preflight results (e.g., 86400 for 24 hours)</li>
        </ul>
        <p>If you want to exclude them from your metrics, use the <code>excludePaths</code> option or filter by method in your analysis.</p>
      </div>
    </div>
  </div>

  <div class="guide-section">
    <div class="guide-section-title">API Design Best Practices</div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">How should I structure my API response format?</span></div>
      <div class="qa-a">
        <p>Use a consistent envelope structure across all endpoints:</p>
        <ul>
          <li>Always include a <code>success</code> boolean or HTTP status code</li>
          <li>Wrap data in a <code>data</code> or <code>results</code> key</li>
          <li>Include pagination metadata (<code>total</code>, <code>page</code>, <code>limit</code>, <code>nextCursor</code>) for list endpoints</li>
          <li>Use a consistent error format with <code>message</code>, <code>code</code>, and optional <code>details</code></li>
        </ul>
        <div class="qa-tip">
          <div class="qa-tip-label">Schema capture</div>
          <p>Enable <code>captureSchemas: true</code> to automatically see your current response structures in the API Docs tab. This helps identify inconsistencies across endpoints.</p>
        </div>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">When should I use caching vs. optimizing the query?</span></div>
      <div class="qa-a">
        <p>Start with the query. Caching adds complexity (invalidation, stale data, memory). Optimize the query first:</p>
        <ul>
          <li><strong>Optimize first</strong> if the data changes frequently, correctness is critical, or the query can be made fast with indexes</li>
          <li><strong>Cache</strong> if the data is read-heavy and rarely changes, the computation is inherently expensive (aggregations, joins across services), or the upstream source is slow (external APIs)</li>
        </ul>
        <p>When caching, prefer <strong>short TTLs</strong> (30s-5min) over long ones. Short TTLs limit stale data while still absorbing traffic spikes. Use cache-aside pattern (check cache, miss = query + store) rather than write-through for simplicity.</p>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">How do I handle API versioning?</span></div>
      <div class="qa-a">
        <p>Common approaches:</p>
        <ul>
          <li><strong>URL prefix</strong> (e.g., <code>/v1/users</code>, <code>/v2/users</code>) &mdash; simplest, most visible, easiest to route. Works well with API Observatory since each version appears as a distinct endpoint pattern.</li>
          <li><strong>Header-based</strong> (e.g., <code>Accept: application/vnd.api.v2+json</code>) &mdash; cleaner URLs but harder to test in browsers and less discoverable.</li>
          <li><strong>Query parameter</strong> (e.g., <code>?version=2</code>) &mdash; easy to use but pollutes the URL.</li>
        </ul>
        <p>URL prefix is recommended for most APIs. When introducing a new version, keep the old one running and monitor its traffic in the Metrics tab to know when it&rsquo;s safe to deprecate.</p>
      </div>
    </div>
  </div>

  <div class="guide-section">
    <div class="guide-section-title">About API Observatory</div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">Does API Observatory affect my application&rsquo;s performance?</span></div>
      <div class="qa-a">
        <p><strong>Metrics collection (default mode):</strong> Minimal impact. Timing uses <code>process.hrtime.bigint()</code> (nanosecond precision, near-zero cost). Recording happens in <code>setImmediate()</code> after the response is sent, so it does not block the response.</p>
        <p><strong>Schema capture (<code>captureSchemas: true</code>):</strong> Additional overhead from intercepting <code>res.json()</code>, inferring schemas, computing hashes, and merging. All processing is off the hot path via <code>setImmediate()</code>, but does consume background CPU proportional to response body size.</p>
        <div class="qa-tip">
          <div class="qa-tip-label">Recommendation</div>
          <p>Keep <code>captureSchemas</code> disabled in high-throughput production environments. Enable it in staging, development, or during dedicated profiling sessions. Use the <code>OBSERVATORY_CAPTURE_SCHEMAS</code> env var for easy toggling without code changes.</p>
        </div>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">Is data persisted across restarts?</span></div>
      <div class="qa-a">
        <p>No. All metrics and schemas are stored in-memory and are lost when the process restarts. API Observatory is designed for live debugging and development, not long-term storage.</p>
        <p>For persistent metrics, use the <code>onRecord</code> callback to forward records to an external time-series database (Prometheus, InfluxDB, Datadog, etc.).</p>
      </div>
    </div>

    <div class="qa-item">
      <div class="qa-q" onclick="toggleQa(this)"><span class="qa-chevron">&#9654;</span><span class="qa-q-text">How do I secure the dashboard in production?</span></div>
      <div class="qa-a">
        <p>API Observatory exposes metrics at a public URL by default. To restrict access:</p>
        <ul>
          <li>Place authentication middleware before the observatory middleware for the mount path</li>
          <li>Use a non-obvious mount path (e.g., <code>/_internal/metrics</code>)</li>
          <li>Use network-level restrictions (VPN, IP allowlist, reverse proxy rules)</li>
          <li>Set <code>htmlDashboard: false</code> to disable the HTML UI and only expose JSON APIs</li>
        </ul>
      </div>
    </div>
  </div>
</div>
<script>
var TABS = ${tabLabelsJson};
var metricsUrl = '${metricsUrl}';
var resetUrl = '${resetUrl}';
var tbody = document.getElementById('tbody');
var status = document.getElementById('status');

function switchTab(tabId) {
  TABS.forEach(function(t) {
    var panel = document.getElementById('panel-' + t.id);
    var btn = document.querySelector('.nav-btn[data-tab="' + t.id + '"]');
    if (panel) panel.classList.toggle('active', t.id === tabId);
    if (btn) btn.classList.toggle('active', t.id === tabId);
  });
  if (tabId === 'schemas' && typeof loadSchemas === 'function') loadSchemas();
}

function toggleQa(el) {
  el.closest('.qa-item').classList.toggle('open');
}

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
