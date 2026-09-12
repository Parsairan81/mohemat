// ================================================================
//  app.js - دفترچه یادداشت با Google OAuth + تم داینامیک
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

// ================================================================
// تم‌های رنگی سایت
// ================================================================
const THEMES = {
  yellow:  { primary: '#ffd60a', dark: '#ffc300', text: '#1a1a1a', bg1: '#fffdf5', bg2: '#ffffff', bg3: '#fffbe8' },
  indigo:  { primary: '#818cf8', dark: '#6366f1', text: '#1a1a1a', bg1: '#f5f3ff', bg2: '#ffffff', bg3: '#ede9fe' },
  blue:    { primary: '#60a5fa', dark: '#3b82f6', text: '#1a1a1a', bg1: '#f0f9ff', bg2: '#ffffff', bg3: '#e0f2fe' },
  green:   { primary: '#34d399', dark: '#10b981', text: '#1a1a1a', bg1: '#f0fdf4', bg2: '#ffffff', bg3: '#dcfce7' },
  pink:    { primary: '#f472b6', dark: '#ec4899', text: '#1a1a1a', bg1: '#fdf2f8', bg2: '#ffffff', bg3: '#fce7f3' },
  purple:  { primary: '#c084fc', dark: '#a855f7', text: '#1a1a1a', bg1: '#faf5ff', bg2: '#ffffff', bg3: '#f3e8ff' },
  orange:  { primary: '#fb923c', dark: '#f97316', text: '#1a1a1a', bg1: '#fff7ed', bg2: '#ffffff', bg3: '#ffedd5' },
  dark:    { primary: '#ffd60a', dark: '#ffc300', text: '#ffffff', bg1: '#0f0f0f', bg2: '#1a1a1a', bg3: '#2b2b2b' }
};

function applyTheme(themeName) {
  const theme = THEMES[themeName] || THEMES.yellow;
  const root = document.documentElement;
  root.style.setProperty('--yellow', theme.primary);
  root.style.setProperty('--yellow-dark', theme.dark);
  root.style.setProperty('--bg1', theme.bg1);
  root.style.setProperty('--bg2', theme.bg2);
  root.style.setProperty('--bg3', theme.bg3);

  if (themeName === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// ====== Google Login ======
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

// ====== نمایش اپ ======
function showMainApp() {
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';

  if (currentUser) {
    var firstName = currentUser.name.split(' ')[0];
    document.getElementById('welcomeName').textContent = firstName;
    document.getElementById('menuName').textContent = currentUser.name;
    document.getElementById('menuEmail').textContent = currentUser.email;

    // عکس با fallback
    var pic = currentUser.picture || '';
    var wAvatar = document.getElementById('welcomeAvatar');
    var mAvatar = document.getElementById('menuAvatar');
    if (pic) {
      wAvatar.src = pic;
      mAvatar.src = pic;
      wAvatar.onerror = function() { this.style.display = 'none'; };
      mAvatar.onerror = function() { this.style.display = 'none'; };
    } else {
      wAvatar.style.display = 'none';
      mAvatar.style.display = 'none';
    }

    // پیام خوش‌آمد بعد ۵ ثانیه محو می‌شه
    setTimeout(function() {
      var wb = document.getElementById('welcomeBar');
      if (wb) {
        wb.style.transition = 'opacity 0.6s ease, transform 0.6s ease, max-height 0.6s ease, margin 0.6s ease, padding 0.6s ease';
        wb.style.opacity = '0';
        wb.style.transform = 'translateY(-20px)';
        wb.style.maxHeight = '0';
        wb.style.margin = '0';
        wb.style.padding = '0';
        setTimeout(function() { wb.style.display = 'none'; }, 700);
      }
    }, 5000);
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
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }
  location.reload();
}

// ====== بررسی ورود قبلی ======
function checkExistingLogin() {
  var savedToken = localStorage.getItem('authToken');
  var savedUser = localStorage.getItem('currentUser');

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
var pencilsInitialized = false;
function initPencils() {
  if (pencilsInitialized) return;
  pencilsInitialized = true;
  var container = document.getElementById('floatingPencils');
  if (!container) return;
  var emojis = ['✏️', '📝', '🖊️', '📌', '⭐'];
  for (var i = 0; i < 12; i++) {
    var span = document.createElement('span');
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
  var toast = document.createElement('div');
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
  var div = document.createElement('div');
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
    var res = await authFetch(API_URL + '/notes');
    if (!res.ok) throw new Error('خطا در اتصال');
    notes = await res.json();
    renderNotes();
  } catch (err) {
    document.getElementById('notesContainer').innerHTML =
      '<div class="empty-state"><span class="emoji">⚠️</span><p>خطا در اتصال به سرور</p></div>';
  }
}

// ====== تنظیمات ======
async function loadSettings() {
  try {
    var res = await authFetch(API_URL + '/settings');
    if (!res.ok) return;
    var settings = await res.json();
    if (settings.theme) {
      applyTheme(settings.theme);
      document.querySelectorAll('.color-dot').forEach(function(dot) {
        dot.classList.toggle('active', dot.dataset.color === settings.theme);
      });
    }
  } catch (err) { console.log('settings error:', err); }
}

async function saveSettings(settings) {
  try {
    await authFetch(API_URL + '/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  } catch (err) { console.log('save settings error:', err); }
}

// ====== کلیک روی رنگ ======
document.addEventListener('click', function(e) {
  if (e.target.classList && e.target.classList.contains('color-dot')) {
    var color = e.target.dataset.color;
    document.querySelectorAll('.color-dot').forEach(function(d) { d.classList.remove('active'); });
    e.target.classList.add('active');
    applyTheme(color);
    saveSettings({ theme: color });
    showToast('🎨 تم سایت تغییر کرد');
  }
});

// ====== منو ======
function toggleMenu() {
  document.getElementById('sideMenu').classList.toggle('open');
  document.getElementById('sideMenuOverlay').classList.toggle('open');
}
function closeMenu() {
  var menu = document.getElementById('sideMenu');
  var overlay = document.getElementById('sideMenuOverlay');
  if (menu) menu.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function showGuide() {
  document.getElementById('guideModal').classList.add('active');
  closeMenu();
}
function closeGuide() {
  document.getElementById('guideModal').classList.remove('active');
}

// ====== فیلترها ======
function renderFilters() {
  var container = document.getElementById('filters');
  if (!container) return;
  container.innerHTML = categories.map(function(cat) {
    return '<button class="filter-btn ' + (currentFilter === cat ? 'active' : '') + '" onclick="setFilter(\'' + cat + '\')">' + cat + '</button>';
  }).join('');
}
function setFilter(cat) {
  currentFilter = cat;
  renderFilters();
  renderNotes();
}

// ====== رندر یادداشت‌ها ======
function renderNotes() {
  var container = document.getElementById('notesContainer');
  if (!container) return;
  var searchEl = document.getElementById('searchInput');
  var search = searchEl ? searchEl.value.trim().toLowerCase() : '';

  var filtered = notes.filter(function(n) {
    var matchCat = currentFilter === 'همه' || n.category === currentFilter;
    var matchSearch = !search ||
      n.title.toLowerCase().indexOf(search) !== -1 ||
      n.content.toLowerCase().indexOf(search) !== -1;
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><span class="emoji">📝</span><p>' +
      (notes.length === 0 ? 'هنوز یادداشتی نداری! یه یادداشت جدید بساز ✏️' : 'چیزی پیدا نشد!') +
      '</p></div>';
    return;
  }

  container.innerHTML = filtered.map(function(note) {
    return '<div class="note" data-id="' + note.id + '">' +
      '<div class="note-header">' +
        '<div class="note-title">' + escapeHtml(note.title) + '</div>' +
        '<div class="note-category">' + escapeHtml(note.category) + '</div>' +
      '</div>' +
      '<div class="note-content">' + escapeHtml(note.content) + '</div>' +
      '<div class="note-footer">' +
        '<div class="note-date">' + note.date + '</div>' +
        '<div class="note-actions">' +
          '<button class="icon-btn" onclick="editNote(\'' + note.id + '\')" title="ویرایش">✏️</button>' +
          '<button class="icon-btn" onclick="askDeleteNote(\'' + note.id + '\')" title="حذف">🗑️</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ====== مودال ======
function openModal(note) {
  var overlay = document.getElementById('modalOverlay');
  var title = document.getElementById('modalTitle');
  var form = document.getElementById('noteForm');

  if (note) {
    title.textContent = '✏️ ویرایش یادداشت';
    document.getElementById('noteId').value = note.id;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    document.getElementById('noteCategory').value = note.category;
  } else {
    title.textContent = '✏️ یادداشت جدید';
    form.reset();
    document.getElementById('noteId').value = '';
  }
  overlay.classList.add('active');
  setTimeout(function() { document.getElementById('noteTitle').focus(); }, 300);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

// ====== ذخیره ======
async function saveNote(e) {
  e.preventDefault();
  var id = document.getElementById('noteId').value;
  var title = document.getElementById('noteTitle').value.trim();
  var content = document.getElementById('noteContent').value.trim();
  var category = document.getElementById('noteCategory').value;

  var dateStr = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  var noteData = {
    id: id || Date.now().toString(),
    title: title, content: content, category: category, date: dateStr
  };

  try {
    if (id) {
      await authFetch(API_URL + '/notes/' + id, { method: 'PUT', body: JSON.stringify(noteData) });
    } else {
      await authFetch(API_URL + '/notes', { method: 'POST', body: JSON.stringify(noteData) });
    }
    await loadNotes();
    closeModal();
    showToast('✅ یادداشت ذخیره شد!');
  } catch (err) {
    showToast('خطا: ' + err.message, true);
  }
}

function editNote(id) {
  var note = notes.find(function(n) { return n.id == id; });
  if (note) openModal(note);
}

// ====== حذف ======
function askDeleteNote(id) {
  pendingDeleteId = id;
  var note = notes.find(function(n) { return n.id == id; });
  if (!note) return;
  document.getElementById('deleteNoteTitle').textContent = '« ' + note.title + ' »';
  document.getElementById('deleteModal').classList.add('active');
}
function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').classList.remove('active');
}
async function confirmDelete() {
  if (!pendingDeleteId) return;
  var id = pendingDeleteId;
  var noteEl = document.querySelector('.note[data-id="' + id + '"]');
  if (noteEl) noteEl.classList.add('removing');

  setTimeout(async function() {
    try {
      await authFetch(API_URL + '/notes/' + id, { method: 'DELETE' });
      await loadNotes();
      showToast('🗑️ یادداشت حذف شد');
    } catch (err) {
      showToast('خطا: ' + err.message, true);
    }
  }, 280);
  closeDeleteModal();
}

// ====== Export ======
function openExportModal() {
  document.getElementById('exportCount').textContent = notes.length;
  document.getElementById('exportModal').classList.add('active');
}
function closeExportModal() {
  document.getElementById('exportModal').classList.remove('active');
}
function confirmExport() {
  if (notes.length === 0) {
    showToast('هنوز یادداشتی نداری!', true);
    closeExportModal();
    return;
  }
  var data = { version: '1.0', exportDate: new Date().toISOString(), count: notes.length, notes: notes };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var today = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = 'my-notes-backup-' + today + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  closeExportModal();
  showToast('✅ بکاپ دانلود شد!');
}

// ====== Import ======
function importNotes(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.notes || !Array.isArray(data.notes)) {
        showToast('❌ فایل نامعتبر!', true);
        event.target.value = '';
        return;
      }
      if (data.notes.length === 0) {
        showToast('⚠️ فایل خالیه!', true);
        event.target.value = '';
        return;
      }
      pendingImportData = data.notes;
      document.getElementById('importCount').textContent = data.notes.length;
      document.getElementById('importModal').classList.add('active');
    } catch (err) {
      showToast('❌ خطا در خواندن فایل', true);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}
function closeImportModal() {
  document.getElementById('importModal').classList.remove('active');
  pendingImportData = null;
}
async function confirmImport() {
  if (!pendingImportData) return;
  var mode = document.querySelector('input[name="importMode"]:checked').value;

  try {
    if (mode === 'replace') {
      for (var i = 0; i < notes.length; i++) {
        await authFetch(API_URL + '/notes/' + notes[i].id, { method: 'DELETE' });
      }
    }
    for (var j = 0; j < pendingImportData.length; j++) {
      var n = pendingImportData[j];
      var newNote = {
        id: mode === 'replace' ? n.id : Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title: n.title, content: n.content, category: n.category, date: n.date
      };
      await authFetch(API_URL + '/notes', { method: 'POST', body: JSON.stringify(newNote) });
    }
    await loadNotes();
    showToast('✅ ' + pendingImportData.length + ' یادداشت اضافه شد!');
  } catch (err) {
    showToast('خطا: ' + err.message, true);
  }
  closeImportModal();
}

// ====== کیبورد ======
function handleKeyboard() {
  var modalOverlay = document.getElementById('modalOverlay');
  if (!modalOverlay || !modalOverlay.classList.contains('active')) return;
  var vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  var wh = window.innerHeight;
  if (vh < wh - 150) {
    modalOverlay.classList.add('keyboard-open');
    var el = document.activeElement;
    if (el && el.tagName !== 'BODY') {
      setTimeout(function() { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    }
  } else {
    modalOverlay.classList.remove('keyboard-open');
  }
}

// ====== راه‌اندازی ======
document.addEventListener('DOMContentLoaded', function() {
  renderFilters();
  checkExistingLogin();

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleKeyboard);
    window.visualViewport.addEventListener('scroll', handleKeyboard);
  } else {
    window.addEventListener('resize', handleKeyboard);
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeModal(); closeDeleteModal(); closeExportModal(); closeImportModal(); closeGuide(); closeMenu();
  }
});

document.addEventListener('click', function(e) {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
