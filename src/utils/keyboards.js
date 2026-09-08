const { Markup } = require('telegraf');
const { SURAHS } = require('../constants/surahs');
const { RECITERS } = require('../services/audioService');
const { TRANSLATIONS } = require('../services/translationService');
const { getLang } = require('../services/store');

function mainMenu(userId) {
  const lang = getLang(userId);
  const labels = {
    russian: ['📖 Читать Коран', '🔍 Поиск', '🔊 Аудио', '📑 Закладки'],
    english: ['📖 Read Quran', '🔍 Search', '🔊 Audio', '📑 Bookmarks'],
    arabic: ['📖 اقرأ القرآن', '🔍 بحث', '🔊 صوت', '📑 العلامات'],
  };
  const btn = labels[lang] || labels.russian;
  return Markup.keyboard([
    [btn[0], btn[1]],
    [btn[2], btn[3]],
  ]).resize();
}

function languageKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('🇷🇺 Русский', 'lang_russian'),
    Markup.button.callback('🇬🇧 English', 'lang_english'),
    Markup.button.callback('🇸🇦 العربية', 'lang_arabic'),
  ]);
}

function surahListKeyboard(page = 0, userId) {
  const lang = getLang(userId);
  const perPage = 10;
  const total = SURAHS.length;
  const pages = Math.ceil(total / perPage);
  const start = page * perPage;
  const end = Math.min(start + perPage, total);
  const buttons = [];

  for (let i = start; i < end; i++) {
    const s = SURAHS[i];
    const name = lang === 'arabic' ? s.nameArabic : lang === 'english' ? s.nameEnglish : s.nameRussian;
    buttons.push([Markup.button.callback(`${s.id}. ${name}`, `surah_${s.id}`)]);
  }

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('⬅️', `surahpage_${page - 1}`));
  const backLabel = { russian: '🏠 Главная', english: '🏠 Home', arabic: '🏠 الرئيسية' };
  nav.push(Markup.button.callback(backLabel[lang] || backLabel.russian, 'main_menu'));
  if (page < pages - 1) nav.push(Markup.button.callback('➡️', `surahpage_${page + 1}`));
  buttons.push(nav);

  return Markup.inlineKeyboard(buttons);
}

function ayahActionsKeyboard(surahId, ayahNumber, userId) {
  const lang = getLang(userId);
  const texts = {
    russian: { tafsir: '📖 Тафсир', audio: '🔊 Аудио', back: '⬅️ К суре', home: '🏠' },
    english: { tafsir: '📖 Tafsir', audio: '🔊 Audio', back: '⬅️ To surah', home: '🏠' },
    arabic: { tafsir: '📖 التفسير', audio: '🔊 صوت', back: '⬅️ للسورة', home: '🏠' },
  };
  const t = texts[lang] || texts.russian;
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t.tafsir, `tafsir_${surahId}_${ayahNumber}`),
      Markup.button.callback(t.audio, `audioayah_${surahId}_${ayahNumber}`),
    ],
    [
      Markup.button.callback(t.back, `surah_${surahId}`),
      Markup.button.callback(t.home, 'main_menu'),
    ],
  ]);
}

function translationKeyboard(surahId, ayahNumber, userId) {
  const lang = getLang(userId);
  const buttons = TRANSLATIONS.map((tr) => {
    const label = tr.label[lang] || tr.label.russian;
    return Markup.button.callback(`${label}`, `translate_${tr.id}_${surahId}_${ayahNumber}`);
  });
  const backLabel = { russian: '⬅️ Назад', english: '⬅️ Back', arabic: '⬅️ رجوع' };
  buttons.push(Markup.button.callback(backLabel[lang] || backLabel.russian, `ayah_${surahId}_${ayahNumber}`));
  return Markup.inlineKeyboard(buttons.map((b) => [b]));
}

function reciterKeyboard(surahId, userId) {
  const lang = getLang(userId);
  const buttons = RECITERS.map((r) => {
    return Markup.button.callback(
      (r.name[lang] || r.name.russian),
      `play_${r.id}_${surahId}`
    );
  });
  const backLabel = { russian: '⬅️ К суре', english: '⬅️ To surah', arabic: '⬅️ للسورة' };
  buttons.push(Markup.button.callback(backLabel[lang] || backLabel.russian, `surah_${surahId}`));
  return Markup.inlineKeyboard(buttons.map((b) => [b]));
}

function settingsKeyboard(userId) {
  const lang = getLang(userId);
  const texts = {
    russian: { lang: '🌐 Язык', back: '🏠 Главная' },
    english: { lang: '🌐 Language', back: '🏠 Home' },
    arabic: { lang: '🌐 اللغة', back: '🏠 الرئيسية' },
  };
  const t = texts[lang] || texts.russian;
  return Markup.inlineKeyboard([
    [Markup.button.callback(t.lang, 'change_lang')],
    [Markup.button.callback(t.back, 'main_menu')],
  ]);
}

module.exports = { mainMenu, languageKeyboard, surahListKeyboard, ayahActionsKeyboard, translationKeyboard, reciterKeyboard, settingsKeyboard };