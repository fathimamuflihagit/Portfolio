/*
 * projects.js
 * ---------------------------------------------------------------------------
 * Shared helpers, project cards, the filterable grid, the small charts and the
 * case-study page. No personal text lives here: everything is read from
 * data/site.json and data/projects.json.
 *
 * Contents
 *   1. Small helpers (DOM, icons, text checks)
 *   2. Data loading
 *   3. Project helpers (links, labels, counts)
 *   4. Charts (Chart.js, loaded from a CDN only when a chart scrolls into view)
 *   5. Project cards and featured rows
 *   6. Filterable grid
 *   7. Case-study page (project.html?id=...)
 * ---------------------------------------------------------------------------
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.min.js';

/* 1. Small helpers --------------------------------------------------------- */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/**
 * Create an element. Text is always inserted as text, never as HTML,
 * so nothing typed into the JSON files can inject markup.
 *   el('a', { class: 'tag', href: '#' }, 'Label')
 */
export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else if (value === true) node.setAttribute(key, '');
      else node.setAttribute(key, value);
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** True for empty values and for placeholders that start with "TODO". */
export function isTodo(value) {
  return typeof value !== 'string' || value.trim() === '' || /^todo\b/i.test(value.trim());
}

/** Keep only the entries of a list that have been filled in. */
export const filled = (list) => (Array.isArray(list) ? list.filter((item) => !isTodo(item)) : []);

export const slug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Only allow web links and relative paths from the data files. */
export function safeUrl(url, { httpsOnly = false } = {}) {
  if (typeof url !== 'string') return '';
  const value = url.trim();
  if (!value) return '';
  if (/^https:\/\//i.test(value)) return value;
  if (httpsOnly) return '';
  if (/^(http:\/\/|mailto:)/i.test(value)) return value;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  return hasScheme || value.startsWith('//') ? '' : value;
}

/** A link that opens in a new tab safely. `context` is extra wording for screen readers only. */
export function externalLink(href, label, className = 'text-link', context = '') {
  return el(
    'a',
    { class: className, href, target: '_blank', rel: 'noopener noreferrer' },
    label,
    context ? el('span', { class: 'sr-only', text: `: ${context}` }) : null,
    icon('external'),
    el('span', { class: 'sr-only', text: ' (opens in a new tab)' })
  );
}

// Simple line icons, drawn on a 24 x 24 grid.
const ICONS = {
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  external: '<path d="M7 17L17 7M9 7h8v8"/>',
  file: '<path d="M7 3h7l5 5v13H7zM14 3v5h5"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  table: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 10h18M9 5v14"/>',
};

export function icon(name, extraClass = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `icon ${extraClass}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = ICONS[name] || '';
  return svg;
}

/** The dashed "coming soon" block used wherever a TODO has not been filled in. */
export function pending(text) {
  return el('div', { class: 'pending' }, icon('clock'), el('span', { text }));
}

export function badge(status) {
  return el('span', { class: 'badge', 'data-status': slug(status || 'planned'), text: status || 'Planned' });
}

/** Fade elements in as they scroll into view (see .reveal in the stylesheet). */
let revealObserver;
export function observeReveals(root = document) {
  const items = $$('.reveal:not(.is-visible)', root);
  if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
  }
  items.forEach((item) => revealObserver.observe(item));
}

/* 2. Data loading ---------------------------------------------------------- */

async function fetchJson(path) {
  // "no-cache" asks the server whether the file changed, so edits show up as soon as GitHub publishes them.
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load ${path} (status ${response.status})`);
  return response.json();
}

// Completed projects first, then In progress, then Planned. Within each group the order in projects.json is kept.
const STATUS_ORDER = ['completed', 'in-progress', 'planned'];
function sortByStatus(projects) {
  const rank = (project) => {
    const i = STATUS_ORDER.indexOf(slug(project.status || ''));
    return i === -1 ? STATUS_ORDER.length : i;
  };
  return projects.map((project, index) => ({ project, index })).sort((a, b) => rank(a.project) - rank(b.project) || a.index - b.index).map((entry) => entry.project);
}

let dataPromise;
/** Loads both data files once and shares the result with every caller. */
export function loadData() {
  if (!dataPromise) {
    dataPromise = Promise.all([fetchJson('data/site.json'), fetchJson('data/projects.json')]).then(([site, file]) => ({
      site,
      projects: sortByStatus(Array.isArray(file.projects) ? file.projects : []),
    }));
  }
  return dataPromise;
}

/* 3. Project helpers ------------------------------------------------------- */

export const projectUrl = (project) => `project.html?id=${encodeURIComponent(project.id)}`;
export const filterUrl = (key, value) => `./?${key}=${encodeURIComponent(value)}#projects`;
export const roleLabel = (site, tag) => (site.role_labels && site.role_labels[tag]) || tag;

export function findCourse(site, code) {
  if (!code) return null;
  for (const phase of site.journey?.phases || []) {
    const match = (phase.courses || []).find((course) => course.code === code);
    if (match) return match;
  }
  return null;
}

/** Tool names in the order they appear in the skills section, then any extras. */
export function orderedTools(site, projects) {
  const used = new Set(projects.flatMap((project) => project.tools || []));
  const fromSkills = (site.skills?.groups || []).flatMap((group) => group.tools.map((tool) => tool.name));
  const ordered = fromSkills.filter((name) => used.has(name));
  for (const name of used) if (!ordered.includes(name)) ordered.push(name);
  return ordered;
}

/** Role tags in the order of site.role_labels, then any extras. */
export function orderedRoles(site, projects) {
  const used = new Set(projects.flatMap((project) => project.role_tags || []));
  const fromLabels = Object.keys(site.role_labels || {}).filter((key) => !key.startsWith('_'));
  const ordered = fromLabels.filter((name) => used.has(name));
  for (const name of used) if (!ordered.includes(name)) ordered.push(name);
  return ordered;
}

export function toolCounts(projects) {
  const counts = new Map();
  for (const project of projects) {
    for (const tool of project.tools || []) counts.set(tool, (counts.get(tool) || 0) + 1);
  }
  return counts;
}

/* 4. Charts ---------------------------------------------------------------- */

let chartJsPromise;
function loadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!chartJsPromise) {
    chartJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHART_JS_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => (window.Chart ? resolve(window.Chart) : reject(new Error('Chart.js did not initialise')));
      script.onerror = () => reject(new Error('Chart.js could not be loaded'));
      document.head.append(script);
    });
  }
  return chartJsPromise;
}

const liveCharts = new Map(); // canvas -> { spec, compact, chart }

function readColors(node) {
  const styles = getComputedStyle(node);
  const read = (name) => styles.getPropertyValue(name).trim();
  return {
    series: [read('--series-1'), read('--series-2')],
    ink: read('--ink'),
    muted: read('--muted'),
    line: read('--line'),
    lineStrong: read('--line-strong'),
    surface: read('--surface'),
    font: getComputedStyle(document.body).fontFamily,
  };
}

function withAlpha(hex, alpha) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}


/** Break a long category label onto two lines so every bar keeps its label. */
function wrapLabel(label, limit = 12) {
  const text = String(label);
  if (text.length <= limit || !text.includes(' ')) return text;
  const words = text.split(' ');
  const lines = [''];
  for (const word of words) {
    const current = lines[lines.length - 1];
    if (current && (current + ' ' + word).length > limit && lines.length < 2) lines.push(word);
    else lines[lines.length - 1] = current ? `${current} ${word}` : word;
  }
  return lines;
}

// Thin vertical guide that follows the pointer on line charts.
const crosshairPlugin = {
  id: 'crosshair',
  beforeDatasetsDraw(chart, _args, options) {
    if (chart.config.type !== 'line') return;
    const active = chart.getActiveElements();
    if (!active.length) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = options.color || '#999';
    ctx.stroke();
    ctx.restore();
  },
};

/** Number formatting for one chart: optional prefix ("$"), suffix ("K", "%") and decimals. */
function formatter(spec, axis = 'y') {
  const prefix = (axis === 'x' ? spec.x_prefix : spec.prefix) || '';
  const unit = (axis === 'x' ? spec.x_unit : spec.unit) || '';
  const decimals = Number.isInteger(spec.decimals) ? spec.decimals : 1;
  const format = new Intl.NumberFormat('en-CA', { maximumFractionDigits: axis === 'x' ? 1 : decimals });
  return (value) => `${prefix}${format.format(value)}${unit}`;
}

/** Which colour slot each bar uses: by group (for example Urban / Suburban) or by series. */
const barGroups = (spec) => (Array.isArray(spec.groups) && spec.groups.length === (spec.labels || []).length ? spec.groups : null);

function tooltipStyle(colors) {
  return {
    backgroundColor: colors.ink,
    titleColor: colors.surface,
    bodyColor: colors.surface,
    footerColor: colors.surface,
    titleFont: { family: colors.font, size: 11, weight: '500' },
    bodyFont: { family: colors.font, size: 13, weight: '600' },
    footerFont: { family: colors.font, size: 10, weight: '400' },
    padding: 9,
    cornerRadius: 6,
    caretSize: 0,
    boxWidth: 10,
    boxHeight: 10,
    boxPadding: 4,
  };
}

function axisTitle(text, colors) {
  return text ? { display: true, text, color: colors.muted, font: { family: colors.font, size: 11, weight: '500' }, padding: { top: 6, bottom: 2 } } : { display: false };
}

// Writes the name next to a few chosen points ("callout": true in the data), so the story needs no hovering.
const calloutPlugin = {
  id: 'callouts',
  afterDatasetsDraw(chart, _args, options) {
    // Narrow charts have no room for names; hovering still shows them.
    if (options.hidden || chart.width < 480) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = `600 11px ${options.font}`;
    ctx.textBaseline = 'middle';
    chart.data.datasets.forEach((dataset, di) => {
      if (dataset.type === 'line' || !chart.isDatasetVisible(di)) return;
      chart.getDatasetMeta(di).data.forEach((point, pi) => {
        const raw = dataset.data[pi];
        if (!raw || !raw.callout) return;
        const text = raw.label;
        const width = ctx.measureText(text).width;
        const left = point.x + 10 + width > chartArea.right;
        const x = left ? point.x - 10 - width : point.x + 10;
        const y = point.y;
        ctx.fillStyle = options.halo;
        ctx.fillRect(x - 3, y - 8, width + 6, 16);
        ctx.fillStyle = options.color;
        ctx.fillText(text, x, y);
      });
    });
    ctx.restore();
  },
};

function scatterConfig(spec, colors, compact) {
  const fy = formatter(spec, 'y');
  const fx = formatter(spec, 'x');
  const fontSize = compact ? 10 : 12;
  const series = (spec.series || []).slice(0, 2);
  const points = series.flatMap((entry) => entry.points || []);
  const xs = points.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const datasets = series.map((entry, index) => ({
    type: 'scatter',
    label: entry.name,
    data: (entry.points || []).map((point) => ({ x: point.x, y: point.y, label: point.label, callout: point.callout === true })),
    backgroundColor: colors.series[index],
    borderColor: colors.surface,
    borderWidth: 2,
    pointRadius: compact ? 4.5 : 6.5,
    pointHoverRadius: compact ? 6 : 8.5,
    pointHitRadius: 10,
    order: 1,
  }));

  const trend = spec.trendline;
  if (trend && Number.isFinite(trend.slope) && Number.isFinite(trend.intercept)) {
    const pad = (maxX - minX) * 0.04;
    const from = minX - pad;
    const to = maxX + pad;
    datasets.push({
      type: 'line',
      label: trend.name || 'Trend line',
      data: [
        { x: from, y: trend.intercept + trend.slope * from },
        { x: to, y: trend.intercept + trend.slope * to },
      ],
      borderColor: colors.ink,
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 0,
      pointHitRadius: 0,
      fill: false,
      order: 2,
    });
  }

  return {
    type: 'scatter',
    data: { datasets },
    plugins: [calloutPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReducedMotion() ? false : { duration: 500 },
      layout: { padding: { top: 8, right: 8, bottom: 0, left: 0 } },
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        legend: { display: false },
        callouts: { hidden: compact, color: colors.ink, halo: withAlpha(colors.surface, 0.85), font: colors.font },
        tooltip: {
          ...tooltipStyle(colors),
          filter: (item) => item.dataset.type !== 'line',
          callbacks: {
            title: (items) => items[0]?.raw?.label || '',
            label: (item) => ` ${item.dataset.label}: ${fx(item.parsed.x)} ${spec.x_short || ''}, ${fy(item.parsed.y)} ${spec.y_short || ''}`.replace(/\s+,/g, ','),
            labelColor: (item) => ({ borderColor: item.dataset.backgroundColor, backgroundColor: item.dataset.backgroundColor }),
            footer: () => (spec.sample ? 'Sample data' : ''),
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          grace: '4%',
          title: compact ? { display: false } : axisTitle(spec.x_title, colors),
          grid: { color: colors.line, drawTicks: false },
          border: { color: colors.lineStrong },
          ticks: { color: colors.muted, font: { family: colors.font, size: fontSize }, maxTicksLimit: compact ? 4 : 7, padding: 6, callback: (value) => fx(value) },
        },
        y: {
          grace: '8%',
          title: compact ? { display: false } : axisTitle(spec.y_title, colors),
          grid: { color: colors.line, drawTicks: false },
          border: { display: false },
          ticks: { color: colors.muted, font: { family: colors.font, size: fontSize }, maxTicksLimit: compact ? 3 : 6, padding: 6, callback: (value) => fy(value) },
        },
      },
    },
  };
}

function chartConfig(spec, colors, compact) {
  if (spec.type === 'scatter') return scatterConfig(spec, colors, compact);

  const isLine = spec.type === 'line';
  const horizontal = !isLine && spec.horizontal === true;
  const groups = isLine ? null : barGroups(spec);
  const fy = formatter(spec, 'y');
  const series = (spec.series || []).slice(0, 2);
  const fontSize = compact ? 10 : 12;
  const highlight = Number.isInteger(spec.highlight) ? spec.highlight : -1;

  const datasets = series.map((entry, index) => {
    const color = colors.series[index];
    if (isLine) {
      const last = entry.values.length - 1;
      return {
        label: entry.name,
        data: entry.values,
        borderColor: color,
        borderWidth: 2,
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
        tension: 0.25,
        fill: false,
        // One end marker per line, with a ring in the surface colour so it stays readable.
        pointRadius: entry.values.map((_, i) => (i === last ? 4 : 0)),
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: colors.surface,
        pointBorderWidth: 2,
        pointHoverBorderWidth: 2,
        pointHitRadius: 14,
      };
    }
    // Bars: coloured by group when groups are given; one bar can be picked out with "highlight".
    const fill = entry.values.map((_, i) => {
      const base = groups ? colors.series[groups[i] === 1 ? 1 : 0] : color;
      return highlight >= 0 && i !== highlight ? withAlpha(base, 0.35) : base;
    });
    return {
      label: entry.name,
      data: entry.values,
      backgroundColor: fill,
      hoverBackgroundColor: fill.map((value) => (value.startsWith('#') ? withAlpha(value, 0.8) : value)),
      borderRadius: horizontal ? { topRight: 4, bottomRight: 4 } : { topLeft: 4, topRight: 4 },
      borderSkipped: horizontal ? 'left' : 'bottom',
      maxBarThickness: horizontal ? 18 : 24,
      categoryPercentage: horizontal ? 0.8 : 0.72,
      barPercentage: horizontal ? 0.82 : 0.86,
    };
  });

  const categoryScale = {
    grid: { display: false },
    border: { color: colors.lineStrong },
    ticks: { color: horizontal ? colors.ink : colors.muted, font: { family: colors.font, size: fontSize }, maxRotation: 0, autoSkip: isLine, autoSkipPadding: 10, padding: 4 },
  };
  const valueScale = {
    beginAtZero: !isLine,
    grace: '10%',
    title: compact ? { display: false } : axisTitle(spec.value_title, colors),
    grid: { color: colors.line, drawTicks: false },
    border: { display: false },
    ticks: { color: colors.muted, font: { family: colors.font, size: fontSize }, maxTicksLimit: compact ? 3 : 5, padding: 6, callback: (value) => fy(value) },
  };

  return {
    type: isLine ? 'line' : 'bar',
    data: { labels: (spec.labels || []).map((label) => (isLine || horizontal ? label : wrapLabel(label, compact ? 11 : 16))), datasets },
    plugins: [crosshairPlugin],
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReducedMotion() ? false : { duration: 450 },
      layout: { padding: { top: 8, right: isLine ? 10 : 6, bottom: 0, left: 0 } },
      interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
      plugins: {
        legend: { display: false },
        crosshair: { color: colors.lineStrong },
        tooltip: {
          ...tooltipStyle(colors),
          displayColors: series.length > 1 || Boolean(groups),
          callbacks: {
            title: (items) => String((spec.labels || [])[items[0].dataIndex] ?? ''),
            label: (item) => {
              const value = fy(horizontal ? item.parsed.x : item.parsed.y);
              if (groups) return ` ${value}  ${(spec.group_names || [])[groups[item.dataIndex]] || ''}`;
              return series.length > 1 ? ` ${value}  ${item.dataset.label}` : value;
            },
            labelColor: (item) => {
              const color = Array.isArray(item.dataset.backgroundColor) ? item.dataset.backgroundColor[item.dataIndex] : item.dataset.borderColor || item.dataset.backgroundColor;
              return { borderColor: color, backgroundColor: color };
            },
            footer: () => (spec.sample ? 'Sample data' : ''),
          },
        },
      },
      scales: horizontal ? { y: categoryScale, x: valueScale } : { x: categoryScale, y: valueScale },
    },
  };
}

function drawChart(canvas, spec, compact) {
  const Chart = window.Chart;
  if (!Chart || !canvas.isConnected) return;
  const existing = liveCharts.get(canvas);
  if (existing?.chart) existing.chart.destroy();
  const chart = new Chart(canvas, chartConfig(spec, readColors(canvas), compact));
  liveCharts.set(canvas, { spec, compact, chart });
}

/** Redraw every chart with the new theme colours. Called by main.js on toggle. */
export function refreshCharts() {
  for (const [canvas, entry] of liveCharts) {
    if (!canvas.isConnected) {
      entry.chart?.destroy();
      liveCharts.delete(canvas);
      continue;
    }
    drawChart(canvas, entry.spec, entry.compact);
  }
}

/** A plain-language description of the chart for screen readers. */
function chartSummary(spec) {
  const fy = formatter(spec, 'y');
  if (spec.type === 'scatter') {
    const fx = formatter(spec, 'x');
    const parts = (spec.series || []).map((entry) => `${entry.name}: ${(entry.points || []).map((point) => `${point.label} ${fx(point.x)}, ${fy(point.y)}`).join('; ')}`);
    const trend = spec.trendline ? ` ${spec.trendline.name || 'Trend line'} shown.` : '';
    return `Scatter plot${spec.sample ? ' with sample data' : ''}. ${spec.title}. ${spec.x_title || 'x'} against ${spec.y_title || 'y'}. ${parts.join('. ')}.${trend}`;
  }
  const kind = spec.type === 'line' ? 'Line chart' : 'Bar chart';
  const parts = (spec.series || []).slice(0, 2).map((entry) => {
    const values = entry.values.map((value, i) => `${spec.labels[i]} ${fy(value)}`).join(', ');
    return `${entry.name}: ${values}`;
  });
  return `${kind}${spec.sample ? ' with sample data' : ''}. ${spec.title}. ${parts.join('. ')}.`;
}

function chartLegend(spec) {
  const series = (spec.series || []).slice(0, 2);
  const entries = [];
  if (spec.type !== 'line' && spec.type !== 'scatter' && barGroups(spec)) {
    (spec.group_names || []).slice(0, 2).forEach((name, i) => entries.push({ name, slot: i, kind: 'box' }));
  } else if (series.length > 1) {
    series.forEach((entry, i) => entries.push({ name: entry.name, slot: i, kind: spec.type === 'line' ? 'line' : spec.type === 'scatter' ? 'dot' : 'box' }));
  }
  if (spec.type === 'scatter' && spec.trendline) entries.push({ name: spec.trendline.name || 'Trend line', slot: 'trend', kind: 'dash' });
  if (!entries.length) return null; // one series needs no legend: the title already names it
  return el(
    'div',
    { class: 'chart-legend' },
    entries.map((entry) => el('span', null, el('i', { class: `legend-key legend-key--${entry.kind}`, 'data-slot': String(entry.slot) }), entry.name))
  );
}

function chartTable(spec) {
  const fy = formatter(spec, 'y');
  const table = el('table', { class: 'data-table' });
  table.append(el('caption', { text: `${spec.title}${spec.sample ? ' (sample data)' : ''}` }));
  const body = el('tbody');

  if (spec.type === 'scatter') {
    const fx = formatter(spec, 'x');
    const multi = (spec.series || []).length > 1;
    table.append(
      el('thead', null, el('tr', null, el('th', { scope: 'col', text: spec.point_title || 'Item' }), multi ? el('th', { scope: 'col', text: spec.series_title || 'Group' }) : null, el('th', { scope: 'col', text: spec.x_title || 'x' }), el('th', { scope: 'col', text: spec.y_title || 'y' })))
    );
    for (const entry of spec.series || []) {
      for (const point of entry.points || []) {
        body.append(el('tr', null, el('th', { scope: 'row', text: point.label || '' }), multi ? el('td', { class: 'is-text', text: entry.name }) : null, el('td', { text: fx(point.x) }), el('td', { text: fy(point.y) })));
      }
    }
    table.append(body);
    return table;
  }

  const series = (spec.series || []).slice(0, 2);
  const groups = barGroups(spec);
  table.append(
    el('thead', null, el('tr', null, el('th', { scope: 'col', text: spec.category_title || 'Category' }), groups ? el('th', { scope: 'col', text: spec.group_title || 'Group' }) : null, series.map((entry) => el('th', { scope: 'col', text: entry.name }))))
  );
  (spec.labels || []).forEach((label, i) => {
    body.append(
      el('tr', null, el('th', { scope: 'row', text: label }), groups ? el('td', { class: 'is-text', text: (spec.group_names || [])[groups[i]] || '' }) : null, series.map((entry) => el('td', { text: fy(entry.values[i]) })))
    );
  });
  table.append(body);
  return table;
}

let chartObserver;
/**
 * Draw the chart the first time its canvas scrolls into view.
 * onFail runs if Chart.js cannot be loaded (for example, when offline).
 */
function lazyChart(canvas, spec, { compact = false, onFail } = {}) {
  canvas.__chartJob = { spec, compact, onFail };
  if (!('IntersectionObserver' in window)) {
    startChart(canvas);
    return;
  }
  if (!chartObserver) {
    chartObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          chartObserver.unobserve(entry.target);
          startChart(entry.target);
        }
      },
      { rootMargin: '200px 0px' }
    );
  }
  chartObserver.observe(canvas);
}

function startChart(canvas) {
  const job = canvas.__chartJob;
  if (!job) return;
  loadChartJs()
    .then(() => drawChart(canvas, job.spec, job.compact))
    .catch(() => job.onFail && job.onFail());
}

const validChart = (spec) =>
  Boolean(spec) &&
  Array.isArray(spec.series) &&
  spec.series.length > 0 &&
  (spec.type === 'scatter' ? spec.series.every((entry) => Array.isArray(entry.points)) : Array.isArray(spec.labels));
const hasChart = (project) => validChart(project.chart);

/* 5. Project cards and featured rows --------------------------------------- */

function coverImage(project, { eager = false } = {}) {
  const src = safeUrl(project.cover_image);
  if (!src) return null;
  return el('img', {
    src,
    alt: project.cover_alt || '',
    width: 1200,
    height: 675,
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
    fetchpriority: eager ? 'high' : null,
  });
}

function cardVisual(project) {
  const cover = () => el('div', { class: 'pcard__visual pcard__visual--cover' }, coverImage(project));
  if (!hasChart(project)) return cover();

  const spec = project.chart;
  const canvas = el('canvas', { role: 'img', 'aria-label': chartSummary(spec) });
  const visual = el(
    'div',
    { class: 'pcard__visual' },
    el('div', { class: 'pcard__chart-head' }, el('span', { text: spec.title }), spec.sample ? el('span', { class: 'sample-tag', text: 'Sample data' }) : null),
    chartLegend(spec),
    el('div', { class: 'pcard__chart' }, canvas)
  );
  lazyChart(canvas, spec, { compact: true, onFail: () => visual.replaceWith(cover()) });
  return visual;
}

export function projectCard(project, site) {
  const roles = (project.role_tags || []).map((tag) => roleLabel(site, tag));
  const card = el('article', { class: 'pcard', 'data-id': project.id });
  card.style.viewTransitionName = `pcard-${slug(project.id)}`;
  card.append(
    cardVisual(project),
    el(
      'div',
      { class: 'pcard__body' },
      el('div', { class: 'pcard__top' }, badge(project.status), el('span', { text: (project.role_tags || []).join(', ') })),
      el('h3', { class: 'pcard__title' }, el('a', { href: projectUrl(project), text: project.title })),
      el('p', { class: 'pcard__tagline', text: project.tagline }),
      el('span', { class: 'sr-only', text: `Suited to: ${roles.join(', ')}.` }),
      el('ul', { class: 'tag-list pcard__tools', 'aria-label': 'Tools' }, (project.tools || []).map((tool) => el('li', { class: 'tag', text: tool })))
    )
  );
  return card;
}

function featureRow(project, site) {
  const roles = (project.role_tags || []).map((tag) => roleLabel(site, tag)).join(', ');
  const url = projectUrl(project);
  return el(
    'article',
    { class: 'feature reveal' },
    el('a', { class: 'feature__media', href: url, tabindex: '-1', 'aria-hidden': 'true' }, coverImage(project)),
    el(
      'div',
      { class: 'feature__body' },
      el('div', { class: 'feature__meta' }, badge(project.status), el('span', { text: roles })),
      el('h3', { class: 'feature__title' }, el('a', { href: url, text: project.title })),
      el('p', { class: 'feature__tagline', text: project.tagline }),
      el(
        'ol',
        { class: 'feature__steps', 'aria-label': 'Parts of this project' },
        (project.subprojects || []).map((sub) => el('li', null, el('span', { text: sub.title }), el('span', { text: sub.tool })))
      ),
      el('p', { class: 'feature__cta' }, el('a', { class: 'text-link', href: url }, 'View case study', el('span', { class: 'sr-only', text: `: ${project.title}` })))
    )
  );
}

export function renderFeatured({ site, projects }) {
  const host = $('#featured-list');
  if (!host) return;
  const featured = projects.filter((project) => project.featured);
  if (!featured.length) {
    const section = host.closest('section');
    if (section) section.hidden = true;
    return;
  }
  host.append(...featured.map((project) => featureRow(project, site)));
}

/* 6. Filterable grid ------------------------------------------------------- */

function searchText(project, site) {
  return [
    project.title,
    project.tagline,
    project.status,
    project.dataset?.name,
    project.course_code,
    ...(project.tools || []),
    ...(project.role_tags || []),
    ...(project.role_tags || []).map((tag) => roleLabel(site, tag)),
    ...(project.subprojects || []).flatMap((sub) => [sub.title, sub.tool]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Builds the project grid, the role and tool filters and the search box.
 * Returns { setTool, setRole, reset } so other parts of the page (the skill
 * chips) can drive the same filters.
 */
export function initProjectGrid({ site, projects }) {
  const grid = $('#project-grid');
  if (!grid) return null;

  const roleHost = $('#filter-roles');
  const toolHost = $('#filter-tools');
  const searchInput = $('#project-search');
  const countNode = $('#project-count');
  const resetButton = $('#filters-reset');
  const form = $('#filters');

  const roles = orderedRoles(site, projects);
  const tools = orderedTools(site, projects);
  const state = { q: '', role: '', tool: '' };

  // Start from the address bar, so links such as ./?tool=Tableau#projects work.
  const params = new URLSearchParams(window.location.search);
  if (roles.includes(params.get('role'))) state.role = params.get('role');
  if (tools.includes(params.get('tool'))) state.tool = params.get('tool');
  if (params.get('q')) state.q = params.get('q').slice(0, 80);

  const makeButton = (label, key, value) =>
    el('button', {
      class: 'filter-btn',
      type: 'button',
      'aria-pressed': 'false',
      'data-key': key,
      'data-value': value,
      text: label,
      onclick: () => {
        state[key] = state[key] === value ? '' : value;
        apply();
      },
    });

  roleHost.append(makeButton('All roles', 'role', ''), ...roles.map((role) => makeButton(role, 'role', role)));
  toolHost.append(makeButton('All tools', 'tool', ''), ...tools.map((tool) => makeButton(tool, 'tool', tool)));

  const cards = projects.map((project) => ({ project, node: projectCard(project, site), text: searchText(project, site) }));
  const emptyState = el(
    'div',
    { class: 'empty-state', hidden: true },
    el('p', null, el('strong', { text: 'No projects match these filters.' })),
    el('p', null, el('button', { class: 'btn btn--secondary btn--small', type: 'button', text: 'Clear filters', onclick: () => reset() }))
  );
  grid.append(...cards.map((card) => card.node), emptyState);

  function matches(card) {
    const { project, text } = card;
    if (state.role && !(project.role_tags || []).includes(state.role)) return false;
    if (state.tool && !(project.tools || []).includes(state.tool)) return false;
    if (state.q) {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.every((word) => text.includes(word))) return false;
    }
    return true;
  }

  function render() {
    let shown = 0;
    for (const card of cards) {
      const visible = matches(card);
      card.node.hidden = !visible;
      if (visible) shown += 1;
    }
    emptyState.hidden = shown !== 0;

    for (const button of $$('.filter-btn', form)) {
      button.setAttribute('aria-pressed', String(state[button.dataset.key] === button.dataset.value));
    }
    if (searchInput.value !== state.q) searchInput.value = state.q;

    const filtering = Boolean(state.q || state.role || state.tool);
    const noun = cards.length === 1 ? 'project' : 'projects';
    countNode.textContent = filtering ? `Showing ${shown} of ${cards.length} ${noun}` : `${cards.length} ${noun}`;
    resetButton.hidden = !filtering;
  }

  function syncAddress() {
    const url = new URL(window.location.href);
    for (const key of ['q', 'role', 'tool']) {
      if (state[key]) url.searchParams.set(key, state[key]);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function apply({ animate = true } = {}) {
    // Browsers with the View Transitions API slide the cards into their new places.
    if (animate && document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(render);
    else render();
    syncAddress();
    document.dispatchEvent(new CustomEvent('filters:change', { detail: { ...state } }));
  }

  function reset() {
    state.q = '';
    state.role = '';
    state.tool = '';
    apply();
  }

  let typingTimer;
  searchInput.addEventListener('input', () => {
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => {
      state.q = searchInput.value.trim().slice(0, 80);
      apply();
    }, 140);
  });
  resetButton.addEventListener('click', reset);

  apply({ animate: false });

  return {
    reset,
    setTool(tool) {
      state.tool = state.tool === tool ? '' : tool;
      apply();
    },
    setRole(role) {
      state.role = state.role === role ? '' : role;
      apply();
    },
  };
}

/* 7. Case-study page ------------------------------------------------------- */

/** A button that opens the contact form on the home page with a question about this project filled in. */
function requestButton(project, className = 'btn btn--secondary') {
  if (!project.request) return null;
  const label = isTodo(project.request.label) ? 'Ask about this project' : project.request.label;
  return el('a', { class: className, href: `./?about=${encodeURIComponent(project.id)}#contact` }, icon('file'), label);
}

function setMeta(selector, attribute, value) {
  const node = document.head.querySelector(selector);
  if (node && value) node.setAttribute(attribute, value);
}

function updateCaseMeta(site, project) {
  const name = site.person?.name || '';
  const title = `${project.title} | ${name}`;
  const description = `${project.tagline} A data analytics case study by ${name}.`;
  const base = safeUrl(site.site?.url) || '';
  const url = base ? `${base}project.html?id=${encodeURIComponent(project.id)}` : '';
  document.title = title;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('link[rel="canonical"]', 'href', url);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', url);
}

function caseHeader(site, project) {
  const roles = (project.role_tags || []).map((tag) => roleLabel(site, tag)).join(', ');
  const github = safeUrl(project.github_url);
  const live = safeUrl(project.live_dashboard_url);
  const datasetUrl = safeUrl(project.dataset?.url);
  const course = findCourse(site, project.course_code);
  const status = slug(project.status || '');

  const header = el(
    'header',
    { class: 'case__header wrap' },
    el('a', { class: 'case__back', href: './#projects' }, icon('arrow-left'), 'All projects'),
    el('div', { class: 'case__meta' }, badge(project.status), el('span', { text: roles })),
    el('h1', { class: 'case__title', text: project.title }),
    el('p', { class: 'case__tagline', text: project.tagline })
  );

  const request = requestButton(project, github || live ? 'btn btn--secondary' : 'btn btn--primary');
  if (github || live || request) {
    header.append(
      el(
        'div',
        { class: 'case__actions' },
        live ? externalLink(live, 'Open live dashboard', 'btn btn--primary') : null,
        github ? externalLink(github, 'View code on GitHub', live ? 'btn btn--secondary' : 'btn btn--primary') : null,
        request
      )
    );
  }

  if (status === 'planned') {
    header.append(el('div', { class: 'case__notice' }, pending('This project is planned. The page shows the intended approach. Visuals and findings will be added as the work is done.')));
  } else if (status === 'in-progress') {
    header.append(el('div', { class: 'case__notice' }, pending('This project is in progress. Sections marked as coming soon will be filled in as the work is completed.')));
  }

  const fact = (term, ...detail) => el('div', null, el('dt', { text: term }), el('dd', null, ...detail));
  header.append(
    el(
      'dl',
      { class: 'case__facts' },
      fact('Dataset', datasetUrl ? externalLink(datasetUrl, project.dataset.name) : project.dataset?.name || 'To be confirmed'),
      fact('Tools', (project.tools || []).join(', ')),
      course
        ? fact('Related course', el('span', { class: 'code', text: course.code }), ` ${course.name}`)
        : !isTodo(project.context)
          ? fact('Context', project.context)
          : fact('Suited to', roles)
    )
  );
  return header;
}

function chartBlock(spec) {
  const canvas = el('canvas', { role: 'img', 'aria-label': chartSummary(spec) });
  const canvasBox = el('div', { class: `chart-block__canvas${spec.size === 'tall' ? ' is-tall' : spec.size === 'short' ? ' is-short' : ''}` }, canvas);
  const tableBox = el('div', { hidden: true }, chartTable(spec));
  const toggle = el('button', { class: 'btn btn--secondary btn--small', type: 'button', 'aria-pressed': 'false' }, icon('table'), el('span', { text: 'View as table' }));
  const legend = chartLegend(spec);

  const showTable = (show) => {
    tableBox.hidden = !show;
    canvasBox.hidden = show;
    if (legend) legend.hidden = show;
    toggle.setAttribute('aria-pressed', String(show));
    toggle.lastElementChild.textContent = show ? 'View as chart' : 'View as table';
  };
  toggle.addEventListener('click', () => showTable(tableBox.hidden));

  lazyChart(canvas, spec, {
    onFail: () => {
      showTable(true);
      toggle.hidden = true;
    },
  });

  return el(
    'figure',
    { class: 'chart-block' },
    el('div', { class: 'chart-block__head' }, el('figcaption', { class: 'chart-block__title' }, spec.title, spec.sample ? el('span', { class: 'sample-tag', text: 'Sample data' }) : null), toggle),
    canvasBox,
    legend,
    tableBox,
    isTodo(spec.caption) ? null : el('p', { class: 'chart-block__caption', text: spec.caption }),
    spec.sample ? el('p', { class: 'chart-block__note', text: 'These are placeholder values that show the chart layout. Real results will replace them when the analysis is complete.' }) : null
  );
}

/** Headline numbers for a finished project. */
function highlightStrip(project) {
  const items = (project.highlights || []).filter((item) => !isTodo(item.value) && !isTodo(item.label));
  if (!items.length) return null;
  return el(
    'div',
    { class: 'wrap' },
    el(
      'dl',
      { class: 'case-highlights', 'aria-label': 'Results at a glance' },
      items.map((item, i) => {
        const node = el('div', { class: 'case-highlight' }, el('dt', { text: item.label }), el('dd', { class: 'case-highlight__value', text: item.value }), isTodo(item.note) ? null : el('dd', { class: 'case-highlight__note', text: item.note }));
        node.style.setProperty('--i', String(i));
        return node;
      })
    )
  );
}

/** Two groups side by side (for example urban and suburban shops), one row per measure. */
function comparisonBlock(spec) {
  if (!spec || !Array.isArray(spec.columns) || !Array.isArray(spec.rows) || spec.columns.length < 2) return null;
  const rows = spec.rows.filter((row) => !isTodo(row.label));
  return el(
    'figure',
    { class: 'compare' },
    el('figcaption', { class: 'compare__title', text: spec.title || 'Comparison' }),
    el(
      'div',
      { class: 'compare__table', role: 'table', 'aria-label': spec.title || 'Comparison' },
      el(
        'div',
        { class: 'compare__row compare__row--head', role: 'row' },
        el('span', { role: 'columnheader', class: 'sr-only', text: 'Measure' }),
        spec.columns.slice(0, 2).map((column, i) => el('span', { role: 'columnheader', class: 'compare__col', 'data-slot': String(i) }, el('i', { 'aria-hidden': 'true' }), column))
      ),
      rows.map((row) => {
        const values = (row.values || []).slice(0, 2);
        const numbers = (row.bars || []).slice(0, 2);
        const max = Math.max(...numbers, 0);
        return el(
          'div',
          { class: 'compare__row', role: 'row' },
          el('span', { role: 'rowheader', class: 'compare__label', text: row.label }),
          values.map((value, i) => {
            const cell = el('span', { role: 'cell', class: 'compare__cell', 'data-slot': String(i) }, el('b', { text: value }));
            if (max > 0 && Number.isFinite(numbers[i])) {
              const bar = el('span', { class: 'compare__bar', 'aria-hidden': 'true' });
              bar.style.setProperty('--w', `${Math.round((numbers[i] / max) * 100)}%`);
              cell.append(bar);
            }
            return cell;
          })
        );
      })
    ),
    isTodo(spec.note) ? null : el('p', { class: 'chart-block__caption', text: spec.note })
  );
}

function chartGallery(project) {
  const charts = (project.charts || []).filter(validChart);
  if (!charts.length) return null;
  return el('div', { class: 'chart-gallery' }, charts.map((spec) => {
    const block = chartBlock(spec);
    if (spec.wide) block.classList.add('is-wide');
    return block;
  }));
}

function embedBlock(sub) {
  const embedUrl = safeUrl(sub.embed_url, { httpsOnly: true });
  const image = safeUrl(sub.image);

  if (embedUrl) {
    let host = 'the dashboard host';
    try {
      host = new URL(embedUrl).hostname.replace(/^www\./, '');
    } catch (error) {
      /* keep the generic wording */
    }
    const frame = el('div', { class: 'embed' });
    const load = () => {
      frame.replaceChildren(
        el('iframe', {
          src: embedUrl,
          title: `${sub.title}: interactive dashboard`,
          loading: 'lazy',
          allowfullscreen: true,
          referrerpolicy: 'strict-origin-when-cross-origin',
        })
      );
    };
    frame.append(
      el(
        'div',
        { class: 'embed__prompt' },
        el('button', { class: 'btn btn--primary', type: 'button', onclick: load }, icon('play'), 'Load interactive dashboard'),
        el('p', { text: `Loads from ${host}. Nothing is downloaded until you choose to load it.` })
      )
    );
    return frame;
  }

  if (image) {
    return el('figure', { class: 'embed' }, el('img', { src: image, alt: sub.image_alt || `${sub.title} screenshot`, loading: 'lazy', decoding: 'async' }));
  }
  return null;
}

function subprojectTabs(project) {
  const subs = project.subprojects || [];
  if (!subs.length) return null;

  const list = el('div', { class: 'tabs__list', role: 'tablist', 'aria-label': 'Parts of this project' });
  const wrapper = el('div', { class: 'tabs' }, list);
  const tabs = [];
  const panels = [];

  subs.forEach((sub, index) => {
    const tab = el('button', {
      class: 'tabs__tab',
      type: 'button',
      role: 'tab',
      id: `tab-${index}`,
      'aria-controls': `panel-${index}`,
      'aria-selected': String(index === 0),
      tabindex: index === 0 ? '0' : '-1',
      text: sub.title,
    });

    const visual = validChart(sub.chart) ? chartBlock(sub.chart) : embedBlock(sub);
    const hasInsight = !isTodo(sub.key_insight);
    const panel = el(
      'div',
      { class: 'tabs__panel', role: 'tabpanel', id: `panel-${index}`, 'aria-labelledby': `tab-${index}`, tabindex: '0', hidden: index !== 0 },
      el('div', { class: 'tabs__panel-head' }, el('h3', { text: sub.title }), sub.tool ? el('span', { class: 'tag', text: sub.tool }) : null),
      el('p', { text: sub.description }),
      filled(sub.steps).length ? el('ul', { class: 'bullets tabs__steps' }, filled(sub.steps).map((step) => el('li', { text: step }))) : null,
      visual,
      hasInsight ? el('div', { class: 'insight' }, el('span', { class: 'insight__label', text: 'Key insight' }), el('p', { text: sub.key_insight })) : null
    );
    if (!visual && !hasInsight) panel.append(pending('Screenshots and the key insight for this part will be added as the work is completed.'));
    else if (!visual) panel.append(pending('A screenshot or live view for this part is coming soon.'));
    else if (!hasInsight) panel.append(pending('The key insight for this part is coming soon.'));

    tabs.push(tab);
    panels.push(panel);
    list.append(tab);
    wrapper.append(panel);
  });

  const select = (index, focus = true) => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
      panels[i].hidden = !active;
    });
    if (focus) tabs[index].focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      let next = null;
      if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
      else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = last;
      if (next === null) return;
      event.preventDefault();
      select(next);
    });
  });

  return wrapper;
}

function artifactGrid(project) {
  const artifacts = Array.isArray(project.artifacts) ? project.artifacts : [];
  if (!artifacts.length) return null;
  return el(
    'div',
    { class: 'artifact-grid' },
    artifacts.map((item) => {
      const file = safeUrl(item.file);
      const preview = safeUrl(item.preview_image);
      return el(
        'article',
        { class: 'artifact' },
        el('div', { class: 'artifact__preview' }, preview ? el('img', { src: preview, alt: `Preview of ${item.title}`, loading: 'lazy', decoding: 'async' }) : icon('file')),
        el(
          'div',
          { class: 'artifact__body' },
          el('h3', { text: item.title }),
          item.description ? el('p', { text: item.description }) : null,
          file
            ? el('a', { class: 'text-link', href: file, download: true }, 'Download', el('span', { class: 'sr-only', text: ` ${item.title}` }))
            : el('p', { class: 'artifact__soon', text: 'Coming soon' })
        )
      );
    })
  );
}

function listOrPending(items, className, pendingText) {
  const ready = filled(items);
  if (!ready.length) return pending(pendingText);
  return el('ul', { class: className }, ready.map((item) => el('li', { text: item })));
}

function caseSections(site, project) {
  const datasetUrl = safeUrl(project.dataset?.url);
  const github = safeUrl(project.github_url);
  const live = safeUrl(project.live_dashboard_url);
  const approach = filled(project.approach);

  return [
    {
      id: 'problem',
      title: 'Business problem',
      content: [isTodo(project.business_problem) ? pending('The business problem will be written up soon.') : el('p', { class: 'case-lead', text: project.business_problem })],
    },
    {
      id: 'dataset',
      title: 'Dataset',
      content: [
        el(
          'div',
          { class: 'dataset-card' },
          el('h3', { text: project.dataset?.name || 'Dataset to be confirmed' }),
          isTodo(project.dataset?.note) ? null : el('p', { text: project.dataset.note }),
          datasetUrl ? el('p', null, externalLink(datasetUrl, 'Open the dataset source')) : null
        ),
      ],
    },
    {
      id: 'approach',
      title: 'Approach',
      content: [approach.length ? el('ol', { class: 'steps' }, approach.map((step) => el('li', null, el('span', { text: step })))) : pending('The step-by-step approach will be added soon.')],
    },
    {
      id: 'tools',
      title: 'Tools',
      content: [
        el('ul', { class: 'tag-list' }, (project.tools || []).map((tool) => el('li', null, el('a', { class: 'tag', href: filterUrl('tool', tool), title: `See all projects that use ${tool}`, text: tool })))),
      ],
    },
    {
      id: 'visuals',
      title: isTodo(project.visuals_title) ? 'Dashboard and visuals' : project.visuals_title,
      content: [
        isTodo(project.visuals_intro) ? null : el('p', { class: 'case-intro', text: project.visuals_intro }),
        chartGallery(project) || (hasChart(project) ? chartBlock(project.chart) : null),
        comparisonBlock(project.comparison),
        (project.subprojects || []).length ? el('h3', { class: 'case-subhead', text: isTodo(project.tabs_title) ? 'Part by part' : project.tabs_title }) : null,
        subprojectTabs(project),
        artifactGrid(project),
      ],
    },
    {
      id: 'insights',
      title: 'Key insights',
      content: [listOrPending(project.insights, 'bullets', 'Insights will be added once the analysis is complete. No numbers are shown here until they are real.')],
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      content: [listOrPending(project.recommendations, 'bullets', 'Recommendations will follow from the insights, once they are in.')],
    },
    {
      id: 'next',
      title: "What I'd improve next",
      content: [listOrPending(project.improvements, 'bullets', 'A short reflection on limits and next steps will be added when the project wraps up.')],
    },
    {
      id: 'links',
      title: 'Links',
      content: [
        project.request && !isTodo(project.request.intro) ? el('p', { class: 'case-intro', text: project.request.intro }) : null,
        el(
          'div',
          { class: 'link-row' },
          live ? externalLink(live, 'Live dashboard', 'btn btn--primary') : null,
          github ? externalLink(github, 'GitHub repository', live ? 'btn btn--secondary' : 'btn btn--primary') : null,
          requestButton(project, github || live ? 'btn btn--secondary' : 'btn btn--primary'),
          datasetUrl ? externalLink(datasetUrl, 'Dataset source', 'btn btn--secondary') : null
        ),
        !github && !live && !project.request ? pending('The GitHub repository and live dashboard links will be added when this project is published.') : null,
      ],
    },
  ];
}

function initTocSpy(toc, sections) {
  if (!('IntersectionObserver' in window)) return;
  const links = new Map($$('a', toc).map((link) => [link.getAttribute('href').slice(1), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((link) => link.removeAttribute('aria-current'));
        links.get(entry.target.id)?.setAttribute('aria-current', 'true');
      }
    },
    { rootMargin: '-20% 0px -70% 0px' }
  );
  sections.forEach((section) => observer.observe(section));
}

function renderNotFound(root, projects) {
  document.title = 'Project not found';
  root.append(
    el(
      'div',
      { class: 'wrap notfound' },
      el('p', { class: 'notfound__code', text: 'Project not found' }),
      el('h1', { text: "That project isn't here." }),
      el('p', { text: 'The link may be out of date, or the project may have been renamed. Here is everything that is available:' }),
      el('ul', { class: 'bullets' }, projects.map((project) => el('li', null, el('a', { class: 'text-link', href: projectUrl(project), text: project.title })))),
      el('p', null, el('a', { class: 'btn btn--secondary', href: './#projects' }, icon('arrow-left'), 'Back to all projects'))
    )
  );
}

export function initProjectPage({ site, projects }) {
  const root = $('#case-root');
  if (!root) return;

  const id = new URLSearchParams(window.location.search).get('id');
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) {
    renderNotFound(root, projects);
    return;
  }

  const project = projects[index];
  updateCaseMeta(site, project);

  // A project can choose its own section order with "section_order" (list of section ids).
  let sections = caseSections(site, project);
  if (Array.isArray(project.section_order) && project.section_order.length) {
    const rank = (id) => {
      const i = project.section_order.indexOf(id);
      return i === -1 ? 999 : i;
    };
    sections = [...sections].sort((a, b) => rank(a.id) - rank(b.id));
  }
  const sectionNodes = sections.map((section) =>
    el('section', { class: 'case-section', id: section.id, 'aria-labelledby': `${section.id}-title` }, el('h2', { id: `${section.id}-title`, text: section.title }), ...section.content)
  );
  const toc = el(
    'nav',
    { class: 'case__toc', 'aria-label': 'On this page' },
    el('ol', null, sections.map((section) => el('li', null, el('a', { href: `#${section.id}`, text: section.title }))))
  );

  const cover = coverImage(project, { eager: true });
  const previous = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];

  root.append(
    el(
      'article',
      { class: 'case' },
      caseHeader(site, project),
      highlightStrip(project),
      cover && !project.hide_cover ? el('div', { class: 'wrap' }, el('figure', { class: 'case__cover' }, cover)) : null,
      el('div', { class: 'wrap case__layout' }, toc, el('div', { class: 'case__content' }, sectionNodes)),
      projects.length > 1
        ? el(
            'nav',
            { class: 'wrap case__nav', 'aria-label': 'More projects' },
            el('a', { href: projectUrl(previous) }, el('span', { text: 'Previous project' }), el('strong', { text: previous.title })),
            el('a', { href: projectUrl(next) }, el('span', { text: 'Next project' }), el('strong', { text: next.title }))
          )
        : null
    )
  );

  initTocSpy(toc, sectionNodes);
}
