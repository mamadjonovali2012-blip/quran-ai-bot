const AUDIO_BASE = 'https://cdn.islamic.network/quran/audio';
const AUDIO_SURAH_BASE = 'https://cdn.islamic.network/quran/audio-surah';
const QDC_BASE = 'https://download.quranicaudio.com/qdc';

const RECITERS = [
  { id: 'ar.alafasy', name: { russian: 'аль-Афаси', english: 'Al-Afasy', arabic: 'العفاسي' }, bitrate: 128, surahSource: 'cdn' },
  { id: 'ar.abdurrahmaansudais', name: { russian: 'ас-Судайс', english: 'As-Sudais', arabic: 'السديس' }, bitrate: 128, surahQdc: 'abdurrahmaan_as_sudais' },
  { id: 'ar.shaatree', name: { russian: 'аш-Шатри', english: 'Ash-Shatri', arabic: 'الشاطري' }, bitrate: 128 },
  { id: 'ar.mahermuaiqly', name: { russian: 'аль-Муайкли', english: 'Al-Muaiqly', arabic: 'المعيقلي' }, bitrate: 128 },
  { id: 'ar.husary', name: { russian: 'аль-Хусари', english: 'Al-Husary', arabic: 'الحصري' }, bitrate: 128 },
  { id: 'ar.hudhaify', name: { russian: 'аль-Хузайфи', english: 'Al-Hudhaify', arabic: 'الحذيفي' }, bitrate: 128 },
  { id: 'ar.ahmedajamy', name: { russian: 'аль-Аджами', english: 'Al-Ajamy', arabic: 'العجمي' }, bitrate: 128 },
  { id: 'ar.muhammadayyoub', name: { russian: 'Мухаммад Айюб', english: 'Muhammad Ayyoub', arabic: 'محمد أيوب' }, bitrate: 128 },
  { id: 'ar.muhammadjibreel', name: { russian: 'Мухаммад Джибриль', english: 'Muhammad Jibreel', arabic: 'محمد جبريل' }, bitrate: 128 },
];

function findReciter(id) {
  return RECITERS.find((r) => r.id === id);
}

function ayahCdnUrl(reciter, globalAyahNumber) {
  if (!reciter) return null;
  const bitrate = reciter.bitrate || 128;
  return `${AUDIO_BASE}/${bitrate}/${reciter.id}/${globalAyahNumber}.mp3`;
}

function surahAudioUrl(reciter, surahId) {
  if (!reciter) return null;
  if (reciter.surahSource === 'cdn') {
    const bitrate = reciter.bitrate || 128;
    return `${AUDIO_SURAH_BASE}/${bitrate}/${reciter.id}/${surahId}.mp3`;
  }
  if (reciter.surahQdc) {
    return `${QDC_BASE}/${reciter.surahQdc}/murattal/${surahId}.mp3`;
  }
  return null;
}

function surahCapableReciters() {
  return RECITERS.filter((r) => r.surahSource === 'cdn' || r.surahQdc);
}

module.exports = { RECITERS, findReciter, ayahCdnUrl, surahAudioUrl, surahCapableReciters };