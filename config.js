// ============================================================
//  Всё, что нужно поменять, — здесь. Остальные файлы трогать не нужно.
// ============================================================
window.CONFIG = {
  // Имя именинницы (первая буква пойдёт на печать конверта)
  name: "Bakulya",

  // Тексты открытки и первого экрана
  invitedLine: "You are invited to",
  title: "Bakulya’s Birthday Party!",
  age: "24",
  quote: "Twenty-four, and the loveliest chapters are still unwritten.",

  // Дата и время праздника (формат: ГГГГ-ММ-ДДTЧЧ:ММ, время Бишкека)
  date: "2026-11-29T19:00",
  // Как дата написана на открытке
  dateLine: "29 November 2026, 19:00",

  // Место
  place: {
    title: "Aiza Terrace",
    address: "9а Aaly Tokombaev St, Bishkek",
    // Ссылка на карту (2ГИС / Google Maps / Яндекс) — откроется по кнопке
    mapUrl: "https://2gis.kg/bishkek/search/Aiza%20Terrace",
  },

  // Дресс-код (оставь пустым "", если не нужен)
  dressCode: "",

  // До какого числа просим подтвердить
  rsvpDeadline: "26 ноября",

  // Контакт организатора (покажется внизу страницы)
  contact: {
    label: "@bakuli28",
    url: "https://t.me/bakuli28",
  },

  // URL веб-приложения Google Apps Script (см. README).
  // Пока пусто — сайт работает в демо-режиме: ответы сохраняются только в твоём браузере.
  scriptUrl: "https://script.google.com/macros/s/AKfycbw5B2aXv0g3giqeJaR-57quVR5fhDdoRFuKyZRZZnO22G3U_UrJpio46UKKRXBhrxdG/exec",

  // Вишлист загружается из Google Таблицы (лист «Вишлист», см. README).
  // Этот список ниже — только для демо-режима, пока scriptUrl пустой.
  wishlist: [
    {
      id: "perfume",
      title: "Духи",
      note: "Любимый аромат, 50 мл",
      price: "≈ 45 000 ₸",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80",
    },
    {
      id: "flowers",
      title: "Сертификат в цветочный",
      note: "Пионы — всегда хорошая идея",
      price: "≈ 20 000 ₸",
      image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&q=80",
    },
    {
      id: "book",
      title: "Книга",
      note: "Что-нибудь из списка на сайте",
      price: "≈ 8 000 ₸",
      image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80",
    },
    {
      id: "spa",
      title: "Сертификат в SPA",
      note: "День для себя",
      price: "≈ 35 000 ₸",
      image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80",
    },
  ],
};
