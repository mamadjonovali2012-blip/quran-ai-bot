const axios = require('axios');
const config = require('../config');

const SYSTEM_PROMPT_RU = `Ты — QuranAI, эксперт по исламу и Корану. Отвечай на вопросы об исламе, 
Коране, сунне, истории пророков, фикхе и тафсире. 

Правила:
1. Основывайся на Коране и достоверной сунне
2. Указывай суру и аят, когда цитируешь Коран
3. Если вопрос выходит за рамки исламских знаний, честно скажи об этом
4. Отвечай уважительно и структурированно
5. Используй русский язык`;

const SYSTEM_PROMPT_EN = `You are QuranAI, an expert on Islam and the Quran. Answer questions about Islam,
the Quran, Sunnah, prophets' history, fiqh, and tafsir.

Rules:
1. Base your answers on the Quran and authentic Sunnah
2. Mention surah and ayah when quoting the Quran
3. If the question is beyond Islamic knowledge, say so honestly
4. Answer respectfully and in a structured way`;

const SYSTEM_PROMPT_AR = `أنت QuranAI، خبير في الإسلام والقرآن. أجب عن الأسئلة حول الإسلام،
القرآن، السنة، تاريخ الأنبياء، الفقه، والتفسير.

القواعد:
1. استند إلى القرآن والسنة الصحيحة
2. اذكر السورة والآية عند الاستشهاد بالقرآن
3. إذا كان السؤال خارج نطاق المعرفة الإسلامية، فقل ذلك بصراحة
4. أجب باحترام وبطريقة منظمة`;

const systemPrompts = {
  russian: SYSTEM_PROMPT_RU,
  english: SYSTEM_PROMPT_EN,
  arabic: SYSTEM_PROMPT_AR,
};

async function askAI(question, lang = 'russian') {
  if (!config.ai.apiKey) {
    return lang === 'russian'
      ? 'AI-режим недоступен: не задан AI_API_KEY. Добавьте его в .env или воспользуйтесь /quran.'
      : lang === 'english'
        ? 'AI mode unavailable: AI_API_KEY not set. Add it to .env or use /quran.'
        : 'وضع AI غير متاح: لم يتم تعيين AI_API_KEY. أضفه إلى .env أو استخدم /quran.';
  }

  try {
    const { data } = await axios.post(
      `${config.ai.baseUrl}/chat/completions`,
      {
        model: config.ai.model,
        messages: [
          { role: 'system', content: systemPrompts[lang] || systemPrompts.russian },
          { role: 'user', content: question },
        ],
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    return data.choices[0].message.content;
  } catch (err) {
    console.error('AI request failed:', err.message);
    return lang === 'russian'
      ? 'Извините, AI-сервис временно недоступен. Пожалуйста, попробуйте позже.'
      : lang === 'english'
        ? 'Sorry, the AI service is temporarily unavailable. Please try again later.'
        : 'عذراً، خدمة AI غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.';
  }
}

module.exports = { askAI };