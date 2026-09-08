require('dotenv').config();

const config = {
  botToken: process.env.BOT_TOKEN,
  quranApiBase: 'https://api.alquran.cloud/v1',
};

if (!config.botToken) {
  console.error('Ошибка: не задан BOT_TOKEN. Скопируйте .env.example в .env и укажите токен.');
  process.exit(1);
}

module.exports = config;