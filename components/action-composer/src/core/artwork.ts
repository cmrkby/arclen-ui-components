// Upper-left lighting is shared by all five miniatures. The component styles the object shadow.
type Gradient = (name: string, colors: readonly string[], horizontal?: boolean) => string;

const paint = (ref: string, part: string) => `url(#${ref}-${part})`;

function sketch(ref: string, gradient: Gradient) {
  const body = 'M25 19C34 8 57 7 69 17c10 8 11 23 2 29-4 3-9 1-13 0-4-1-7 2-6 6 0 4-4 7-10 6-17-1-28-12-26-25 1-5 4-10 9-14Z';
  return `<defs>
    ${gradient('rim', ['#f1ab46','#bc6021','#80421c'])}
    ${gradient('enamel', ['#fff6d6','#ffdd8a','#f3b351','#d99036'])}
    ${gradient('bristles', ['#75401b','#df9d58','#ae6735','#643019'], true)}
    ${[['red','#ff9784','#f14c38','#ab271c'],['ochre','#ffe299','#ff9b1e','#c57212'],['green','#8ae6bc','#18a378','#07674e'],['blue','#9fd5ff','#2586db','#17579b']].map(([name,hi,mid,lo])=>`<radialGradient id="${ref}-${name}" cx="34%" cy="22%" r="79%"><stop stop-color="${hi}"/><stop offset="48%" stop-color="${mid}"/><stop offset="100%" stop-color="${lo}"/></radialGradient>`).join('')}
    ${gradient('brush', ['#3289fa','#174aad','#092c72'], true)}
    ${gradient('metal', ['#697986','#f8fcff','#98a8b2','#647483'], true)}
  </defs>
  <path d="${body}" transform="translate(0 2)" fill="${paint(ref,'rim')}"/>
  <path d="${body}" fill="${paint(ref,'enamel')}" stroke="#d59b50" stroke-width=".7"/>
  <path d="M20 31c4-13 18-19 31-18" fill="none" stroke="#fffce2" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="52" cy="40" rx="4.9" ry="4.2" fill="#9b6535"/>
  <path d="M48 40q3-5 8-1" fill="none" stroke="#734323" stroke-width="1.7"/>
  ${[[29,32,'red'],[39,22,'ochre'],[54,21,'green'],[36,46,'blue']].map(([x,y,c]) => `<g transform="translate(${x} ${y})">
    <ellipse cx=".8" cy="2" rx="6.4" ry="4.3" fill="#78431d" opacity=".27"/>
    <path d="M-5.8 1C-6.9-2.2-3.8-5.2-.9-4.5 1.7-4.8 2.5-3.8 3.8-3.3 7.5-.8 6 3.1 2.6 4.4-1.1 5.6-5 4.3-5.8 1Z" fill="${paint(ref,String(c))}"/>
    <path d="M-3.9-.9q.3-2 2.9-2.1" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.1" stroke-linecap="round"/>
  </g>`).join('')}
  <path d="M72.4 23.3 61.7 40.6q-3.8 4.8-8.3 6.4" stroke="#744b25" opacity=".16" fill="none" stroke-width="6.5" stroke-linecap="round"/>
  <g transform="rotate(37 68 30)">
    <path d="M66.5 31q-1-2 .3-6l2.7-19q.6-4 2-4 1.7.5 1.3 4l-1.6 20q-.3 4-2 6Z" fill="${paint(ref,'brush')}" stroke="#12396c" stroke-width=".8"/>
    <path d="m65.5 28 6.4.6-2.1 12.2-7.3-.9Z" fill="${paint(ref,'metal')}" stroke="#566671" stroke-width=".8"/>
    <path d="m65.7 29.7 5.2.6m-7.2 7.5 5.8.7" fill="none" stroke="#e8f1ff" stroke-width="1.3"/>
    <path d="m64.8 36.4 5.3.6" fill="none" stroke="#62798d" stroke-width=".8"/>
    <path d="M63 39.5q-4.8 5.1-2.5 10 .6 2.5-1.5 5 11.8-3.5 10.2-14.2Z" fill="${paint(ref,'bristles')}" stroke="#855332" stroke-width=".55"/>
    <path d="m64.7 41.2-2 6.8m4.7-6.2-2 6" stroke="#e3ab70" fill="none" stroke-width=".8" stroke-linecap="round"/>
    <path d="M60.5 48.2q2.5 2.1 5.5-.3-1.2 4-7 6.6 2.1-3.2 1.5-6.3Z" fill="#16846d"/>
  </g>`;
}

function createDoc(ref: string, gradient: Gradient) {
  const page = 'M29 5h23l13 13v35a3 3 0 0 1-3 3H29a3.5 3.5 0 0 1-3.5-3.5V8.5A3.5 3.5 0 0 1 29 5Z';
  return `<defs>
    ${gradient('sheet', ['#fafdff', '#ddf2ff', '#c3e4ff', '#a8ceee'])}
    ${gradient('edge', ['#82bde8', '#6097cb', '#426fa7'])}
    ${gradient('fold', ['#9ddcff', '#50a8ed', '#237dc5'])}
    ${gradient('pencil', ['#ffd674', '#ffb336', '#f69220', '#c77723'], true)}
    ${gradient('chrome', ['#8091a4', '#eff5f7', '#a4b2bf', '#617182'], true)}
  </defs>
  <g transform="rotate(-7 47 32)">
    <path d="${page}" fill="${paint(ref,'edge')}" transform="translate(1.2 2.5)"/>
    <path d="${page}" fill="${paint(ref,'sheet')}" stroke="#79a8cf" stroke-width=".9"/>
    <path d="M27.6 39V9.8q0-2.8 2.6-2.8h19" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>
    <path d="m52 5 13 13v2.5l-9.1-1.1q-3.1-.5-3.3-3.7Z" fill="#7da9c9" opacity=".65"/>
    <path d="m52 5 13 13-9.2-.8q-3.2-.3-3.4-3.7Z" fill="${paint(ref,'fold')}"/>
    <path d="M33 18h11" stroke="#347ebf" stroke-width="3.8" stroke-linecap="round"/>
    <path d="M33 27h22m-22 7h18m-18 7h13" stroke="#78a9cc" stroke-width="2.3" stroke-linecap="round"/>
  </g>
  <g transform="rotate(33 66 34)">
    <path d="M62.2 13.8h8.2v31.6l-4 11.5-4.2-11.5Z" fill="${paint(ref,'pencil')}" stroke="#ad762c" stroke-width=".8"/>
    <path d="M63.8 18.6v24.9" stroke="#ffeab8" stroke-linecap="round" stroke-width="1.4"/>
    <path d="M62.2 13.4V9.8q0-2.7 2.7-2.7h2.7q2.8 0 2.8 2.7v4Z" fill="#ed8e84" stroke="#bb746c" stroke-width=".65"/>
    <path d="M62 13.4h8.6v4.8H62z" fill="${paint(ref,'chrome')}" stroke="#728492" stroke-width=".65"/>
    <path d="m62.3 45.1 2.1 1.4 1.9-2.4 1.9 2.4 2.1-1.4-4 11.6Z" fill="#e8bf86"/>
    <path d="m64.9 52.8 1.4 4 1.4-4Z" fill="#404754"/>
  </g>`;
}

function createSlides(ref: string, gradient: Gradient) {
  return `<defs>
    ${gradient('rail', ['#ffa991', '#ff7157', '#e34c3c', '#b9332e'])}
    ${gradient('paper', ['#fffdf6', '#fff3e9', '#ffddd0'])}
    ${gradient('peg', ['#946159', '#c58b77', '#874f49'], true)}
  </defs>
  <g transform="rotate(4 50 30)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M48 41h4v10l9.5 7-2 2L50 54l-9.5 6-2.2-2 9.7-7Z" fill="${paint(ref,'peg')}" stroke="#8c6057" stroke-width=".8"/>
    <rect x="20" y="9" width="60" height="38" rx="2.8" fill="#c99282"/>
    <rect x="20" y="8" width="59" height="37" rx="2.8" fill="${paint(ref,'paper')}" stroke="#dfb6a4" stroke-width=".9"/>
    <path d="M23 11v30" fill="none" stroke="#fffdfa" stroke-width="1.8"/>
    <rect x="17.4" y="5.2" width="65" height="6.8" rx="3.2" fill="${paint(ref,'rail')}" stroke="#c65a4a" stroke-width=".8"/>
    <path d="M21 7h53" fill="none" stroke="#ffc2ae" stroke-width="1.2"/>
    <rect x="18.5" y="42.7" width="63" height="4.5" rx="2.2" fill="${paint(ref,'rail')}" stroke="#c75f4e" stroke-width=".7"/>
    <path d="M37.2 17.4a10.2 10.2 0 1 0 10.2 10.2H37.2Z" fill="#e36b4d"/>
    <path d="M39.5 15.8v9.5H49a9.5 9.5 0 0 0-9.5-9.5Z" fill="#ffaf6d"/>
    <path d="M54 22h15" fill="none" stroke="#97685b" stroke-width="3"/>
    <path d="M54 28h13m-13 5h9" fill="none" stroke="#d3ab99" stroke-width="2.1"/>
  </g>`;
}

function analyzeDoc(ref: string, gradient: Gradient) {
  return `<defs>
    ${gradient('sheet', ['#fffefe', '#f4f0fc', '#dfd8ed'])}
    ${gradient('ring', ['#dfc6ff', '#be99ed', '#9266c7', '#69458e'])}
    ${gradient('handle', ['#d8b2fb', '#a177d0', '#76509d', '#553975'], true)}
    ${gradient('lens', ['#f7f1fe', '#e9ddfa', '#cfb6ea'])}
    ${gradient('socket', ['#88799d', '#e2dceb', '#9790ab'], true)}
  </defs>
  <g transform="rotate(-7 45 30)" stroke-linecap="round">
    <rect x="23" y="7" width="39" height="45" rx="4" fill="#bdb1cb" transform="rotate(7 43 30)"/>
    <rect x="22" y="5" width="39" height="45" rx="3.4" fill="${paint(ref,'sheet')}" stroke="#aaa1b9" stroke-width=".9"/>
    <path d="M24 24V9q0-2 2-2h28" fill="none" stroke="#fff" stroke-width="1.5"/>
    <path d="M28 14h15" stroke="#8f82a1" stroke-width="3"/>
    <path d="M28 22h23m-23 6h18m-18 6h14m-14 6h8" stroke="#b8adca" stroke-width="2.1"/>
  </g>
  <g transform="rotate(-42 55 32)" stroke-linecap="round">
    <rect x="50.6" y="46" width="8.8" height="19.8" rx="4.2" fill="${paint(ref,'handle')}" stroke="#654d7c" stroke-width=".9"/>
    <path d="M52.8 52v8.2" stroke="#d4b2ec" stroke-width="1.3"/>
    <rect x="51.1" y="44.4" width="7.8" height="5.5" rx="1.2" fill="${paint(ref,'socket')}" stroke="#81738e" stroke-width=".6"/>
  </g>
  <circle cx="55" cy="32" r="16.4" fill="#705283"/>
  <circle cx="54.6" cy="31" r="16" fill="${paint(ref,'ring')}" stroke="#86649d" stroke-width=".8"/>
  <circle cx="54.6" cy="31" r="11.8" fill="${paint(ref,'lens')}" stroke="#846998" stroke-width="1"/>
  <path d="M47.6 28.4 60 26.8m-11.8 7.1 10-1.3" stroke="#a287b9" fill="none" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M42.3 25.3q3-6.1 9.7-7.2m-6.3 7.5q2-3.1 4.3-4.1" fill="none" stroke="#f7e9ff" stroke-width="1.55" stroke-linecap="round"/>`;
}

function createChart(ref: string, gradient: Gradient) {
  const columns = [
    { x: 24, top: 35, shade: 'short', cap: '#b5f5db', side: '#54b89c' },
    { x: 41, top: 23, shade: 'middle', cap: '#91ecd2', side: '#269d88' },
    { x: 58, top: 11, shade: 'tall', cap: '#66dbc5', side: '#167a71' },
  ];
  return `<defs>
    ${gradient('short', ['#a7f0d2', '#7cd7b3', '#59ba9c'])}
    ${gradient('middle', ['#79e8cb', '#42c5a9', '#2ea28e'])}
    ${gradient('tall', ['#51ddc0', '#20b49f', '#088b80'])}
    ${gradient('foot', ['#b1ceca', '#7fa5a1', '#5f8886'])}
  </defs>
  <g stroke-linejoin="round">
    <path d="m17 49 6-4 57 4-6 5Z" fill="#d5e6e1" stroke="#a4bfb8" stroke-width=".7"/>
    <path d="m17 49 57 5v3.6l-54.8-4.4q-2.2-.2-2.2-2Z" fill="${paint(ref,'foot')}"/>
    <path d="m74 54 6-5v3.6l-6 5Z" fill="#6f9490"/>
    ${columns.map(({ x, top, shade, cap, side }, index) => {
      const bottom = 49 + index * 1.2;
      return `<g>
        <path d="M${x} ${top}l5-3.6 10.5.7-5 3.7Z" fill="${cap}"/>
        <path d="M${x+10.5} ${top+.8}l5-3.7V${bottom-3}l-5 3.8Z" fill="${side}"/>
        <path d="M${x} ${top}l10.5.8v${bottom-top}l-10.5-.8Z" fill="${paint(ref,shade)}"/>
        <path d="M${x+.8} ${top+5}v-4l8.5.6" fill="none" stroke="#d1ffea" stroke-opacity=".76" stroke-width=".9" stroke-linecap="round"/>
      </g>`;
    }).join('')}
  </g>`;
}

const illustrations = { image: sketch, note: createDoc, event: createSlides, voice: analyzeDoc, docs: createChart };

export function renderArtwork(action: keyof typeof illustrations, instanceId: string): string {
  const ref = instanceId + '-art-' + action;
  const gradient: Gradient = (name, colors, horizontal = false) =>
    `<linearGradient id="${ref}-${name}" x1="0" y1="0" x2="${horizontal ? '100%' : '45%'}" y2="${horizontal ? '0' : '100%'}">${colors.map((color, i) => `<stop offset="${Math.round(i * 100 / (colors.length - 1))}%" stop-color="${color}"/>`).join('')}</linearGradient>`;
  return `<svg class="ac-art" viewBox="7 0 86 63" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <g class="ac-art-object">${illustrations[action](ref, gradient)}</g>
  </svg>`;
}
