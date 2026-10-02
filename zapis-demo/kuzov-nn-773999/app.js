'use strict';

const $ = (id) => document.getElementById(id);
const KEY = 'zapis-app:bookings';
const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const state = { config: null, service: null, day: null, time: null };

const pad = (n) => String(n).padStart(2, '0');
const toMin = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const toHm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const humanDay = (s) => new Date(s + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const bookings = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

function pick(box, active) {
  for (const b of box.querySelectorAll('button[aria-pressed]')) b.setAttribute('aria-pressed', 'false');
  if (active) active.setAttribute('aria-pressed', 'true');
}

function buildServices() {
  const list = $('services');
  state.config.услуги.forEach((s) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    const name = document.createElement('span');
    name.textContent = s.название;
    const meta = document.createElement('span');
    meta.textContent = new Intl.NumberFormat('ru-RU').format(s.цена) + ' ₽ · ' + s.длительность_минут + ' мин';
    meta.className = 'service__meta';
    b.append(name, meta);
    b.addEventListener('click', () => {
      state.service = s; state.time = null; pick(list, b);
      $('price-sum').textContent = new Intl.NumberFormat('ru-RU').format(s.цена) + ' ₽';
      $('price-card').querySelector('.price__note').textContent = s.название + ', ' + s.длительность_минут + ' мин';
      renderTimes();
    });
    li.append(b);
    list.append(li);
  });
}

function buildDays() {
  const box = $('days');
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.dataset.date = iso(d);
    b.textContent = i === 0
      ? 'Сегодня, ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      : d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    b.addEventListener('click', () => { state.day = b.dataset.date; state.time = null; pick(box, b); renderTimes(); });
    box.append(b);
  }
}

function renderTimes() {
  const box = $('times');
  box.textContent = '';
  if (!state.service || !state.day) return;
  const d = new Date(state.day + 'T00:00:00');
  const hours = state.config.часы_работы[DOW[d.getDay()]];
  const dur = state.service.длительность_минут;
  const taken = bookings().filter((b) => b.день === state.day);
  if (hours) {
    const now = new Date();
    const nowMin = state.day === iso(now) ? now.getHours() * 60 + now.getMinutes() : -1;
    for (let t = toMin(hours[0]); t + dur <= toMin(hours[1]); t += dur) {
      if (t <= nowMin) continue;
      if (taken.some((b) => { const s = toMin(b.время); return t < s + (b.длительность || dur) && s < t + dur; })) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.textContent = toHm(t);
      b.addEventListener('click', () => { state.time = b.textContent; pick(box, b); });
      box.append(b);
    }
  }
  if (!box.children.length) {
    box.textContent = 'Свободного времени нет. Позвоните, подберём время вручную.';
    $('submit-button').disabled = true;
    $('submit-button').textContent = 'Свободного времени нет';
    return;
  }
  const first = box.querySelector('button');
  if (first) { state.time = first.textContent; pick(box, first); }
  $('submit-button').disabled = false;
  $('submit-button').textContent = 'Записаться';
}

$('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.service || !state.day || !state.time) return;
  const data = { имя: $('client-name').value.trim(), телефон: $('client-phone').value.trim(), услуга: state.service.название, день: state.day, время: state.time };
  const number = 'З-' + String(Date.now()).slice(-6);
  const note = $('confirm-note');
  note.hidden = true;
  if (state.config.lead_url) {
    try {
      const r = await fetch(state.config.lead_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error(r.status);
    } catch {
      note.textContent = 'Заявка не ушла: адрес приёма не отвечает. Позвоните по телефону в шапке.';
      note.hidden = false;
    }
  } else {
    note.textContent = 'Демо-режим: заявка не отправлена, адрес приёма заявок не настроен.';
    note.hidden = false;
  }
  const list = bookings();
  list.push({ id: number, день: state.day, время: state.time, услуга: data.услуга, длительность: state.service.длительность_минут });
  localStorage.setItem(KEY, JSON.stringify(list));
  $('confirm-service').textContent = data.услуга;
  $('confirm-day').textContent = humanDay(data.день);
  $('confirm-time').textContent = data.время;
  $('confirm-number').textContent = number;
  renderTimes();
  renderMine();
  showScreen('confirm');
});

$('new-booking').addEventListener('click', () => {
  state.time = null;
  showScreen('booking');
  renderTimes();
});

$('hero-cta').addEventListener('click', () => {
  showScreen('booking');
  const form = $('booking-form');
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

/* Экраны внутри одной страницы: переключение как в приложении, без перезагрузки */
function showScreen(name) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== 'screen-' + name;
  const hero = document.querySelector('.hero');
  if (hero) hero.hidden = name !== 'booking' && name !== 'confirm';
  document.body.dataset.screen = name;
  for (const b of document.querySelectorAll('#tabbar .tabbar__item')) {
    b.setAttribute('aria-selected', String(b.dataset.screen === name || (name === 'confirm' && b.dataset.screen === 'booking')));
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('#tabbar .tabbar__item').forEach((b) => {
  b.addEventListener('click', () => showScreen(b.dataset.screen));
});

/* Моя запись: клиент видит свои записи и может отменить — освободившееся время вернётся в список */
function renderMine() {
  const box = $('mine-list');
  if (!box) return;
  const list = bookings();
  box.textContent = '';
  if (!list.length) {
    const p = document.createElement('li');
    p.className = 'mine__empty';
    p.textContent = 'Записей пока нет. Выберите услугу и время — запись появится здесь.';
    box.append(p);
    return;
  }
  list.slice().reverse().forEach((b) => {
    const li = document.createElement('li');
    li.className = 'mine__item';
    const info = document.createElement('div');
    info.className = 'mine__info';
    const name = document.createElement('span');
    name.className = 'mine__name';
    name.textContent = b.услуга;
    const when = document.createElement('span');
    when.className = 'mine__when';
    when.textContent = humanDay(b.день) + ', ' + b.время;
    const status = document.createElement('span');
    status.className = 'mine__status';
    status.textContent = 'ждём вас';
    info.append(name, when, status);
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'mine__cancel';
    cancel.textContent = 'Отменить';
    cancel.addEventListener('click', () => {
      const left = bookings().filter((x) => x.id !== b.id);
      localStorage.setItem(KEY, JSON.stringify(left));
      renderMine();
      renderTimes();
    });
    li.append(info, cancel);
    box.append(li);
  });
}

/* Контакты: адрес, телефон и часы работы из настроек студии */
function buildContacts(config) {
  const box = $('contacts-list');
  if (!box) return;
  const rows = [['Студия', config.название || ''], ['Адрес', config.адрес || ''], ['Телефон', config.телефон || '']];
  const часов = config.часы_работы || {};
  const дни = [['пн', 'Понедельник'], ['вт', 'Вторник'], ['ср', 'Среда'], ['чт', 'Четверг'], ['пт', 'Пятница'], ['сб', 'Суббота'], ['вс', 'Воскресенье']];
  box.textContent = '';
  for (const [k, v] of rows) {
    const row = document.createElement('div');
    row.className = 'confirm__row';
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    row.append(dt, dd);
    box.append(row);
  }
  for (const [key, label] of дни) {
    const hours = часов[key];
    const row = document.createElement('div');
    row.className = 'confirm__row';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = hours ? hours[0] + ' – ' + hours[1] : 'выходной';
    row.append(dt, dd);
    box.append(row);
  }
  const call = $('call-button');
  call.href = 'tel:' + String(config.телефон || '').replace(/[^\d+]/g, '');
}

function init(config) {
  state.config = config;
  const c = config.цвета || {};
  if (c.акцент) document.documentElement.style.setProperty('--accent', c.акцент);
  if (c.фон) document.documentElement.style.setProperty('--bg', c.фон);
  const photo = $('photo-img');
  const photoCard = $('photo-card');
  if (config.фон_героя) { photo.src = config.фон_героя; } else if (photoCard) { photoCard.hidden = true; }
  const услуги = config.услуги || [];
  const цены = услуги.map((s) => Number(s.цена) || 0).filter((n) => n > 0);
  const дешевле = цены.length ? Math.min.apply(null, цены) : 0;
  $('price-sum').textContent = дешевле ? 'от ' + new Intl.NumberFormat('ru-RU').format(дешевле) + ' ₽' : '';
  $('company-name').textContent = config.название || '';
  $('company-short').textContent = config.короткое_имя || config.название || 'Онлайн-запись';
  $('benefit').textContent = config.выгода || '';
  $('company-address').textContent = config.адрес || '';
  const phone = $('company-phone');
  phone.textContent = config.телефон || '';
  phone.href = 'tel:' + String(config.телефон || '').replace(/[^\d+]/g, '');
  const метрики = (config.метрики && config.метрики.length) ? config.метрики : [
    { значение: услуги.length + ' услуг', подпись: 'в прайсе студии' },
    { значение: 'всегда свободно', подпись: 'время видно сразу' },
    { значение: 'без звонка', подпись: 'запись в два тапа' },
  ];
  const mb = $('metrics'); mb.textContent = '';
  for (const m of метрики) {
    const li = document.createElement('li');
    li.className = 'metrics__item';
    li.innerHTML = '<span class="metrics__value"></span><span class="metrics__label"></span>';
    li.firstChild.textContent = m.значение; li.lastChild.textContent = m.подпись;
    mb.append(li);
  }
  buildServices();
  buildDays();
  buildContacts(config);
  renderMine();
  showScreen('booking');
  const s = $('services').querySelector('button');
  const d = $('days').querySelector('button');
  if (s) s.click();
  if (d) d.click();
}

fetch('config.json')
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(init)
  .catch(() => { $('company-name').textContent = 'Не удалось загрузить config.json'; });
