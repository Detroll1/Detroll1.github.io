'use strict';

/* Онлайн-запись: главная, кабинет клиента и профиль. Данные живут на сервере,
   поэтому записи и настройки видны с любого устройства по телефону и пину. */

const $ = (id) => document.getElementById(id);
const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const TOKEN_KEY = 'zapis-app:token';
const state = {
  config: null,
  service: null,
  day: null,
  time: null,
  busy: [],
  token: localStorage.getItem(TOKEN_KEY) || '',
  profile: null,
  bookings: [],
  editing: null,
  edit: { service: null, day: null, time: null },
};

const pad = (n) => String(n).padStart(2, '0');
const toMin = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const toHm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const money = (n) => new Intl.NumberFormat('ru-RU').format(Number(n) || 0) + ' ₽';

/* Телефон в кабинете приходит цифрами: показываем его как привычно — +7 900 000-00-00 */
function prettyPhone(value) {
  const d = String(value || '').replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return String(value || '');
  return '+7 ' + d.slice(0, 3) + ' ' + d.slice(3, 6) + '-' + d.slice(6, 8) + '-' + d.slice(8);
}
const humanDay = (s) => new Date(s + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const today = () => iso(new Date());

const apiBase = () => (state.config && state.config.сервер) || '';
const slug = () => (state.config && state.config.студия) || 'detroll';

async function api(path, body) {
  if (!apiBase()) throw new Error('сервер не настроен');
  const res = await fetch(apiBase() + path, body === undefined
    ? { headers: { 'Content-Type': 'application/json' } }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch { data = { ok: false, error: 'сервер не ответил' }; }
  if (!res.ok && data && !data.error) data.error = 'ошибка сервера';
  return data;
}

function pick(box, active) {
  for (const b of box.querySelectorAll('button[aria-pressed]')) b.setAttribute('aria-pressed', 'false');
  if (active) active.setAttribute('aria-pressed', 'true');
}

function showError(id, text) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || '';
  el.hidden = !text;
}

/* Шаги записи: человек видит, что уже выбрано и что осталось */
function updateSteps() {
  const box = $('steps');
  if (!box) return;
  const shortDay = state.day ? humanDay(state.day).replace(/^\w/, (c) => c.toUpperCase()) : '';
  const name = $('client-name').value.trim();
  const phone = $('client-phone').value.trim();
  const done = {
    service: state.service ? state.service.название : '',
    when: state.day && state.time ? shortDay + ', ' + state.time : '',
    data: name && phone ? 'готово' : '',
  };
  for (const item of box.querySelectorAll('.steps__item')) {
    const value = done[item.dataset.step];
    const kind = item.dataset.step;
    const base = kind === 'service' ? 'Выберите услугу' : kind === 'when' ? 'День и время' : 'Имя и телефон';
    item.classList.toggle('steps__item--done', Boolean(value));
    item.querySelector('.steps__label').textContent = value ? (kind === 'data' ? 'Данные заполнены' : value) : base;
    item.querySelector('.steps__num').textContent = value ? '✓' : kind === 'service' ? '1' : kind === 'when' ? '2' : '3';
  }
  $('form-summary').textContent = state.service && state.day && state.time
    ? 'Вы записываетесь: ' + state.service.название + ' — ' + shortDay + ', ' + state.time : '';
}

/* Услуги */
function buildServices() {
  const list = $('services');
  list.textContent = '';
  for (const s of state.config.услуги || []) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    const name = document.createElement('span');
    name.textContent = s.название;
    const meta = document.createElement('span');
    meta.className = 'service__meta';
    meta.textContent = money(s.цена) + ' · ' + s.длительность_минут + ' мин';
    b.append(name, meta);
    b.addEventListener('click', () => {
      state.service = s;
      state.time = null;
      pick(list, b);
      $('price-sum').textContent = money(s.цена);
      $('price-card').querySelector('.price__note').textContent = s.название + ', ' + s.длительность_минут + ' мин';
      renderTimes();
    });
    li.append(b);
    list.append(li);
  }
}

/* Дни */
function buildDays() {
  const box = $('days');
  box.textContent = '';
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.dataset.date = iso(d);
    b.textContent = i === 0
      ? 'Сегодня, ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      : d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    b.addEventListener('click', () => {
      state.day = b.dataset.date;
      state.time = null;
      pick(box, b);
      renderTimes();
    });
    box.append(b);
  }
}

/* Свободное время: рабочие часы студии минус занятые окна с сервера */
async function renderTimes() {
  const box = $('times');
  const button = $('submit-button');
  box.textContent = '';
  box.textContent = 'Смотрим свободное время…';
  if (!state.service || !state.day) return;
  const hours = (state.config.часы_работы || {})[DOW[new Date(state.day + 'T00:00:00').getDay()]];
  const dur = state.service.длительность_минут;
  state.busy = [];
  try {
    const data = await api('/zapis/busy?slug=' + encodeURIComponent(slug()) + '&day=' + state.day);
    if (data && data.ok && data.taken) state.busy = data.taken;
  } catch { /* без сервера покажем просто рабочие часы */ }
  box.textContent = '';
  if (hours) {
    const now = new Date();
    const nowMin = state.day === today() ? now.getHours() * 60 + now.getMinutes() : -1;
    for (let t = toMin(hours[0]); t + dur <= toMin(hours[1]); t += dur) {
      if (t <= nowMin) continue;
      const busy = state.busy.some((b) => {
        const s = toMin(b.time);
        return t < s + (Number(b.minutes) || dur) && s < t + dur;
      });
      if (busy) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.textContent = toHm(t);
      b.addEventListener('click', () => {
        state.time = b.textContent;
        pick(box, b);
        updateSteps();
      });
      box.append(b);
    }
  }
  if (!box.children.length) {
    box.textContent = 'На этот день всё занято. Выберите другой день или позвоните — подберём время вручную.';
    button.disabled = true;
    button.textContent = 'Свободного времени нет';
    updateSteps();
    return;
  }
  const first = box.querySelector('button');
  if (first) {
    state.time = first.textContent;
    pick(box, first);
  }
  button.disabled = false;
  button.textContent = 'Записаться';
  updateSteps();
}

/* Открыть ближайший день со свободным временем */
async function selectFirstFreeDay() {
  for (const day of Array.from($('days').querySelectorAll('button'))) {
    day.click();
    await new Promise((r) => setTimeout(r, 60));
    if ($('times').querySelector('button')) return day;
    await new Promise((r) => setTimeout(r, 220));
    if ($('times').querySelector('button')) return day;
  }
  return null;
}

/* Кабинет */
async function loadMe() {
  if (!state.token) return;
  try {
    const data = await api('/zapis/me?token=' + state.token);
    if (data && data.ok) {
      state.profile = data.profile;
      state.bookings = data.bookings || [];
      fillProfile();
      fillFromProfile();
    } else {
      state.token = '';
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch { /* сервер недоступен — покажем как есть */ }
}

function fillFromProfile() {
  if (!state.profile) return;
  if (!$('client-name').value) $('client-name').value = state.profile.name || '';
  if (!$('client-phone').value) $('client-phone').value = state.profile.phone || '';
  if (!$('client-car').value) $('client-car').value = state.profile.car || '';
  const pin = $('client-pin');
  if (pin) {
    const known = state.profile.phone && state.profile.phone === $('client-phone').value.replace(/\D/g, '').slice(-10);
    $('pin-field').hidden = Boolean(state.token && state.profile);
    pin.value = '';
  }
}

function calendarHref(b) {
  const dur = Number(b.minutes) || 60;
  const start = b.date.replace(/-/g, '') + 'T' + b.time.replace(':', '') + '00';
  const endMin = toMin(b.time) + dur;
  const end = b.date.replace(/-/g, '') + 'T' + pad(Math.floor(endMin / 60) % 24) + pad(endMin % 60) + '00';
  const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:' + b.service,
    'DTSTART:' + start, 'DTEND:' + end, 'LOCATION:' + ((state.config && state.config.адрес) || ''),
    'DESCRIPTION:Запись ' + b.id, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text);
}

function renderMine() {
  const box = $('mine-list');
  const logged = Boolean(state.token && state.profile);
  $('login-card').hidden = logged;
  $('logout-button').hidden = !logged;
  $('mine-hint').hidden = !logged;
  box.textContent = '';
  if (!logged) {
    $('mine-hint').textContent = '';
    return;
  }
  const now = today();
  const list = state.bookings.slice().reverse();
  if (!list.length) {
    const p = document.createElement('li');
    p.className = 'mine__empty';
    p.textContent = 'Записей пока нет. Выберите услугу и время на главной — запись появится здесь.';
    box.append(p);
    return;
  }
  for (const b of list) {
    const li = document.createElement('li');
    li.className = 'mine__item';
    const info = document.createElement('div');
    info.className = 'mine__info';
    const name = document.createElement('span');
    name.className = 'mine__name';
    name.textContent = b.service;
    const when = document.createElement('span');
    when.className = 'mine__when';
    when.textContent = humanDay(b.date) + ', ' + b.time + (b.price ? ' · ' + money(b.price) : '');
    const status = document.createElement('span');
    status.className = 'mine__status';
    const cancelled = b.status === 'отменена';
    const past = b.date < now;
    status.textContent = cancelled ? 'отменена' : past ? 'запись прошла' : 'ждём вас · номер ' + b.id;
    if (cancelled || past) status.classList.add('mine__status--past');
    info.append(name, when, status);

    const row = document.createElement('div');
    row.className = 'mine__actions';
    if (!cancelled && !past) {
      const cal = document.createElement('a');
      cal.className = 'mine__action';
      cal.href = calendarHref(b);
      cal.download = 'zapis-' + b.id + '.ics';
      cal.textContent = 'В календарь';
      row.append(cal);

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'mine__action';
      edit.textContent = 'Изменить';
      edit.addEventListener('click', () => openSheet(b));
      row.append(edit);

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'mine__action mine__action--danger';
      cancel.textContent = 'Отменить';
      cancel.addEventListener('click', async () => {
        cancel.disabled = true;
        const data = await api('/zapis/booking/cancel', { token: state.token, id: b.id });
        if (data && data.ok) {
          state.bookings = data.bookings || state.bookings;
          renderMine();
          renderTimes();
        } else {
          cancel.disabled = false;
          $('mine-hint').hidden = false;
          $('mine-hint').textContent = (data && data.error) || 'не получилось отменить, попробуйте ещё раз';
        }
      });
      row.append(cancel);
    }
    li.append(info, row);
    box.append(li);
  }
  $('mine-hint').textContent = 'Записи хранятся на сервере: войдите с любого телефона по номеру и пину.';
}

/* Лист изменения записи */
async function openSheet(b) {
  state.editing = b;
  state.edit = { service: (state.config.услуги || []).find((s) => s.название === b.service) || null, day: b.date, time: b.time };
  $('sheet-title').textContent = 'Изменить запись ' + b.id;
  $('sheet').hidden = false;
  await buildEditServices();
  buildEditDays();
  await renderEditTimes();
}

function closeSheet() {
  $('sheet').hidden = true;
  state.editing = null;
  showError('edit-error', '');
}

async function buildEditServices() {
  const box = $('edit-service');
  box.textContent = '';
  for (const s of state.config.услуги || []) {
    const o = document.createElement('option');
    o.value = s.название;
    o.textContent = s.название + ' — ' + money(s.цена) + ' · ' + s.длительность_минут + ' мин';
    if (state.edit.service && state.edit.service.название === s.название) o.selected = true;
    box.append(o);
  }
}

async function pickEditService() {
  const name = $('edit-service').value;
  const found = (state.config.услуги || []).find((s) => s.название === name) || null;
  state.edit.service = found;
  state.edit.time = null;
  await renderEditTimes();
}

function buildEditDays() {
  const box = $('edit-days');
  box.textContent = '';
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.date = iso(d);
    b.setAttribute('aria-pressed', String(state.edit.day === iso(d)));
    b.textContent = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    b.addEventListener('click', async () => {
      state.edit.day = b.dataset.date;
      state.edit.time = null;
      pick(box, b);
      await renderEditTimes();
    });
    box.append(b);
  }
}

async function renderEditTimes() {
  const box = $('edit-times');
  box.textContent = '';
  if (!state.edit.service || !state.edit.day) return;
  const hours = (state.config.часы_работы || {})[DOW[new Date(state.edit.day + 'T00:00:00').getDay()]];
  if (!hours) {
    box.textContent = 'В этот день студия не работает';
    return;
  }
  const dur = state.edit.service.длительность_минут;
  let taken = [];
  try {
    const data = await api('/zapis/busy?slug=' + encodeURIComponent(slug()) + '&day=' + state.edit.day);
    if (data && data.ok && data.taken) taken = data.taken;
  } catch { /* покажем часы без учёта занятости */ }
  const own = state.editing ? [state.editing] : [];
  const now = new Date();
  const nowMin = state.edit.day === today() ? now.getHours() * 60 + now.getMinutes() : -1;
  for (let t = toMin(hours[0]); t + dur <= toMin(hours[1]); t += dur) {
    if (t <= nowMin) continue;
    const busy = taken.some((b) => {
      const s = toMin(b.time);
      return t < s + (Number(b.minutes) || dur) && s < t + dur;
    }) && !own.some((o) => o.date === state.edit.day && o.time === toHm(t));
    if (busy) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(state.edit.time === toHm(t)));
    b.textContent = toHm(t);
    b.addEventListener('click', () => {
      state.edit.time = b.textContent;
      pick(box, b);
    });
    box.append(b);
  }
  if (!box.children.length) box.textContent = 'Свободного времени нет — выберите другой день';
}

async function saveEdit() {
  const b = state.editing;
  if (!b) return;
  if (!state.edit.service || !state.edit.day || !state.edit.time) {
    showError('edit-error', 'Выберите услугу, день и время');
    return;
  }
  const data = await api('/zapis/booking/update', {
    token: state.token,
    id: b.id,
    service: state.edit.service.название,
    price: state.edit.service.цена,
    minutes: state.edit.service.длительность_минут,
    date: state.edit.day,
    time: state.edit.time,
  });
  if (data && data.ok) {
    state.bookings = data.bookings || state.bookings;
    closeSheet();
    renderMine();
    renderTimes();
  } else {
    showError('edit-error', (data && data.error) || 'не получилось сохранить');
  }
}

/* Профиль */
function fillProfile() {
  const p = state.profile;
  if (!p) return;
  $('profile-card').hidden = false;
  $('profile-guest').hidden = true;
  $('profile-name').value = p.name || '';
  $('profile-phone').value = prettyPhone(p.phone);
  $('profile-car').value = p.car || '';
  $('profile-remind').value = String(p.remindHours == null ? 3 : p.remindHours);
  $('profile-contact').value = p.contact || 'звонок';
  $('profile-note').value = p.note || '';
}

function renderProfileGuest() {
  const logged = Boolean(state.token && state.profile);
  $('profile-card').hidden = !logged;
  $('profile-guest').hidden = logged;
}

function buildImportant() {
  const box = $('important-list');
  const c = state.config || {};
  const rows = [
    ['Студия', c.название || ''],
    ['Адрес', c.адрес || ''],
    ['Телефон', c.телефон || ''],
    ['Отмена', c.правила_отмены || 'Отменить или перенести запись можно в разделе «Мои записи» — в любое время.'],
  ];
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
    const hours = (c.часы_работы || {})[key];
    const row = document.createElement('div');
    row.className = 'confirm__row';
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = hours ? hours[0] + ' – ' + hours[1] : 'выходной';
    row.append(dt, dd);
    box.append(row);
  }
}

/* Экраны */
function showScreen(name) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== 'screen-' + name;
  document.body.dataset.screen = name;
  for (const b of document.querySelectorAll('#tabbar .tabbar__item')) {
    b.setAttribute('aria-selected', String(b.dataset.screen === name));
  }
  if (name === 'mine') renderMine();
  if (name === 'profile') renderProfileGuest();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Запись */
async function submitBooking(event) {
  event.preventDefault();
  const name = $('client-name').value.trim();
  const phone = $('client-phone').value.trim();
  const car = $('client-car').value.trim();
  const pin = $('client-pin').value.replace(/\D/g, '');
  showError('form-error', '');
  if (!state.service || !state.day || !state.time) return showError('form-error', 'Выберите услугу, день и время');
  if (!name) return showError('form-error', 'Напишите, как вас зовут');
  if (phone.replace(/\D/g, '').length < 10) return showError('form-error', 'Проверьте номер телефона');
  const logged = Boolean(state.token && state.profile);
  if (!logged && !/^\d{4,6}$/.test(pin)) return showError('form-error', 'Придумайте пин из 4–6 цифр — по нему откроете свои записи');
  const button = $('submit-button');
  button.disabled = true;
  button.textContent = 'Отправляем…';
  let data = null;
  try {
    data = await api('/zapis/booking', {
      slug: slug(),
      studio: state.config.название,
      service: state.service.название,
      price: state.service.цена,
      minutes: state.service.длительность_минут,
      date: state.day,
      time: state.time,
      name, phone, car, pin,
      token: state.token || '',
    });
  } catch {
    data = { ok: false, error: 'Сервер не ответил. Позвоните в студию по телефону в шапке.' };
  }
  button.disabled = false;
  button.textContent = 'Записаться';
  if (!data || !data.ok) {
    showError('form-error', (data && data.error) || 'не получилось записаться');
    await renderTimes();
    return;
  }
  if (data.token) {
    state.token = data.token;
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  state.profile = data.profile || state.profile;
  state.bookings = data.bookings || [];
  const b = data.booking;
  $('confirm-service').textContent = b.service;
  $('confirm-day').textContent = humanDay(b.date);
  $('confirm-time').textContent = b.time;
  $('confirm-number').textContent = b.id;
  $('confirm-calendar').href = calendarHref(b);
  showError('confirm-note', '');
  showScreen('confirm');
  renderMine();
  fillFromProfile();
  fillProfile();
}

/* Вход в кабинет */
async function submitLogin(event) {
  event.preventDefault();
  const phone = $('login-phone').value.trim();
  const pin = $('login-pin').value.replace(/\D/g, '');
  showError('login-error', '');
  const data = await api('/zapis/login', { slug: slug(), phone, pin });
  if (!data || !data.ok) {
    showError('login-error', (data && data.error) || 'не получилось войти');
    return;
  }
  state.token = data.token;
  localStorage.setItem(TOKEN_KEY, data.token);
  state.profile = data.profile;
  state.bookings = data.bookings || [];
  $('login-pin').value = '';
  $('client-name').value = state.profile.name || '';
  $('client-phone').value = state.profile.phone || '';
  $('client-car').value = state.profile.car || '';
  $('pin-field').hidden = true;
  fillProfile();
  renderMine();
  renderProfileGuest();
  renderTimes();
}

async function saveProfileForm(event) {
  event.preventDefault();
  if (!state.token) return;
  const data = await api('/zapis/profile', {
    token: state.token,
    name: $('profile-name').value.trim(),
    car: $('profile-car').value.trim(),
    remindHours: $('profile-remind').value,
    contact: $('profile-contact').value,
    note: $('profile-note').value.trim(),
  });
  if (data && data.ok) {
    state.profile = data.profile;
    $('profile-ok').hidden = false;
    setTimeout(() => { $('profile-ok').hidden = true; }, 2000);
    fillFromProfile();
  }
}

/* Установка приложения */
function setupInstall() {
  const banner = $('install-banner');
  const hint = $('install-hint');
  let prompt = null;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const hidden = localStorage.getItem('zapis-app:install-hidden') === '1';
  const known = (what) => { localStorage.setItem('zapis-app:install-' + what, '1'); };

  if (standalone || hidden) return;
  if (isIos) banner.hidden = false;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    prompt = e;
    banner.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    banner.hidden = true;
    known('installed');
  });
  banner.addEventListener('click', async () => {
    if (prompt) {
      prompt.prompt();
      const res = await prompt.userChoice;
      prompt = null;
      if (res && res.outcome === 'accepted') banner.hidden = true;
      else {
        localStorage.setItem('zapis-app:install-hidden', '1');
        banner.hidden = true;
      }
      return;
    }
    hint.textContent = isIos
      ? 'Нажмите «Поделиться» внизу экрана и выберите «На экран «Домой»» — приложение появится среди иконок и откроется без адресной строки.'
      : 'Откройте меню браузера и выберите «Установить приложение» — запись появится среди иконок и откроется без адресной строки.';
    hint.hidden = false;
  });
}

function init(config) {
  state.config = config;
  const c = config.цвета || {};
  if (c.акцент) document.documentElement.style.setProperty('--accent', c.акцент);
  if (c.фон) document.documentElement.style.setProperty('--bg', c.фон);
  const photo = $('photo-img');
  if (config.фон_героя) photo.src = config.фон_героя;
  else $('photo-card').hidden = true;
  $('company-name').textContent = config.название || '';
  $('company-short').textContent = config.короткое_имя || config.название || 'Онлайн-запись';
  $('benefit').textContent = config.выгода || '';
  $('company-address').textContent = config.адрес || '';
  const phone = $('company-phone');
  phone.textContent = config.телефон || '';
  phone.href = 'tel:' + String(config.телефон || '').replace(/[^\d+]/g, '');
  const услуги = config.услуги || [];
  const цены = услуги.map((s) => Number(s.цена) || 0).filter((n) => n > 0);
  const дешевле = цены.length ? Math.min.apply(null, цены) : 0;
  $('price-sum').textContent = дешевле ? 'от ' + money(дешевле) : '';
  const метрики = (config.метрики && config.метрики.length) ? config.метрики : [
    { значение: услуги.length + ' услуг', подпись: 'в прайсе студии' },
    { значение: 'всегда свободно', подпись: 'время видно сразу' },
    { значение: 'без звонка', подпись: 'запись в два тапа' },
  ];
  const mb = $('metrics');
  mb.textContent = '';
  for (const m of метрики) {
    const li = document.createElement('li');
    li.className = 'metrics__item';
    const value = document.createElement('span');
    value.className = 'metrics__value';
    value.textContent = m.значение;
    const label = document.createElement('span');
    label.className = 'metrics__label';
    label.textContent = m.подпись;
    li.append(value, label);
    mb.append(li);
  }
  buildServices();
  buildDays();
  buildImportant();
  setupInstall();
  $('booking-form').addEventListener('submit', submitBooking);
  $('login-form').addEventListener('submit', submitLogin);
  $('profile-form').addEventListener('submit', saveProfileForm);
  for (const id of ['client-name', 'client-phone']) $(id).addEventListener('input', updateSteps);
  document.querySelectorAll('#tabbar .tabbar__item').forEach((b) => b.addEventListener('click', () => showScreen(b.dataset.screen)));
  $('topbar-profile').addEventListener('click', () => showScreen('profile'));
  $('hero-cta').addEventListener('click', () => {
    showScreen('booking');
    $('form-block').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('new-booking').addEventListener('click', () => { showScreen('booking'); renderTimes(); });
  $('logout-button').addEventListener('click', () => {
    state.token = '';
    state.profile = null;
    state.bookings = [];
    localStorage.removeItem(TOKEN_KEY);
    $('pin-field').hidden = false;
    renderMine();
    renderProfileGuest();
  });
  $('profile-login').addEventListener('click', () => showScreen('mine'));
  $('edit-save').addEventListener('click', saveEdit);
  $('edit-service').addEventListener('change', pickEditService);
  for (const el of document.querySelectorAll('#sheet [data-close]')) el.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });

  loadMe().then(async () => {
    renderMine();
    renderProfileGuest();
    const s = $('services').querySelector('button');
    if (s) s.click();
    await selectFirstFreeDay();
    updateSteps();
    const wanted = new URLSearchParams(location.search).get('screen');
    if (wanted && document.getElementById('screen-' + wanted)) showScreen(wanted);
  });
}

fetch('config.json')
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(init)
  .catch(() => { $('company-name').textContent = 'Не удалось загрузить config.json'; });
