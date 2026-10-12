// Меню и цены взяты из демо Quorvox. Поменять блюдо или цену — правится только здесь.
const CATS = [
  { key: 'salad', name: 'Салаты', img: 'assets/img/salad.jpg' },
  { key: 'soup', name: 'Супы', img: 'assets/img/soup.jpg' },
  { key: 'main', name: 'Горячее', img: 'assets/img/main.jpg' },
  { key: 'bake', name: 'Выпечка', img: 'assets/img/bake.jpg' },
  { key: 'drink', name: 'Напитки', img: 'assets/img/drink.jpg' }
];

const DISHES = [
  { cat: 'salad', name: 'Оливье', comp: 'Картофель, морковь, яйцо, колбаса, огурец, горошек', w: '150 г', price: 110 },
  { cat: 'salad', name: 'Нежность', comp: 'Курица, яйцо, огурец, сыр', w: '150 г', price: 120 },
  { cat: 'salad', name: 'Крабовый', comp: 'Крабовые палочки, кукуруза, рис, яйцо', w: '150 г', price: 115 },
  { cat: 'salad', name: 'Южный', comp: 'Капуста, морковь, перец, масло', w: '150 г', price: 95 },
  { cat: 'soup', name: 'Борщ', comp: 'Свёкла, капуста, картофель, говядина', w: '300 г', price: 130 },
  { cat: 'soup', name: 'Щи', comp: 'Капуста, картофель, морковь', w: '300 г', price: 120 },
  { cat: 'soup', name: 'Суп с фрикадельками', comp: 'Фрикадельки, вермишель, картофель', w: '300 г', price: 125 },
  { cat: 'main', name: 'Котлета куриная с гречей', comp: 'Котлета с сыром, гречка, подлива', w: '120/150 г', price: 190 },
  { cat: 'main', name: 'Гуляш с рисом', comp: 'Говядина в подливе, лук, рис', w: '120/150 г', price: 195 },
  { cat: 'main', name: 'Тефтели с макаронами', comp: 'Тефтели в томатном соусе, макароны', w: '120/150 г', price: 175 },
  { cat: 'bake', name: 'Пирожок с капустой', comp: 'Дрожжевое тесто, капуста, яйцо', w: '100 г', price: 45 },
  { cat: 'bake', name: 'Булочка с сахаром', comp: 'Сдобное тесто, сахар, масло', w: '90 г', price: 40 },
  { cat: 'drink', name: 'Компот', comp: 'Из сухофруктов или ягод', w: '200 мл', price: 50 },
  { cat: 'drink', name: 'Чай', comp: 'Чёрный или зелёный, сахар, лимон', w: '200 мл', price: 40 }
];

const WEEK = [
  ['Пн', 'Оливье · Щи · Ёжики'],
  ['Вт', 'Южный · Вермишелевый · Гуляш'],
  ['Ср', 'Нежность · С фрикадельками · Котлета'],
  ['Чт', 'Оливье · Свекольный · Котлета'],
  ['Пт', 'Крабовый · Борщ · Тефтели'],
  ['Сб', 'Нежность · Щи · Гуляш'],
  ['Вс', 'Крабовый · Борщ · Тефтели']
];
const DAY_NAMES = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];

const $ = (s) => document.querySelector(s);
const rub = (n) => n + ' ₽';

// мобильное меню
$('#burger').addEventListener('click', () => $('#nav').classList.toggle('open'));
document.querySelectorAll('#nav a').forEach((a) => a.addEventListener('click', () => $('#nav').classList.remove('open')));

// меню по вкладкам
function showCat(key) {
  const cat = CATS.find((c) => c.key === key);
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.key === key;
    t.classList.toggle('on', on);
    t.setAttribute('aria-selected', on);
  });
  $('#menuBody').innerHTML =
    '<div class="menu-pic"><img src="' + cat.img + '" alt="' + cat.name + '" loading="lazy"></div>' +
    '<ul class="dishes">' +
    DISHES.filter((d) => d.cat === key).map((d) =>
      '<li class="dish"><h3>' + d.name + '<span class="dish-w">' + d.w + '</span></h3>' +
      '<span class="dish-price">' + rub(d.price) + '</span><p>' + d.comp + '</p></li>'
    ).join('') + '</ul>';
}
$('#tabs').innerHTML = CATS.map((c) =>
  '<button class="tab" role="tab" type="button" data-key="' + c.key + '">' + c.name + '</button>'
).join('');
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showCat(t.dataset.key)));
showCat('salad');

// комплекс сегодня и на неделю (getDay: 0 — воскресенье)
const today = (new Date().getDay() + 6) % 7;
$('#todayLabel').textContent = 'Комплекс в ' + DAY_NAMES[today];
$('#todayMenu').textContent = WEEK[today][1];
$('#weekGrid').innerHTML = WEEK.map((d, i) =>
  '<div class="day' + (i === today ? ' on' : '') + '"><b>' + d[0] + (i === today ? ' · сегодня' : '') + '</b><span>' + d[1].split(' · ').join('<br>') + '</span></div>'
).join('');

// сборщик комплекса
const COMBO_CATS = ['salad', 'soup', 'main', 'drink'];
const chosen = {};
let comboPrice = 360;

$('#comboPick').innerHTML = COMBO_CATS.map((k) => {
  const cat = CATS.find((c) => c.key === k);
  return '<div class="pick-group"><h3>' + cat.name + '</h3><div class="pick-row">' +
    DISHES.filter((d) => d.cat === k).map((d) =>
      '<button class="pick" type="button" data-cat="' + k + '" data-name="' + d.name + '">' + d.name + '</button>'
    ).join('') + '</div></div>';
}).join('');

document.querySelectorAll('.pick').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.cat;
  chosen[k] = chosen[k] === b.dataset.name ? null : b.dataset.name;
  document.querySelectorAll('.pick[data-cat="' + k + '"]').forEach((x) => x.classList.toggle('on', x.dataset.name === chosen[k]));
  drawCombo();
}));

document.querySelectorAll('.mode-btn').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.mode-btn').forEach((x) => x.classList.toggle('on', x === b));
  comboPrice = +b.dataset.price;
  drawCombo();
}));

function drawCombo() {
  const items = COMBO_CATS.filter((k) => chosen[k]).map((k) => DISHES.find((d) => d.name === chosen[k]));
  const sum = items.reduce((a, d) => a + d.price, 0);
  $('#comboList').innerHTML = items.length
    ? items.map((d) => '<li><span>' + d.name + '</span><span>' + rub(d.price) + '</span></li>').join('') + '<li><span>Хлеб</span><span>входит</span></li>'
    : '<li class="empty">Выберите блюда слева</li>';
  $('#comboSum').textContent = rub(sum);
  $('#comboPrice').textContent = rub(comboPrice);
  const left = COMBO_CATS.length - items.length;
  $('#comboSave').textContent = left === 0
    ? (sum > comboPrice ? 'Выгода ' + rub(sum - comboPrice) : 'Обед собран')
    : 'Осталось выбрать: ' + left;
}
drawCombo();
