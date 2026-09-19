require('dotenv').config();

const webhookEnabled = process.env.WEBHOOK === 'true' && !!process.env.WEBHOOK_URL;

const config = {
  botToken: process.env.BOT_TOKEN,
  quranApiBase: 'https://api.alquran.cloud/v1',
  webhook: {
    enabled: webhookEnabled,
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

if (process.env.WEBHOOK === 'true' && !process.env.WEBHOOK_URL) {
  console.warn('Внимание: WEBHOOK=true, но WEBHOOK_URL не задан. Бот запустится в режиме polling.');
}

module.exports = config;