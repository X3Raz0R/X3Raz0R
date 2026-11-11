// Builds every graphic in ../assets for the profile README, in a dark and a light variant.
// Run: npm install && npm run build
// GitHub shows README images without web fonts, so all text is converted to outlines here.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const OUT = path.join(__dirname, '..', 'assets');
const W = 1200;
const PAD = 56;

const THEMES = {
  dark: {
    card: '#12181d', edge: '#222c35', ink: '#eef2f4', mist: '#8d9ba6', faint: '#46545f', line: '#34414b',
    chip: '#1a232b', base: '#2b3640', lamp: '#f2b54a', lampText: '#f2b54a', onLamp: '#1d2830', glow: 0.5, plaque: [0.3, 0.03],
  },
  light: {
    card: '#eef1f3', edge: '#d3dae0', ink: '#1d2830', mist: '#55636d', faint: '#a9b4bc', line: '#b9c3ca',
    chip: '#e1e6ea', base: '#c3ccd3', lamp: '#f2b54a', lampText: '#7a4b2a', onLamp: '#1d2830', glow: 0.6, plaque: [0.55, 0.1],
  },
};

// ---------- text to outlines ----------
const fonts = {};
function font(key) {
  if (!fonts[key]) {
    const [family, weight] = key.split(':');
    const pkg = family === 'sans' ? 'schibsted-grotesk' : 'jetbrains-mono';
    const file = path.join(__dirname, 'node_modules', '@fontsource', pkg, 'files', `${pkg}-latin-${weight}-normal.woff`);
    const buf = fs.readFileSync(file);
    fonts[key] = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return fonts[key];
}
function num(v) {
  if (!Number.isFinite(v)) throw new Error('bad coordinate');
  return String(Math.round(v * 10) / 10);
}
function pathData(commands) {
  return commands.map((c) => (
    c.type === 'M' || c.type === 'L' ? `${c.type}${num(c.x)} ${num(c.y)}`
      : c.type === 'Q' ? `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`
        : c.type === 'C' ? `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`
          : 'Z')).join('');
}
function measure(key, str, size, tracking = 0) {
  return font(key).getAdvanceWidth(str, size) + tracking * Math.max(0, str.length - 1);
}
/** anchor: 's' start, 'm' middle, 'e' end; tracking is extra pixels between letters. */
function text(key, str, x, y, size, fill, { anchor = 's', tracking = 0, cls = '' } = {}) {
  const f = font(key);
  const w = measure(key, str, size, tracking);
  let x0 = anchor === 'm' ? x - w / 2 : anchor === 'e' ? x - w : x;
  let commands;
  if (!tracking) {
    commands = f.getPath(str, x0, y, size).commands;
  } else {
    commands = [];
    for (const ch of str) {
      commands.push(...f.getPath(ch, x0, y, size).commands);
      x0 += f.getAdvanceWidth(ch, size) + tracking;
    }
  }
  return `<path${cls ? ` class="${cls}"` : ''} d="${pathData(commands)}" fill="${fill}"/>`;
}

// ---------- shared pieces ----------
const NO_MOTION = '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
function svg(w, h, label, body, style = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">\n${style ? `<style>${style}${NO_MOTION}</style>\n` : ''}${body}\n</svg>\n`;
}
function card(t, w, h) {
  return `<rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="16" fill="${t.card}" stroke="${t.edge}" stroke-width="1.5"/>`;
}
function badge(t, label, x, y, solid = true) {
  const size = 22, tracking = 1.6, h = 46;
  const w = measure('mono:500', label, size, tracking) + 44;
  const box = solid
    ? `<rect x="${x}" y="${y}" width="${num(w)}" height="${h}" rx="${h / 2}" fill="${t.lamp}"/>`
    : `<rect x="${x + 1}" y="${y + 1}" width="${num(w - 2)}" height="${h - 2}" rx="${h / 2 - 1}" fill="none" stroke="${t.lampText}" stroke-width="2"/>`;
  return box + text('mono:500', label, x + 22, y + 31, size, solid ? t.onLamp : t.lampText, { tracking });
}

// ---------- hero: name, tagline, status, and a shelf with one lit trophy per win ----------
function hero(t) {
  const H = 440;
  const shelfY = 352;
  const trophy = (cx, top, name, year, cls) => `
<circle class="${cls}" cx="${cx}" cy="${shelfY - 34}" r="170" fill="url(#glow)"/>
<rect x="${cx - 92}" y="104" width="184" height="218" rx="12" fill="${t.card}"/>
<rect class="${cls}" x="${cx - 92}" y="104" width="184" height="218" rx="12" fill="url(#plaque)"/>
<rect x="${cx - 92}" y="104" width="184" height="218" rx="12" fill="none" stroke="${t.lamp}" stroke-opacity=".85" stroke-width="2.5"/>
${text('mono:500', top, cx, 152, 21, t.lampText, { anchor: 'm', tracking: 1.6 })}
${text('sans:700', name, cx, 222, 29, t.ink, { anchor: 'm' })}
${text('mono:400', year, cx, 264, 26, t.mist, { anchor: 'm' })}
<rect x="${cx - 62}" y="322" width="124" height="${shelfY - 322}" rx="8" fill="${t.base}"/>`;
  const style = `
.t1{animation:lit 5s ease-in-out infinite}
.t2{animation:lit 5s ease-in-out -2.5s infinite}
.ping{transform-box:fill-box;transform-origin:center;animation:ping 2.6s ease-out infinite}
@keyframes lit{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(3);opacity:0}}
`;
  const body = `<defs>
<radialGradient id="glow"><stop offset="0" stop-color="${t.lamp}" stop-opacity="${t.glow}"/><stop offset=".5" stop-color="${t.lamp}" stop-opacity="${t.glow / 4}"/><stop offset="1" stop-color="${t.lamp}" stop-opacity="0"/></radialGradient>
<linearGradient id="plaque" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${t.lamp}" stop-opacity="${t.plaque[0]}"/><stop offset="1" stop-color="${t.lamp}" stop-opacity="${t.plaque[1]}"/></linearGradient>
<clipPath id="clip"><rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="16"/></clipPath>
</defs>
${card(t, W, H)}
<g clip-path="url(#clip)">
${text('sans:800', 'Antonio', PAD - 6, 158, 116, t.ink)}
${text('sans:800', 'Medeleanu', PAD - 6, 262, 116, t.ink)}
${text('sans:400', 'Data pipelines and full-stack apps.', PAD, 326, 34, t.mist)}
<circle class="ping" cx="${PAD + 9}" cy="384" r="7" fill="${t.lamp}"/>
<circle cx="${PAD + 9}" cy="384" r="7" fill="${t.lamp}"/>
${text('mono:400', 'open to software engineering internships', PAD + 32, 393, 26, t.lampText)}
${trophy(864, 'WINNER', 'SmartHack', '2026', 't1')}
${trophy(1064, '1ST PLACE', 'Veridion', '2026', 't2')}
<path d="M752 ${shelfY + 1.5}H${W - 24}" stroke="${t.line}" stroke-width="3" stroke-linecap="round"/>
</g>`;
  return svg(W, H, 'Antonio Medeleanu. Data pipelines and full-stack apps. Open to software engineering internships. Winner, SmartHack 2026. First place, Veridion Challenge 2026.', body, style);
}

// ---------- contact buttons ----------
function button(t, label, primary) {
  const h = 64, size = 26;
  const tw = measure('mono:500', label, size);
  const w = Math.round(tw + 30 + 14 + 16 + 30);
  const ax = 30 + tw + 16;
  const fg = primary ? t.onLamp : t.ink;
  const box = primary
    ? `<rect width="${w}" height="${h}" rx="${h / 2}" fill="${t.lamp}"/>`
    : `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${h / 2 - 1}" fill="${t.chip}" stroke="${t.line}" stroke-width="2"/>`;
  const arrow = `<path d="M${num(ax)} 40L${num(ax + 13)} 27M${num(ax + 3)} 27H${num(ax + 13)}V37" fill="none" stroke="${fg}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg(w, h, label, box + text('mono:500', label, 30, 41, size, fg) + arrow);
}

// ---------- flow diagram shared by the two hackathon projects ----------
function flow(t, dy, d) {
  const top = 'M70 165H300C430 165 420 92 560 92H640C780 92 770 165 900 165H1130';
  const bottom = 'M70 165H300C430 165 420 238 560 238H640C780 238 770 165 900 165H1130';
  const runner = (p) => `<circle r="8" fill="${t.lamp}"><animateMotion dur="5s" begin="0s" repeatCount="indefinite" path="${p}" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .55 1"/></circle>`;
  const label = (s, x, y, fill = t.ink) => text('sans:600', s, x, y, 31, fill, { anchor: 'm' });
  const note = (s, x, y) => text('mono:400', s, x, y, 28, t.lampText, { anchor: 'm' });
  const node = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="${t.ink}"/>`;
  return `<g transform="translate(0 ${dy})">
<g fill="none" stroke="${t.line}" stroke-width="3"><path d="${top}"/><path d="${bottom}"/></g>
${runner(top)}${runner(bottom)}
${node(70, 165)}${node(300, 165)}${node(600, 92)}${node(600, 238)}${node(900, 165)}<circle cx="1130" cy="165" r="14" fill="${t.lamp}"/>
${label(d.start, 70, 225)}${label(d.gate, 300, 225)}
${label(d.upper, 600, 60)}${note(d.upperNote, 600, 138)}
${label(d.lower, 600, 298)}${note(d.lowerNote, 600, 204)}
${label(d.join, 900, 225)}${label(d.end, 1130, 225, t.lampText)}
</g>`;
}

function project(t, p) {
  const H = 566;
  const body = `${card(t, W, H)}
${badge(t, p.badge, PAD, 44)}
${text('mono:400', p.when, W - PAD, 76, 26, t.mist, { anchor: 'e' })}
${text('sans:800', p.title, PAD - 3, 172, 66, t.ink)}
${text('sans:400', p.subtitle, PAD, 222, 32, t.mist)}
${flow(t, 236, p.flow)}`;
  return svg(W, H, p.alt, body);
}

// ---------- macro tracker: three bars that fill ----------
function macro(t) {
  const H = 290;
  const x0 = 880, x1 = W - PAD;
  const rows = [['protein', 0.78], ['carbs', 0.56], ['fat', 0.36]];
  const bars = rows.map(([name, pct], i) => {
    const y = 96 + i * 54;
    return `${text('mono:400', name, 744, y + 9, 26, t.mist)}
<rect x="${x0}" y="${y - 7}" width="${x1 - x0}" height="14" rx="7" fill="${t.line}"/>
<rect class="bar" style="animation-delay:${i * 0.25}s" x="${x0}" y="${y - 7}" width="${num((x1 - x0) * pct)}" height="14" rx="7" fill="${t.lamp}"/>`;
  }).join('\n');
  const style = `
.bar{transform-box:fill-box;transform-origin:left;animation:fill 7s cubic-bezier(.3,.7,.2,1) infinite both}
@keyframes fill{0%{transform:scaleX(0)}28%,88%{transform:scaleX(1)}100%{transform:scaleX(0)}}
`;
  const body = `${card(t, W, H)}
${badge(t, 'IN TESTING · GOOGLE PLAY', PAD, 44, false)}
${text('sans:800', 'Macro tracker', PAD - 3, 172, 66, t.ink)}
${text('sans:400', 'Calories and macros, tracked in real time', PAD, 222, 32, t.mist)}
${bars}`;
  return svg(W, H, 'Macro tracker. Calories and macros, tracked in real time. In testing on Google Play.', body, style);
}

// ---------- stack: two rows of chips ----------
function stack(t) {
  const rows = [
    ['languages', ['Python', 'SQL', 'JavaScript', 'C#', 'Java', 'C++']],
    ['tools', ['React', 'Node.js', 'Supabase', 'PostgreSQL', 'Docker', 'Linux']],
  ];
  const chipH = 52, gap = 10, size = 26, padX = 18;
  let out = '';
  rows.forEach(([name, items], r) => {
    const y = 40 + r * (chipH + 22);
    out += text('mono:400', name, PAD, y + 35, 26, t.mist);
    let x = 226;
    for (const item of items) {
      const w = measure('sans:500', item, size) + padX * 2;
      if (x + w > W - PAD) throw new Error(`stack row "${name}" does not fit`);
      out += `<rect x="${num(x + 1)}" y="${y + 1}" width="${num(w - 2)}" height="${chipH - 2}" rx="${chipH / 2 - 1}" fill="${t.chip}" stroke="${t.line}" stroke-width="2"/>`;
      out += text('sans:500', item, x + padX, y + 35, size, t.ink);
      x += w + gap;
    }
  });
  const H = 40 * 2 + chipH * 2 + 22;
  return svg(W, H, 'Languages: Python, SQL, JavaScript, C#, Java, C++. Tools: React, Node.js, Supabase, PostgreSQL, Docker, Linux.', card(t, W, H) + '\n' + out);
}

// ---------- build ----------
const PANDORA = {
  badge: 'WINNER · SMARTHACK 2026', when: 'Nov 2026', title: 'Pandora', subtitle: 'A home network check anyone can use',
  alt: 'Pandora, a home network check anyone can use. Winner, SmartHack 2026. A scan of the home network goes through fixed rules, then each finding gets a plain explanation of at most two sentences and one to five fix steps, and a re-scan proves the fix.',
  flow: { start: 'scan', gate: 'rules', upper: 'explain', upperNote: '2 sentences', lower: 'fix steps', lowerNote: '1 to 5', join: 're-scan', end: 'proven' },
};
const RANKING = {
  badge: '1ST PLACE · VIBEHACK 2026', when: 'Veridion Challenge', title: 'Company ranking engine', subtitle: 'Finds the best-fit companies for a plain-language query',
  alt: 'Company ranking engine. First place, Veridion Challenge at VibeHack 2026. A query goes through structured filters, then an LLM constraint check weighted 60 percent and semantic similarity weighted 40 percent, then score fusion produces a ranked list.',
  flow: { start: 'query', gate: 'filters', upper: 'LLM check', upperNote: '60%', lower: 'embeddings', lowerNote: '40%', join: 'fusion', end: 'ranked' },
};
const BUTTONS = [['site', 'x3raz0r.github.io', true], ['cv', 'cv', false], ['linkedin', 'linkedin', false], ['email', 'email', false]];

fs.mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  const write = (file, content) => fs.writeFileSync(path.join(OUT, `${file}-${name}.svg`), content);
  write('hero', hero(t));
  write('pandora', project(t, PANDORA));
  write('ranking', project(t, RANKING));
  write('macro', macro(t));
  write('stack', stack(t));
  for (const [file, label, primary] of BUTTONS) write(`btn-${file}`, button(t, label, primary));
}
console.log('built', fs.readdirSync(OUT).length, 'files in', OUT);
