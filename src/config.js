require('dotenv').config();

const config = {
  botToken: process.env.BOT_TOKEN,
  quranApiBase: 'https://api.alquran.cloud/v1',
  ai: {
    baseUrl: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'openrouter/auto',
  },
};

if (!config.botToken) {
  console.error('Ошибка: не задан BOT_TOKEN. Скопируйте .env.example в .env и укажите токен.');
  process.exit(1);
}

module.exports = config;