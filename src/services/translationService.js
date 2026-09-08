const axios = require('axios');

const TRANSLATIONS = [
  { id: 'ru.kuliev', label: { russian: 'Кулиев', english: 'Kuliev', arabic: 'كوليايف' } },
  { id: 'ru.osmanova', label: { russian: 'Османов', english: 'Osmanov', arabic: 'عثمانوف' } },
  { id: 'ru.abuadel', label: { russian: 'Абу Адель', english: 'Abu Adel', arabic: 'أبو عادل' } },
  { id: 'en.sahih', label: { russian: 'Sahih Intl.', english: 'Sahih Intl.', arabic: 'صحيح إنترناشونال' } },
  { id: 'en.pickthall', label: { russian: 'Pickthall', english: 'Pickthall', arabic: 'بيكثال' } },
  { id: 'en.asad', label: { russian: 'Asad', english: 'Asad', arabic: 'أسد' } },
];

const TRANSLITERATION_EDITION = 'en.transliteration';

async function getTransliteration(surahId, ayahNumber) {
  const { data } = await axios.get(
    `https://api.alquran.cloud/v1/ayah/${surahId}:${ayahNumber}/${TRANSLITERATION_EDITION}`
  );
  return data.data.text;
}

async function getAvailableEditions() {
  const { data } = await axios.get('https://api.alquran.cloud/v1/edition');
  return data.data;
}

module.exports = { TRANSLATIONS, getTransliteration };