/**
 * Google Apps Script — бэкенд для сайта-приглашения.
 * Вставь этот код в Расширения → Apps Script своей Google Таблицы
 * и опубликуй как веб-приложение (инструкция в README.md).
 *
 * Листы:
 *   «Вишлист» — сюда добавляешь подарки, сайт подгружает их сам
 *   «Ответы»  — подтверждения гостей
 *   «Подарки» — забронированные подарки
 */

const RSVP_SHEET = "Ответы";
const GIFTS_SHEET = "Подарки";
const WISH_SHEET = "Вишлист";

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v, max) {
  return String(v == null ? "" : v).replace(/^[=+\-@]/, "'$&").slice(0, max || 300);
}

const WISH_HEADERS = ["ID", "Название", "Описание", "Цена", "Картинка (ссылка)"];

// Читает лист «Вишлист». Пустой ID заполняется автоматически, чтобы бронь
// не терялась, если строки поменять местами или переименовать подарок.
function readWishlist_() {
  const sh = getSheet_(WISH_SHEET, WISH_HEADERS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const range = sh.getRange(2, 1, last - 1, WISH_HEADERS.length);
  const rows = range.getValues();
  let changed = false;
  const items = [];
  rows.forEach((r) => {
    if (!String(r[1]).trim()) return; // строка без названия — пропускаем
    if (!String(r[0]).trim()) {
      r[0] = "g" + Utilities.getUuid().slice(0, 8);
      changed = true;
    }
    items.push({
      id: String(r[0]).trim(),
      title: String(r[1]).trim(),
      note: String(r[2]).trim(),
      price: String(r[3]).trim(),
      image: String(r[4]).trim(),
    });
  });
  if (changed) range.setValues(rows);
  return items;
}

function reservedIds_() {
  const sh = getSheet_(GIFTS_SHEET, ["Дата", "ID подарка", "Подарок", "Кто забронировал"]);
  const last = sh.getLastRow();
  return last > 1 ? sh.getRange(2, 2, last - 1, 1).getValues().map((r) => String(r[0])).filter(String) : [];
}

// GET → вишлист + список id забронированных подарков (без имён)
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return json_({ ok: true, wishlist: readWishlist_(), reserved: reservedIds_() });
  } finally {
    lock.releaseLock();
  }
}

// Запусти один раз вручную (▶ Выполнить → setup), чтобы создать все листы
// и пример строки в вишлисте.
function setup() {
  const sh = getSheet_(WISH_SHEET, WISH_HEADERS);
  if (sh.getLastRow() < 2) {
    sh.appendRow(["", "Духи", "Любимый аромат, 50 мл", "≈ 45 000 ₸", "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80"]);
  }
  sh.setColumnWidth(2, 220);
  sh.setColumnWidth(3, 280);
  sh.setColumnWidth(5, 320);
  getSheet_(RSVP_SHEET, ["Дата", "Имя", "Придёт", "Сколько человек", "Комментарий"]);
  getSheet_(GIFTS_SHEET, ["Дата", "ID подарка", "Подарок", "Кто забронировал"]);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad_json" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (data.action === "rsvp") {
      const sh = getSheet_(RSVP_SHEET, ["Дата", "Имя", "Придёт", "Сколько человек", "Комментарий"]);
      sh.appendRow([new Date(), clean_(data.name, 100), clean_(data.attending, 10), Number(data.guests) || 0, clean_(data.comment, 1000)]);
      return json_({ ok: true });
    }

    if (data.action === "reserve") {
      const sh = getSheet_(GIFTS_SHEET, ["Дата", "ID подарка", "Подарок", "Кто забронировал"]);
      const id = clean_(data.giftId, 60);
      const last = sh.getLastRow();
      const ids = last > 1 ? sh.getRange(2, 2, last - 1, 1).getValues().map((r) => String(r[0])) : [];
      if (ids.indexOf(id) !== -1) return json_({ ok: false, error: "taken" });
      sh.appendRow([new Date(), id, clean_(data.giftTitle, 100), clean_(data.who, 100)]);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: "unknown_action" });
  } finally {
    lock.releaseLock();
  }
}
