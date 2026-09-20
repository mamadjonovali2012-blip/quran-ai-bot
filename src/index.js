const { Telegraf, session, Markup } = require('telegraf');
const config = require('./config');
const quranApi = require('./services/quranApi');
const audioService = require('./services/audioService');
const store = require('./services/store');
const { SURAHS } = require('./constants/surahs');
const { LANGUAGES, JUIZ } = require('./constants/languages');
const kbd = require('./utils/keyboards');
const h = require('./utils/helpers');

const bot = new Telegraf(config.botToken);
const lang = (ctx) => store.getLang(ctx.from?.id) || 'russian';
const t = (ctx, ru, en, ar) => h.t(lang(ctx), ru, en, ar);

bot.use(session());

bot.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Bot error:', err);
    try {
      await ctx.reply(t(ctx, 'Произошла ошибка. Попробуйте ещё раз.', 'An error occurred. Try again.', 'حدث خطأ. حاول مرة أخرى.'));
    } catch { }
  }
});

/** ──────── COMMANDS ──────── */

bot.start(async (ctx) => {
  const msg = t(ctx,
    'بسم الله الرحمن الرحيم\n\nДобро пожаловать в QuranAI 🕌\n\nВыберите раздел:',
    'بسم الله الرحمن الرحيم\n\nWelcome to QuranAI 🕌\n\nChoose a section:',
    'بسم الله الرحمن الرحيم\n\nمرحباً بك في QuranAI 🕌\n\nاختر قسماً:');
  await ctx.reply(msg, kbd.mainMenu(lang(ctx)));
});

bot.help((ctx) => ctx.reply(
  t(ctx,
    '📖 Команды:\n/quran — Навигация по Корану\n/surah <номер или название> — Сура\n/juz <N> — Джуз\n/ayah <S> <A> — Аят\n/search <текст> — Поиск\n/tafsir <S> <A> — Тафсир аята\n/continue — Продолжить чтение\n/edition — Выбрать перевод\n/random — Случайный аят\n/today — Аят дня\n/subscribe — Подписка на аят дня\n/audio <сура> [аят] — Аудио\n/bookmarks — Закладки\n/stats — Статистика\n/language — Язык\n\n💬 В любом чате: @QuranAIBot <текст> — поиск',
    '📖 Commands:\n/quran — Quran navigation\n/surah <number or name> — Surah\n/juz <N> — Juz\n/ayah <S> <A> — Ayah\n/search <text> — Search\n/tafsir <S> <A> — Ayah tafsir\n/continue — Continue reading\n/edition — Choose translation\n/random — Random ayah\n/today — Ayah of the day\n/subscribe — Daily ayah subscription\n/audio <surah> [ayah] — Audio\n/bookmarks — Bookmarks\n/stats — Stats\n/language — Language\n\n💬 Any chat: @QuranAIBot <text> — search',
    '📖 الأوامر:\n/quran — تصفح القرآن\n/surah <رقم أو اسم> — سورة\n/juz <رقم> — جزء\n/ayah <س> <آ> — آية\n/search <نص> — بحث\n/tafsir <س> <آ> — تفسير\n/continue — متابعة القراءة\n/edition — اختر الترجمة\n/random — آية عشوائية\n/today — آية اليوم\n/subscribe — اشتراك يومي\n/audio <سورة> [آية] — صوت\n/bookmarks — العلامات\n/stats — الإحصائيات\n/language — اللغة\n\n💬 في أي محادثة: @QuranAIBot <نص> — بحث')
));

bot.command('quran', async (ctx) => {
  await ctx.reply(t(ctx, '📖 Навигация по Корану:', '📖 Quran navigation:', '📖 تصفح القرآن:'), kbd.quranNav(lang(ctx)));
});

bot.command('surah', async (ctx) => {
  const raw = ctx.message.text.replace(/^\/surah\s*/i, '').trim();
  const args = raw.split(/\s+/);
  const surahId = parseInt(args[0], 10);
  let s = h.findSurah(surahId);
  if (!s && raw) {
    s = SURAHS.find((x) =>
      x.nameRussian.toLowerCase().includes(raw.toLowerCase()) ||
      x.nameEnglish.toLowerCase().includes(raw.toLowerCase()) ||
      x.nameArabic.includes(raw)
    );
  }
  if (!s) {
    await ctx.reply(t(ctx, '📖 Отправьте: /surah <номер или название>\nНапример: /surah 36 или /surah Ясин', '📖 Send: /surah <number or name>\nE.g. /surah 36 or /surah Ya-Seen', '📖 أرسل: /surah <رقم أو اسم>\nمثال: /surah 36 أو /surah يس'));
    return;
  }
  await sendSurah(ctx, s.id);
});

bot.command('juz', async (ctx) => {
  const args = ctx.message.text.replace(/^\/juz\s*/i, '').trim().split(/\s+/);
  const juz = parseInt(args[0], 10);
  if (!juz || juz < 1 || juz > 30) {
    await ctx.reply(t(ctx, '📖 Отправьте: /juz <номер> (1-30)\nНапример: /juz 30', '📖 Send: /juz <number> (1-30)\nE.g. /juz 30', '📖 أرسل: /juz <رقم> (1-30)\nمثال: /juz 30'));
    return;
  }
  await sendJuz(ctx, juz);
});

bot.command('ayah', async (ctx) => {
  const args = ctx.message.text.replace(/^\/ayah\s*/i, '').trim().split(/[\s:]+/);
  const surahId = parseInt(args[0], 10);
  const ayahNumber = parseInt(args[1], 10);
  const s = h.findSurah(surahId);
  if (!s || !ayahNumber || ayahNumber < 1 || ayahNumber > s.ayats) {
    await ctx.reply(t(ctx, '📖 Отправьте: /ayah <сура> <аят>\nНапример: /ayah 112 1', '📖 Send: /ayah <surah> <ayah>\nE.g. /ayah 112 1', '📖 أرسل: /ayah <سورة> <آية>\nمثال: /ayah 112 1'));
    return;
  }
  await sendAyah(ctx, surahId, ayahNumber);
});

bot.command('today', async (ctx) => {
  await ctx.reply(t(ctx, '📅 Загружаю аят дня...', '📅 Loading ayah of the day...', '📅 جارٍ تحميل آية اليوم...'));
  await sendDailyAyah(ctx);
});

bot.command('subscribe', async (ctx) => {
  const userId = ctx.from.id;
  const isSub = store.getDailySub(userId);
  store.setDailySub(userId, true);
  await ctx.reply(t(ctx,
    '✅ Вы подписаны на ежедневный аят дня! Каждый день в 06:00 МСК я пришлю вам аят с переводом. Отключить: /unsubscribe',
    '✅ You are subscribed to the daily ayah! Every day at 06:00 MSK I will send you an ayah with translation. Disable: /unsubscribe',
    '✅ تم الاشتراك في آية اليوم! سأرسل لك آية مع الترجمة كل يوم الساعة 06:00. للإلغاء: /unsubscribe'));
});

bot.command('unsubscribe', async (ctx) => {
  const userId = ctx.from.id;
  store.setDailySub(userId, false);
  await ctx.reply(t(ctx,
    '❌ Вы отписались от ежедневного аята.',
    '❌ You unsubscribed from the daily ayah.',
    '❌ تم إلغاء الاشتراك من آية اليوم.'));
});

bot.command('random', async (ctx) => sendRandomAyah(ctx));

bot.command('continue', async (ctx) => {
  const userId = ctx.from.id;
  const last = store.getLastRead(userId);
  if (!last) {
    await ctx.reply(t(ctx, '📖 Вы ещё ничего не читали. Начните с /quran', '📖 You have not read anything yet. Start with /quran', '📖 لم تقرأ شيئاً بعد. ابدأ بـ /quran'));
    return;
  }
  const parts = last.ref.split(':');
  const surahId = parseInt(parts[0], 10);
  const ayahNumber = parseInt(parts[1], 10);
  await sendAyah(ctx, surahId, ayahNumber);
});

bot.command('edition', async (ctx) => {
  const userId = ctx.from.id;
  const current = store.getEdition(userId);
  await ctx.reply(t(ctx, `🌐 Выберите перевод по умолчанию (сейчас: ${current}):`, `🌐 Choose default translation (current: ${current}):`, `🌐 اختر الترجمة الافتراضية (الحالية: ${current}):`), kbd.editionMenu(current, lang(ctx)));
});

bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  const bookmarks = store.getBookmarks(userId);
  const history = store.getHistory(userId);
  const last = store.getLastRead(userId);
  const sub = store.getDailySub(userId);
  await ctx.reply(t(ctx,
    `📊 Статистика:\n\n📑 Закладок: ${bookmarks.length}\n📖 В истории: ${history.length}\n📅 Аят дня: ${sub ? 'включён' : 'выключен'}\n${last ? `▶️ Последнее: ${last.ref}` : ''}`,
    `📊 Stats:\n\n📑 Bookmarks: ${bookmarks.length}\n📖 In history: ${history.length}\n📅 Daily ayah: ${sub ? 'on' : 'off'}\n${last ? `▶️ Last read: ${last.ref}` : ''}`,
    `📊 الإحصائيات:\n\n📑 العلامات: ${bookmarks.length}\n📖 التاريخ: ${history.length}\n📅 آية اليوم: ${sub ? 'مفعّل' : 'معطّل'}\n${last ? `▶️ آخر قراءة: ${last.ref}` : ''}`));
});

bot.command('tafsir', async (ctx) => {
  const args = ctx.message.text.replace(/^\/tafsir\s*/i, '').trim().split(/[\s:]+/);
  const surahId = parseInt(args[0], 10);
  const ayahNumber = parseInt(args[1], 10);
  const s = h.findSurah(surahId);
  if (!s || !ayahNumber || ayahNumber < 1 || ayahNumber > s.ayats) {
    await ctx.reply(t(ctx, '📖 Отправьте: /tafsir <сура> <аят>\nНапример: /tafsir 112 1', '📖 Send: /tafsir <surah> <ayah>\nE.g. /tafsir 112 1', '📖 أرسل: /tafsir <سورة> <آية>\nمثال: /tafsir 112 1'));
    return;
  }
  await sendTafsir(ctx, surahId, ayahNumber);
});

bot.command('language', async (ctx) => {
  await ctx.reply(t(ctx, '🌐 Выберите язык:', '🌐 Choose language:', '🌐 اختر اللغة:'), Markup.inlineKeyboard([
    Markup.button.callback('🇷🇺 Русский', 'lang_russian'),
    Markup.button.callback('🇬🇧 English', 'lang_english'),
    Markup.button.callback('🇸🇦 العربية', 'lang_arabic'),
  ]));
});

bot.command('bookmarks', async (ctx) => sendBookmarks(ctx));

bot.command('search', async (ctx) => {
  const q = ctx.message.text.replace(/^\/search\s*/i, '').trim();
  if (!q) {
    await ctx.reply(t(ctx, '🔍 Отправьте: /search <текст>', '🔍 Send: /search <text>', '🔍 أرسل: /search <نص>'));
    return;
  }
  await doSearch(ctx, q);
});

bot.command('audio', async (ctx) => {
  const args = ctx.message.text.replace(/^\/audio\s*/i, '').trim().split(/\s+/);
  if (args.length < 1) {
    await ctx.reply(t(ctx, '🔊 /audio <сура> [аят]', '🔊 /audio <surah> [ayah]', '🔊 /audio <سورة> [آية]'));
    return;
  }
  const surahId = parseInt(args[0]);
  const s = h.findSurah(surahId);
  if (!s) { await ctx.reply(t(ctx, 'Сура не найдена', 'Surah not found', 'السورة غير موجودة')); return; }
  if (args[1]) {
    const ayahNumber = parseInt(args[1]);
    if (ayahNumber < 1 || ayahNumber > s.ayats) { await ctx.reply(t(ctx, 'Неверный номер аята', 'Invalid ayah number', 'رقم آية غير صحيح')); return; }
    try {
      await ctx.replyWithAudio(audioService.ayahUrl(128, surahId, ayahNumber), { caption: `${h.surahName(s, lang(ctx))} ${surahId}:${ayahNumber}` });
    } catch { await ctx.reply(t(ctx, 'Не удалось воспроизвести аудио', 'Cannot play audio', 'تعذر تشغيل الصوت')); }
  } else {
    await ctx.reply(t(ctx, `Выберите чтеца для ${h.surahName(s, lang(ctx))}:`, `Choose a reciter for ${h.surahName(s, lang(ctx))}:`, `اختر قارئاً لـ ${h.surahName(s, lang(ctx))}:`), kbd.reciterPickerSurah(surahId, lang(ctx)));
  }
});

/** ──────── TEXT HANDLERS ──────── */

bot.hears(/📖/, async (ctx) => {
  await ctx.reply(t(ctx, '📖 Навигация по Корану:', '📖 Quran navigation:', '📖 تصفح القرآن:'), kbd.quranNav(lang(ctx)));
});

bot.hears(/🔍/, async (ctx) => {
  await ctx.reply(t(ctx, '🔍 Отправьте /search <текст> для поиска', '🔍 Send /search <text> to search', '🔍 أرسل /search <نص> للبحث'));
});

bot.hears(/🔊/, async (ctx) => {
  await ctx.reply(t(ctx, '🔊 Отправьте /audio <сура> [аят]', '🔊 Send /audio <surah> [ayah]', '🔊 أرسل /audio <سورة> [آية]'));
});

bot.hears(/📑/, async (ctx) => sendBookmarks(ctx));

bot.hears(/⚙️|🌐/, async (ctx) => {
  await ctx.reply(t(ctx, '🌐 Выберите язык:', '🌐 Choose language:', '🌐 اختر اللغة:'), Markup.inlineKeyboard([
    Markup.button.callback('🇷🇺 Русский', 'lang_russian'),
    Markup.button.callback('🇬🇧 English', 'lang_english'),
    Markup.button.callback('🇸🇦 العربية', 'lang_arabic'),
  ]));
});

bot.hears(/^(аль|ан|ас|ат|аз|аш|алю|йа|та|ха|са|каф|нух|саба)/i, async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.length < 3 || text.length > 30) return;
  const s = SURAHS.find((x) => {
    const q = text.toLowerCase();
    return x.nameRussian.toLowerCase() === q || x.nameEnglish.toLowerCase() === q ||
      x.nameRussian.toLowerCase().includes(q) || x.nameEnglish.toLowerCase().includes(q);
  });
  if (s) await sendSurah(ctx, s.id);
});

/** ──────── INLINE MODE ──────── */

bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim();
  const uid = ctx.inlineQuery.from.id;
  const lng = store.getLang(uid) || 'russian';
  const tt = (ru, en, ar) => h.t(lng, ru, en, ar);

  if (!query || query.length < 2) {
    const recent = store.getHistory(uid).slice(0, 5);
    const articles = recent.map((r, i) => ({
      type: 'article',
      id: `recent_${i}_${Date.now()}`,
      title: tt('📖 Недавнее', '📖 Recent', '📖 الأخيرة'),
      description: r.ref,
      input_message_content: { message_text: `📖 ${r.ref}\n/quran` },
    }));
    return ctx.answerInlineQuery(articles.length ? articles : [{
      type: 'article',
      id: 'empty',
      title: tt('Начните вводить текст для поиска', 'Start typing to search', 'ابدأ الكتابة للبحث'),
      input_message_content: { message_text: '/quran' },
    }], { cache_time: 10 });
  }

  try {
    const apiLang = LANGUAGES[lng]?.quranApi || 'ru.kuliev';
    const result = await quranApi.searchQuran(query, apiLang);
    const matches = result?.matches?.slice(0, 15) || [];
    const articles = matches.map((m, i) => {
      const s = h.findSurah(m.surah.number);
      const name = s ? h.surahName(s, lng) : m.surah.englishName;
      const ref = `${name} ${m.surah.number}:${m.numberInSurah}`;
      return {
        type: 'article',
        id: `q${i}_${m.surah.number}_${m.numberInSurah}`,
        title: ref,
        description: m.text.substring(0, 100),
        input_message_content: { message_text: `${m.text}\n\n— ${ref}` },
        reply_markup: { inline_keyboard: [[
          { text: tt('📖 Подробнее', '📖 More', '📖 المزيد'), callback_data: `ayah_${m.surah.number}_${m.numberInSurah}` },
        ]] },
      };
    });
    await ctx.answerInlineQuery(articles.length ? articles : [{
      type: 'article', id: 'empty',
      title: tt('Ничего не найдено', 'No results', 'لا نتائج'),
      input_message_content: { message_text: tt('Ничего не найдено', 'No results', 'لا نتائج') },
    }], { cache_time: 30 });
  } catch {
    await ctx.answerInlineQuery([{
      type: 'article', id: 'err',
      title: tt('Ошибка поиска', 'Search error', 'خطأ في البحث'),
      input_message_content: { message_text: '/quran' },
    }], { cache_time: 30 });
  }
});

/** ──────── CALLBACK QUERIES ──────── */

bot.action(/^nav_surahs/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(ctx, '📖 Выберите суру:', '📖 Choose a surah:', '📖 اختر سورة:'), kbd.surahList(0, lang(ctx)));
});

bot.action(/^nav_juz/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(ctx, '📖 Выберите джуз (1-30):', '📖 Choose juz (1-30):', '📖 اختر الجزء (1-30):'), kbd.juzList(lang(ctx)));
});

bot.action(/^surahpage_(\d+)/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(kbd.surahList(page, lang(ctx)).reply_markup);
});

bot.action(/^surah_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const s = h.findSurah(surahId);
  if (!s) return;
  await ctx.answerCbQuery();
  await sendSurah(ctx, surahId);
});

bot.action(/^juz_(\d+)/, async (ctx) => {
  const juz = parseInt(ctx.match[1]);
  await ctx.answerCbQuery();
  const ju = JUIZ[juz - 1];
  if (!ju) return;
  const parts = ju.ayah.split(':');
  const startSurah = parseInt(parts[0], 10);
  const startAyah = parseInt(parts[1], 10);
  const s = h.findSurah(startSurah);
  const name = lang(ctx) === 'arabic' ? ju.name : ju.nameRu;
  await ctx.reply(`${t(ctx, 'Джуз', 'Juz', 'الجزء')} ${juz} — ${name}`);
  await sendSurah(ctx, startSurah, startAyah, Math.min(startAyah + 9, s.ayats));
});

bot.action(/^surahpage_more_(\d+)_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const fromAyah = parseInt(ctx.match[2]);
  await ctx.answerCbQuery();
  await sendSurah(ctx, surahId, fromAyah, fromAyah + 9);
});

bot.action(/^ayah_(\d+)_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  await ctx.answerCbQuery();
  await sendAyah(ctx, surahId, ayahNumber);
});

bot.action(/^next_ayah_(\d+)_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  const s = h.findSurah(surahId);
  if (!s) return;
  if (ayahNumber >= s.ayats) {
    await ctx.answerCbQuery(t(ctx, 'Это последний аят суры', 'Last ayah of this surah', 'آخر آية في السورة'));
    return;
  }
  await ctx.answerCbQuery();
  await sendAyah(ctx, surahId, ayahNumber + 1);
});

bot.action(/^prev_ayah_(\d+)_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  if (ayahNumber <= 1) {
    await ctx.answerCbQuery(t(ctx, 'Первый аят суры', 'First ayah of this surah', 'الآية الأولى من السورة'));
    return;
  }
  await ctx.answerCbQuery();
  await sendAyah(ctx, surahId, ayahNumber - 1);
});

bot.action(/^tafsir_(\d+)_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  await ctx.answerCbQuery(t(ctx, '📖 Загружаю тафсир...', '📖 Loading tafsir...', '📖 جارٍ تحميل التفسير...'));
  await sendTafsir(ctx, surahId, ayahNumber);
});

bot.action(/^tafsir_s_(\d+)_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  await ctx.answerCbQuery(t(ctx, '📖 Загружаю тафсир...', '📖 Loading tafsir...', '📖 جارٍ تحميل التفسير...'));
  await sendTafsir(ctx, surahId, ayahNumber);
});

bot.action(/^audioayah_(\d+)_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  await ctx.answerCbQuery();
  const s = h.findSurah(surahId);
  if (!s) return;
  try {
    await ctx.replyWithAudio(audioService.ayahUrl(128, surahId, ayahNumber), {
      caption: `${h.surahName(s, lang(ctx))} ${surahId}:${ayahNumber}`,
    });
  } catch {
    await ctx.reply(t(ctx, 'Не удалось воспроизвести аудио', 'Cannot play audio', 'تعذر تشغيل الصوت'));
  }
});

bot.action(/^audiosurah_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const s = h.findSurah(surahId);
  await ctx.answerCbQuery();
  if (!s) return;
  await ctx.reply(t(ctx, `Выберите чтеца для ${h.surahName(s, lang(ctx))}:`, `Choose reciter for ${h.surahName(s, lang(ctx))}:`, `اختر قارئاً لـ ${h.surahName(s, lang(ctx))}:`), kbd.reciterPickerSurah(surahId, lang(ctx)));
});

bot.action(/^play_(\d+)_(\d+)_(\d+)/, async (ctx) => {
  const reciterId = parseInt(ctx.match[1]);
  const surahId = parseInt(ctx.match[2]);
  const ayahNumber = parseInt(ctx.match[3]);
  const s = h.findSurah(surahId);
  await ctx.answerCbQuery();
  if (!s) return;
  try {
    await ctx.replyWithAudio(audioService.ayahUrl(reciterId, surahId, ayahNumber), {
      caption: `${h.surahName(s, lang(ctx))} ${surahId}:${ayahNumber}`,
    });
  } catch {
    await ctx.reply(t(ctx, 'Не удалось воспроизвести аудио', 'Cannot play audio', 'تعذر تشغيل الصوت'));
  }
});

bot.action(/^playsurah_(\d+)_(\d+)/, async (ctx) => {
  const reciterId = parseInt(ctx.match[1]);
  const surahId = parseInt(ctx.match[2]);
  const s = h.findSurah(surahId);
  await ctx.answerCbQuery();
  if (!s) return;
  const reciter = audioService.RECITERS.find((r) => r.id === reciterId);
  const reciterName = reciter ? (reciter.name[lang(ctx)] || reciter.name.russian) : '';
  try {
    await ctx.replyWithAudio(audioService.surahUrl(reciterId, surahId), {
      caption: `${h.surahName(s, lang(ctx))} — ${reciterName}`,
    });
  } catch {
    await ctx.reply(t(ctx, 'Не удалось воспроизвести аудио', 'Cannot play audio', 'تعذر تشغيل الصوت'));
  }
});

bot.action(/^bookmark_(\d+)_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  const ref = `${surahId}:${ayahNumber}`;
  store.addBookmark(userId, { ref, surahId, ayahNumber, ts: Date.now() });
  await ctx.answerCbQuery(t(ctx, '✅ Добавлено в закладки', '✅ Bookmarked', '✅ تم الحفظ'));
  const newKbd = kbd.ayahActions(surahId, ayahNumber, userId, true, lang(ctx));
  try { await ctx.editMessageReplyMarkup(newKbd.reply_markup); } catch { }
});

bot.action(/^unbookmark_(\d+)_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  const ref = `${surahId}:${ayahNumber}`;
  store.removeBookmark(userId, ref);
  await ctx.answerCbQuery(t(ctx, '❌ Удалено из закладок', '❌ Unbookmarked', '❌ تم الإزالة'));
  const newKbd = kbd.ayahActions(surahId, ayahNumber, userId, false, lang(ctx));
  try { await ctx.editMessageReplyMarkup(newKbd.reply_markup); } catch { }
});

bot.action(/^transmenu_(\d+)_(\d+)/, async (ctx) => {
  const surahId = parseInt(ctx.match[1]);
  const ayahNumber = parseInt(ctx.match[2]);
  await ctx.answerCbQuery();
  await ctx.reply(t(ctx, '🌐 Выберите перевод:', '🌐 Choose translation:', '🌐 اختر الترجمة:'), kbd.translationMenu(surahId, ayahNumber, lang(ctx)));
});

bot.action(/^translate_([\w.]+)_(\d+)_(\d+)/, async (ctx) => {
  const edition = ctx.match[1];
  const surahId = parseInt(ctx.match[2]);
  const ayahNumber = parseInt(ctx.match[3]);
  const s = h.findSurah(surahId);
  await ctx.answerCbQuery();
  if (!s) return;
  try {
    const data = await quranApi.getAyah(surahId, ayahNumber, edition);
    await ctx.reply(`*${h.surahTitle(s, lang(ctx))} ${surahId}:${ayahNumber}* (${edition})\n\n${data.text}`, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply(t(ctx, 'Ошибка перевода', 'Translation error', 'خطأ في الترجمة'));
  }
});

bot.action(/^random_ayah/, async (ctx) => {
  await ctx.answerCbQuery();
  await sendRandomAyah(ctx);
});

bot.action(/^daily_ayah/, async (ctx) => {
  await ctx.answerCbQuery(t(ctx, '📅 Загружаю аят дня...', '📅 Loading...', '📅 جارٍ التحميل...'));
  await sendDailyAyah(ctx);
});

bot.action(/^continue_reading/, async (ctx) => {
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  const last = store.getLastRead(userId);
  if (!last) {
    await ctx.reply(t(ctx, '📖 Вы ещё ничего не читали. Начните с /quran', '📖 You have not read anything yet. Start with /quran', '📖 لم تقرأ شيئاً بعد. ابدأ بـ /quran'));
    return;
  }
  const parts = last.ref.split(':');
  await sendAyah(ctx, parseInt(parts[0], 10), parseInt(parts[1], 10));
});

bot.action(/^bookmarks_menu/, async (ctx) => {
  await ctx.answerCbQuery();
  await sendBookmarks(ctx);
});

bot.action(/^edition_menu/, async (ctx) => {
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  const current = store.getEdition(userId);
  await ctx.reply(t(ctx, `🌐 Выберите перевод по умолчанию (сейчас: ${current}):`, `🌐 Choose default translation (current: ${current}):`, `🌐 اختر الترجمة الافتراضية (الحالية: ${current}):`), kbd.editionMenu(current, lang(ctx)));
});

bot.action(/^edition_([\w.]+)/, async (ctx) => {
  const edition = ctx.match[1];
  store.setEdition(ctx.from.id, edition);
  await ctx.answerCbQuery(t(ctx, `✅ Перевод: ${edition}`, `✅ Edition: ${edition}`, `✅ الترجمة: ${edition}`));
  const current = store.getEdition(ctx.from.id);
  try {
    await ctx.editMessageReplyMarkup(kbd.editionMenu(current, lang(ctx)).reply_markup);
  } catch { }
});

bot.action(/^main_menu/, async (ctx) => {
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(t(ctx, '🏠 Главное меню:', '🏠 Main menu:', '🏠 القائمة الرئيسية:'), kbd.mainMenu(lang(ctx)));
  } catch {
    await ctx.reply(t(ctx, '🏠 Главное меню:', '🏠 Main menu:', '🏠 القائمة الرئيسية:'), kbd.mainMenu(lang(ctx)));
  }
});

bot.action(/^lang_(russian|english|arabic)/, async (ctx) => {
  const newLang = ctx.match[1];
  store.setLang(ctx.from.id, newLang);
  await ctx.answerCbQuery();
  const msg = newLang === 'arabic' ? '✅ تم تغيير اللغة إلى العربية' : newLang === 'english' ? '✅ Language changed to English' : '✅ Язык изменён на русский';
  try {
    await ctx.editMessageText(msg, kbd.mainMenu(newLang));
  } catch {
    await ctx.reply(msg, kbd.mainMenu(newLang));
  }
});

/** ──────── CORE FUNCTIONS ──────── */

async function sendSurah(ctx, surahId, fromAyah, toAyah) {
  const lng = lang(ctx);
  const s = h.findSurah(surahId);
  if (!s) { await ctx.reply(t(ctx, 'Сура не найдена', 'Surah not found', 'السورة غير موجودة')); return; }

  const edition = store.getEdition(ctx.from.id) || LANGUAGES[lng]?.quranApi || 'ru.kuliev';
  try {
    const [arabicData, transData] = await Promise.all([
      quranApi.getSurah(surahId, 'ar.alfazy'),
      quranApi.getSurah(surahId, edition),
    ]);

    const start = fromAyah || 1;
    const end = toAyah || Math.min(start + 9, s.ayats);
    let arabicText = '';
    let transText = '';

    for (let i = start - 1; i < Math.min(end, arabicData.ayahs.length); i++) {
      const a = arabicData.ayahs[i];
      arabicText += `${a.text} ﴿${a.numberInSurah}﴾ `;
      if (transData?.ayahs?.[i]) {
        transText += `${transData.ayahs[i].numberInSurah}. ${transData.ayahs[i].text}\n`;
      }
    }

    const info = `${h.surahTitle(s, lng)} — ${h.surahType(s, lng)}, ${s.ayats} ${t(ctx, 'аятов', 'verses', 'آيات')}`;
    const header = lng === 'arabic' ? `سورة ${s.nameArabic}` : `📖 ${h.surahName(s, lng)}`;
    const bismillah = surahId !== 1 && surahId !== 9 ? 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n\n' : '';
    const msg = `${header}\n${info}\n\n${bismillah}${arabicText}\n\n${transText}${end < s.ayats ? `\n\n... ${t(ctx, 'продолжение следует', 'continued', 'يتبع')}` : ''}`;

    const parts = h.splitLongMessage(msg);
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const kb = end < s.ayats && isLast
        ? Markup.inlineKeyboard([[Markup.button.callback(t(ctx, '➡️ Далее', '➡️ Next', '➡️ التالي'), `surahpage_more_${surahId}_${end + 1}`)]])
        : isLast ? kbd.surahActions(surahId, lng) : undefined;
      await ctx.reply(parts[i], kb);
    }

    store.markRead(ctx.from.id, `${surahId}:${start}`);
  } catch (err) {
    console.error('sendSurah error:', err);
    await ctx.reply(t(ctx, 'Ошибка загрузки суры', 'Error loading surah', 'خطأ في تحميل السورة'));
  }
}

async function sendAyah(ctx, surahId, ayahNumber) {
  const lng = lang(ctx);
  const s = h.findSurah(surahId);
  if (!s) return;

  try {
    const edition = store.getEdition(ctx.from.id) || LANGUAGES[lng]?.quranApi || 'ru.kuliev';
    const [arabic, translation] = await Promise.all([
      quranApi.getAyah(surahId, ayahNumber, 'ar.alfazy'),
      quranApi.getAyah(surahId, ayahNumber, edition),
    ]);

    const userId = ctx.from.id;
    const ref = `${surahId}:${ayahNumber}`;
    const isBm = store.isBookmarked(userId, ref);
    const title = `${h.surahTitle(s, lng)} ${surahId}:${ayahNumber}`;
    const text = `*${title}*\n\n${arabic.text}\n\n${translation.text}`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...kbd.ayahActions(surahId, ayahNumber, userId, isBm, lng),
    });

    store.markRead(ctx.from.id, ref);
  } catch (err) {
    console.error('sendAyah error:', err);
    await ctx.reply(t(ctx, 'Ошибка загрузки аята', 'Error loading ayah', 'خطأ في تحميل الآية'));
  }
}

async function sendTafsir(ctx, surahId, ayahNumber) {
  const lng = lang(ctx);
  const s = h.findSurah(surahId);
  if (!s) return;

  try {
    const edition = LANGUAGES[lng]?.tafsir || 'ru.muntahab';
    const tafsir = await quranApi.getTafsir(edition, surahId, ayahNumber);
    const cleaned = tafsir.text.replace(/<[^>]+>/g, '').substring(0, 3000);
    const text = `📖 *${h.surahTitle(s, lng)} ${surahId}:${ayahNumber}*\n\n${cleaned}`;
    await ctx.reply(text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('sendTafsir error:', err);
    await ctx.reply(t(ctx, 'Ошибка загрузки тафсира', 'Error loading tafsir', 'خطأ في تحميل التفسير'));
  }
}

async function sendRandomAyah(ctx) {
  const { surahId, ayahNumber } = quranApi.getRandomAyah();
  await sendAyah(ctx, surahId, ayahNumber);
}

async function sendJuz(ctx, juz) {
  const ju = JUIZ[juz - 1];
  if (!ju) {
    await ctx.reply(t(ctx, 'Джуз не найден', 'Juz not found', 'الجزء غير موجود'));
    return;
  }
  const parts = ju.ayah.split(':');
  const startSurah = parseInt(parts[0], 10);
  const startAyah = parseInt(parts[1], 10);
  const s = h.findSurah(startSurah);
  const name = lang(ctx) === 'arabic' ? ju.name : ju.nameRu;
  await ctx.reply(`${t(ctx, 'Джуз', 'Juz', 'الجزء')} ${juz} — ${name}`);
  await sendSurah(ctx, startSurah, startAyah, Math.min(startAyah + 9, s.ayats));
}

async function sendDailyAyah(ctx) {
  const lng = lang(ctx);
  try {
    const { surahId, ayahNumber } = quranApi.getRandomAyah();
    const edition = LANGUAGES[lng]?.quranApi || 'ru.kuliev';
    const [arabic, translation] = await Promise.all([
      quranApi.getAyah(surahId, ayahNumber, 'ar.alfazy'),
      quranApi.getAyah(surahId, ayahNumber, edition),
    ]);
    const s = h.findSurah(surahId);
    const name = h.surahTitle(s, lng);
    await ctx.reply(`📅 *${t(ctx, 'Аят дня', 'Ayah of the day', 'آية اليوم')}*\n\n${name} ${surahId}:${ayahNumber}\n\n${arabic.text}\n\n${translation.text}`, {
      parse_mode: 'Markdown',
      ...kbd.ayahActions(surahId, ayahNumber, ctx.from.id, store.isBookmarked(ctx.from.id, `${surahId}:${ayahNumber}`), lng),
    });
    store.markRead(ctx.from.id, `${surahId}:${ayahNumber}`);
  } catch (err) {
    console.error('sendDailyAyah error:', err);
    await ctx.reply(t(ctx, 'Не удалось загрузить аят дня', 'Could not load ayah of the day', 'تعذر تحميل آية اليوم'));
  }
}

async function broadcastDailyAyah() {
  const subscribers = store.getAllDailySubscribers();
  if (!subscribers.length) return;
  for (const userId of subscribers) {
    try {
      const ctxLike = { from: { id: userId } };
      const lng = store.getLang(userId) || 'russian';
      const { surahId, ayahNumber } = quranApi.getRandomAyah();
      const edition = LANGUAGES[lng]?.quranApi || 'ru.kuliev';
      const [arabic, translation] = await Promise.all([
        quranApi.getAyah(surahId, ayahNumber, 'ar.alfazy'),
        quranApi.getAyah(surahId, ayahNumber, edition),
      ]);
      const s = h.findSurah(surahId);
      const name = h.surahTitle(s, lng);
      await bot.telegram.sendMessage(userId,
        `📅 *${h.t(lng, 'Аят дня', 'Ayah of the day', 'آية اليوم')}*\n\n${name} ${surahId}:${ayahNumber}\n\n${arabic.text}\n\n${translation.text}`,
        { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`broadcast to ${userId} failed:`, err.message);
    }
  }
}

function scheduleDailyBroadcast() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  console.log(`Daily broadcast scheduled at 06:00 MSK (in ${Math.round(delay / 60000)} min)`);
  setTimeout(async () => {
    try {
      await broadcastDailyAyah();
    } catch (err) {
      console.error('broadcast error:', err);
    }
    scheduleDailyBroadcast();
  }, delay);
}

async function sendBookmarks(ctx) {
  const userId = ctx.from.id;
  const bookmarks = store.getBookmarks(userId);
  if (!bookmarks.length) {
    await ctx.reply(t(ctx, '📑 У вас нет закладок', '📑 No bookmarks yet', '📑 لا توجد علامات'));
    return;
  }
  const rows = bookmarks.slice(0, 10).map((b) => {
    const s = h.findSurah(b.surahId);
    const name = s ? h.surahName(s, lang(ctx)) : `#${b.surahId}`;
    return [Markup.button.callback(`${name} ${b.surahId}:${b.ayahNumber}`, `ayah_${b.surahId}_${b.ayahNumber}`)];
  });
  rows.push([Markup.button.callback(t(ctx, '🏠 Меню', '🏠 Menu', '🏠 القائمة'), 'main_menu')]);
  await ctx.reply(t(ctx, '📑 Закладки:', '📑 Bookmarks:', '📑 العلامات:'), Markup.inlineKeyboard(rows));
}

async function doSearch(ctx, query) {
  const lng = lang(ctx);
  await ctx.reply(t(ctx, '🔍 Ищу...', '🔍 Searching...', '🔍 جارٍ البحث...'));
  try {
    const apiLang = LANGUAGES[lng]?.quranApi || 'ru.kuliev';
    const result = await quranApi.searchQuran(query, apiLang);
    const matches = result?.matches?.slice(0, 8) || [];
    if (!matches.length) {
      await ctx.reply(t(ctx, 'Ничего не найдено', 'No results', 'لا نتائج'));
      return;
    }
    let text = `${t(ctx, '🔍 Результаты поиска', '🔍 Search results', '🔍 نتائج البحث')}: "${query}"\n`;
    for (const m of matches) {
      const s = h.findSurah(m.surah.number);
      const name = s ? h.surahName(s, lng) : m.surah.englishName;
      text += `\n📖 ${name} ${m.surah.number}:${m.numberInSurah}\n${m.text.substring(0, 120)}...\n`;
    }
    const parts = h.splitLongMessage(text);
    for (const part of parts) await ctx.reply(part);
  } catch {
    await ctx.reply(t(ctx, 'Ошибка поиска', 'Search error', 'خطأ في البحث'));
  }
}

/** ──────── AYAH OF THE DAY ──────── */

const AYAH_EDITION = 'ru.kuliev';
let dailyAyahCache = null;
let dailyAyahDate = '';

async function getDailyAyah() {
  const today = new Date().toDateString();
  if (dailyAyahCache && dailyAyahDate === today) return dailyAyahCache;
  const { surahId, ayahNumber } = quranApi.getRandomAyah();
  try {
    const [arabic, translation] = await Promise.all([
      quranApi.getAyah(surahId, ayahNumber, 'ar.alfazy'),
      quranApi.getAyah(surahId, ayahNumber, AYAH_EDITION),
    ]);
    const s = h.findSurah(surahId);
    const name = s ? `${s.nameRussian} (${s.nameEnglish})` : `#${surahId}`;
    dailyAyahCache = { surahId, ayahNumber, name, arabic: arabic.text, translation: translation.text };
    dailyAyahDate = today;
  } catch {
    return null;
  }
  return dailyAyahCache;
}

/** ──────── LAUNCH ──────── */

const http = require('http');

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && config.webhook.enabled && req.url === config.webhook.path) {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try { bot.handleUpdate(JSON.parse(body)); } catch (err) { console.error('Webhook handle error:', err); }
    });
    res.writeHead(200);
    res.end('ok');
  } else if (req.url === '/daily') {
    const ayah = await getDailyAyah();
    if (ayah) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>${ayah.name} ${ayah.surahId}:${ayah.ayahNumber}</h2>
        <p style="font-size:24px;direction:rtl">${ayah.arabic}</p>
        <p style="font-size:18px">${ayah.translation}</p></body></html>`);
    } else {
      res.writeHead(503);
      res.end('Error');
    }
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('QuranAI Bot v3.0 — running');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

async function start() {
  server.listen(config.port, '0.0.0.0', async () => {
    console.log(`HTTP server on :${config.port}`);

    if (config.webhook.enabled && config.webhook.url) {
      const fullUrl = `${config.webhook.url}${config.webhook.path}`;
      await bot.telegram.setWebhook(fullUrl, { secret_token: config.webhook.secret });
      console.log(`Webhook set to ${fullUrl}`);
    } else {
      await bot.telegram.deleteWebhook();
      bot.launch({ dropPendingUpdates: true });
      console.log('Bot started (polling mode)');
    }

    scheduleDailyBroadcast();
    startSelfPing();
  });
}

function startSelfPing() {
  if (!config.selfUrl) return;
  const interval = setInterval(async () => {
    try {
      const res = await fetch(config.selfUrl, { signal: AbortSignal.timeout(15000) });
      console.log(`Self-ping: ${res.status}`);
    } catch (err) {
      console.log('Self-ping failed:', err.message);
    }
  }, 10 * 60 * 1000);
  console.log(`Self-ping to ${config.selfUrl} every 10 min`);
  process.once('SIGTERM', () => clearInterval(interval));
}

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { getDailyAyah };