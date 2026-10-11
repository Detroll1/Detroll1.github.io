// Страница «калькулятор + заявка» для малого бизнеса.
// Настройки компании — один файл t/<слаг>.json; слаг берётся из window.KALK или из адреса (#/слаг).
import { NICHES, priceRange, rub } from './calc.js';
import { ICONS } from './icons.js';

const root = document.getElementById('app');
const base = window.KALK_BASE || './';
const slug = window.KALK || location.hash.replace(/^#\/?/, '') || 'demo-tehnika';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const cfg = await fetch(`${base}t/${slug}.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (!cfg) {
  root.innerHTML = '<p class="empty">Страница не найдена</p>';
  throw new Error('нет настроек ' + slug);
}

const co = cfg.company;
document.title = `${co.name} — ${cfg.hero.title}`;
document.documentElement.style.setProperty('--accent', co.accent || '#e8641b');
if (co.accentInk) document.documentElement.style.setProperty('--accent-ink', co.accentInk);

const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const state = {
  item: null, zone: 0, hours: cfg.tech?.hours || 4,
  texture: 0, area: cfg.niche === 'klining' ? 50 : 18, corners: 4,
  type: 0, counts: {},
  date: '', address: '', name: '', phone: '', comment: '',
};

// ---------- кусочки разметки ----------
const stepper = (key, value, { min = 0, max = 999, step = 1, unit = '' } = {}) => `
  <div class="stepper" data-key="${key}" data-min="${min}" data-max="${max}" data-step="${step}">
    <button type="button" data-d="-1" aria-label="Меньше">−</button>
    <output>${value}${unit ? ` <small>${unit}</small>` : ''}</output>
    <button type="button" data-d="1" aria-label="Больше">+</button>
  </div>`;

const section = (n, title, body, note = '') => `
  <section class="step">
    <h2><span>${n}</span>${title}</h2>
    ${note ? `<p class="step__note">${note}</p>` : ''}
    ${body}
  </section>`;

const extrasBlock = (list) => `<div class="extras">${list.map((x) => `
  <div class="extra">
    ${x.photo ? `<img class="extra__pic" src="${esc(x.photo)}" alt="" loading="lazy">` : ''}
    <div class="extra__text"><b>${esc(x.name)}</b><small>${rub(x.price)} / ${esc(x.unit || 'шт')}</small></div>
    ${stepper('x:' + x.id, state.counts[x.id] || 0, { max: x.max || 30 })}
  </div>`).join('')}</div>`;

const choice = (key, list, cur, render) => `<div class="choices">${list.map((x, i) => `
  <button type="button" class="choice${i === cur ? ' is-on' : ''}" data-choice="${key}" data-i="${i}">${render(x)}</button>`).join('')}</div>`;

const media = (x, kind) => (x.photo
  ? `<img src="${esc(x.photo)}" alt="" loading="lazy">`
  : `<i class="pict">${ICONS[x.kind || kind] || ICONS.excavator}</i>`);

function nicheBody() {
  if (cfg.niche === 'tech') {
    const t = cfg.tech;
    return section(1, 'Выберите технику', `<div class="cards">${t.items.map((x) => `
      <button type="button" class="card${state.item === x.id ? ' is-on' : ''}${x.busy ? ' is-busy' : ''}" data-item="${x.id}" ${x.busy ? 'disabled' : ''}>
        <div class="card__media">${media(x, 'excavator')}<span class="badge ${x.busy ? 'badge--busy' : ''}">${x.busy ? esc(x.busyText || 'Занята') : 'Свободна'}</span></div>
        <div class="card__body">
          <b>${esc(x.name)}</b>
          <small>${esc(x.purpose)}</small>
          <span class="card__price">${x.from ? 'от ' : ''}${rub(x.rate)}<small> / час</small></span>
          <small>Смена от ${x.min} ч</small>
        </div>
      </button>`).join('')}</div>`)
      + section(2, 'Где и когда', `
        <label class="field"><span>Адрес объекта</span><input name="address" placeholder="Улица, дом или ориентир" value="${esc(state.address)}"></label>
        <div class="field"><span>Зона подачи</span>${choice('zone', t.zones, state.zone, (z) => `<b>${esc(z.name)}</b><small>${z.text || (z.price ? '+ ' + rub(z.price) : 'бесплатно')}</small>`)}</div>
        <div class="row">
          <label class="field"><span>Дата</span><input type="date" name="date" min="${today}" value="${state.date}"></label>
          <div class="field"><span>Часов работы</span>${stepper('hours', state.hours, { min: 1, max: 24, unit: 'ч' })}</div>
        </div>`);
  }
  if (cfg.niche === 'potolki') {
    const t = cfg.potolki;
    return section(1, 'Размер и полотно', `
        <div class="row">
          <div class="field"><span>Площадь потолка</span>${stepper('area', state.area, { min: 1, max: 300, unit: 'м²' })}</div>
          ${t.cornerPrice ? `<div class="field"><span>Углов в комнате</span>${stepper('corners', state.corners, { min: 3, max: 20 })}</div>` : ''}
        </div>
        <div class="field"><span>Полотно</span>${choice('texture', t.textures, state.texture, (x) => `${x.photo ? `<img class="choice__pic" src="${esc(x.photo)}" alt="" loading="lazy">` : ''}<b>${esc(x.name)}</b><small>${x.from ? 'от ' : ''}${rub(x.price)} / м²</small>${x.desc ? `<em>${esc(x.desc)}</em>` : ''}`)}</div>`,
      t.cornerPrice ? `Четыре угла входят в цену, каждый следующий — ${rub(t.cornerPrice)}.` : (t.areaNote || ''))
      + section(2, 'Свет и обходы', extrasBlock(t.extras))
      + section(3, 'Когда приехать на замер', `<label class="field"><span>Удобная дата</span><input type="date" name="date" min="${today}" value="${state.date}"></label>`, t.measure || 'Замер бесплатный, цена уточнится на месте.');
  }
  const t = cfg.klining;
  return section(1, 'Вид уборки', choice('type', t.types, state.type, (x) => `${x.photo ? `<img class="choice__pic" src="${esc(x.photo)}" alt="" loading="lazy">` : ''}<b>${esc(x.name)}</b><small>${rub(x.price)} / м²</small>${x.desc ? `<em>${esc(x.desc)}</em>` : ''}`)
      + `<div class="field"><span>Площадь</span>${stepper('area', state.area, { min: 10, max: 500, step: 5, unit: 'м²' })}</div>`)
    + section(2, 'Дополнительно', extrasBlock(t.extras))
    + section(3, 'Когда', `<label class="field"><span>Дата уборки</span><input type="date" name="date" min="${today}" value="${state.date}"></label>`);
}

function render() {
  const icon = cfg.niche === 'tech' ? 'excavator' : cfg.niche === 'potolki' ? 'ceiling' : 'clean';
  root.innerHTML = `
    <header class="top">
      <div class="brand">
        ${co.logo ? `<img class="${co.logoWide ? 'logo-wide' : ''}${co.logoLight ? ' logo-light' : ''}" src="${esc(co.logo)}" alt="">` : `<i class="mono">${esc(co.name.replace(/[«»"]/g, '').slice(0, 1))}</i>`}
        <div><b>${esc(co.name)}</b><small>${esc(co.city || '')}</small></div>
      </div>
      ${co.phone ? `<a class="top__call" href="tel:${esc(co.phone.replace(/[^\d+]/g, ''))}">${ICONS.phone}<span>${esc(co.phone)}</span></a>` : ''}
    </header>

    <section class="hero">
      <div class="hero__text">
        <h1>${esc(cfg.hero.title)}</h1>
        <p>${esc(cfg.hero.sub)}</p>
        <ul class="pills">${(cfg.hero.points || ['Цена сразу', 'Заявка в Telegram', 'Без звонков']).map((p) => `<li>${ICONS.check}${esc(p)}</li>`).join('')}</ul>
      </div>
      ${cfg.hero.photo ? `<img class="hero__photo" src="${esc(cfg.hero.photo)}" alt=""${cfg.hero.photoPos ? ` style="object-position:${esc(cfg.hero.photoPos)}"` : ''}>` : `<i class="hero__pict">${ICONS[icon]}</i>`}
    </section>

    <form class="steps" id="form" autocomplete="on" onsubmit="return false">
      ${nicheBody()}
      ${section(cfg.niche === 'tech' ? 3 : 4, 'Контакты', `
        <div class="row">
          <label class="field"><span>Имя</span><input name="name" autocomplete="name" placeholder="Как к вам обращаться" value="${esc(state.name)}"></label>
          <label class="field"><span>Телефон</span><input name="phone" type="tel" autocomplete="tel" placeholder="+7" value="${esc(state.phone)}"></label>
        </div>
        <label class="field"><span>Комментарий</span><textarea name="comment" rows="2" placeholder="${esc(cfg.commentHint || 'Что важно знать заранее')}">${esc(state.comment)}</textarea></label>`)}
      <p class="fine">${esc(cfg.note || 'Цена предварительная: точную сумму подтвердим после заявки.')}</p>
    </form>

    <div class="bar" id="bar"></div>
    <footer class="foot">${esc(co.name)}${co.address ? ' · ' + esc(co.address) : ''}${co.hours ? ' · ' + esc(co.hours) : ''}</footer>
    <div class="sheet" id="sheet" hidden></div>`;
  updateBar();
}

function result() {
  return NICHES[cfg.niche](cfg, state);
}

function updateBar() {
  const r = result();
  const bar = document.getElementById('bar');
  const price = r.ready ? priceRange(cfg, r.sum).text : r.hint;
  bar.innerHTML = `
    <div class="bar__price"><small>${r.ready ? 'Предварительно' : 'Стоимость'}</small><b>${price}</b></div>
    <button type="button" class="btn" id="send" ${r.ready ? '' : 'disabled'}>Отправить заявку</button>`;
}

function requestText() {
  const r = result();
  const range = priceRange(cfg, r.sum).text;
  return [
    `Заявка с сайта ${co.name}`,
    ...r.lines,
    state.address && `Адрес: ${state.address}`,
    state.date && `Дата: ${state.date.split('-').reverse().join('.')}`,
    `Предварительно: ${range}`,
    state.name && `Имя: ${state.name}`,
    state.phone && `Телефон: ${state.phone}`,
    state.comment && `Комментарий: ${state.comment}`,
  ].filter(Boolean).join('\n');
}

function openSheet() {
  const text = requestText();
  const enc = encodeURIComponent(text);
  const sheet = document.getElementById('sheet');
  const tg = co.telegram ? `https://t.me/${co.telegram.replace(/^@/, '')}?text=${enc}` : '';
  const wa = co.whatsapp ? `https://wa.me/${co.whatsapp.replace(/\D/g, '')}?text=${enc}` : '';
  sheet.innerHTML = `
    <div class="sheet__box" role="dialog" aria-modal="true" aria-label="Заявка">
      <button type="button" class="sheet__close" data-close aria-label="Закрыть">${ICONS.close}</button>
      <h3>Заявка готова</h3>
      <p>Отправьте её в мессенджер — всё уже заполнено, ничего печатать не нужно.</p>
      <pre>${esc(text)}</pre>
      <div class="sheet__btns">
        ${tg ? `<a class="btn" href="${tg}" target="_blank" rel="noopener">${ICONS.tg}Отправить в Telegram</a>` : ''}
        ${wa ? `<a class="btn btn--ghost" href="${wa}" target="_blank" rel="noopener">${ICONS.wa}WhatsApp</a>` : ''}
        <button type="button" class="btn btn--ghost" id="copy">${ICONS.copy}<span>Скопировать</span></button>
        ${co.phone ? `<a class="btn btn--ghost" href="tel:${esc(co.phone.replace(/[^\d+]/g, ''))}">${ICONS.phone}Позвонить</a>` : ''}
      </div>
    </div>`;
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  // в Telegram ссылка с текстом открывает чат с уже вставленной заявкой; копия — на случай, если не вставилась
  navigator.clipboard?.writeText(text).catch(() => {});
}

function closeSheet() {
  const sheet = document.getElementById('sheet');
  sheet.classList.remove('is-open');
  setTimeout(() => { sheet.hidden = true; }, 250);
}

// ---------- события ----------
root.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-close]');
  if (!t) return;
  if (t.dataset.item) { state.item = t.dataset.item; return rerenderKeep(); }
  if (t.dataset.choice) { state[t.dataset.choice] = +t.dataset.i; return rerenderKeep(); }
  if (t.dataset.d) {
    const box = t.closest('.stepper');
    const key = box.dataset.key;
    const step = +box.dataset.step;
    const cur = key.startsWith('x:') ? (state.counts[key.slice(2)] || 0) : state[key];
    const next = Math.min(+box.dataset.max, Math.max(+box.dataset.min, cur + step * +t.dataset.d));
    if (key.startsWith('x:')) state.counts[key.slice(2)] = next; else state[key] = next;
    const unit = box.querySelector('small')?.outerHTML || '';
    box.querySelector('output').innerHTML = `${next}${unit ? ' ' + unit : ''}`;
    return updateBar();
  }
  if (t.id === 'send') return openSheet();
  if (t.id === 'copy') {
    navigator.clipboard?.writeText(requestText()).then(() => { t.querySelector('span').textContent = 'Скопировано'; });
    return;
  }
  if (t.hasAttribute('data-close')) closeSheet();
});
root.addEventListener('input', (e) => {
  const { name, value } = e.target;
  if (name in state) { state[name] = value; updateBar(); }
});
root.addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

// перерисовка без прыжка прокрутки
function rerenderKeep() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

render();
