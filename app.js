// ================================================================
//  app.js - دفترچه یادداشت (بدون احراز هویت)
// ================================================================

const API_URL = 'https://my-memo-worker.parsaeshi259.workers.dev';

let notes = [];
let currentFilter = 'همه';
let pendingDeleteId = null;
let pendingImportData = null;
const categories = ['همه', 'مهم', 'آموزش', 'کار', 'شخصی', 'ایده'];

// ================================================================
// تم‌های رنگی
// ================================================================
const THEMES = {
  yellow:  { primary: '#ffd60a', dark: '#ffc300', bg1: '#fffdf5', bg2: '#ffffff', bg3: '#fffbe8', accent: 'rgba(255,214,10,0.35)', accentSoft: 'rgba(255,214,10,0.15)' },
  indigo:  { primary: '#818cf8', dark: '#6366f1', bg1: '#f5f3ff', bg2: '#f9f7ff', bg3: '#ede9fe', accent: 'rgba(129,140,248,0.25)', accentSoft: 'rgba(129,140,248,0.10)' },
  blue:    { primary: '#60a5fa', dark: '#3b82f6', bg1: '#f0f9ff', bg2: '#f8fbff', bg3: '#e0f2fe', accent: 'rgba(96,165,250,0.25)', accentSoft: 'rgba(96,165,250,0.10)' },
  green:   { primary: '#34d399', dark: '#10b981', bg1: '#f0fdf4', bg2: '#f7fefa', bg3: '#dcfce7', accent: 'rgba(52,211,153,0.25)', accentSoft: 'rgba(52,211,153,0.10)' },
  pink:    { primary: '#f472b6', dark: '#ec4899', bg1: '#fdf2f8', bg2: '#fef9fc', bg3: '#fce7f3', accent: 'rgba(244,114,182,0.25)', accentSoft: 'rgba(244,114,182,0.10)' },
  purple:  { primary: '#c084fc', dark: '#a855f7', bg1: '#faf5ff', bg2: '#fcfaff', bg3: '#f3e8ff', accent: 'rgba(192,132,252,0.25)', accentSoft: 'rgba(192,132,252,0.10)' },
  orange:  { primary: '#fb923c', dark: '#f97316', bg1: '#fff7ed', bg2: '#fffbf7', bg3: '#ffedd5', accent: 'rgba(251,146,60,0.25)', accentSoft: 'rgba(251,146,60,0.10)' },
  dark:    { primary: '#ffd60a', dark: '#ffc300', bg1: '#0f0f0f', bg2: '#1a1a1a', bg3: '#2b2b2b', accent: 'rgba(255,214,10,0.15)', accentSoft: 'rgba(255,214,10,0.05)' }
};

function applyTheme(themeName) {
  const theme = THEMES[themeName] || THEMES.yellow;
  const root = document.documentElement;
  root.style.setProperty('--yellow', theme.primary);
  root.style.setProperty('--yellow-dark', theme.dark);
  root.style.setProperty('--bg1', theme.bg1);
  root.style.setProperty('--bg2', theme.bg2);
  root.style.setProperty('--bg3', theme.bg3);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-soft', theme.accentSoft);

  if (themeName === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// ================================================================
// مدادهای شناور
// ================================================================
const pencilEmojis = ['✏️', '📝', '🖊️', '📌', '⭐'];
function initPencils() {
  const container = document.getElementById('floatingPencils');
  if (!container) return;
  for (let i = 0; i < 12; i++) {
    const span = document.createElement('span');
    span.textContent = pencilEmojis[Math.floor(Math.random() * pencilEmojis.length)];
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDelay = Math.random() * 15 + 's';
    span.style.animationDuration = (12 + Math.random() * 10) + 's';
    span.style.fontSize = (1.5 + Math.random() * 2) + 'rem';
    container.appendChild(span);
  }
}

// ================================================================
// توابع کمکی
// ================================================================
function showToast(msg, isError) {
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ================================================================
// بارگذاری یادداشت‌ها
// ================================================================
async function loadNotes() {
  try {
    const res = await fetch(API_URL + '/notes');
    if (!res.ok) throw new Error('خطا در اتصال');
    notes = await res.json();
    renderNotes();
  } catch (err) {
    document.getElementById('notesContainer').innerHTML =
      '<div class="empty-state"><span class="emoji">⚠️</span><p>اتصال به سرور برقرار نشد. اینترنتت رو چک کن یا Worker رو بررسی کن.</p></div>';
  }
}

// ================================================================
// بارگذاری/ذخیره تنظیمات (فقط localStorage)
// ================================================================
function loadSettings() {
  const theme = localStorage.getItem('theme') || 'yellow';
  applyTheme(theme);
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.color === theme);
  });
}

function saveSettings(settings) {
  if (settings.theme) localStorage.setItem('theme', settings.theme);
}

// ================================================================
// کلیک روی رنگ
// ================================================================
document.addEventListener('click', function(e) {
  if (e.target.classList && e.target.classList.contains('color-dot')) {
    const color = e.target.dataset.color;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    e.target.classList.add('active');
    applyTheme(color);
    saveSettings({ theme: color });
    showToast('🎨 تم سایت تغییر کرد');
  }
});

// ================================================================
// منو
// ================================================================
function toggleMenu() {
  document.getElementById('sideMenu').classList.toggle('open');
  document.getElementById('sideMenuOverlay').classList.toggle('open');
}
function closeMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideMenuOverlay');
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

// ================================================================
// فیلترها
// ================================================================
function renderFilters() {
  const container = document.getElementById('filters');
  if (!container) return;
  container.innerHTML = categories.map(cat =>
    '<button class="filter-btn ' + (currentFilter === cat ? 'active' : '') + '" onclick="setFilter(\'' + cat + '\')">' + cat + '</button>'
  ).join('');
}
function setFilter(cat) {
  currentFilter = cat;
  renderFilters();
  renderNotes();
}

// ================================================================
// رندر یادداشت‌ها
// ================================================================
function renderNotes() {
  const container = document.getElementById('notesContainer');
  if (!container) return;
  const searchEl = document.getElementById('searchInput');
  const search = searchEl ? searchEl.value.trim().toLowerCase() : '';

  const filtered = notes.filter(n => {
    const matchCat = currentFilter === 'همه' || n.category === currentFilter;
    const matchSearch = !search ||
      n.title.toLowerCase().includes(search) ||
      n.content.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><span class="emoji">📝</span><p>' +
      (notes.length === 0 ? 'هنوز یادداشتی نداری! یه یادداشت جدید بساز ✏️' : 'چیزی پیدا نشد!') +
      '</p></div>';
    return;
  }

  container.innerHTML = filtered.map(note => `
    <div class="note" data-id="${note.id}">
      <div class="note-header">
        <div class="note-title">${escapeHtml(note.title)}</div>
        <div class="note-category">${escapeHtml(note.category)}</div>
      </div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-footer">
        <div class="note-date">${note.date}</div>
        <div class="note-actions">
          <button class="icon-btn" onclick="editNote('${note.id}')" title="ویرایش">✏️</button>
          <button class="icon-btn" onclick="askDeleteNote('${note.id}')" title="حذف">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ================================================================
// مودال
// ================================================================
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
  setTimeout(() => document.getElementById('noteTitle').focus(), 300);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

// ================================================================
// ذخیره یادداشت
// ================================================================
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
    title, content, category, date: dateStr
  };

  try {
    if (id) {
      await fetch(API_URL + '/notes/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
    } else {
      await fetch(API_URL + '/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
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
  const note = notes.find(n => n.id == id);
  if (note) openModal(note);
}

// ================================================================
// حذف
// ================================================================
function askDeleteNote(id) {
  pendingDeleteId = id;
  const note = notes.find(n => n.id == id);
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

  setTimeout(async () => {
    try {
      await fetch(API_URL + '/notes/' + id, { method: 'DELETE' });
      await loadNotes();
      showToast('🗑️ یادداشت حذف شد');
    } catch (err) {
      showToast('خطا: ' + err.message, true);
    }
  }, 280);
  closeDeleteModal();
}

// ================================================================
// Export / Import
// ================================================================
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
  const data = { version: '1.0', exportDate: new Date().toISOString(), count: notes.length, notes };
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

function importNotes(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
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
        await fetch(API_URL + '/notes/' + notes[i].id, { method: 'DELETE' });
      }
    }
    for (let j = 0; j < pendingImportData.length; j++) {
      const n = pendingImportData[j];
      const newNote = {
        id: mode === 'replace' ? n.id : Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title: n.title, content: n.content, category: n.category, date: n.date
      };
      await fetch(API_URL + '/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });
    }
    await loadNotes();
    showToast('✅ ' + pendingImportData.length + ' یادداشت اضافه شد!');
  } catch (err) {
    showToast('خطا: ' + err.message, true);
  }
  closeImportModal();
}

// ================================================================
// کیبورد
// ================================================================
function handleKeyboard() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (!modalOverlay || !modalOverlay.classList.contains('active')) return;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const wh = window.innerHeight;
  if (vh < wh - 150) {
    modalOverlay.classList.add('keyboard-open');
    const el = document.activeElement;
    if (el && el.tagName !== 'BODY') {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  } else {
    modalOverlay.classList.remove('keyboard-open');
  }
}

// ================================================================
// راه‌اندازی
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
  initPencils();
  renderFilters();
  loadSettings();
  loadNotes();

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
