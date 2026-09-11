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
      (notes.length === 0 ? 'هنوز یادداشتی نداری! یه یادداشت جدید بساز ✏️'
