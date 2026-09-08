const { Telegraf, Scenes, session } = require('telegraf');
const config = require('./config');
const quranApi = require('./services/quranApi');
const audioService = require('./services/audioService');
const store = require('./services/store');
const { SURAHS } = require('./constants/surahs');
const { LANGUAGES } = require('./constants/languages');
const { mainMenu, languageKeyboard, surahListKeyboard, ayahActionsKeyboard, translationKeyboard, reciterKeyboard, settingsKeyboard } = require('./utils/keyboards');
const { findSurah, findSurahByName, formatSurahName, getReadRange, splitLongMessage } = require('./utils/helpers');

const bot = new Telegraf(config.botToken);

bot.use(session());

bot.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Bot error:', err);
    const lang = store.getLang(ctx.from?.id);
    const msg = lang === 'arabic'
      ? 'حدث خطأ. يرجى المحاولة مرة أخرى.'
      : lang === 'english'
        ? 'An error occurred. Please try again.'
        : 'Произошла ошибка. Пожалуйста, попробуйте ещё раз.';
    try {
      await ctx.reply(msg);
    } catch { }
  }
});

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const welcome = lang === 'arabic'
    ? `بسم الله الرحمن الرحيم\n\nمرحباً بك في QuranAI 🤖📖\n\nاستخدم الأزرار للتنقل أو أرسل /quran لقراءة القرآن.`
    : lang === 'english'
      ? `بسم الله الرحمن الرحيم\n\nWelcome to QuranAI 🤖📖\n\nUse the buttons to navigate or send /quran to read the Quran.`
      : `بسم الله الرحمن الرحيم\n\nДобро пожаловать в QuranAI 🤖📖\n\nИспользуйте кнопки для навигации или отправьте /quran чтобы читать Коран.`;

  await ctx.reply(welcome, mainMenu(userId));
});

bot.help(async (ctx) => {
  const lang = store.getLang(ctx.from.id);
  const text = lang === 'arabic'
    ? 'الأوامر المتاحة:\n/quran - قراءة القرآن\n/search <نص> - بحث في القرآن\n/audio <السورة> <الآية> - استماع\n/bookmarks - العلامات\n/language - تغيير اللغة\n/settings - الإعدادات'
    : lang === 'english'
      ? 'Commands:\n/quran - Read the Quran\n/search <text> - Search the Quran\n/audio <surah> <ayah> - Listen\n/bookmarks - Bookmarks\n/language - Change language\n/settings - Settings'
      : 'Команды:\n/quran — Читать Коран\n/search <текст> — Поиск по Корану\n/audio <сура> <аят> — Слушать аудио\n/bookmarks — Закладки\n/language — Сменить язык\n/settings — Настройки';

  await ctx.reply(text);
});

bot.command('quran', async (ctx) => {
  const userId = ctx.from.id;
  const pages = Math.ceil(SURAHS.length / 10);
  await ctx.reply(
    store.getLang(userId) === 'arabic' ? 'اختر سورة:' : store.getLang(userId) === 'english' ? 'Choose a surah:' : 'Выберите суру:',
    surahListKeyboard(0, userId)
  );
});

bot.command('language', async (ctx) => {
  await ctx.reply(
    store.getLang(ctx.from.id) === 'arabic' ? 'اختر اللغة:' : store.getLang(ctx.from.id) === 'english' ? 'Choose language:' : 'Выберите язык:',
    languageKeyboard()
  );
});

bot.command('settings', async (ctx) => {
  const lang = store.getLang(ctx.from.id);
  const text = lang === 'arabic' ? '⚙️ الإعدادات' : lang === 'english' ? '⚙️ Settings' : '⚙️ Настройки';
  await ctx.reply(text, settingsKeyboard(ctx.from.id));
});

bot.command('bookmarks', async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const bookmarks = store.getBookmarks(userId);

  if (bookmarks.length === 0) {
    const msg = lang === 'arabic' ? 'لا توجد علامات.' : lang === 'english' ? 'No bookmarks yet.' : 'У вас пока нет закладок.';
    await ctx.reply(msg);
    return;
  }

  const buttons = bookmarks.map((b) => {
    const s = findSurah(b.surahId);
    const name = s ? (lang === 'arabic' ? s.nameArabic : lang === 'english' ? s.nameEnglish : s.nameRussian) : `#${b.surahId}`;
    return [{
      text: `${name} ${b.ayahNumber}:${b.translationLabel || ''}`,
      callback_data: `ayah_${b.surahId}_${b.ayahNumber}`,
    }];
  });

  await ctx.reply(lang === 'arabic' ? '📑 العلامات:' : lang === 'english' ? '📑 Bookmarks:' : '📑 Закладки:', {
    reply_markup: { inline_keyboard: buttons },
  });
});

bot.command('search', async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const query = ctx.message.text.replace(/^\/search\s*/i, '').trim();

  if (!query) {
    const msg = lang === 'arabic' ? '🔍 أرسل: /search كلمة البحث' : lang === 'english' ? '🔍 Send: /search <query>' : '🔍 Отправьте: /search <текст>';
    await ctx.reply(msg);
    return;
  }

  await ctx.reply(lang === 'arabic' ? '🔍 جارٍ البحث...' : lang === 'english' ? '🔍 Searching...' : '🔍 Ищу...');

  try {
    const apiLang = LANGUAGES[lang]?.quranApi || 'ru.kuliev';
    const results = await quranApi.searchQuran(query, apiLang);

    if (!results || !results.matches || results.matches.length === 0) {
      const msg = lang === 'arabic' ? 'لا توجد نتائج.' : lang === 'english' ? 'No results found.' : 'Ничего не найдено.';
      await ctx.reply(msg);
      return;
    }

    let reply = '';
    const maxResults = Math.min(results.matches.length, 10);
    for (let i = 0; i < maxResults; i++) {
      const m = results.matches[i];
      const s = findSurah(m.surah.number);
      const name = s ? (lang === 'arabic' ? s.nameArabic : lang === 'english' ? s.nameEnglish : s.nameRussian) : m.surah.englishName;
      reply += `\n${i + 1}. ${name} ${m.surah.number}:${m.numberInSurah}\n${m.text}\n`;
    }

    const parts = splitLongMessage(reply);
    for (const part of parts) {
      await ctx.reply(part);
    }
  } catch (err) {
    const msg = lang === 'arabic' ? 'خطأ في البحث.' : lang === 'english' ? 'Search failed.' : 'Ошибка поиска.';
    await ctx.reply(msg);
  }
});

bot.command('audio', async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const args = ctx.message.text.replace(/^\/audio\s*/i, '').trim().split(/\s+/);

  if (args.length < 1) {
    const msg = lang === 'arabic' ? '🔊 أرسل: /audio رقم_السورة رقم_الآية' : lang === 'english' ? '🔊 Send: /audio <surah> [ayah]' : '🔊 Отправьте: /audio <сура> [аят]';
    await ctx.reply(msg);
    return;
  }

  const surahId = parseInt(args[0]);
  const ayahNumber = args[1] ? parseInt(args[1]) : null;
  const s = findSurah(surahId);

  if (!s) {
    const msg = lang === 'arabic' ? 'سورة غير موجودة.' : lang === 'english' ? 'Surah not found.' : 'Сура не найдена.';
    await ctx.reply(msg);
    return;
  }

  if (ayahNumber) {
    const url = audioService.getAudioUrl(128, surahId, ayahNumber);
    try {
      await ctx.replyWithAudio(url, {
        caption: lang === 'arabic' ? `${s.nameArabic} ${surahId}:${ayahNumber} - السديس` : `${formatSurahName(s, lang)} ${surahId}:${ayahNumber} - As-Sudais`,
      });
    } catch {
      const msg = lang === 'arabic' ? 'تعذر تشغيل الصوت.' : lang === 'english' ? 'Cannot play audio.' : 'Не удалось воспроизвести аудио.';
      await ctx.reply(msg);
    }
  } else {
    const name = lang === 'arabic' ? s.nameArabic : lang === 'english' ? s.nameEnglish : s.nameRussian;
    await ctx.reply(
      lang === 'arabic' ? `اختر قارئاً لـ ${name}:` : lang === 'english' ? `Choose a reciter for ${name}:` : `Выберите чтеца для ${name}:`,
      reciterKeyboard(surahId, userId)
    );
  }
});

bot.hears(/📖/, async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const pages = Math.ceil(SURAHS.length / 10);
  await ctx.reply(
    lang === 'arabic' ? 'اختر سورة:' : lang === 'english' ? 'Choose a surah:' : 'Выберите суру:',
    surahListKeyboard(0, userId)
  );
});

bot.hears(/🔍/, async (ctx) => {
  const lang = store.getLang(ctx.from.id);
  const msg = lang === 'arabic'
    ? '🔍 أرسل /search ثم كلمة البحث (مثلاً: /search رحمة)'
    : lang === 'english'
      ? '🔍 Send /search followed by your query (e.g. /search mercy)'
      : '🔍 Отправьте /search и текст для поиска (например: /search милость)';
  await ctx.reply(msg);
});

bot.hears(/🔊/, async (ctx) => {
  const lang = store.getLang(ctx.from.id);
  const msg = lang === 'arabic'
    ? '🔊 أرسل /audio رقم_السورة (مثلاً: /audio 36) أو /audio رقم_السورة رقم_الآية'
    : lang === 'english'
      ? '🔊 Send /audio <surah> (e.g. /audio 36) or /audio <surah> <ayah>'
      : '🔊 Отправьте /audio <сура> (например: /audio 36) или /audio <сура> <аят>';
  await ctx.reply(msg);
});

bot.hears(/📑/, async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const bookmarks = store.getBookmarks(userId);

  if (bookmarks.length === 0) {
    const msg = lang === 'arabic' ? 'لا توجد علامات.' : lang === 'english' ? 'No bookmarks yet.' : 'У вас пока нет закладок.';
    await ctx.reply(msg);
    return;
  }

  let text = lang === 'arabic' ? '📑 العلامات:\n' : lang === 'english' ? '📑 Bookmarks:\n' : '📑 Закладки:\n';
  for (let i = 0; i < bookmarks.length; i++) {
    text += `${i + 1}. /ayah_${bookmarks[i].surahId}_${bookmarks[i].ayahNumber}\n`;
  }
  await ctx.reply(text);
});

bot.action(/surah_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const surahId = parseInt(ctx.match[1]);
  const s = findSurah(surahId);
  if (!s) return;

  await ctx.answerCbQuery();
  const name = formatSurahName(s, lang);
  await ctx.reply(`${name}\n${s.type === 'мекканская' ? 'Мекканская' : 'Мединская'}, ${s.ayats} аятов`);

  try {
    const edition = LANGUAGES[lang]?.quranApi || 'ru.kuliev';
    const data = await quranApi.getSurah(surahId, 'ar.alfazy');
    const translationData = await quranApi.getSurah(surahId, edition);

    let arabicText = '';
    let transText = '';
    const ayahList = data.ayahs;

    for (let i = 0; i < ayahList.length; i++) {
      arabicText += `${ayahList[i].text}﴿${ayahList[i].numberInSurah}﴾ `;
      if (translationData?.ayahs?.[i]) {
        transText += `${translationData.ayahs[i].numberInSurah}. ${translationData.ayahs[i].text}\n`;
      }
    }

    const currentPage = Math.ceil(ayahList[0]?.numberInSurah / 20) || 1;
    const header = lang === 'arabic'
      ? `سورة ${s.nameArabic}\n`
      : lang === 'english'
        ? `Surah ${s.nameEnglish} (${surahId})\n`
        : `Сура ${s.nameRussian} (${surahId})\n`;

    const msg = `${header}${arabicText}\n\n${transText}`;
    const parts = splitLongMessage(msg, 3500);

    for (let i = 0; i < parts.length; i++) {
      const kbd = i === parts.length - 1 ? reciterKeyboard(surahId, userId) : undefined;
      await ctx.reply(parts[i], kbd);
    }

    store.addHistory(userId, { surahId, ayahNumber: 1, type: 'surah' });
  } catch (err) {
    const msg = lang === 'arabic' ? 'خطأ في تحميل السورة.' : lang === 'english' ? 'Error loading surah.' : 'Ошибка загрузки суры.';
    await ctx.reply(msg);
  }
});

bot.action(/surahpage_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const page = parseInt(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(surahListKeyboard(page, userId).reply_markup);
});

bot.action(/ayah_(\d+)_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  const s = findSurah(surahId);
  if (!s) return;

  await ctx.answerCbQuery();

  try {
    const arabic = await quranApi.getAyah(surahId, ayahNumber, 'ar.alfazy');
    const edition = LANGUAGES[lang]?.quranApi || 'ru.kuliev';
    const translation = await quranApi.getAyah(surahId, ayahNumber, edition);

    let text = `*${formatSurahName(s, lang)} ${surahId}:${ayahNumber}*\n\n`;
    text += `${arabic.text}\n\n`;
    text += `${translation.text}`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...ayahActionsKeyboard(surahId, ayahNumber, userId),
    });

    store.addHistory(userId, { surahId, ayahNumber, type: 'ayah' });
  } catch (err) {
    const msg = lang === 'arabic' ? 'خطأ في تحميل الآية.' : lang === 'english' ? 'Error loading ayah.' : 'Ошибка загрузки аята.';
    await ctx.reply(msg);
  }
});

bot.action(/tafsir_(\d+)_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  const s = findSurah(surahId);
  if (!s) return;

  await ctx.answerCbQuery();
  await ctx.reply(lang === 'arabic' ? '📖 جارٍ تحميل التفسير...' : lang === 'english' ? '📖 Loading tafsir...' : '📖 Загружаю тафсир...');

  try {
    const tafsirLang = lang === 'arabic' ? 'russian' : lang;
    const tafsir = await quranApi.getTafsir(surahId, ayahNumber, tafsirLang);
    const name = formatSurahName(s, lang);
    let text = `*Тафсир ${name} ${surahId}:${ayahNumber}*\n\n`;

    const tafsirText = tafsir.text
      .replace(/<[^>]+>/g, '')
      .substring(0, 3000);

    text += tafsirText;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: ayahActionsKeyboard(surahId, ayahNumber, userId).reply_markup,
    });
  } catch (err) {
    const msg = lang === 'arabic' ? 'خطأ في تحميل التفسير.' : lang === 'english' ? 'Error loading tafsir.' : 'Ошибка загрузки тафсира.';
    await ctx.reply(msg);
  }
});

bot.action(/audioayah_(\d+)_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  const s = findSurah(surahId);

  await ctx.answerCbQuery();

  if (!s) return;

  const name = lang === 'arabic' ? s.nameArabic : lang === 'english' ? s.nameEnglish : s.nameRussian;
  const url = audioService.getAudioUrl(128, surahId, ayahNumber);

  try {
    await ctx.replyWithAudio(url, {
      caption: `${name} ${surahId}:${ayahNumber} - As-Sudais`,
    });
  } catch {
    const msg = lang === 'arabic' ? 'تعذر تشغيل الصوت.' : lang === 'english' ? 'Cannot play audio.' : 'Не удалось воспроизвести аудио.';
    await ctx.reply(msg);
  }
});

bot.action(/play_(\d+)_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const reciterId = parseInt(ctx.match[1]);
  const surahId = parseInt(ctx.match[2]);
  const s = findSurah(surahId);
  if (!s) return;

  await ctx.answerCbQuery();

  const url = audioService.getSurahAudioUrl(reciterId, surahId);
  const reciter = audioService.RECITERS.find((r) => r.id === reciterId);
  const reciterName = reciter ? (reciter.name[lang] || reciter.name.russian) : '';
  const name = lang === 'arabic' ? s.nameArabic : lang === 'english' ? s.nameEnglish : s.nameRussian;

  try {
    await ctx.replyWithAudio(url, {
      caption: `${name} — ${reciterName}`,
    });
  } catch {
    const msg = lang === 'arabic' ? 'تعذر تشغيل الصوت.' : lang === 'english' ? 'Cannot play audio.' : 'Не удалось воспроизвести аудио.';
    await ctx.reply(msg);
  }
});

bot.action(/translate_(\w+(?:\.\w+)?)_(\d+)_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const edition = ctx.match[1];
  const surahId = parseInt(ctx.match[2]);
  const ayahNumber = parseInt(ctx.match[3]);
  const s = findSurah(surahId);
  if (!s) return;

  await ctx.answerCbQuery();

  try {
    const data = await quranApi.getAyah(surahId, ayahNumber, edition);
    const name = formatSurahName(s, store.getLang(userId));
    await ctx.reply(`*${name} ${surahId}:${ayahNumber} (${edition})*\n\n${data.text}`, {
      parse_mode: 'Markdown',
    });
  } catch {
    const msg = store.getLang(userId) === 'arabic' ? 'خطأ في الترجمة.' : store.getLang(userId) === 'english' ? 'Translation error.' : 'Ошибка перевода.';
    await ctx.reply(msg);
  }
});

bot.action(/change_lang/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    'Выберите язык / Choose language / اختر اللغة:',
    languageKeyboard()
  );
});

bot.action(/lang_(russian|english|arabic)/, async (ctx) => {
  const userId = ctx.from.id;
  const lang = ctx.match[1];
  store.setLang(userId, lang);
  await ctx.answerCbQuery();

  const msg = lang === 'arabic'
    ? '✅ تم تغيير اللغة إلى العربية'
    : lang === 'english'
      ? '✅ Language changed to English'
      : '✅ Язык изменён на русский';

  try {
    await ctx.editMessageText(msg, mainMenu(userId));
  } catch {
    await ctx.reply(msg, mainMenu(userId));
  }
});

bot.action('main_menu', async (ctx) => {
  const userId = ctx.from.id;
  const lang = store.getLang(userId);
  const msg = lang === 'arabic' ? 'القائمة الرئيسية:' : lang === 'english' ? 'Main menu:' : 'Главное меню:';
  await ctx.answerCbQuery();
  await ctx.reply(msg, mainMenu(userId));
});

const PORT = process.env.PORT || 3000;
const http = require('http');

const healthServer = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('QuranAI bot is running');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

bot.launch().then(() => {
  console.log('QuranAI бот запущен! 🤖📖');
  healthServer.listen(PORT, () => {
    console.log(`Health server listening on :${PORT}`);
  });
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));