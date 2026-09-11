// ================================================================
//  app.js - دفترچه یادداشت با Google OAuth
// ================================================================

const API_URL = 'https://my-memo-worker.parsaeshi259.workers.dev';
const CLIENT_ID = '150383359779-70gbem0j167kljr12fqlh52ege41edms.apps.googleusercontent.com';

let notes = [];
let currentFilter = 'همه';
let currentUser = null;
let authToken = null;
let pendingDeleteId = null;
let pendingImportData = null;
const categories = ['همه', 'مهم', 'آموزش', 'کار', 'شخصی', 'ایده'];

// ====== Google Login Callback ======
function handleGoogleLogin(response) {
  if (!response.credential) return;
  authToken = response.credential;

  fetch(API_URL + '/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: authToken })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showMainApp();
      loadNotes();
      loadSettings();
    } else {
      alert('خطا در ورود: ' + data.error);
    }
  })
  .catch(function(err) {
    alert('خطا در اتصال: ' + err.message);
  });
}

// ====== نمایش اپ اصلی ======
function showMainApp() {
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';

  if (currentUser) {
    document.getElementById('welcomeName').textContent = currentUser.name.split(' ')[0];
    document.getElementById('welcomeAvatar').src = currentUser.picture || '';
    document.getElementById('menuAvatar').src = currentUser.picture || '';
    document.getElementById('menuName').textContent = currentUser.name;
    document.getElementById('menuEmail').textContent = currentUser.email;
  }

  initPencils();
}

// ====== خروج ======
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  authToken = null;
  currentUser = null;
  notes = [];
  if (window.google && google.accounts) {
    google.accounts.id.disableAutoSelect();
  }
  location.reload();
}

// ====== بررسی ورود قبلی ======
function checkExistingLogin() {
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');

  if (savedToken && savedUser) {
    authToken = savedToken;
    currentUser = JSON.parse(savedUser);

    fetch(API_URL + '/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: authToken })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success) {
        showMainApp();
        loadNotes();
        loadSettings();
      } else {
        logout();
      }
    })
    .catch(function() { logout(); });
  }
}

// ====== مدادهای شناور ======
let pencilsInitialized = false;
function initPencils() {
  if (pencilsInitialized) return;
  pencilsInitialized = true;
  const container = document.getElementById('floatingPencils');
  if (!container) return;
  const emojis = ['✏️', '📝', '🖊️', '📌', '⭐'];
  for (let i = 0; i < 12; i++) {
    const span = document.createElement('span');
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDelay = Math.random() * 15 + 's';
    span.style.animationDuration = (12 + Math.random() * 10) + 's';
    span.style.fontSize = (1.5 + Math.random() * 2) + 'rem';
    container.appendChild(span);
  }
}

// ====== توابع کمکی ======
function showToast(msg, isError) {
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('show'); }, 100);
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function authFetch(url, options) {
  options = options || {};
  options.headers = options.headers || {};
  options.headers['Authorization'] = 'Bearer ' + authToken;
  if (options.body && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }
  return fetch(url, options);
}

// ====== بارگذاری یادداشت‌ها ======
async function loadNotes() {
  try {
    const res = await authFetch(API_URL + '/notes');
    if (!res.ok) throw new Error('خطا در اتصال');
    notes = await res.json();
    renderNotes();
  } catch (err) {
    document.getElementById('notesContainer').innerHTML =
      '<div class="empty-state"><span class="emoji">⚠️</span><p>خطا در اتصال به سرور</p></div>';
  }
}

// ====== بارگذاری تنظیمات ======
async function loadSettings() {
  try {
    const res = await authFetch(API_URL + '/settings');
    if (!res.ok) return;
    const settings = await res.json();
    if (settings.menuColor) {
      applyMenuColor(settings.menuColor);
      document.querySelectorAll('.color-dot').forEach(function(dot) {
        dot.classList.toggle('active', dot.dataset.color === settings.menuColor);
      });
    }
  } catch (err) { console.log('settings error:', err); }
}

// ====== ذخیره تنظیمات ======
async function saveSettings(settings) {
  try {
    await authFetch(API_URL + '/settings', {
      method: 'PUT',
      body: JSON.stringify
