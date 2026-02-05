/**
 * Self-contained HTML dashboard template.
 * Inline CSS + JS, no external assets.
 * Auto-refreshes every 10s via fetch().
 * When schemasEnabled is true, adds an "API Docs" tab with schema rendering.
 */
export function buildHtmlDashboard(mountPath: string, schemasEnabled = false): string {
  const metricsUrl = `${mountPath}/metrics`;
  const resetUrl = `${mountPath}/reset`;
  const schemasUrl = `${mountPath}/schemas`;

  const schemaCss = schemasEnabled ? `
  .nav-bar { display: flex; gap: 8px; margin-bottom: 20px; }
  .nav-btn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.15s; }
  .nav-btn:hover { background: #334155; color: #e2e8f0; }
  .nav-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }
  .schema-list { display: flex; flex-direction: column; gap: 6px; }
  .schema-endpoint { background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; transition: border-color 0.15s; }
  .schema-endpoint.open { border-color: #475569; }
  .schema-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; user-select: none; transition: background 0.15s; }
  .schema-header:hover { background: #243044; }
  .schema-chevron { color: #64748b; font-size: 0.65rem; transition: transform 0.2s; display: inline-block; }
  .schema-endpoint.open .schema-chevron { transform: rotate(90deg); }
  .schema-method { font-weight: 700; font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
  .schema-method-GET { background: rgba(52,211,153,0.1); color: #34d399; }
  .schema-method-POST { background: rgba(96,165,250,0.1); color: #60a5fa; }
  .schema-method-PUT { background: rgba(251,191,36,0.1); color: #fbbf24; }
  .schema-method-PATCH { background: rgba(192,132,252,0.1); color: #c084fc; }
  .schema-method-DELETE { background: rgba(248,113,113,0.1); color: #f87171; }
  .schema-pattern { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.85rem; color: #e2e8f0; }
  .schema-samples { color: #64748b; font-size: 0.7rem; margin-left: auto; white-space: nowrap; }
  .schema-detail { display: none; padding: 0 16px 16px; }
  .schema-endpoint.open .schema-detail { display: block; }
  .schema-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .schema-sections { grid-template-columns: 1fr; } }
  .schema-section { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; }
  .schema-section-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #0c1322; border-bottom: 1px solid #1e293b; }
  .schema-section-title { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .schema-section-badge { font-size: 0.65rem; color: #64748b; background: #1e293b; padding: 2px 8px; border-radius: 10px; }
  .schema-pre { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 0.8rem; line-height: 1.7; padding: 14px; margin: 0; overflow-x: auto; color: #e2e8f0; background: transparent; border: none; }
  .schema-pre .sk { color: #93c5fd; }
  .schema-pre .st { color: #34d399; }
  .schema-pre .so { color: #f97316; font-size: 0.7rem; }
  .schema-pre .sb { color: #94a3b8; }
  .schema-pre .sc { color: #475569; }
  .schema-none { color: #64748b; font-size: 0.8rem; font-style: italic; padding: 20px 14px; text-align: center; }` : '';

  const navBarHtml = schemasEnabled ? `
<div class="nav-bar">
  <button class="nav-btn active" onclick="switchTab('metrics')">Metrics</button>
  <button class="nav-btn" onclick="switchTab('schemas')">API Docs</button>
</div>` : '';

  const schemaPanelHtml = schemasEnabled
    ? `<div id="panel-schemas" class="tab-panel"><div class="schema-list" id="schema-list"></div></div>`
    : '';

  const schemaJs = schemasEnabled ? `
const schemasUrl = '${schemasUrl}';
const schemaList = document.getElementById('schema-list');

function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach(function(b) {
    b.classList.toggle('active', b.textContent.trim() === (tab === 'metrics' ? 'Metrics' : 'API Docs'));
  });
  document.getElementById('panel-metrics').classList.toggle('active', tab === 'metrics');
  document.getElementById('panel-schemas').classList.toggle('active', tab === 'schemas');
  if (tab === 'schemas') loadSchemas();
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
      var optMark = f.required === false ? ' <span class="so">optional</span>' : '';
      var valStr;
      if ((f.type.includes('object') && f.properties) || (f.type.includes('array') && f.items)) {
        valStr = renderField(f, indent + 1);
      } else {
        valStr = '<span class="st">' + esc(f.type) + '</span>';
      }
      var comma = idx < keys.length - 1 ? '<span class="sc">,</span>' : '';
      lines.push(nextPad + '<span class="sk">"' + esc(k) + '"</span>' + optMark + '<span class="sc">:</span> ' + valStr + comma);
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

function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function toggleEndpoint(el) {
  el.closest('.schema-endpoint').classList.toggle('open');
}

async function loadSchemas() {
  try {
    var res = await fetch(schemasUrl);
    var data = await res.json();
    var eps = data.endpoints || [];
    if (eps.length === 0) {
      schemaList.innerHTML = '<div class="empty">No schemas captured yet. Send some requests with captureSchemas enabled.</div>';
      return;
    }
    schemaList.innerHTML = eps.map(function(e) {
      var reqHtml = e.requestBody
        ? '<pre class="schema-pre">' + renderField(e.requestBody, 0) + '</pre>'
        : '<div class="schema-none">No request body captured</div>';
      var resHtml = e.responseBody
        ? '<pre class="schema-pre">' + renderField(e.responseBody, 0) + '</pre>'
        : '<div class="schema-none">No response body captured</div>';
      return '<div class="schema-endpoint">' +
        '<div class="schema-header" onclick="toggleEndpoint(this)">' +
          '<span class="schema-chevron">&#9654;</span>' +
          '<span class="schema-method schema-method-' + e.method + '">' + e.method + '</span>' +
          '<span class="schema-pattern">' + esc(e.pattern) + '</span>' +
          '<span class="schema-samples">' + e.requestSampleCount + ' req &middot; ' + e.responseSampleCount + ' res</span>' +
        '</div>' +
        '<div class="schema-detail">' +
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
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {
    schemaList.innerHTML = '<div class="empty">Error loading schemas: ' + esc(err.message) + '</div>';
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
const metricsUrl = '${metricsUrl}';
const resetUrl = '${resetUrl}';
const tbody = document.getElementById('tbody');
const status = document.getElementById('status');

function latClass(ms) { return ms < 100 ? 'lat-green' : ms < 500 ? 'lat-yellow' : 'lat-red'; }
function errClass(rate) { return rate < 0.01 ? 'err-green' : rate < 0.05 ? 'err-yellow' : 'err-red'; }
function fmt(n) { return typeof n === 'number' ? n.toFixed(1) : '0'; }
function fmtPct(n) { return typeof n === 'number' ? (n * 100).toFixed(1) + '%' : '0%'; }

async function refresh() {
  try {
    const res = await fetch(metricsUrl);
    const data = await res.json();
    const eps = data.endpoints || [];
    if (eps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty">No metrics recorded yet</td></tr>';
    } else {
      tbody.innerHTML = eps.map(e => \`<tr>
        <td><span class="method method-\${e.method}">\${e.method}</span></td>
        <td class="mono">\${e.pattern}</td>
        <td class="right">\${e.count}</td>
        <td class="right mono \${latClass(e.latency.p50)}">\${fmt(e.latency.p50)}</td>
        <td class="right mono \${latClass(e.latency.p95)}">\${fmt(e.latency.p95)}</td>
        <td class="right mono \${latClass(e.latency.p99)}">\${fmt(e.latency.p99)}</td>
        <td class="right mono">\${fmt(e.latency.avg)}</td>
        <td class="right \${errClass(e.errorRate.total)}">\${fmtPct(e.errorRate.total)}</td>
        <td class="right">\${fmt(e.throughput)}</td>
      </tr>\`).join('');
    }
    status.textContent = 'Updated ' + new Date().toLocaleTimeString() + ' · ' + eps.length + ' endpoints';
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
}

async function resetMetrics() {
  if (!confirm('Reset all metrics?')) return;
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
