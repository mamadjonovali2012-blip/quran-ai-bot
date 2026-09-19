const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio';

const RECITERS = [
  { id: 128, name: { russian: 'ас-Судайс', english: 'As-Sudais', arabic: 'السديس' } },
  { id: 31, name: { russian: 'аль-Гамиди', english: 'Al-Ghamidi', arabic: 'الغامدي' } },
  { id: 3, name: { russian: 'аль-Афаси', english: 'Al-Afasy', arabic: 'العفاسي' } },
  { id: 4, name: { russian: 'Абдульбасит', english: 'Abdulbasit', arabic: 'عبد الباسط' } },
  { id: 7, name: { russian: 'Миншави', english: 'Al-Minshawi', arabic: 'المنشاوي' } },
  { id: 6, name: { russian: 'аш-Шатри', english: 'Ash-Shatri', arabic: 'الشاطري' } },
  { id: 109, name: { russian: 'ад-Дуссари', english: 'Ad-Dussari', arabic: 'الدوسري' } },
  { id: 10, name: { russian: 'ар-Рифай', english: 'Ar-Rifai', arabic: 'الرفاعي' } },
];

function ayahUrl(reciterId, surahId, ayahNumber) {
  return `${AUDIO_BASE}/${reciterId}/${String(surahId).padStart(3, '0')}${String(ayahNumber).padStart(3, '0')}.mp3`;
}

function surahUrl(reciterId, surahId) {
  return `${AUDIO_BASE}/${reciterId}/${String(surahId).padStart(3, '0')}.mp3`;
}

module.exports = { RECITERS, ayahUrl, surahUrl };