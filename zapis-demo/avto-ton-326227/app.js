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

/* Шаги записи: человек видит, что уже выбрано и что осталось — как в приложении, а не списком полей */
function updateSteps() {
  const box = $('steps');
  if (!box) return;
  const shortDay = state.day ? humanDay(state.day).replace(/^\w/, (c) => c.toUpperCase()) : '';
  const done = {
    service: state.service ? state.service.название : '',
    when: state.day && state.time ? shortDay + ', ' + state.time : '',
    data: ($('client-name').value.trim() && $('client-phone').value.trim()) ? 'готово' : '',
  };
  for (const item of box.querySelectorAll('.steps__item')) {
    const value = done[item.dataset.step];
    const label = item.querySelector('.steps__label');
    const num = item.querySelector('.steps__num');
    item.classList.toggle('steps__item--done', Boolean(value));
    const base = item.dataset.step === 'service' ? 'Выберите услугу'
      : item.dataset.step === 'when' ? 'День и время' : 'Имя и телефон';
    label.textContent = value ? (item.dataset.step === 'data' ? 'Данные заполнены' : value) : base;
    if (num) num.textContent = value ? '✓' : item.dataset.step === 'service' ? '1' : item.dataset.step === 'when' ? '2' : '3';
  }
  const summary = $('form-summary');
  if (summary) {
    summary.textContent = state.service && state.day && state.time
      ? 'Вы записываетесь: ' + state.service.название + ' — ' + shortDay + ', ' + state.time
      : '';
  }
}

/* Файл для календаря: клиент одним тапом ставит запись в свой календарь */
function calendarLink(b) {
  const dur = Number(b.длительность) || 60;
  const start = b.день.replace(/-/g, '') + 'T' + b.время.replace(':', '') + '00';
  const endMin = toMin(b.время) + dur;
  const end = b.день.replace(/-/g, '') + 'T' + pad(Math.floor(endMin / 60) % 24) + pad(endMin % 60) + '00';
  const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    'SUMMARY:' + b.услуга, 'DTSTART:' + start, 'DTEND:' + end,
    'LOCATION:' + (state.config.адрес || ''), 'DESCRIPTION:Запись ' + b.id, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text);
}

function pick(box, active) {
  for (const b of box.querySelectorAll('button[aria-pressed]')) b.setAttribute('aria-pressed', 'false');
  if (active) active.setAttribute('aria-pressed', 'true');
}

/* Если на сегодня времени уже не осталось, сразу открываем ближайший день со свободными окнами */
function selectFirstFreeDay() {
  const days = Array.from($('days').querySelectorAll('button'));
  for (const day of days) {
    day.click();
    if ($('times').querySelector('button')) return day;
  }
  return null;
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
      updateSteps();
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
    b.addEventListener('click', () => { state.day = b.dataset.date; state.time = null; pick(box, b); renderTimes(); updateSteps(); });
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
      b.addEventListener('click', () => { state.time = b.textContent; pick(box, b); updateSteps(); });
      box.append(b);
    }
  }
  if (!box.children.length) {
    box.textContent = 'На этот день свободного времени нет. Выберите другой день или позвоните — подберём время вручную.';
    $('submit-button').disabled = true;
    $('submit-button').textContent = 'Свободного времени нет';
    updateSteps();
    return;
  }
  const first = box.querySelector('button');
  if (first) { state.time = first.textContent; pick(box, first); }
  $('submit-button').disabled = false;
  $('submit-button').textContent = 'Записаться';
  updateSteps();
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

for (const id of ['client-name', 'client-phone']) {
  const el = $(id);
  if (el) el.addEventListener('input', updateSteps);
}

/* Установка как приложение: кнопка «На экран Домой» ставит ярлык по-настоящему, а не картинкой */
let installEvent = null;
const installButton = $('install-button');
const installHint = $('install-hint');
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

if (standalone && installButton) installButton.hidden = true;
if (isIos && !standalone && installButton) installButton.hidden = false;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  if (installButton) installButton.hidden = false;
});

window.addEventListener('appinstalled', () => { if (installButton) installButton.hidden = true; });

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (installEvent) {
      installEvent.prompt();
      const res = await installEvent.userChoice;
      installEvent = null;
      if (res && res.outcome === 'accepted') installButton.hidden = true;
      return;
    }
    if (installHint) {
      installHint.textContent = isIos
        ? 'Нажмите «Поделиться» внизу экрана и выберите «На экран «Домой»» — приложение появится среди иконок и откроется без адресной строки.'
        : 'Откройте меню браузера и выберите «Установить приложение» — запись появится среди иконок и откроется без адресной строки.';
      installHint.hidden = false;
      installHint.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

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

/* Моя запись: клиент видит свои записи, может поставить в календарь, перенести или отменить */
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
  const today = iso(new Date());
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
    const past = b.день < today;
    status.textContent = past ? 'запись прошла' : 'ждём вас, номер ' + b.id;
    if (past) status.classList.add('mine__status--past');
    info.append(name, when, status);

    const row = document.createElement('div');
    row.className = 'mine__actions';

    if (!past) {
      const cal = document.createElement('a');
      cal.className = 'mine__action';
      cal.href = calendarLink(b);
      cal.download = 'zapis-' + b.id + '.ics';
      cal.textContent = 'В календарь';
      row.append(cal);

      const move = document.createElement('button');
      move.type = 'button';
      move.className = 'mine__action';
      move.textContent = 'Перенести';
      move.addEventListener('click', () => {
        const left = bookings().filter((x) => x.id !== b.id);
        localStorage.setItem(KEY, JSON.stringify(left));
        const service = (state.config.услуги || []).find((s) => s.название === b.услуга);
        showScreen('booking');
        if (service) {
          const btn = Array.from(document.querySelectorAll('#services button'))
            .find((x) => x.textContent.indexOf(service.название) === 0);
          if (btn) btn.click();
        }
        renderMine();
      });
      row.append(move);
    }

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'mine__action mine__action--danger';
    cancel.textContent = 'Отменить';
    cancel.addEventListener('click', () => {
      const left = bookings().filter((x) => x.id !== b.id);
      localStorage.setItem(KEY, JSON.stringify(left));
      renderMine();
      renderTimes();
    });
    row.append(cancel);

    li.append(info, row);
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
  if (s) s.click();
  selectFirstFreeDay();
  updateSteps();
  const wanted = new URLSearchParams(location.search).get('screen');
  if (wanted && document.getElementById('screen-' + wanted)) showScreen(wanted);
}

fetch('config.json')
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(init)
  .catch(() => { $('company-name').textContent = 'Не удалось загрузить config.json'; });
