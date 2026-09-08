const { SURAHS } = require('../constants/surahs');

function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function findSurah(id) {
  return SURAHS.find((s) => s.id === Number(id));
}

function findSurahByName(query, lang = 'russian') {
  const q = query.toLowerCase().trim();
  return SURAHS.find(
    (s) =>
      s.nameRussian.toLowerCase().includes(q) ||
      s.nameEnglish.toLowerCase().includes(q) ||
      String(s.id) === q
  );
}

function formatSurahName(s, lang = 'russian') {
  if (lang === 'arabic') return `${s.nameArabic} (${s.nameRussian})`;
  if (lang === 'english') return `${s.nameEnglish} (${s.nameRussian})`;
  return `${s.nameRussian} (${s.nameArabic})`;
}

function getReadRange(s, from, to) {
  const start = Math.max(1, from || 1);
  const end = Math.min(s.ayats, to || start);
  return { start, end };
}

function splitLongMessage(text, maxLen = 4000) {
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

module.exports = { escapeMarkdown, findSurah, findSurahByName, formatSurahName, getReadRange, splitLongMessage };