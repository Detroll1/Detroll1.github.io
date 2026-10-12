// Общее для всех страниц: шапка и подвал, мобильное меню, появление блоков.
(function () {
  const page = document.body.dataset.page;

  const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h8v8H8z"/><path d="M16 16l3 3"/></svg>';

  document.getElementById('top').innerHTML =
    '<div class="wrap top-in">' +
      '<a class="logo" href="index.html">' + LOGO + 'quorvox</a>' +
      '<nav class="nav" id="nav">' +
        '<a href="projects.html"' + (page === 'projects' ? ' aria-current="page"' : '') + '>Проекты</a>' +
        '<a href="journal.html"' + (page === 'journal' ? ' aria-current="page"' : '') + '>Журнал</a>' +
        '<a href="contact.html"' + (page === 'contact' ? ' aria-current="page"' : '') + '>Контакты</a>' +
      '</nav>' +
      '<div class="top-btns">' +
        '<a class="btn btn-line" href="https://github.com/Quorvox" target="_blank" rel="noopener">GitHub</a>' +
        '<a class="btn" href="contact.html">Обсудить проект</a>' +
      '</div>' +
      '<button class="burger" id="burger" aria-label="Открыть меню"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
    '</div>';

  document.getElementById('foot').innerHTML =
    '<div class="wrap">' +
      '<div class="foot-cols">' +
        '<div><span class="mono">Сайт</span><a href="index.html">Главная</a><a href="projects.html">Проекты</a><a href="journal.html">Журнал</a><a href="contact.html">Контакты</a></div>' +
        '<div><span class="mono">Связь</span><a href="https://t.me/Quorvox_team" target="_blank" rel="noopener">Telegram</a><a href="mailto:neironkabot@gmail.com">Почта</a><a href="https://github.com/Quorvox" target="_blank" rel="noopener">GitHub</a></div>' +
        '<div><span class="mono">© 2026</span><a href="https://t.me/Quorvox_team" target="_blank" rel="noopener">Quorvox_team</a><span class="mono" style="text-transform:none">Североморск · удалённо</span></div>' +
      '</div>' +
      '<div class="word" aria-hidden="true">quorvox</div>' +
    '</div>';

  const nav = document.getElementById('nav');
  document.getElementById('burger').addEventListener('click', () => nav.classList.toggle('open'));

  document.documentElement.classList.add('js');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -6% 0px' });
  ['.sec-title', '.grid4>*', '.statement', '.folder', '.list', '.rows li', '.team>div', '.stack', '.cta', '.clist li', '.form']
    .forEach((sel) => document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('rv');
      el.style.setProperty('--d', Math.min(i, 6) * 0.06 + 's');
      io.observe(el);
    }));
})();
