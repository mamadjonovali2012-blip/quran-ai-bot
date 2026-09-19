const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const TTL = 1000 * 60 * 60 * 24 * 30;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function userFile(userId) {
  ensureDir();
  return path.join(DATA_DIR, `user_${userId}.json`);
}

function defaultData() {
  return { lang: 'russian', bookmarks: [], history: [], lastRead: null, settings: {} };
}

function getData(userId) {
  const file = userFile(userId);
  if (!fs.existsSync(file)) return defaultData();
  try {
    return { ...defaultData(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return defaultData();
  }
}

function save(userId, data) {
  ensureDir();
  fs.writeFileSync(userFile(userId), JSON.stringify(data, null, 2), 'utf8');
}

function getLang(userId) {
  return getData(userId).lang || 'russian';
}

function setLang(userId, lang) {
  const d = getData(userId);
  d.lang = lang;
  save(userId, d);
}

function addBookmark(userId, book) {
  const d = getData(userId);
  if (!d.bookmarks) d.bookmarks = [];
  if (!d.bookmarks.some((b) => b.ref === book.ref)) {
    d.bookmarks.unshift({ ...book, ts: Date.now() });
    d.bookmarks = d.bookmarks.slice(0, 100);
  }
  save(userId, d);
}

function removeBookmark(userId, ref) {
  const d = getData(userId);
  if (!d.bookmarks) d.bookmarks = [];
  d.bookmarks = d.bookmarks.filter((b) => b.ref !== ref);
  save(userId, d);
}

function isBookmarked(userId, ref) {
  const d = getData(userId);
  return (d.bookmarks || []).some((b) => b.ref === ref);
}

function getBookmarks(userId) {
  return getData(userId).bookmarks || [];
}

function markRead(userId, ref) {
  const d = getData(userId);
  if (!d.history) d.history = [];
  d.history = d.history.filter((h) => h.ref !== ref);
  d.history.unshift({ ref, ts: Date.now() });
  d.history = d.history.slice(0, 50);
  d.lastRead = { ref, ts: Date.now() };
  save(userId, d);
}

function getHistory(userId) {
  return getData(userId).history || [];
}

function getLastRead(userId) {
  return getData(userId).lastRead || null;
}

module.exports = {
  getLang, setLang, addBookmark, removeBookmark, isBookmarked,
  getBookmarks, markRead, getHistory, getLastRead, getData, save,
};