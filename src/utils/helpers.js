const { SURAHS } = require('../constants/surahs');

function t(lang, ru, en, ar) {
  return lang === 'arabic' ? ar : lang === 'english' ? en : ru;
}

function findSurah(id) {
  return SURAHS.find((s) => s.id === Number(id));
}

function surahName(s, lang) {
  return lang === 'arabic' ? s.nameArabic : lang === 'english' ? s.nameEnglish : s.nameRussian;
}

function surahTitle(s, lang) {
  const base = surahName(s, lang);
  if (lang === 'arabic') return `${s.nameArabic} (${s.nameRussian})`;
  if (lang === 'english') return `${s.nameEnglish} (${s.nameRussian})`;
  return `${s.nameRussian} (${s.nameArabic})`;
}

function surahType(s, lang) {
  return s.type === 'meccan' ? t(lang, 'Мекканская', 'Meccan', 'مكية') : t(lang, 'Мединская', 'Medinan', 'مدنية');
}

function formatAyahListItem(s, ayah, lang) {
  return `${ayah.numberInSurah}. ${ayah.text}`;
}

function splitLongMessage(text, maxLen = 4000) {
  if (text.length <= maxLen) return [text];
  const parts = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (current.length + line.length + 1 > maxLen) {
      parts.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseRef(ref) {
  const parts = ref.split(':');
  const surahId = parseInt(parts[0], 10);
  const ayahNumber = parseInt(parts[1], 10);
  return { surahId, ayahNumber };
}

const AYAH_OFFSETS = (() => {
  const offsets = [0];
  let total = 0;
  for (const s of SURAHS) {
    total += s.ayats;
    offsets.push(total);
  }
  return offsets; 
})();

function globalAyahNumber(surahId, ayahNumber) {
  const idx = Number(surahId);
  if (idx < 1 || idx > SURAHS.length) return null;
  return AYAH_OFFSETS[idx - 1] + Number(ayahNumber);
}

module.exports = { findSurah, surahName, surahTitle, surahType, formatAyahListItem, splitLongMessage, parseRef, t, globalAyahNumber };