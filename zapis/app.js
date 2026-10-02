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
    meta.style.cssText = 'display:block;font-size:14px;color:var(--muted)';
    b.append(name, meta);
    b.addEventListener('click', () => { state.service = s; state.time = null; pick(list, b); renderTimes(); });
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
  if (!box.children.length) box.textContent = 'Свободного времени нет';
}

$('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.service || !state.day || !state.time) return;
  const data = { имя: $('client-name').value.trim(), телефон: $('client-phone').value.trim(), услуга: state.service.название, день: state.day, время: state.time };
  let number = 'З-' + String(Date.now()).slice(-6);
  if (state.config.lead_url) {
    try { await fetch(state.config.lead_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
    catch { number += ' · не отправлено'; }
  } else { number = 'Адрес приёма не настроен'; }
  const list = bookings();
  list.push({ день: state.day, время: state.time, услуга: data.услуга, длительность: state.service.длительность_минут });
  localStorage.setItem(KEY, JSON.stringify(list));
  $('confirm-service').textContent = data.услуга;
  $('confirm-day').textContent = humanDay(data.день);
  $('confirm-time').textContent = data.время;
  $('confirm-number').textContent = number;
  $('screen-booking').hidden = true;
  $('screen-confirm').hidden = false;
  renderTimes();
});

$('new-booking').addEventListener('click', () => {
  state.time = null;
  renderTimes();
  $('screen-confirm').hidden = true;
  $('screen-booking').hidden = false;
});

function init(config) {
  state.config = config;
  const c = config.цвета || {};
  if (c.акцент) document.documentElement.style.setProperty('--accent', c.акцент);
  if (c.фон) document.documentElement.style.setProperty('--bg', c.фон);
  $('company-name').textContent = config.название || '';
  $('company-address').textContent = config.адрес || '';
  const phone = $('company-phone');
  phone.textContent = config.телефон || '';
  phone.href = 'tel:' + String(config.телефон || '').replace(/[^\d+]/g, '');
  buildServices();
  buildDays();
  const s = $('services').querySelector('button');
  const d = $('days').querySelector('button');
  if (s) s.click();
  if (d) d.click();
}

fetch('config.json')
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(init)
  .catch(() => { $('company-name').textContent = 'Не удалось загрузить config.json'; });
