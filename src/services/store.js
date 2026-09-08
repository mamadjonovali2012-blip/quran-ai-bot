const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUserFile(userId) {
  ensureDir();
  return path.join(DATA_DIR, `user_${userId}.json`);
}

function getUserData(userId) {
  const file = getUserFile(userId);
  if (!fs.existsSync(file)) return { lang: 'russian', bookmarks: [], history: [], settings: {} };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { lang: 'russian', bookmarks: [], history: [], settings: {} };
  }
}

function saveUserData(userId, data) {
  ensureDir();
  fs.writeFileSync(getUserFile(userId), JSON.stringify(data, null, 2), 'utf8');
}

function getLang(userId) {
  return getUserData(userId).lang || 'russian';
}

function setLang(userId, lang) {
  const data = getUserData(userId);
  data.lang = lang;
  saveUserData(userId, data);
}

function addBookmark(userId, ref) {
  const data = getUserData(userId);
  if (!data.bookmarks) data.bookmarks = [];
  const exists = data.bookmarks.some((b) => b.ref === ref.ref);
  if (!exists) {
    data.bookmarks.unshift(ref);
    if (data.bookmarks.length > 100) data.bookmarks.pop();
  }
  saveUserData(userId, data);
  return !exists;
}

function removeBookmark(userId, ref) {
  const data = getUserData(userId);
  if (!data.bookmarks) data.bookmarks = [];
  data.bookmarks = data.bookmarks.filter((b) => b.ref !== ref.ref);
  saveUserData(userId, data);
}

function getBookmarks(userId) {
  return (getUserData(userId).bookmarks || []).slice(0, 20);
}

function addHistory(userId, ref) {
  const data = getUserData(userId);
  if (!data.history) data.history = [];
  data.history = data.history.filter((h) => h.ref !== ref.ref);
  data.history.unshift(ref);
  if (data.history.length > 20) data.history.pop();
  saveUserData(userId, data);
}

function getHistory(userId) {
  return getUserData(userId).history || [];
}

module.exports = { getUserData, getLang, setLang, addBookmark, removeBookmark, getBookmarks, addHistory, getHistory };