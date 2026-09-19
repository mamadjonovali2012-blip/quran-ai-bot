require('dotenv').config();

const config = {
  botToken: process.env.BOT_TOKEN,
  quranApiBase: 'https://api.alquran.cloud/v1',
  webhook: {
    enabled: process.env.WEBHOOK === 'true',
    url: process.env.WEBHOOK_URL,
    path: process.env.WEBHOOK_PATH || '/webhook',
    secret: process.env.WEBHOOK_SECRET,
  },
  port: parseInt(process.env.PORT || '3000', 10),
  selfUrl: process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL,
};

if (!config.botToken) {
  console.error('Ошибка: не задан BOT_TOKEN. Скопируйте .env.example в .env и укажите токен.');
  process.exit(1);
}

if (config.webhook.enabled && !config.webhook.url) {
  console.error('Ошибка: WEBHOOK=true, но не задан WEBHOOK_URL.');
  process.exit(1);
}

module.exports = config;