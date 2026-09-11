// ====== تنظیمات ======
const USE_CLOUDFLARE = true;
const API_URL = 'https://my-memo-worker.parsaeshi259.workers.dev';

let notes = [];
let currentFilter = 'همه';
const categories = ['همه', 'مهم', 'آموزش', 'کار', 'شخصی', 'ایده'];
let pendingDeleteId = null;
let pendingImportData = null;

// ====== مدادهای شناور ======
const pencilsContainer = document.getElementById('floatingPencils');
const pencilEmojis = ['✏️', '📝', '🖊️', '📌', '⭐'];
for (let i = 0; i < 12; i++) {
  const span = document.createElement('span');
  span.textContent = pencilEmojis[Math.floor(Math.random() * pencilEmojis.length)];
  span.style.left = Math.random() * 100 + '%';
  span.style.animationDelay = Math.random() * 15 + 's';
  span.style.animationDuration = (12 + Math.random() * 10) + 's';
  span.style.fontSize = (1.5 + Math.random() * 2) + 'rem';
  pencilsContainer.appendChild(span);
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

function saveToLocalStorage() {
  localStorage.setItem('myNotes', JSON.stringify(notes));
}

// ====== بارگذاری یادداشت‌ها ======
async function loadNotes() {
  if (USE_CLOUDFLARE) {
    try {
      const res = await fetch(API_URL + '/notes');
      if (!res.ok) throw new Error('خطا در اتصال به سرور');
      notes = await res.json();
      renderNotes();
    } catch (err) {
      console.error('خطا:', err);
      document.getElementById('notesContainer').innerHTML =
        '<div class="empty-state"><span class="emoji">⚠️</span><p>اتصال به سرور برقرار نشد.</p></div>';
    }
  } else {
    notes = JSON.parse(localStorage.getItem('myNotes')) || [];
    renderNotes();
  }
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

// ====== مودال افزودن/ویرایش ======
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

  const now = new Date();
  const dateStr = now.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

  const noteData = {
    id: id || Date.now().toString(),
    title: title,
    content: content,
    category: category,
    date: dateStr
  };

  if (USE_CLOUDFLARE) {
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
  } else {
    if (id) {
      const idx = notes.findIndex(function(n) { return n.id == id; });
      if (idx > -1) notes[idx] = noteData;
    } else {
      notes.unshift(noteData);
    }
    saveToLocalStorage();
    renderNotes();
    closeModal();
    showToast('✅ یادداشت ذخیره شد!');
  }
}

function editNote(id) {
  const note = notes.find(function(n) { return n.id == id; });
  if (note) openModal(note);
}

// ====== حذف با تایید ======
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
      if (USE_CLOUDFLARE) {
        await fetch(API_URL + '/notes/' + id, { method: 'DELETE' });
        await loadNotes();
      } else {
        notes = notes.filter(function(n) { return n.id != id; });
        saveToLocalStorage();
        renderNotes();
      }
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
    version: '1.0',
    exportDate: new Date().toISOString(),
    count: notes.length,
    notes: notes
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

  if (USE_CLOUDFLARE) {
    try {
      if (mode === 'replace') {
        for (let i = 0; i < notes.length; i++) {
          await fetch(API_URL + '/notes/' + notes[i].id, { method: 'DELETE' });
        }
      }
      for (let i = 0; i < pendingImportData.length; i++) {
        const n = pendingImportData[i];
        const newNote = {
          id: mode === 'replace' ? n.id : Date.now().toString() + Math.random().toString(36).substr(2, 5),
          title: n.title,
          content: n.content,
          category: n.category,
          date: n.date
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
  } else {
    if (mode === 'replace') {
      notes = pendingImportData.slice();
    } else {
      const newNotes = pendingImportData.map(function(n) {
        return Object.assign({}, n, { id: Date.now().toString() + Math.random().toString(36).substr(2, 5) });
      });
      notes = newNotes.concat(notes);
    }
    saveToLocalStorage();
    renderNotes();
    showToast('✅ ' + pendingImportData.length + ' یادداشت اضافه شد!');
  }
  closeImportModal();
}

// ====== راه‌اندازی ======
document.addEventListener('DOMContentLoaded', function() {
  renderFilters();
  loadNotes();
});
