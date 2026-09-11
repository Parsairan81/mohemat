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
      body: JSON.stringify(settings)
    });
  } catch (err) { console.log('save settings error:', err); }
}

// ====== تغییر رنگ منو ======
function applyMenuColor(color) {
  const menu = document.getElementById('sideMenu');
  if (!menu) return;
  menu.classList.remove('color-yellow', 'color-indigo', 'color-blue', 'color-black', 'color-green', 'color-pink');
  menu.classList.add('color-' + color);
}

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('color-dot')) {
    const color = e.target.dataset.color;
    document.querySelectorAll('.color-dot').forEach(function(d) { d.classList.remove('active'); });
    e.target.classList.add('active');
    applyMenuColor(color);
    saveSettings({ menuColor: color });
    showToast('🎨 رنگ منو تغییر کرد');
  }
});

// ====== منو ======
function toggleMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideMenuOverlay');
  menu.classList.toggle('open');
  overlay.classList.toggle('open');
}
function closeMenu() {
  document.getElementById('sideMenu').classList.remove('open');
  document.getElementById('sideMenuOverlay').classList.remove('open');
}

// ====== راهنما ======
function showGuide() {
  document.getElementById('guideModal').classList.add('active');
  closeMenu();
}
function closeGuide() {
  document.getElementById('guideModal').classList.remove('active');
}

// ====== فیلترها ======
function renderFilters() {
  const container = document.getElementById('filters');
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
  const container = document.getElementById('notesContainer');
  const search = document.getElementById('searchInput').value.trim().toLowerCase();

  const filtered = notes.filter(function(n) {
    const matchCat = currentFilter === 'همه' || n.category === currentFilter;
    const matchSearch = !search ||
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
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const form = document.getElementById('noteForm');

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

// ====== ذخیره یادداشت ======
async function saveNote(e) {
  e.preventDefault();
  const id = document.getElementById('noteId').value;
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  const category = document.getElementById('noteCategory').value;

  const dateStr = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const noteData = {
    id: id || Date.now().toString(),
    title: title, content: content, category: category, date: dateStr
  };

  try {
    if (id) {
      await authFetch(API_URL + '/notes/' + id, {
        method: 'PUT', body: JSON.stringify(noteData)
      });
    } else {
      await authFetch(API_URL + '/notes', {
        method: 'POST', body: JSON.stringify(noteData)
      });
    }
    await loadNotes();
    closeModal();
    showToast('✅ یادداشت ذخیره شد!');
  } catch (err) {
    showToast('خطا: ' + err.message, true);
  }
}

function editNote(id) {
  const note = notes.find(function(n) { return n.id == id; });
  if (note) openModal(note);
}

// ====== حذف ======
function askDeleteNote(id) {
  pendingDeleteId = id;
  const note = notes.find(function(n) { return n.id == id; });
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
  const id = pendingDeleteId;
  const noteEl = document.querySelector('.note[data-id="' + id + '"]');
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
  const data = {
    version: '1.0', exportDate: new Date().toISOString(),
    count: notes.length, notes: notes
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
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
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
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
  const mode = document.querySelector('input[name="importMode"]:checked').value;

  try {
    if (mode === 'replace') {
      for (let i = 0; i < notes.length; i++) {
        await authFetch(API_URL + '/notes/' + notes[i].id, { method: 'DELETE' });
      }
    }
    for (let i = 0; i < pendingImportData.length; i++) {
      const n = pendingImportData[i];
      const newNote = {
        id: mode === 'replace' ? n.id : Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title: n.title, content: n.content, category: n.category, date: n.date
      };
      await authFetch(API_URL + '/notes', {
        method: 'POST', body: JSON.stringify(newNote)
      });
    }
    await loadNotes();
    showToast('✅ ' + pendingImportData.length + ' یادداشت اضافه شد!');
  } catch (err) {
    showToast('خطا: ' + err.message, true);
  }
  closeImportModal();
}

// ====== مدیریت کیبورد ======
function handleKeyboard() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (!modalOverlay || !modalOverlay.classList.contains('active')) return;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const wh = window.innerHeight;
  if (vh < wh - 150) {
    modalOverlay.classList.add('keyboard-open');
    const el = document.activeElement;
    if (el && el.tagName !== 'BODY') {
      setTimeout(function() {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
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

// بستن مودال با Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
    closeExportModal();
    closeImportModal();
    closeGuide();
    closeMenu();
  }
});

// بستن مودال با کلیک بیرون
document.addEventListener('click', function(e) {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
