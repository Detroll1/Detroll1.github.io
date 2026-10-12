// Записи журнала. Каждая ведёт на пост в Telegram-канале. Новая запись — строка в начало списка.
const JOURNAL = [
  { cat: 'Релизы', date: '2026-10-12', title: 'Сайт для кафе-кулинарии в Североморске', text: 'Меню, конструктор комплексного обеда, корзина и заказ по телефону.', url: 'https://quorvox.github.io/cookingseveromorsk-demo/' },
  { cat: 'Релизы', date: '2026-09-16', title: 'Atmosfera — точная погода на Android', text: 'Вышло наше приложение погоды, установочный файл лежит в канале.', url: 'https://t.me/Quorvox_team/992' },
  { cat: 'Обновления', date: '2026-09-15', title: 'Обновили админку и настроили серверы', text: 'Админка стала стабильнее.', url: 'https://t.me/Quorvox_team/990' },
  { cat: 'Обновления', date: '2026-09-15', title: 'BimiBami_bot: свежее обновление', text: 'Новая версия бота, ждём отзывов.', url: 'https://t.me/Quorvox_team/988' },
  { cat: 'Команда', date: '2026-09-12', title: '13 сентября — день программиста', text: '', url: 'https://t.me/Quorvox_team/983' },
  { cat: 'Команда', date: '2026-09-12', title: 'Ищем партнёров для наших проектов', text: 'Предлагаем рекламу в наших сайтах, играх, веб-приложениях и ботах.', url: 'https://t.me/Quorvox_team/979' },
  { cat: 'Релизы', date: '2026-09-10', title: 'BimiBami_bot: новые режимы и игры', text: 'Новые режимы и игры, чёткая модерация, ранги, анимации и перевод голосовых сообщений в текст.', url: 'https://t.me/Quorvox_team/975' }
];

function rowHtml(e) {
  return '<li><a class="row" href="' + e.url + '" target="_blank" rel="noopener"><b>' + e.title + '</b><time>' + e.date + '</time>' +
    (e.text ? '<p>' + e.text + '</p>' : '') + '</a></li>';
}
