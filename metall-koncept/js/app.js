(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  // шапка становится плотной после первого экрана
  var hdr = document.getElementById('hdr');
  function onScroll() { hdr.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // счёт цифр
  function fmt(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function count(el) {
    var to = +el.getAttribute('data-count'), t0 = null, dur = 1600;
    if (reduce) { el.textContent = fmt(to); return; }
    (function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(to * k));
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      setTimeout(function () { el.classList.add('is-in'); }, Math.min(sib, 6) * 80);
      if (el.hasAttribute('data-count')) count(el);
      el.querySelectorAll && Array.prototype.forEach.call(el.querySelectorAll('[data-count]'), count);
      io.unobserve(el);
    });
  }, { threshold: .15 }) : null;

  var watch = document.querySelectorAll('.reveal, .hero__stats [data-count]');
  Array.prototype.forEach.call(watch, function (el) { io ? io.observe(el) : el.classList.add('is-in'); });
  if (!io) Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), count);

  if (reduce) return;

  // карточки продукции: верхняя уходит в глубину, когда на неё наезжает следующая
  var cards = document.querySelectorAll('.card');
  // галерея объектов едет вбок при прокрутке
  var gal = document.getElementById('gallery'), track = gal && gal.querySelector('.gallery__track');
  // фон завода с лёгким параллаксом
  var fimg = document.querySelector('.factory__img');

  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    for (var i = 0; i < cards.length - 1; i++) {
      var next = cards[i + 1].getBoundingClientRect().top, top = cards[i].getBoundingClientRect().top;
      var k = Math.max(0, Math.min(1, 1 - (next - top) / (vh * .8)));
      cards[i].style.transform = 'scale(' + (1 - k * .06) + ')';
      cards[i].style.filter = 'brightness(' + (1 - k * .45) + ')';
    }
    if (track) {
      var r = gal.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
      var max = track.scrollWidth - window.innerWidth;
      track.style.transform = 'translateX(' + (-p * Math.max(0, max)) + 'px)';
    }
    if (fimg) {
      var fr = fimg.parentNode.getBoundingClientRect();
      var off = Math.max(-80, Math.min(80, (fr.top + fr.height / 2 - vh / 2) * -0.08));
      fimg.style.transform = 'translateY(' + off + 'px)';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  window.addEventListener('resize', frame);
  frame();
})();
