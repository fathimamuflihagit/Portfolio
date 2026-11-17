/*
 * story.js
 * ---------------------------------------------------------------------------
 * Story blocks for case-study pages. A project opts in with a "story" list in
 * data/projects.json; each entry has a "type":
 *
 *   chapter       A numbered chapter: title, text, optional stats and visual
 *   flow          An animated, clickable walk through numbered steps
 *   decisions     "Chose X over Y" cards
 *   budget        A cost gauge against a budget, plus optional comparison bars
 *   matrix        A who-can-access-what grid
 *   split         Two columns side by side (for example, who is responsible)
 *   checklist     Requirements, each ticked with how it was met
 *   evidence      Original images (diagram, screenshots) that open full size
 *
 * Any text can be a plain string, or { "plain": "...", "tech": "..." }. The
 * reader picks "In plain words" or "Under the hood" with the switch at the
 * top of the story, and every two-level text on the page follows.
 * ---------------------------------------------------------------------------
 */

import { el, isTodo, safeUrl, prefersReducedMotion } from './projects.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MODE_KEY = 'story-mode';

// Simple line icons on a 24 x 24 grid (generic shapes, not product logos).
const GLYPHS = {
  store: '<path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10h18M9 20v-6h6v6"/>',
  file: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  bucket: '<path d="M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3zM4 6l1.8 13c.2 1.2 2.9 2 6.2 2s6-.8 6.2-2L20 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  catalog: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5M11 8.5v5"/>',
  chart: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16v-4M11 16V8M15 16v-6M19 16v-2"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .7 3 2.8 3 6"/>',
  shield: '<path d="M12 3l8 3v6c0 4.6-3.4 8.3-8 9-4.6-.7-8-4.4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  log: '<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  maple: '<path d="M12 2l1.6 3.6 2.2-1.1-.6 4.4 3.3-2.2-.5 2.3 2.5.6-2.2 2.6 1 1.6-4.6.4.4 3.1L12 15.6 8.9 17.3l.4-3.1-4.6-.4 1-1.6L3.5 9.6 6 9l-.5-2.3 3.3 2.2-.6-4.4 2.2 1.1z"/><path d="M12 15.6V22"/>',
  dollar: '<path d="M12 3v18M16.5 7.5C16 6 14.3 5 12 5c-2.8 0-4.5 1.4-4.5 3.3 0 4.4 9 2.6 9 7 0 2-1.8 3.4-4.5 3.4-2.4 0-4.2-1.1-4.7-2.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
};

function glyph(name, className = 'story-icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = GLYPHS[name] || GLYPHS.file;
  return svg;
}

/** Text that may come in two versions: plain words and technical detail. */
function say(value, tag = 'span', className = '') {
  if (value && typeof value === 'object' && ('plain' in value || 'tech' in value)) {
    const plain = isTodo(value.plain) ? value.tech : value.plain;
    const tech = isTodo(value.tech) ? value.plain : value.tech;
    if (plain === tech) return el(tag, { class: className || null, text: plain });
    return el(tag, { class: className || null }, el('span', { class: 'say-plain', text: plain }), el('span', { class: 'say-tech', text: tech }));
  }
  return isTodo(value) ? null : el(tag, { class: className || null, text: value });
}

/** Runs once, the first time a node scrolls into view. */
function onFirstView(node, callback, threshold = 0.35) {
  if (!('IntersectionObserver' in window)) {
    callback();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      callback();
    },
    { threshold }
  );
  observer.observe(node);
}

function countUp(node, target, { prefix = '', suffix = '', decimals = 0, duration = 1100 } = {}) {
  const format = (value) => `${prefix}${value.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  if (prefersReducedMotion()) {
    node.textContent = format(target);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    node.textContent = format(target * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Blocks ------------------------------------------------------------------ */

function statRow(stats) {
  if (!Array.isArray(stats) || !stats.length) return null;
  return el(
    'dl',
    { class: 'story-stats' },
    stats.map((stat) => el('div', { class: 'story-stat' }, el('dt', null, say(stat.label)), el('dd', { text: stat.value })))
  );
}

/** Chapter 1 visual: many separate store files flowing into one history. */
function visualFiles(visual) {
  const count = Math.min(Number(visual.count) || 50, 60);
  const grid = el('div', { class: 'files__grid', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i += 1) {
    const dot = el('span', { class: 'files__store' });
    dot.style.setProperty('--d', `${(i % 10) * 0.12 + Math.floor(i / 10) * 0.3}s`);
    grid.append(dot);
  }
  const lane = el('div', { class: 'files__lane', 'aria-hidden': 'true' });
  for (let i = 0; i < 4; i += 1) {
    const packet = el('span', { class: 'files__packet' });
    packet.style.setProperty('--d', `${i * 0.6}s`);
    lane.append(packet);
  }
  return el(
    'figure',
    { class: 'files', role: 'img', 'aria-label': visual.alt || 'Many store files flowing into one sales history' },
    el('div', { class: 'files__side' }, grid, el('figcaption', { class: 'files__label', text: visual.from || `${count} stores` })),
    lane,
    el('div', { class: 'files__side files__side--to' }, el('span', { class: 'files__lake' }, glyph('bucket')), el('span', { class: 'files__label', text: visual.to || 'One sales history' }))
  );
}

function chapterBlock(block, index) {
  const visual = block.visual?.kind === 'files' ? visualFiles(block.visual) : null;
  const chips = Array.isArray(block.chips) && block.chips.length
    ? el(
        'ul',
        { class: 'story-chips' },
        block.chips.map((chip, i) => {
          const node = el('li', { class: 'story-chip' }, glyph(chip.icon || 'check'), say(chip.text));
          node.style.setProperty('--i', String(i));
          return node;
        })
      )
    : null;
  const node = el(
    'section',
    { class: `story-chapter${visual ? ' has-visual' : ''}`, 'aria-labelledby': `story-ch-${index}` },
    el(
      'div',
      { class: 'story-chapter__text' },
      el('p', { class: 'story-kicker' }, el('span', { class: 'story-kicker__num', text: String(block.number ?? index + 1).padStart(2, '0') }), block.kicker || ''),
      el('h3', { class: 'story-title', id: `story-ch-${index}`, text: block.title }),
      say(block.text, 'p', 'story-lead'),
      statRow(block.stats),
      chips
    ),
    visual
  );
  onFirstView(node, () => node.classList.add('is-in'), 0.2);
  return node;
}

/** Animated, clickable pipeline: "follow one day of data". */
function flowBlock(block) {
  const steps = block.steps || [];
  const region = block.region || {};
  const inRegion = (i) => i >= (region.from ?? 0) && i <= (region.to ?? steps.length - 1);
  const wrap = el('section', { class: 'flow', 'aria-label': block.title || 'How the data flows' });

    const panel = el('div', { class: 'flow__panel', 'aria-live': 'polite' });
  const buttons = [];

  // Steps outside the region (people) sit before / after the dashed region frame.
  const before = el('div', { class: 'flow__group' });
  const regionBox = el('div', { class: 'flow__group flow__region' }, el('span', { class: 'flow__region-label' }, glyph('maple', 'story-icon story-icon--sm'), region.label || 'Region'));
  const after = el('div', { class: 'flow__group' });
  const regionTrack = el('div', { class: 'flow__track' });
  regionBox.append(regionTrack);
  for (let i = 0; i < 5; i += 1) {
    const packet = el('span', { class: 'flow__packet', 'aria-hidden': 'true' });
    packet.style.setProperty('--d', `${i * 0.9}s`);
    regionBox.append(packet);
  }

  steps.forEach((step, i) => {
    const button = el(
      'button',
      { class: 'flow__step', type: 'button', id: `flow-tab-${i}`, 'aria-controls': 'flow-panel' },
      el('span', { class: 'flow__badge', text: String(step.n ?? i + 1) }),
      el('span', { class: 'flow__icon' }, glyph(step.icon)),
      el('span', { class: 'flow__name', text: step.name }),
      el('span', { class: 'flow__service', text: step.service || '' })
    );
    button.style.setProperty('--i', String(i));
    buttons.push(button);
    if (!inRegion(i) && i < (region.from ?? 0)) before.append(button);
    else if (inRegion(i)) regionTrack.append(button);
    else after.append(button);
  });
  panel.id = 'flow-panel';

  const lane = el('div', { class: 'flow__lane' }, before.childElementCount ? before : null, regionBox, after.childElementCount ? after : null);

  const guard = block.guard
    ? el(
        'div',
        { class: 'flow__guard' },
        el('span', { class: 'flow__guard-label' }, glyph('shield', 'story-icon story-icon--sm'), say(block.guard.label)),
        el('ul', { class: 'flow__guard-list' }, (block.guard.items || []).map((item) => el('li', null, glyph(item.icon || 'lock', 'story-icon story-icon--sm'), el('b', { text: item.name }), say(item.text))))
      )
    : null;

  let current = -1;
  let timer = null;
  const playButton = el('button', { class: 'btn btn--secondary btn--small flow__play', type: 'button', 'aria-pressed': 'false' });

  function show(i, { focus = false } = {}) {
    current = i;
    buttons.forEach((button, j) => {
      const active = j === i;
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.classList.toggle('is-done', j < i);
    });
    const step = steps[i];
    panel.replaceChildren(
      el('p', { class: 'flow__panel-kicker', text: `Step ${step.n ?? i + 1} of ${steps.length}${step.service ? ` · ${step.service}` : ''}` }),
      el('h4', { class: 'flow__panel-title', text: step.name }),
      say(step.text, 'p', 'flow__panel-text')
    );
    panel.classList.remove('is-in');
    void panel.offsetWidth; // restart the fade
    panel.classList.add('is-in');
    if (focus) buttons[i].focus();
  }

  function setPlaying(on) {
    window.clearInterval(timer);
    timer = null;
    playButton.setAttribute('aria-pressed', String(on));
    playButton.replaceChildren(glyph(on ? 'pause' : 'play', 'icon'), on ? 'Pause the journey' : 'Play the journey');
    wrap.classList.toggle('is-playing', on);
    panel.setAttribute('aria-live', on ? 'off' : 'polite');
    if (on) {
      timer = window.setInterval(() => show((current + 1) % steps.length), 3200);
    }
  }

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => {
      setPlaying(false);
      show(i);
      // In the stacked (narrow) layout the details sit below all the steps: bring them into view.
      if (wrap.clientWidth < 736) panel.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
    button.addEventListener('keydown', (event) => {
      const last = buttons.length - 1;
      let next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = i === last ? 0 : i + 1;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = i === 0 ? last : i - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = last;
      if (next === null) return;
      event.preventDefault();
      setPlaying(false);
      show(next, { focus: true });
    });
  });
  playButton.addEventListener('click', () => setPlaying(playButton.getAttribute('aria-pressed') !== 'true'));
  wrap.addEventListener('focusin', (event) => {
    if (event.target !== playButton) setPlaying(false);
  });

  wrap.append(
    el('div', { class: 'flow__head' }, el('div', null, el('h3', { class: 'story-title', text: block.title || 'How it works' }), say(block.intro, 'p', 'story-lead')), playButton),
    lane,
    guard,
    panel
  );
  show(0);
  setPlaying(false);
  // Start the walkthrough automatically the first time it is seen (not for reduced motion).
  if (!prefersReducedMotion()) onFirstView(wrap, () => setPlaying(true), 0.5);
  return wrap;
}

function decisionsBlock(block) {
  return el(
    'section',
    { class: 'decisions', 'aria-label': block.title || 'Decisions' },
    el('h3', { class: 'story-title', text: block.title || 'Decisions' }),
    say(block.intro, 'p', 'story-lead'),
    el(
      'div',
      { class: 'decisions__grid' },
      (block.items || []).map((item, i) => {
        const card = el(
          'article',
          { class: 'decision reveal' },
          el(
            'div',
            { class: 'decision__vs' },
            el('span', { class: 'decision__pick' }, glyph('check', 'story-icon story-icon--sm'), item.chose),
            el('span', { class: 'decision__over', text: 'over' }),
            el('span', { class: 'decision__skip' }, glyph('cross', 'story-icon story-icon--sm'), item.over)
          ),
          el('h4', { class: 'decision__title', text: item.title }),
          say(item.why, 'p', 'decision__why'),
          isTodo(item.number) ? null : el('p', { class: 'decision__number' }, el('b', { text: item.number }), ' ', say(item.number_label))
        );
        card.style.setProperty('--reveal-delay', `${(i % 3) * 0.08}s`);
        return card;
      })
    )
  );
}

function budgetBlock(block) {
  const spend = Number(block.spend) || 0;
  const limit = Number(block.limit) || 1;
  const share = Math.min(100, (spend / limit) * 100);
  const amount = el('b', { class: 'budget__amount', text: `${block.currency || ''}${spend}` });
  const fill = el('span', { class: 'budget__fill' });
  fill.style.setProperty('--w', `${share.toFixed(1)}%`);

  const gauge = el(
    'div',
    { class: 'budget__gauge', role: 'img', 'aria-label': `${block.currency || ''}${spend} a month out of a ${block.currency || ''}${limit} budget (${Math.round(share)}%)` },
    el('div', { class: 'budget__bar' }, fill, el('span', { class: 'budget__limit' }, el('span', { text: `Budget ${block.currency || ''}${limit}` }))),
    el('div', { class: 'budget__scale', 'aria-hidden': 'true' }, el('span', { text: `${block.currency || ''}0` }), el('span', { text: `${block.currency || ''}${limit}` }))
  );

  const parts = (block.parts || []).filter((part) => Number.isFinite(part.value)).sort((a, b) => b.value - a.value);
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const stack = parts.length
    ? el(
        'div',
        { class: 'budget__parts' },
        el('p', { class: 'budget__parts-title', text: block.parts_title || 'Where the money goes' }),
        el(
          'ul',
          { class: 'budget__list' },
          parts.map((part, i) => {
            const bar = el('span', { class: 'budget__part-bar' });
            bar.style.setProperty('--w', `${((part.value / parts[0].value) * 100).toFixed(1)}%`);
            bar.style.setProperty('--i', String(i));
            return el(
              'li',
              { class: `budget__part${i === 0 ? ' is-top' : ''}` },
              el('span', { class: 'budget__part-name', text: part.name }),
              el('span', { class: 'budget__part-track' }, bar),
              el('span', { class: 'budget__part-value', text: `${block.part_prefix || '$'}${part.value.toFixed(2)}` }),
              el('span', { class: 'budget__part-share', text: (part.value / total) * 100 < 1 ? '<1%' : `${Math.round((part.value / total) * 100)}%` })
            );
          })
        ),
        say(block.parts_note, 'p', 'budget__note')
      )
    : null;

  const compare = block.compare
    ? (() => {
        const items = block.compare.items || [];
        const max = Math.max(...items.map((item) => item.value));
        return el(
          'div',
          { class: 'budget__compare' },
          el('p', { class: 'budget__parts-title', text: block.compare.title }),
          items.map((item, i) => {
            const bar = el('span', { class: `budget__cmp-bar${i === 0 ? ' is-good' : ''}` });
            bar.style.setProperty('--w', `${Math.max(0.6, (item.value / max) * 100).toFixed(2)}%`);
            return el('div', { class: 'budget__cmp' }, el('span', { class: 'budget__cmp-label' }, say(item.label)), el('span', { class: 'budget__cmp-track' }, bar), el('b', { class: 'budget__cmp-value', text: item.display }));
          }),
          say(block.compare.note, 'p', 'budget__note')
        );
      })()
    : null;

  const wrap = el(
    'section',
    { class: 'budget', 'aria-label': block.title || 'Budget' },
    el('h3', { class: 'story-title', text: block.title || 'Budget' }),
    say(block.intro, 'p', 'story-lead'),
    el(
      'div',
      { class: 'budget__hero' },
      el('div', { class: 'budget__figure' }, amount, el('span', { class: 'budget__per', text: block.per || 'a month' })),
      el('div', { class: 'budget__verdict' }, glyph('check', 'story-icon'), say(block.verdict))
    ),
    gauge,
    stack,
    compare
  );
  onFirstView(wrap, () => {
    wrap.classList.add('is-in');
    countUp(amount, spend, { prefix: block.currency || '' });
  });
  return wrap;
}

function matrixBlock(block) {
  const cols = block.columns || [];
  const mark = (value) => {
    if (value === true || value === 'yes') return el('span', { class: 'matrix__yes' }, glyph('check', 'story-icon story-icon--sm'), el('span', { class: 'sr-only', text: 'Yes' }));
    if (value === false || value === 'no' || !value) return el('span', { class: 'matrix__no' }, glyph('cross', 'story-icon story-icon--sm'), el('span', { class: 'sr-only', text: 'No' }));
    return el('span', { class: 'matrix__part' }, glyph('check', 'story-icon story-icon--sm'), el('span', { class: 'matrix__note', text: value }));
  };
  return el(
    'section',
    { class: 'matrix', 'aria-label': block.title || 'Access' },
    el('h3', { class: 'story-title', text: block.title || 'Who can see what' }),
    say(block.intro, 'p', 'story-lead'),
    el(
      'div',
      { class: 'matrix__scroll', tabindex: '0', role: 'region', 'aria-label': 'Access table (scrolls sideways on small screens)' },
      el(
        'table',
        { class: 'matrix__table' },
        el('thead', null, el('tr', null, el('th', { scope: 'col', text: block.corner || 'Who' }), cols.map((col) => el('th', { scope: 'col', text: col })))),
        el(
          'tbody',
          null,
          (block.rows || []).map((row) =>
            el('tr', null, el('th', { scope: 'row' }, el('span', { class: 'matrix__who', text: row.who }), say(row.note, 'span', 'matrix__who-note')), (row.cells || []).map((cell) => el('td', null, mark(cell))))
          )
        )
      )
    ),
    say(block.note, 'p', 'story-note')
  );
}

function splitBlock(block) {
  return el(
    'section',
    { class: 'split', 'aria-label': block.title || 'Comparison' },
    el('h3', { class: 'story-title', text: block.title }),
    say(block.intro, 'p', 'story-lead'),
    el(
      'div',
      { class: 'split__grid' },
      (block.columns || []).slice(0, 2).map((col, i) =>
        el(
          'div',
          { class: `split__col reveal${i === 1 ? ' is-second' : ''}` },
          el('p', { class: 'split__label' }, glyph(col.icon || 'shield', 'story-icon story-icon--sm'), col.label),
          el('h4', { class: 'split__title' }, say(col.title)),
          el('ul', { class: 'split__list' }, (col.items || []).map((item) => el('li', null, say(item))))
        )
      )
    )
  );
}

function checklistBlock(block) {
  return el(
    'section',
    { class: 'checklist', 'aria-label': block.title || 'Requirements' },
    el('h3', { class: 'story-title', text: block.title || 'Requirements met' }),
    say(block.intro, 'p', 'story-lead'),
    el(
      'ol',
      { class: 'checklist__list' },
      (block.items || []).map((item, i) => {
        const node = el(
          'li',
          { class: 'checklist__item reveal' },
          el('span', { class: 'checklist__tick' }, glyph('check', 'story-icon story-icon--sm')),
          el('div', null, el('p', { class: 'checklist__need', text: item.need }), say(item.how, 'p', 'checklist__how'))
        );
        node.style.setProperty('--reveal-delay', `${(i % 3) * 0.06}s`);
        return node;
      })
    )
  );
}

function evidenceBlock(block) {
  return el(
    'section',
    { class: 'evidence', 'aria-label': block.title || 'Original work' },
    el('h3', { class: 'story-title', text: block.title || 'Original work' }),
    say(block.intro, 'p', 'story-lead'),
    el(
      'div',
      { class: 'evidence__grid' },
      (block.items || []).map((item) => {
        const src = safeUrl(item.image);
        if (!src) return null;
        return el(
          'figure',
          { class: `evidence__item${item.wide ? ' is-wide' : ''}` },
          el(
            'a',
            { class: 'evidence__frame', href: src, target: '_blank', rel: 'noopener' },
            el('img', { src, alt: item.alt || item.caption || '', loading: 'lazy', decoding: 'async', width: item.width || null, height: item.height || null }),
            el('span', { class: 'evidence__zoom' }, glyph('expand', 'story-icon story-icon--sm'), 'Open full size', el('span', { class: 'sr-only', text: ' (opens in a new tab)' }))
          ),
          isTodo(item.caption) ? null : el('figcaption', { text: item.caption })
        );
      })
    )
  );
}

const RENDERERS = { chapter: chapterBlock, flow: flowBlock, decisions: decisionsBlock, budget: budgetBlock, matrix: matrixBlock, split: splitBlock, checklist: checklistBlock, evidence: evidenceBlock };

/** Builds the whole story, with the plain / technical switch at the top. */
export function renderStory(story) {
  const blocks = (story.blocks || []).filter((block) => RENDERERS[block.type]);
  let mode = 'plain';
  try {
    mode = localStorage.getItem(MODE_KEY) === 'tech' ? 'tech' : 'plain';
  } catch (error) {
    /* storage unavailable */
  }

  const root = el('div', { class: 'story', 'data-mode': mode });
  const options = [
    ['plain', story.plain_label || 'In plain words'],
    ['tech', story.tech_label || 'Under the hood'],
  ];
  const switcher = el(
    'div',
    { class: 'story-switch', role: 'group', 'aria-label': 'How should this story be explained?' },
    el('span', { class: 'story-switch__label', text: story.switch_label || 'Explain it' }),
    el(
      'div',
      { class: 'story-switch__options' },
      options.map(([value, label]) =>
        el('button', {
          class: 'story-switch__btn',
          type: 'button',
          'aria-pressed': String(mode === value),
          'data-mode': value,
          text: label,
          onclick: () => {
            root.dataset.mode = value;
            switcher.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === value)));
            try {
              localStorage.setItem(MODE_KEY, value);
            } catch (error) {
              /* storage unavailable */
            }
          },
        })
      )
    ),
    say(story.switch_hint, 'span', 'story-switch__hint')
  );

  // The switch only appears when the story actually has two versions of some text.
  const twoLevels = JSON.stringify(story.blocks || []).includes('"plain"');
  if (twoLevels) root.append(switcher);
  root.append(...blocks.map((block, i) => RENDERERS[block.type](block, i)).filter(Boolean));
  return root;
}
