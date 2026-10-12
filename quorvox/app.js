// Стек, мобильное меню, появление блоков и терминал на первом экране.
const STACK = ['JavaScript', 'Node.js', 'React', 'Python', 'HTML', 'CSS', 'Git', 'Lua', 'Android Studio', 'AI-инструменты'];

// Сценарий терминала: команда, затем строки ответа. Меняется только здесь.
const SCRIPT = [
  ['quorvox --about', ['Николай, full-stack разработчик', 'Североморск · работаю удалённо']],
  ['quorvox services', ['лендинг ........ 24 часа', 'telegram-бот ... по ТЗ', 'парсинг ........ разово или по расписанию', 'веб-сервис ..... Node.js + React']],
  ['quorvox projects', ['[ok] сайт кафе-кулинарии', '[ok] QuorStream — совместный просмотр', '[ok] QuorKick — видео без привязки']],
  ['quorvox order --landing', ['принято. напишите в Telegram: @Quorvox_team']]
];

const $ = (s) => document.querySelector(s);
document.documentElement.classList.add('js');

$('#stackList').innerHTML = STACK.map((s) => '<span>' + s + '</span>').join('');

$('#burger').addEventListener('click', () => $('#nav').classList.toggle('open'));
document.querySelectorAll('#nav a').forEach((a) => a.addEventListener('click', () => $('#nav').classList.remove('open')));

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!calm && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  ['.sec-head', '.svc-item', '.proj-item', '.stack span', '.about-lead', '.about p', '.timeline li', '.person', '.contacts li', '.form']
    .forEach((sel) => document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('rv');
      el.style.setProperty('--d', Math.min(i, 8) * 0.06 + 's');
      io.observe(el);
    }));
}

// терминал
const term = $('#term');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const line = (s) => s.startsWith('[ok]') ? '<span class="ok">[ok]</span>' + esc(s.slice(4)) : esc(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  let html = '';
  const paint = (extra) => { term.innerHTML = html + (extra || '') + '<span class="caret"></span>'; term.scrollTop = term.scrollHeight; };
  for (const [cmd, out] of SCRIPT) {
    let typed = '';
    for (const ch of cmd) {
      typed += ch;
      paint('<span class="p">$ </span><span class="c">' + esc(typed) + '</span>');
      await sleep(calm ? 0 : 45 + Math.random() * 50);
    }
    html += '<span class="p">$ </span><span class="c">' + esc(cmd) + '</span>\n';
    paint();
    await sleep(calm ? 0 : 350);
    for (const o of out) {
      html += line(o) + '\n';
      paint();
      await sleep(calm ? 0 : 110);
    }
    html += '\n';
    await sleep(calm ? 0 : 700);
  }
  if (calm) return;
  await sleep(4000);
  run();
}
run();
