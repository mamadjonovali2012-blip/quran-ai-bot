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
    'Команды:\n/quran — Читать Коран\n/search <текст> — Поиск\n/random — Случайный аят\n/audio <сура> [аят] — Аудио\n/bookmarks — Закладки\n/language — Язык\n\nВ любом чате: @QuranAIBot <текст> для поиска',
    'Commands:\n/quran — Read Quran\n/search <text> — Search\n/random — Random ayah\n/audio <surah> [ayah] — Audio\n/bookmarks — Bookmarks\n/language — Language\n\nAny chat: @QuranAIBot <text> for inline search',
    'الأوامر:\n/quran — قراءة القرآن\n/search <نص> — بحث\n/random — آية عشوائية\n/audio <سورة> [آية] — صوت\n/bookmarks — العلامات\n/language — اللغة\n\nفي أي محادثة: @QuranAIBot <نص> للبحث')
));

bot.command('quran', async (ctx) => {
  await ctx.reply(t(ctx, '📖 Навигация по Корану:', '📖 Quran navigation:', '📖 تصفح القرآن:'), kbd.quranNav(lang(ctx)));
});

bot.command('random', async (ctx) => sendRandomAyah(ctx));

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

  const edition = LANGUAGES[lng]?.quranApi || 'ru.kuliev';
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
    const msg = `${header}\n${info}\n\n${arabicText}\n\n${transText}${end < s.ayats ? `\n\n... ${t(ctx, 'продолжение следует', 'continued', 'يتبع')}` : ''}`;

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
    const edition = LANGUAGES[lng]?.quranApi || 'ru.kuliev';
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
    res.end('QuranAI Bot v2.0 — running');
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
  });
}

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { getDailyAyah };