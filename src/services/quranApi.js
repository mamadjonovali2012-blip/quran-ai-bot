const axios = require('axios');
const config = require('../config');

const client = axios.create({
  baseURL: config.quranApiBase,
  timeout: 20000,
});

async function getSurah(surahId, edition) {
  const { data } = await client.get(`/surah/${surahId}/${edition}`);
  return data.data;
}

async function getAyah(surahId, ayahNumber, edition) {
  const { data } = await client.get(`/ayah/${surahId}:${ayahNumber}/${edition}`);
  return data.data;
}

async function getPage(page, edition) {
  const { data } = await client.get(`/page/${page}/${edition}`);
  return data.data;
}

async function searchQuran(query, language) {
  const { data } = await client.get(`/search/${encodeURIComponent(query)}/${language}`);
  return data.data;
}

const TAFSIR_EDITIONS = {
  russian: 'ru.muntahab',
  english: 'en.al-tafsir',
};

async function getTafsir(surahId, ayahNumber, language) {
  const edition = TAFSIR_EDITIONS[language] || 'ru.muntahab';
  const { data } = await client.get(`/tafsir/${edition}/${surahId}:${ayahNumber}`);
  return data.data;
}

module.exports = { getSurah, getAyah, getPage, searchQuran, getTafsir };