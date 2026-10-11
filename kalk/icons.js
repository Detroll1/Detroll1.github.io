// Линейные пиктограммы, когда у компании нет своих фото. Цвет берут из currentColor.
const wrap = (body) => `<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  excavator: wrap('<rect x="6" y="26" width="26" height="7" rx="3.5"/><circle cx="11" cy="29.5" r="1.6"/><circle cx="27" cy="29.5" r="1.6"/><path d="M10 26v-9h12l4 5v4"/><path d="M14 17v-4h6v4"/><path d="M26 20l12-11 10 8"/><path d="M48 17l4 9h-8l-2-5"/>'),
  loader: wrap('<circle cx="16" cy="30" r="5"/><circle cx="40" cy="30" r="5"/><path d="M8 30V20h10l4-8h10v18"/><path d="M32 18h10l6 6v6"/><path d="M48 24l8-4 2 8h-10"/>'),
  truck: wrap('<circle cx="16" cy="31" r="4"/><circle cx="44" cy="31" r="4"/><circle cx="53" cy="31" r="4"/><path d="M6 31V21l4-7h10v17"/><path d="M20 27h38v-9L34 12H22"/><path d="M20 31h-0"/>'),
  crane: wrap('<rect x="8" y="27" width="40" height="6" rx="3"/><path d="M14 27v-6h12v6"/><path d="M20 21L50 5"/><path d="M50 5v14"/><path d="M47 19h6v4h-6z"/>'),
  roller: wrap('<rect x="6" y="24" width="14" height="10" rx="5"/><circle cx="44" cy="30" r="5"/><path d="M20 28h20"/><path d="M24 28V16h12l4 8"/><path d="M28 16v-4h6"/>'),
  ceiling: wrap('<path d="M6 10h52"/><path d="M10 10l6 6h32l6-6"/><circle cx="24" cy="22" r="2.5"/><circle cx="40" cy="22" r="2.5"/><path d="M32 16v8"/><path d="M28 28h8l-1 4h-6z"/>'),
  clean: wrap('<path d="M22 6v14"/><path d="M14 20h16l4 14H10z"/><path d="M14 34l2-8M22 34v-8M30 34l-2-8"/><path d="M44 12c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z"/>'),
  phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  tg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};
