const config = require('../config');

const BASE = config.quranApiBase;
const cache = new Map();
const CACHE_TTL = 3600000;

async function fetchJson(url) {
  if (cache.has(url)) {
    const entry = cache.get(url);
    if (Date.now() - entry.ts < CACHE_TTL) return entry.data;
    cache.delete(url);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Quran API error: ${res.status} for ${url}`);
  const result = await res.json();
  if (!result.data) throw new Error(`Quran API: no data for ${url}`);
  cache.set(url, { data: result.data, ts: Date.now() });
  return result.data;
}

function getSurah(surahId, edition) {
  return fetchJson(`${BASE}/surah/${surahId}/${edition}`);
}

function getAyah(surahId, ayahNumber, edition) {
  return fetchJson(`${BASE}/ayah/${surahId}:${ayahNumber}/${edition}`);
}

function getPage(page, edition) {
  return fetchJson(`${BASE}/page/${page}/${edition}`);
}

function searchQuran(query, language) {
  return fetchJson(`${BASE}/search/${encodeURIComponent(query)}/${language}`);
}

function getTafsir(edition, surahId, ayahNumber) {
  return fetchJson(`${BASE}/ayah/${surahId}:${ayahNumber}/${edition}`);
}

function getAyahAudio(surahId, ayahNumber, reciterEdition) {
  return fetchJson(`${BASE}/ayah/${surahId}:${ayahNumber}/${reciterEdition}`);
}

function getRandomAyah() {
  const surahId = Math.floor(Math.random() * 114) + 1;
  const { SURAHS } = require('../constants/surahs');
  const s = SURAHS.find((x) => x.id === surahId);
  const ayahNumber = Math.floor(Math.random() * s.ayats) + 1;
  return { surahId, ayahNumber };
}

module.exports = { getSurah, getAyah, getPage, searchQuran, getTafsir, getAyahAudio, getRandomAyah };