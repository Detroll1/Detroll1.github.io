// Движение: появление блоков, шапка при прокрутке, бегущая строка, параллакс фото.
(function () {
  document.documentElement.classList.add('js');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // бегущая строка: дублируем содержимое, чтобы шла без разрыва
  const track = document.querySelector('.ticker-track');
  if (track) track.innerHTML += track.innerHTML;

  // шапка
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (calm || !('IntersectionObserver' in window)) return;

  // блоки появляются по мере прокрутки, соседние — с небольшой задержкой
  const groups = [
    '.sec-head', '.tabs', '.combo-text>h2', '.combo-text>p', '.mode', '.pick-group', '.receipt',
    '.week .day', '.deliv>div', '.deliv-list li', '.contacts>div', '.map-card', '.foot-in'
  ];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  groups.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('rv');
      el.style.setProperty('--d', Math.min(i, 6) * 0.07 + 's');
      io.observe(el);
    });
  });

  // лёгкий параллакс фото на первом экране
  const pic = document.querySelector('.hero-pic');
  if (pic && matchMedia('(min-width: 981px)').matches) {
    addEventListener('scroll', () => {
      const y = Math.min(scrollY, 600);
      pic.style.transform = 'translateY(' + y * 0.08 + 'px)';
    }, { passive: true });
  }
})();
