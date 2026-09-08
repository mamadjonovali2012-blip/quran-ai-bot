const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio';

const RECITERS = [
  { id: 128, name: { russian: 'Абдуррахман ас-Судайс', english: 'Abdurrahman As-Sudais', arabic: 'عبد الرحمن السديس' } },
  { id: 4, name: { russian: 'Абдульбасит Абдуссамад', english: 'Abdulbasit Abdussamad', arabic: 'عبد الباسط عبد الصمد' } },
  { id: 31, name: { russian: 'Саад аль-Гамиди', english: 'Saad Al-Ghamidi', arabic: 'سعد الغامدي' } },
  { id: 3, name: { russian: 'Мишари Рашид аль-Афаси', english: 'Mishari Rashid Al-Afasy', arabic: 'مشاري راشد العفاسي' } },
  { id: 7, name: { russian: 'Мухаммад Сидик Миншави', english: 'Muhammad Siddiq Al-Minshawi', arabic: 'محمد صديق المنشاوي' } },
  { id: 10, name: { russian: 'Хани ад-Дани', english: 'Hani Ar-Rifai', arabic: 'هاني الرفاعي' } },
  { id: 6, name: { russian: 'Абу Бакр аш-Шатри', english: 'Abu Bakr Ash-Shatri', arabic: 'أبو بكر الشاطري' } },
  { id: 109, name: { russian: 'Ясир ад-Дуссари', english: 'Yasser Ad-Dussari', arabic: 'ياسر الدوسري' } },
];

function getAudioUrl(reciterId, surahId, ayahNumber) {
  const surahPadded = String(surahId).padStart(3, '0');
  const ayahPadded = String(ayahNumber).padStart(3, '0');
  return `${AUDIO_BASE}/${reciterId}/${surahPadded}${ayahPadded}.mp3`;
}

function getSurahAudioUrl(reciterId, surahId) {
  const surahPadded = String(surahId).padStart(3, '0');
  return `${AUDIO_BASE}/${reciterId}/${surahPadded}.mp3`;
}

module.exports = { RECITERS, getAudioUrl, getSurahAudioUrl };