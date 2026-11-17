/*
 * main.js
 * ---------------------------------------------------------------------------
 * Runs on every page. It loads the two data files, then:
 *   - wires up the shared interface (theme, menu, scroll progress, toasts)
 *   - on index.html, builds every section from data/site.json
 *   - on project.html, hands over to the case-study builder in projects.js
 *
 * You should not need to edit this file to change content. Edit the JSON files.
 * ---------------------------------------------------------------------------
 */

import {
  $,
  $$,
  el,
  isTodo,
  filled,
  slug,
  icon,
  badge,
  safeUrl,
  externalLink,
  prefersReducedMotion,
  observeReveals,
  loadData,
  projectUrl,
  toolCounts,
  renderFeatured,
  initProjectGrid,
  initProjectPage,
  refreshCharts,
} from './projects.js';

const SIMPLE_ICONS_URL = 'https://cdn.jsdelivr.net/npm/simple-icons@16.38.0/icons/';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* Shared interface --------------------------------------------------------- */

function toast(message) {
  const region = $('#toast-region');
  if (!region) return;
  const node = el('div', { class: 'toast', text: message });
  region.append(node);
  window.setTimeout(() => {
    node.classList.add('is-leaving');
    window.setTimeout(() => node.remove(), 300);
  }, 2600);
}

function initTheme() {
  const root = document.documentElement;
  const button = $('#theme-toggle');
  const themeColor = $('meta[name="theme-color"]');

  const apply = (theme, save) => {
    root.setAttribute('data-theme', theme);
    if (button) button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#0d1517' : '#f6f7f5');
    if (save) {
      try {
        localStorage.setItem('theme', theme);
      } catch (error) {
        /* private browsing: the choice simply is not remembered */
      }
      document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    }
  };

  apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
  if (button) button.addEventListener('click', () => apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));
  document.addEventListener('themechange', refreshCharts);
}

function initScrollUi() {
  const header = $('#site-header');
  const bar = $('#progress-bar');
  const toTop = $('#to-top');
  const pill = $('#avail-pill');
  const navPill = $('#nav-avail');
  const contact = $('#contact');
  const isHome = document.body.dataset.page === 'home';
  let contactVisible = false;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const past = y > window.innerHeight * 0.6;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (toTop) toTop.classList.toggle('is-visible', past);
    if (pill) pill.classList.toggle('is-visible', past && !contactVisible);
    // On the home page the hero already shows the badge, so the header copy waits until you scroll.
    if (navPill) navPill.classList.toggle('is-visible', !isHome || past);
  };
  const request = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  update();

  if (contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        contactVisible = entry.isIntersecting;
        request();
      },
      { threshold: 0.15 }
    ).observe(contact);
  }

  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      const brand = $('.brand');
      if (brand) brand.focus({ preventScroll: true });
    });
  }
}

function initMenu() {
  const button = $('#menu-toggle');
  const menu = $('#mobile-menu');
  const header = $('#site-header');
  if (!button || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    header.classList.toggle('is-open', open);
  };

  button.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      button.focus();
    }
  });
  window.matchMedia('(min-width: 56rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

/* Data binding helpers ----------------------------------------------------- */

const getPath = (object, path) => path.split('.').reduce((value, key) => (value === null || value === undefined ? undefined : value[key]), object);

/** Fill every element that has data-bind="some.path" with text from site.json. */
function bindText(site) {
  for (const node of $$('[data-bind]')) {
    const value = getPath(site, node.dataset.bind);
    if (isTodo(value)) {
      if (!node.textContent.trim()) node.hidden = true;
      continue;
    }
    node.textContent = value;
  }
}

function bindResume(site) {
  const href = safeUrl(site.person?.resume);
  const fileName = `${(site.person?.name || 'Resume').trim().replace(/\s+/g, '-')}-Resume.pdf`;
  for (const link of $$('[data-resume]')) {
    if (!href) {
      link.hidden = true;
      continue;
    }
    link.setAttribute('href', href);
    link.setAttribute('download', fileName);
  }
}

function parseYm(value) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value || '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, match[3] ? Number(match[3]) : 1) : null;
}

const monthDiff = (from, to) => (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
const monthYear = (date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
const longDate = (date) => `${MONTHS_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

function initFooter(site) {
  const copy = $('#footer-copy');
  const updated = $('#footer-updated');
  if (copy) copy.textContent = `© ${new Date().getFullYear()} ${site.person?.name || ''}`;
  const date = parseYm(site.site?.last_updated);
  if (updated && date) {
    updated.replaceChildren('Last updated ', el('time', { datetime: site.site.last_updated, text: longDate(date) }));
  }
}

/* Home page sections ------------------------------------------------------- */

function renderHero(site) {
  const host = $('#hero-roles');
  const roles = filled(site.hero?.roles);
  if (host && roles.length) {
    host.append(el('span', { text: site.hero.rotator_label || 'Open to roles as' }));
    if (prefersReducedMotion() || roles.length === 1) {
      host.append(el('span', { class: 'hero__roles-static', text: roles.join(', ') }));
    } else {
      const items = roles.map((role, index) => el('span', { class: `rotator__item${index === 0 ? ' is-active' : ''}`, text: role }));
      host.append(el('span', { class: 'rotator', 'aria-hidden': 'true' }, items), el('span', { class: 'sr-only', text: roles.join(', ') }));
      let current = 0;
      window.setInterval(() => {
        if (document.hidden) return;
        const leaving = items[current];
        current = (current + 1) % items.length;
        leaving.classList.remove('is-active');
        leaving.classList.add('is-leaving');
        items[current].classList.add('is-active');
        window.setTimeout(() => leaving.classList.remove('is-leaving'), 500);
      }, 2600);
    }
  }

  const meta = $('#hero-meta');
  if (meta) {
    const education = site.education || {};
    const parts = [[education.program, education.school].filter(Boolean).join(', '), site.person?.location].filter((part) => !isTodo(part));
    meta.textContent = parts.length ? `${parts.join('. ')}.` : '';
  }

  // Show the hero once its font is ready (or after a short wait), so the headline
  // never re-wraps in front of the visitor and nothing jumps.
  const inner = $('#hero-inner');
  if (inner) {
    const show = () => inner.classList.add('is-ready');
    if (document.fonts && document.fonts.load) {
      const timeout = new Promise((resolve) => window.setTimeout(resolve, 1200));
      Promise.race([document.fonts.load('600 1em "Plus Jakarta Sans"'), timeout]).then(show, show);
    } else {
      show();
    }
  }
}

function computeStat(source, site, projects) {
  const phases = site.journey?.phases || [];
  const coursesWith = (status) => phases.filter((phase) => slug(phase.status) === status).flatMap((phase) => phase.courses || []).length;
  const withStatus = (...statuses) => projects.filter((project) => statuses.includes(slug(project.status))).length;
  const sources = {
    projects_total: () => projects.length,
    projects_active: () => withStatus('in-progress', 'completed'),
    projects_completed: () => withStatus('completed'),
    tools: () => (site.skills?.groups || []).flatMap((group) => group.tools || []).length,
    datasets: () => new Set(projects.map((project) => project.dataset?.url).filter(Boolean)).size,
    courses_current: () => coursesWith('in-progress'),
    courses_completed: () => coursesWith('completed'),
    certifications_earned: () => (site.certifications?.items || []).filter((item) => slug(item.status) === 'earned').length,
  };
  return sources[source] ? sources[source]() : 0;
}

function animateCount(node, target) {
  if (prefersReducedMotion() || target === 0) {
    node.textContent = String(target);
    return;
  }
  const duration = 900;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = String(Math.round(target * eased));
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

function renderStats(site, projects) {
  const host = $('#stats-list');
  if (!host) return;
  const stats = (site.stats || []).filter((stat) => !isTodo(stat.label));
  if (!stats.length) {
    host.closest('section').hidden = true;
    return;
  }
  const counters = [];
  for (const stat of stats) {
    const target = typeof stat.value === 'number' ? stat.value : computeStat(stat.source, site, projects);
    const value = el('span', { class: 'stat__value', text: String(target) });
    counters.push({ node: value, target });
    host.append(el('li', { class: 'stat' }, value, el('span', { class: 'stat__label', text: stat.label })));
  }
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      counters.forEach(({ node, target }) => animateCount(node, target));
    },
    { threshold: 0.4 }
  );
  observer.observe(host);
}

function renderAbout(site) {
  const about = site.about || {};
  const text = $('#about-text');
  const aside = $('#about-aside');
  const bring = $('#about-bring');

  if (text) text.append(...filled(about.paragraphs).map((paragraph) => el('p', { text: paragraph })));

  if (aside) {
    const photo = safeUrl(site.person?.photo);
    if (photo) {
      aside.append(el('div', { class: 'portrait' }, el('img', { src: photo, alt: site.person.photo_alt || `Portrait of ${site.person.name}`, width: 800, height: 1000, loading: 'lazy', decoding: 'async' })));
    } else {
      const words = (site.person?.name || '').trim().split(/\s+/).filter(Boolean);
      const initials = words.length ? `${words[0][0]}${words.length > 1 ? words[words.length - 1][0] : ''}`.toUpperCase() : '';
      aside.append(el('div', { class: 'portrait portrait--placeholder', role: 'img', 'aria-label': 'Photo coming soon' }, el('span', { 'aria-hidden': 'true', text: initials })));
    }
  }

  // "Currently learning" sits under the About text. Update it monthly in site.json.
  if (text) {
    const learning = about.currently_learning;
    const items = filled(learning?.items);
    if (learning && items.length) {
      text.append(
        el(
          'div',
          { class: 'learning' },
          el('div', { class: 'learning__head' }, el('h3', { class: 'learning__title', text: 'Currently learning' }), isTodo(learning.updated) ? null : el('span', { class: 'learning__date', text: learning.updated })),
          isTodo(learning.intro) ? null : el('p', { text: learning.intro }),
          el('ul', null, items.map((item) => el('li', { text: item })))
        )
      );
    }
  }

  if (bring) {
    const cards = (about.bring || []).filter((item) => !isTodo(item.title) && !isTodo(item.text));
    bring.append(...cards.map((item) => el('div', { class: 'bring__item' }, el('h4', { text: item.title }), el('p', { text: item.text }))));
    if (!cards.length) {
      bring.hidden = true;
      const heading = bring.previousElementSibling;
      if (heading) heading.hidden = true;
    }
  }
}

function renderRecruiterFacts(site) {
  const host = $('#recruiter-facts');
  if (!host) return;
  const education = site.education || {};
  const rows = [
    ['Availability', site.availability?.summary],
    ['Education', [education.program, education.school, education.expected_graduation ? `expected ${education.expected_graduation}` : ''].filter(Boolean).join(', ')],
    ['Top skills', filled(site.recruiter?.top_skills).join(', ')],
    ['Location', [site.person?.location, site.person?.work_preference].filter((part) => !isTodo(part)).join('. ')],
    ['Work authorization', site.recruiter?.work_authorization],
  ];
  for (const [term, detail] of rows) {
    if (isTodo(detail)) continue;
    host.append(el('div', null, el('dt', { text: term }), el('dd', { text: detail })));
  }
}

/** Swap a chip's monogram for its Simple Icons glyph, if one exists. */
async function loadSkillIcon(holder, iconSlug) {
  if (!/^[a-z0-9_]+$/.test(iconSlug)) return;
  try {
    const response = await fetch(`${SIMPLE_ICONS_URL}${iconSlug}.svg`);
    if (!response.ok) return;
    const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    const path = doc.querySelector('path');
    const d = path && path.getAttribute('d');
    if (!d) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shape.setAttribute('d', d);
    svg.append(shape);
    holder.replaceChildren(svg);
  } catch (error) {
    /* offline or blocked: the monogram stays */
  }
}

function renderSkills(site, projects, grid) {
  const host = $('#skills-groups');
  if (!host) return;
  const counts = toolCounts(projects);
  const chips = new Map();
  const iconJobs = [];

  for (const group of site.skills?.groups || []) {
    const list = el('ul', { class: 'chip-list' });
    for (const tool of group.tools || []) {
      const count = counts.get(tool.name) || 0;
      const holder = el('span', { class: 'skill-chip__icon', 'aria-hidden': 'true', text: tool.monogram || tool.name.slice(0, 2) });
      if (tool.icon) iconJobs.push(() => loadSkillIcon(holder, tool.icon));
      const noun = count === 1 ? 'project' : 'projects';
      const chip = el(
        'button',
        {
          class: 'skill-chip',
          type: 'button',
          'aria-pressed': 'false',
          'data-tool': tool.name,
          onclick: () => {
            if (!grid) return;
            grid.setTool(tool.name);
            const target = $('#projects');
            if (target) target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
          },
        },
        holder,
        el('span', { class: 'skill-chip__text' }, el('span', { class: 'skill-chip__name', text: tool.name }), isTodo(tool.detail) ? null : el('span', { class: 'skill-chip__detail', text: tool.detail })),
        el('span', { class: 'skill-chip__count', 'aria-hidden': 'true', text: String(count) }),
        el('span', { class: 'sr-only', text: `, used in ${count} ${noun}. Show ${count === 1 ? 'it' : 'them'}.` })
      );
      chips.set(tool.name, chip);
      list.append(el('li', null, chip));
    }
    const concepts = filled(group.concepts);
    host.append(
      el(
        'div',
        { class: 'skill-group' },
        el('h3', { class: 'skill-group__name', text: group.name }),
        list,
        concepts.length ? el('p', { class: 'concepts', text: `Working vocabulary: ${concepts.join(', ')}.` }) : null
      )
    );
  }

  document.addEventListener('filters:change', (event) => {
    chips.forEach((chip, name) => chip.setAttribute('aria-pressed', String(event.detail.tool === name)));
  });

  // Fetch the brand glyphs only when the section is about to be seen.
  if (iconJobs.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        iconJobs.forEach((job) => job());
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(host);
  }
}

function renderProcess(site, projects) {
  const host = $('#process-steps');
  if (!host) return;
  const steps = (site.process?.steps || []).filter((step) => !isTodo(step.name));
  if (!steps.length) {
    host.closest('section').hidden = true;
    return;
  }
  host.append(...steps.map((step) => el('li', { class: 'process__step' }, el('h3', { class: 'process__name', text: step.name }), el('p', { class: 'process__text', text: step.text }))));
  const example = projects.find((project) => project.featured) || projects[0];
  const link = $('#process-cta');
  if (link && example) link.setAttribute('href', projectUrl(example));
}

function renderJourney(site) {
  const chartHost = $('#journey-chart');
  const listHost = $('#journey-phases');
  const journey = site.journey;
  if (!chartHost || !listHost || !journey) return;

  const start = parseYm(journey.axis?.start);
  const end = parseYm(journey.axis?.end);
  const phases = (journey.phases || []).filter((phase) => parseYm(phase.start) && parseYm(phase.end));
  const milestones = (journey.milestones || []).filter((item) => parseYm(item.date) && !isTodo(item.title));
  const certTargets = (site.certifications?.items || []).filter((item) => parseYm(item.target) && !isTodo(item.name));

  if (start && end && end >= start) {
    const cols = monthDiff(start, end) + 1;
    const clampIndex = (date) => Math.max(0, Math.min(cols - 1, monthDiff(start, date)));
    const body = el('div', { class: 'gantt__body' });

    for (const phase of phases) {
      const from = clampIndex(parseYm(phase.start));
      const to = clampIndex(parseYm(phase.end));
      const bar = el('div', { class: 'gantt__bar', 'data-status': slug(phase.status || ''), text: `${monthYear(parseYm(phase.start))} to ${monthYear(parseYm(phase.end))}` });
      bar.style.gridColumn = `${from + 1} / ${to + 2}`;
      body.append(el('div', { class: 'gantt__row' }, el('div', { class: 'gantt__label', text: phase.title }), el('div', { class: 'gantt__track' }, bar)));
    }

    const milestoneRow = (label, items) => {
      const track = el('div', { class: 'gantt__track' });
      for (const item of items) {
        const index = clampIndex(item.date);
        const onRight = index < 4;
        const marker = el('div', { class: `gantt__milestone${onRight ? ' gantt__milestone--right' : ''}`, text: item.title });
        marker.style.gridColumn = onRight ? `${index + 2} / -1` : `1 / ${index + 2}`;
        track.append(marker);
      }
      return el('div', { class: 'gantt__row' }, el('div', { class: 'gantt__label', text: label }), track);
    };
    if (milestones.length) body.append(milestoneRow('Milestones', milestones.map((item) => ({ title: item.title, date: parseYm(item.date) }))));
    if (certTargets.length) body.append(milestoneRow('Certifications', certTargets.map((item) => ({ title: item.name, date: parseYm(item.target) }))));

    // "Today" marker, only while the current date is inside the chart.
    const today = new Date();
    const afterEnd = new Date(end.getFullYear(), end.getMonth() + 1, 1);
    let todayPosition = null;
    if (today >= start && today < afterEnd) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      todayPosition = ((monthDiff(start, today) + (today.getDate() - 1) / daysInMonth) / cols) * 100;
    }

    const months = Array.from({ length: cols }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1));
    const axis = el(
      'div',
      { class: 'gantt__axis' },
      el(
        'div',
        { class: 'gantt__months' },
        months.map((month, i) =>
          el(
            'span',
            null,
            el('span', { class: 'is-long', text: MONTHS[month.getMonth()] }),
            el('span', { class: 'is-short', text: MONTHS[month.getMonth()][0] }),
            i === 0 || month.getMonth() === 0 ? el('b', { text: String(month.getFullYear()) }) : null
          )
        )
      )
    );

    const summary = [
      `Timeline from ${monthYear(start)} to ${monthYear(end)}.`,
      ...phases.map((phase) => `${phase.title}: ${monthYear(parseYm(phase.start))} to ${monthYear(parseYm(phase.end))}, ${String(phase.status || '').toLowerCase()}.`),
      ...milestones.map((item) => `${item.title}: ${item.label || monthYear(parseYm(item.date))}.`),
    ].join(' ');

    const gantt = el('div', { class: `gantt${todayPosition === null ? '' : ' gantt--today'}`, role: 'img', 'aria-label': summary }, body, axis);
    gantt.style.setProperty('--cols', String(cols));
    if (todayPosition !== null) gantt.style.setProperty('--today', `${todayPosition.toFixed(2)}%`);
    chartHost.append(gantt);
  }

  // The same information as readable text, in date order.
  const entries = [
    ...phases.map((phase) => ({ sort: parseYm(phase.start).getTime(), phase })),
    ...milestones.map((milestone) => ({ sort: parseYm(milestone.date).getTime() + 1, milestone })),
  ].sort((a, b) => a.sort - b.sort);

  for (const entry of entries) {
    if (entry.milestone) {
      listHost.append(
        el(
          'div',
          { class: 'phase reveal' },
          el('div', null, el('div', { class: 'phase__head' }, el('h3', { class: 'phase__title', text: entry.milestone.title }), el('span', { class: 'phase__dates', text: entry.milestone.label || monthYear(parseYm(entry.milestone.date)) })))
        )
      );
      continue;
    }
    const phase = entry.phase;
    const courses = (phase.courses || []).filter((course) => !isTodo(course.name));
    const hasCodes = courses.some((course) => course.code);
    listHost.append(
      el(
        'div',
        { class: 'phase reveal' },
        el(
          'div',
          null,
          el(
            'div',
            { class: 'phase__head' },
            el('h3', { class: 'phase__title', text: phase.title }),
            phase.status ? badge(phase.status) : null,
            el('span', { class: 'phase__dates', text: `${monthYear(parseYm(phase.start))} to ${monthYear(parseYm(phase.end))}` })
          ),
          isTodo(phase.summary) ? null : el('p', { class: 'phase__summary', text: phase.summary })
        ),
        courses.length
          ? el(
              'ul',
              { class: `course-list${hasCodes ? '' : ' course-list--plain'}`, 'aria-label': `${phase.title} courses` },
              courses.map((course) => el('li', null, hasCodes ? el('span', { class: 'code', text: course.code }) : null, el('span', { text: course.name })))
            )
          : null
      )
    );
  }

  const certLine = $('#journey-certs');
  const certNames = (site.certifications?.items || []).filter((item) => !isTodo(item.name) && slug(item.status) !== 'earned').map((item) => item.name);
  if (certLine && certNames.length) {
    certLine.hidden = false;
    certLine.append(`Certifications planned along the way: ${certNames.join(', ')}. `, el('a', { class: 'text-link', href: '#certifications', text: 'See the certification plan' }));
  }
}

function renderCertifications(site) {
  const host = $('#cert-list');
  if (!host) return;
  const items = (site.certifications?.items || []).filter((item) => !isTodo(item.name));
  if (!items.length) {
    host.closest('section').hidden = true;
    return;
  }
  for (const item of items) {
    const details = safeUrl(item.url);
    const credential = safeUrl(item.credential_url);
    host.append(
      el(
        'article',
        { class: 'cert reveal' },
        el('div', { class: 'cert__top' }, el('span', { text: item.issuer || '' }), badge(item.status || 'Planned')),
        el('h3', { class: 'cert__name', text: item.name }),
        isTodo(item.note) ? null : el('p', { class: 'cert__note', text: item.note }),
        isTodo(item.date) ? null : el('p', { class: 'cert__note', text: item.date }),
        el(
          'div',
          { class: 'cert__links' },
          credential ? externalLink(credential, 'View credential', 'text-link', item.name) : null,
          details ? externalLink(details, credential ? 'About this certification' : 'Exam details', 'text-link', item.name) : null
        )
      )
    );
  }
}

/* Notes: a tiny, safe Markdown reader -------------------------------------- */

const INLINE_PATTERN = '(`[^`]+`)|(\\*\\*[^*]+\\*\\*)|(\\*[^*\\s][^*]*\\*)|(\\[[^\\]]+\\]\\([^)\\s]+\\))';

function appendInline(parent, text) {
  const pattern = new RegExp(INLINE_PATTERN, 'g');
  let last = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parent.append(text.slice(last, match.index));
    const token = match[0];
    if (match[1]) parent.append(el('code', { text: token.slice(1, -1) }));
    else if (match[2]) parent.append(el('strong', { text: token.slice(2, -2) }));
    else if (match[3]) parent.append(el('em', { text: token.slice(1, -1) }));
    else {
      const parts = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const href = parts ? safeUrl(parts[2]) : '';
      if (href) {
        const external = /^https?:/i.test(href);
        parent.append(el('a', { href, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null, text: parts[1] }));
      } else {
        parent.append(parts ? parts[1] : token);
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) parent.append(text.slice(last));
}

/** Supports headings, paragraphs, lists, quotes, code blocks, bold, italic, code and links. */
function renderMarkdown(source) {
  const fragment = document.createDocumentFragment();
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const isBullet = (line) => /^\s*[-*]\s+/.test(line);
  const isNumbered = (line) => /^\s*\d+[.)]\s+/.test(line);
  const startsBlock = (line) => /^(#{1,4}\s|>|```)/.test(line) || isBullet(line) || isNumbered(line);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i += 1;
      fragment.append(el('pre', { tabindex: '0' }, el('code', { text: code.join('\n') })));
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const node = el(`h${heading[1].length}`);
      appendInline(node, heading[2].trim());
      fragment.append(node);
      i += 1;
      continue;
    }
    if (line.startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''));
      const paragraph = el('p');
      appendInline(paragraph, quote.join(' '));
      fragment.append(el('blockquote', null, paragraph));
      continue;
    }
    if (isBullet(line) || isNumbered(line)) {
      const numbered = isNumbered(line);
      const list = el(numbered ? 'ol' : 'ul');
      const test = numbered ? isNumbered : isBullet;
      while (i < lines.length && test(lines[i])) {
        const item = el('li');
        appendInline(item, lines[i].replace(numbered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/, ''));
        list.append(item);
        i += 1;
      }
      fragment.append(list);
      continue;
    }
    const paragraphLines = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) paragraphLines.push(lines[i++].trim());
    const paragraph = el('p');
    appendInline(paragraph, paragraphLines.join(' '));
    fragment.append(paragraph);
  }
  return fragment;
}

function renderNotes(site) {
  const host = $('#note-list');
  const dialog = $('#note-dialog');
  const section = $('#notes');
  if (!host || !dialog || !section) return;

  const notes = (site.notes?.items || []).filter((note) => note.published === true && !isTodo(note.title) && safeUrl(note.file));
  if (!notes.length) return; // the section stays hidden
  section.hidden = false;

  const body = $('#note-dialog-body');
  const label = $('#note-dialog-label');
  const cache = new Map();
  let opener = null;

  const formatted = (note) => {
    const date = parseYm(note.date);
    return date ? longDate(date) : '';
  };

  async function open(note, trigger) {
    opener = trigger || null;
    label.textContent = formatted(note) || 'Note';
    body.replaceChildren(el('p', { text: 'Loading…' }));
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    window.history.replaceState(null, '', `#note/${encodeURIComponent(note.slug)}`);
    try {
      if (!cache.has(note.slug)) {
        const response = await fetch(safeUrl(note.file));
        if (!response.ok) throw new Error(String(response.status));
        cache.set(note.slug, await response.text());
      }
      body.replaceChildren(renderMarkdown(cache.get(note.slug)));
      body.scrollTop = 0;
    } catch (error) {
      body.replaceChildren(el('p', { text: 'This note could not be loaded. Please try again later.' }));
    }
  }

  dialog.addEventListener('close', () => {
    window.history.replaceState(null, '', '#notes');
    if (opener) opener.focus();
  });
  $('#note-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // click on the backdrop
  });

  for (const note of notes) {
    const button = el(
      'button',
      { class: 'note-item reveal', type: 'button', 'aria-haspopup': 'dialog' },
      el('span', { class: 'note-item__date', text: formatted(note) }),
      el('span', { class: 'note-item__title', text: note.title }),
      isTodo(note.summary) ? null : el('span', { class: 'note-item__summary', text: note.summary })
    );
    button.addEventListener('click', () => open(note, button));
    host.append(button);
  }

  const wanted = /^#note\/(.+)$/.exec(window.location.hash);
  if (wanted) {
    const note = notes.find((item) => item.slug === decodeURIComponent(wanted[1]));
    if (note) {
      section.scrollIntoView();
      open(note, null);
    }
  }
}

/* Contact ------------------------------------------------------------------ */

const shortUrl = (url) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

function renderContact(site) {
  const host = $('#contact-links');
  const links = site.links || {};
  const email = isTodo(links.email) ? '' : links.email.trim();

  if (host) {
    const row = (label, ...value) => el('div', { class: 'contact-row' }, el('span', { class: 'contact-row__label', text: label }), el('span', { class: 'contact-row__value' }, ...value));

    if (email) {
      const copy = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Copy email address' }, icon('copy'));
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(email);
          toast('Email address copied');
        } catch (error) {
          toast('Copy is not available here. Please select the address instead.');
        }
      });
      host.append(row('Email', el('a', { href: `mailto:${email}`, text: email }), copy));
    }

    const profiles = [
      ['LinkedIn', links.linkedin],
      ['GitHub', links.github],
      ['Tableau Public', links.tableau_public],
    ];
    for (const [label, url] of profiles) {
      const href = safeUrl(url, { httpsOnly: true });
      if (!href) continue;
      host.append(row(label, el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, shortUrl(href), el('span', { class: 'sr-only', text: ' (opens in a new tab)' }))));
    }

    const resume = safeUrl(site.person?.resume);
    if (resume) host.append(row('Resume', el('a', { href: resume, 'data-resume': true, download: true, text: 'Download PDF' })));
  }

  const form = $('#contact-form');
  const status = $('#form-status');
  if (!form || !status) return;

  const formspreeId = /^[a-z0-9]+$/i.test(site.site?.formspree_id || '') ? site.site.formspree_id : '';
  const setStatus = (state, ...content) => {
    status.dataset.state = state;
    status.replaceChildren(...content);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get('_gotcha')) return; // filled in by a bot

    const name = String(data.get('name') || '').trim();
    const from = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    const button = form.querySelector('button[type="submit"]');

    if (formspreeId) {
      button.disabled = true;
      setStatus('sending', 'Sending…');
      try {
        const response = await fetch(`https://formspree.io/f/${formspreeId}`, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(String(response.status));
        form.reset();
        setStatus('success', 'Message sent. Thank you, I will reply soon.');
        toast('Message sent');
      } catch (error) {
        setStatus('error', 'The message could not be sent. Please try again, or use one of the links on this page.');
      } finally {
        button.disabled = false;
      }
      return;
    }

    if (email) {
      const subject = encodeURIComponent(`Portfolio message from ${name}`);
      const body = encodeURIComponent(`${message}\n\nFrom: ${name} (${from})`);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      setStatus('success', 'Opening your email app to send the message.');
      return;
    }

    const linkedin = safeUrl(links.linkedin, { httpsOnly: true });
    setStatus(
      'error',
      'This form is not connected yet. ',
      linkedin ? el('a', { class: 'text-link', href: linkedin, target: '_blank', rel: 'noopener noreferrer', text: 'Please message me on LinkedIn instead.' }) : 'Please use one of the links on this page.'
    );
  });
}

/* Search-engine data, navigation highlight, hero background ---------------- */

function injectPersonSchema(site, projects) {
  const base = safeUrl(site.site?.url, { httpsOnly: true });
  const links = site.links || {};
  const education = site.education || {};
  const photo = safeUrl(site.person?.photo);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.person?.name,
    description: site.person?.headline,
    url: base || undefined,
    image: photo && base ? new URL(photo, base).href : undefined,
    email: isTodo(links.email) ? undefined : `mailto:${links.email.trim()}`,
    address: isTodo(site.person?.location) ? undefined : { '@type': 'PostalAddress', addressLocality: site.person.location, addressRegion: 'ON', addressCountry: 'CA' },
    alumniOf: education.school ? { '@type': 'CollegeOrUniversity', name: education.school } : undefined,
    knowsAbout: [...new Set(projects.flatMap((project) => project.tools || []))],
    seeks: isTodo(site.availability?.summary) ? undefined : { '@type': 'Demand', name: site.availability.summary },
    sameAs: [links.linkedin, links.github, links.tableau_public].map((url) => safeUrl(url, { httpsOnly: true })).filter(Boolean),
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.append(script);
}

function initNavSpy() {
  const links = $$('#nav-links a[href^="#"]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  // Sections without their own menu item light up the nearest one.
  const owner = { top: '', about: 'about', recruiters: 'about', skills: 'skills', featured: 'projects', projects: 'projects', process: 'projects', journey: 'journey', certifications: 'journey', notes: 'journey', contact: 'contact' };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const active = owner[entry.target.id];
        links.forEach((link) => {
          if (link.getAttribute('href') === `#${active}`) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      }
    },
    { rootMargin: '-35% 0px -60% 0px' }
  );
  Object.keys(owner).forEach((id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

/**
 * Hero background: three slow, flowing chart lines drawn on a canvas.
 * It pauses when off screen or in a background tab, and draws a single
 * still frame for visitors who prefer reduced motion.
 */
function initHeroCanvas() {
  const canvas = $('#hero-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduced = prefersReducedMotion();
  const lines = [
    { token: '--series-1', base: 0.5, amp: 0.085, speed: 1, phase: 0.4, width: 2, alpha: 0.95 },
    { token: '--series-2', base: 0.63, amp: 0.07, speed: 0.75, phase: 2.6, width: 2, alpha: 0.9 },
    { token: '--line-strong', base: 0.76, amp: 0.06, speed: 0.55, phase: 4.4, width: 1.5, alpha: 1 },
  ];
  let width = 0;
  let height = 0;
  let colors = [];
  let surface = '#fff';
  let visible = true;
  let frame = 0;

  const readColors = () => {
    const styles = getComputedStyle(canvas);
    colors = lines.map((line) => styles.getPropertyValue(line.token).trim());
    surface = styles.getPropertyValue('--bg').trim();
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const wide = window.matchMedia('(min-width: 75rem)');
  // y position in pixels of a line at horizontal position x (0 to 1) and time t (seconds)
  const yAt = (line, index, x, t) => {
    const drift = t * 0.07 * line.speed;
    const wave = Math.sin(x * 4.2 + line.phase + drift * 6) * 0.55 + Math.sin(x * 9.5 + line.phase * 1.7 - drift * 9) * 0.22 + Math.sin(x * 2.1 + drift * 4) * 0.3;
    // Wide screens: a rising panel beside the headline.
    if (wide.matches) return (line.base + line.amp * wave - x * 0.22) * height;
    // Smaller screens: a low band under the content.
    return height - 92 + index * 26 + 13 * wave - x * 18;
  };

  const draw = (time) => {
    const t = time / 1000;
    ctx.clearRect(0, 0, width, height);
    const endX = 0.965;
    lines.forEach((line, index) => {
      ctx.beginPath();
      for (let px = 0; px <= width * endX; px += 6) {
        const x = px / width;
        const y = yAt(line, index, x, t);
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.globalAlpha = line.alpha;
      ctx.lineWidth = line.width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = colors[index];
      ctx.stroke();

      if (index < 2) {
        const x = width * endX;
        const y = yAt(line, index, endX, t);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = surface;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = colors[index];
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  };

  const loop = (time) => {
    frame = 0;
    if (!visible || document.hidden) return;
    draw(time);
    frame = window.requestAnimationFrame(loop);
  };
  const start = () => {
    if (reduced) draw(0);
    else if (!frame) frame = window.requestAnimationFrame(loop);
  };

  readColors();
  resize();
  start();

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      resize();
      if (reduced) draw(0);
    }).observe(canvas);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
  document.addEventListener('themechange', () => {
    readColors();
    if (reduced) draw(0);
  });
}

/* Start-up ----------------------------------------------------------------- */

function showLoadError(error) {
  const main = $('#main');
  if (!main) return;
  const local = window.location.protocol === 'file:';
  const box = el(
    'div',
    { class: 'wrap' },
    el(
      'div',
      { class: 'load-error', role: 'alert' },
      el('h2', { text: local ? 'Open this site through a local server' : 'The site data could not be loaded' }),
      el('p', {
        text: local
          ? 'Browsers block data files when a page is opened by double-clicking it. In the site folder, run "python -m http.server" and visit http://localhost:8000, or use the Live Server extension in VS Code. The README has the steps.'
          : 'Check that data/site.json and data/projects.json exist and are valid JSON. A missing comma or quote is the usual cause. You can paste the file into jsonlint.com to find the line.',
      }),
      el('p', { class: 'code', text: String(error && error.message ? error.message : error) })
    )
  );
  main.replaceChildren(box);
}

function initHome(data) {
  const { site, projects } = data;
  renderHero(site);
  renderStats(site, projects);
  renderAbout(site);
  renderRecruiterFacts(site);
  renderFeatured(data);
  const grid = initProjectGrid(data);
  renderSkills(site, projects, grid);
  renderProcess(site, projects);
  renderJourney(site);
  renderCertifications(site);
  renderNotes(site);
  renderContact(site);
  injectPersonSchema(site, projects);
  initNavSpy();
  initHeroCanvas();

  // The page was empty when the browser first looked for the #anchor, so jump again now.
  const hash = window.location.hash;
  if (hash.length > 1 && !hash.startsWith('#note/')) {
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}

async function start() {
  initTheme();
  initMenu();
  try {
    const data = await loadData();
    bindText(data.site);
    if (document.body.dataset.page === 'project') initProjectPage(data);
    else initHome(data);
    bindResume(data.site);
    initFooter(data.site);
    observeReveals();
  } catch (error) {
    console.error(error);
    showLoadError(error);
  }
  initScrollUi();
}

start();
