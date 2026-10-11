// Расчёт цены по нише. Каждая функция получает настройки компании и выбор клиента,
// возвращает сумму и строки для заявки. Цена всегда предварительная — на экране она диапазоном.

const rub = (n) => Math.round(n).toLocaleString('ru-RU') + ' ₽';

function extrasSum(list = [], counts = {}) {
  let sum = 0;
  const lines = [];
  for (const x of list) {
    const n = counts[x.id] || 0;
    if (!n) continue;
    sum += n * x.price;
    lines.push(`${x.name}: ${n} ${x.unit || 'шт'}`);
  }
  return { sum, lines };
}

export const NICHES = {
  // Аренда спецтехники: часы × ставка, но не меньше минимальной смены, плюс подача по зоне
  tech(cfg, s) {
    const item = cfg.tech.items.find((i) => i.id === s.item);
    const zone = cfg.tech.zones[s.zone] || cfg.tech.zones[0];
    if (!item) return { sum: 0, lines: [], ready: false, hint: 'Выберите технику' };
    const hours = Math.max(s.hours, item.min);
    const sum = hours * item.rate + (zone?.price || 0);
    const lines = [
      `Техника: ${item.name}`,
      `Часов: ${hours}${s.hours < item.min ? ` (минимальная смена ${item.min} ч)` : ''}`,
      zone ? `Зона подачи: ${zone.name}` : '',
    ];
    return { sum, lines: lines.filter(Boolean), ready: true };
  },

  // Натяжные потолки: площадь × цена фактуры, углы сверх четырёх, светильники и обходы
  potolki(cfg, s) {
    const tex = cfg.potolki.textures[s.texture] || cfg.potolki.textures[0];
    const area = Math.max(0, s.area);
    if (!area) return { sum: 0, lines: [], ready: false, hint: 'Укажите площадь' };
    const extra = extrasSum(cfg.potolki.extras, s.counts);
    const corners = Math.max(0, s.corners - 4);
    let sum = area * tex.price + corners * cfg.potolki.cornerPrice + extra.sum;
    sum = Math.max(sum, cfg.potolki.min || 0);
    const lines = [
      `Площадь: ${area} м²`,
      `Полотно: ${tex.name}`,
      `Углов: ${s.corners}`,
      ...extra.lines,
    ];
    return { sum, lines, ready: true };
  },

  // Уборка: площадь × цена вида уборки, дополнительные услуги поштучно, есть минимальный заказ
  klining(cfg, s) {
    const type = cfg.klining.types[s.type] || cfg.klining.types[0];
    const area = Math.max(0, s.area);
    if (!area) return { sum: 0, lines: [], ready: false, hint: 'Укажите площадь' };
    const extra = extrasSum(cfg.klining.extras, s.counts);
    const sum = Math.max(area * type.price + extra.sum, cfg.klining.min || 0);
    const lines = [`Уборка: ${type.name}`, `Площадь: ${area} м²`, ...extra.lines];
    return { sum, lines, ready: true };
  },
};

// Диапазон вместо «итога»: на месте цена может уточниться
export function priceRange(cfg, sum) {
  const [lo, hi] = cfg.range || [1, 1.15];
  const round = (n) => Math.round(n / 100) * 100;
  return { lo: round(sum * lo), hi: round(sum * hi), text: `${rub(round(sum * lo))} – ${rub(round(sum * hi))}` };
}

export { rub };
