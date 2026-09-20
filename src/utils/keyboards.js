const { Markup } = require('telegraf');
const { SURAHS } = require('../constants/surahs');

function t(lang, ru, en, ar) {
  return lang === 'arabic' ? ar : lang === 'english' ? en : ru;
}

function mainMenu(lang) {
  const labels = [
    [t(lang, '📖 Коран', '📖 Quran', '📖 القرآن')],
    [t(lang, '🔍 Поиск', '🔍 Search', '🔍 بحث'), t(lang, '🔊 Аудио', '🔊 Audio', '🔊 صوت')],
    [t(lang, '📑 Закладки', '📑 Bookmarks', '📑 العلامات'), t(lang, '⚙️ Язык', '⚙️ Language', '⚙️ اللغة')],
  ];
  return Markup.keyboard(labels).resize();
}

function inMenu(lang) {
  return Markup.inlineKeyboard([
    Markup.button.callback(t(lang, '🏠 Меню', '🏠 Menu', '🏠 القائمة'), 'main_menu'),
  ]);
}

function navRow(lang, ...btns) {
  return btns;
}

function backBtn(lang, action) {
  return Markup.button.callback(t(lang, '⬅️ Назад', '⬅️ Back', '⬅️ رجوع'), action);
}

function surahList(page = 0, lang = 'russian') {
  const perPage = 8;
  const total = SURAHS.length;
  const pages = Math.ceil(total / perPage);
  const start = page * perPage;
  const end = Math.min(start + perPage, total);
  const rows = [];

  for (let i = start; i < end; i++) {
    const s = SURAHS[i];
    const name = lang === 'arabic' ? s.nameArabic : lang === 'english' ? s.nameEnglish : s.nameRussian;
    rows.push([Markup.button.callback(`${s.id}. ${name}`, `surah_${s.id}`)]);
  }

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('⬅️', `surahpage_${page - 1}`));
  nav.push(backBtn(lang, 'main_menu'));
  if (page < pages - 1) nav.push(Markup.button.callback('➡️', `surahpage_${page + 1}`));
  rows.push(nav);

  return Markup.inlineKeyboard(rows);
}

function juzList(lang = 'russian') {
  const rows = [];
  for (let j = 1; j <= 30; j += 3) {
    const row = [];
    for (let k = 0; k < 3 && j + k <= 30; k++) {
      row.push(Markup.button.callback(`${j + k}`, `juz_${j + k}`));
    }
    rows.push(row);
  }
  rows.push([backBtn(lang, 'main_menu')]);
  return Markup.inlineKeyboard(rows);
}

function quranNav(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, '📖 По сурам', '📖 By Surah', '📖 بالسور'), 'nav_surahs'),
     Markup.button.callback(t(lang, '📖 По джузам', '📖 By Juz', '📖 بالأجزاء'), 'nav_juz')],
    [Markup.button.callback(t(lang, '🎲 Случайный аят', '🎲 Random ayah', '🎲 آية عشوائية'), 'random_ayah'),
     backBtn(lang, 'main_menu')],
  ]);
}

function surahActions(surahId, lang) {
  const s = SURAHS.find((x) => x.id === surahId);
  if (!s) return inMenu(lang);
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, '🔊 Слушать суру', '🔊 Listen', '🔊 استمع'), `audiosurah_${surahId}`),
     Markup.button.callback(t(lang, '📖 Тафсир 1', '📖 Tafsir 1', '📖 تفسير 1'), `tafsir_s_${surahId}_1`)],
    [Markup.button.callback(t(lang, '🎲 Случайный аят', '🎲 Random ayah', '🎲 آية عشوائية'), 'random_ayah'),
     backBtn(lang, `surahpage_0`)],
  ]);
}

function homeNav(lang, hasLastRead = false) {
  const rows = [];
  if (hasLastRead) {
    rows.push([Markup.button.callback(t(lang, '▶️ Продолжить чтение', '▶️ Continue reading', '▶️ متابعة القراءة'), 'continue_reading')]);
  }
  rows.push([Markup.button.callback(t(lang, '📖 По сурам', '📖 By Surah', '📖 بالسور'), 'nav_surahs'),
             Markup.button.callback(t(lang, '📖 По джузам', '📖 By Juz', '📖 بالأجزاء'), 'nav_juz')]);
  rows.push([Markup.button.callback(t(lang, '🎲 Случайный аят', '🎲 Random ayah', '🎲 آية عشوائية'), 'random_ayah'),
             Markup.button.callback(t(lang, '📅 Аят дня', '📅 Ayah of day', '📅 آية اليوم'), 'daily_ayah')]);
  rows.push([Markup.button.callback(t(lang, '📑 Закладки', '📑 Bookmarks', '📑 العلامات'), 'bookmarks_menu'),
             Markup.button.callback(t(lang, '🌐 Перевод', '🌐 Edition', '🌐 الترجمة'), 'edition_menu')]);
  return Markup.inlineKeyboard(rows);
}

function ayahActions(surahId, ayahNumber, userId, isBookmarked, lang) {
  const row1 = [
    Markup.button.callback(t(lang, '📖 Тафсир', '📖 Tafsir', '📖 تفسير'), `tafsir_${surahId}_${ayahNumber}`),
    Markup.button.callback(t(lang, '🔊 Аудио', '🔊 Audio', '🔊 صوت'), `audioayah_${surahId}_${ayahNumber}`),
  ];
  const row2 = [
    isBookmarked
      ? Markup.button.callback(t(lang, '❌ Из закладок', '❌ Unbookmark', '❌ إزالة'), `unbookmark_${surahId}_${ayahNumber}`)
      : Markup.button.callback(t(lang, '🔖 В закладки', '🔖 Bookmark', '🔖 حفظ'), `bookmark_${surahId}_${ayahNumber}`),
    Markup.button.callback(t(lang, '🌐 Перевод', '🌐 Translation', '🌐 ترجمة'), `transmenu_${surahId}_${ayahNumber}`),
  ];
  const row3 = [
    Markup.button.callback(t(lang, '◀️', '◀️', '◀️'), `prev_ayah_${surahId}_${ayahNumber}`),
    Markup.button.callback(t(lang, '🏠', '🏠', '🏠'), 'main_menu'),
    Markup.button.callback(t(lang, '▶️', '▶️', '▶️'), `next_ayah_${surahId}_${ayahNumber}`),
  ];
  return Markup.inlineKeyboard([row1, row2, row3]);
}

function editionMenu(currentEdition, lang) {
  const EDITIONS = [
    { id: 'ru.kuliev', ru: '🇷🇺 Кулиев', en: '🇷🇺 Kuliev', ar: '🇷🇺 كوليايف' },
    { id: 'en.sahih', ru: '🇬🇧 Sahih Intl.', en: '🇬🇧 Sahih Intl.', ar: '🇬🇧 صحيح' },
    { id: 'ar.alfazy', ru: '🇸🇦 Арабский', en: '🇸🇦 Arabic', ar: '🇸🇦 العربية' },
    { id: 'en.pickthall', ru: '🇬🇧 Pickthall', en: '🇬🇧 Pickthall', ar: '🇬🇧 بيكثال' },
  ];
  const rows = EDITIONS.map((e) => {
    const label = e[lang] || e.ru;
    const mark = e.id === currentEdition ? ' ✅' : '';
    return [Markup.button.callback(`${label}${mark}`, `edition_${e.id}`)];
  });
  rows.push([backBtn(lang, 'main_menu')]);
  return Markup.inlineKeyboard(rows);
}

function translationMenu(surahId, ayahNumber, lang) {
  const TRS = [
    { id: 'ru.kuliev', ru: 'Кулиев', en: 'Kuliev', ar: 'كوليايف' },
    { id: 'en.sahih', ru: 'Sahih Intl.', en: 'Sahih Intl.', ar: 'صحيح' },
    { id: 'ar.alfazy', ru: 'Арабский', en: 'Arabic', ar: 'العربية' },
    { id: 'en.pickthall', ru: 'Pickthall', en: 'Pickthall', ar: 'بيكثال' },
    { id: 'en.transliteration', ru: 'Транслит', en: 'Transliteration', ar: 'الترجمة الصوتية' },
  ];
  const rows = TRS.map((tr) => {
    const label = tr[lang] || tr.ru;
    return [Markup.button.callback(label, `translate_${tr.id}_${surahId}_${ayahNumber}`)];
  });
  rows.push([backBtn(lang, `ayah_${surahId}_${ayahNumber}`)]);
  return Markup.inlineKeyboard(rows);
}

function reciterPicker(surahId, ayahNumber, lang) {
  const { RECITERS } = require('../services/audioService');
  const rows = RECITERS.map((r, idx) => {
    const name = r.name[lang] || r.name.russian;
    return [Markup.button.callback(`🔊 ${name}`, `play_${idx}_${surahId}_${ayahNumber}`)];
  });
  rows.push([backBtn(lang, `ayah_${surahId}_${ayahNumber}`)]);
  return Markup.inlineKeyboard(rows);
}

function reciterPickerSurah(surahId, lang) {
  const { surahCapableReciters, RECITERS } = require('../services/audioService');
  const capable = surahCapableReciters().length ? surahCapableReciters() : RECITERS;
  const idxOf = (r) => RECITERS.indexOf(r);
  const rows = [];
  for (let i = 0; i < capable.length; i += 2) {
    const row = [];
    row.push(Markup.button.callback(`🔊 ${capable[i].name[lang] || capable[i].name.russian}`, `playsurah_${idxOf(capable[i])}_${surahId}`));
    if (capable[i + 1]) row.push(Markup.button.callback(`🔊 ${capable[i + 1].name[lang] || capable[i + 1].name.russian}`, `playsurah_${idxOf(capable[i + 1])}_${surahId}`));
    rows.push(row);
  }
  rows.push([backBtn(lang, `surah_${surahId}`)]);
  return Markup.inlineKeyboard(rows);
}

module.exports = {
  mainMenu, inMenu, surahList, juzList, quranNav, homeNav, surahActions,
  ayahActions, translationMenu, reciterPicker, reciterPickerSurah, editionMenu, t,
};