/* ============================================
   SAKURA GALLERY — Admin Script
   File: js/admin.js
   ============================================ */

'use strict';

// ─── ⚠️ GANTI PASSWORD DI SINI ───────────────────────────────────────────────
const ADMIN_PASSWORD = 'joscreine';
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY   = 'sakura_admin_auth';
const PHOTOS_KEY    = 'sakura_gallery_photos';
const COUNTER_KEY   = 'sakura_id_counter';

// ─── State ────────────────────────────────────────────────────────────────────
let photos  = [];
let nextId  = 1;

// ─── DOM refs ────────────────────────────────────────────────────────────────
const loginScreen   = document.getElementById('loginScreen');
const adminPanel    = document.getElementById('adminPanel');
const loginForm     = document.getElementById('loginForm');
const loginError    = document.getElementById('loginError');
const logoutBtn     = document.getElementById('logoutBtn');

const addPhotoForm  = document.getElementById('addPhotoForm');
const fileInput     = document.getElementById('fileInput');
const dropzone      = document.getElementById('dropzone');
const imagePreview  = document.getElementById('imagePreview');
const previewImg    = document.getElementById('previewImg');
const photoTitle    = document.getElementById('photoTitle');
const photoCategory = document.getElementById('photoCategory');
const photoFilename = document.getElementById('photoFilename');
const photoDate     = document.getElementById('photoDate');

const adminPhotoList  = document.getElementById('adminPhotoList');
const adminPhotoCount = document.getElementById('adminPhotoCount');
const jsonOutput      = document.getElementById('jsonOutput');
const copyJsonBtn     = document.getElementById('copyJsonBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const clearAllBtn     = document.getElementById('clearAllBtn');
const statsGrid       = document.getElementById('statsGrid');

const adminToast     = document.getElementById('adminToast');
const adminToastIcon = document.getElementById('adminToastIcon');
const adminToastMsg  = document.getElementById('adminToastMsg');

// ─── Auth ─────────────────────────────────────────────────────────────────────
function checkSession() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function showPanel() {
  loginScreen.style.display = 'none';
  adminPanel.classList.add('visible');
  loadData();
  renderAdminGallery();
  updateJsonOutput();
  renderStats();
}

function showLogin() {
  loginScreen.style.display = 'flex';
  adminPanel.classList.remove('visible');
}

// ─── Login ───────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const pwd = document.getElementById('adminPassword').value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    loginError.style.display = 'none';
    showPanel();
  } else {
    loginError.style.display = 'block';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
    // Shake animation
    loginError.animate(
      [{ transform:'translateX(-5px)' }, { transform:'translateX(5px)' }, { transform:'translateX(0)' }],
      { duration: 300, iterations: 2 }
    );
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
  document.getElementById('adminPassword').value = '';
});

// ─── Data persistence (localStorage) ─────────────────────────────────────────
function loadData() {
  const stored = localStorage.getItem(PHOTOS_KEY);
  photos  = stored ? JSON.parse(stored) : [];

  const cnt = localStorage.getItem(COUNTER_KEY);
  nextId  = cnt ? parseInt(cnt) : (photos.length > 0 ? Math.max(...photos.map(p => p.id)) + 1 : 1);
}

function saveData() {
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
  localStorage.setItem(COUNTER_KEY, String(nextId));
}

// ─── Add Photo ────────────────────────────────────────────────────────────────
addPhotoForm.addEventListener('submit', e => {
  e.preventDefault();

  const title    = photoTitle.value.trim();
  const category = photoCategory.value;
  const filename = photoFilename.value.trim();
  const date     = photoDate.value || new Date().toISOString().split('T')[0];

  if (!title) {
    showAdminToast('⚠️', 'Judul foto wajib diisi!', 'error');
    photoTitle.focus();
    return;
  }

  const newPhoto = {
    id: nextId++,
    title,
    filename,
    category,
    date,
    addedAt: new Date().toISOString(),
  };

  photos.unshift(newPhoto); // newest first
  saveData();

  // UI updates
  renderAdminGallery();
  updateJsonOutput();
  renderStats();
  addPhotoForm.reset();
  imagePreview.style.display = 'none';
  previewImg.src = '';

  showAdminToast('🌸', `"${title}" berhasil ditambahkan!`, 'success');
});

// ─── Delete Photo ─────────────────────────────────────────────────────────────
function deletePhoto(id) {
  const photo = photos.find(p => p.id === id);
  if (!photo) return;
  if (!confirm(`Hapus foto "${photo.title}"?`)) return;

  photos = photos.filter(p => p.id !== id);
  saveData();
  renderAdminGallery();
  updateJsonOutput();
  renderStats();
  showAdminToast('🗑', `"${photo.title}" dihapus`, '');
}
window.deletePhoto = deletePhoto;

// ─── Clear All ────────────────────────────────────────────────────────────────
clearAllBtn.addEventListener('click', () => {
  if (!photos.length) {
    showAdminToast('ℹ️', 'Tidak ada foto untuk dihapus', '');
    return;
  }
  if (!confirm(`Hapus semua ${photos.length} foto? Tindakan ini tidak bisa dibatalkan.`)) return;
  photos = [];
  nextId = 1;
  saveData();
  renderAdminGallery();
  updateJsonOutput();
  renderStats();
  showAdminToast('🗑', 'Semua foto telah dihapus', '');
});

// ─── Render Admin Gallery ─────────────────────────────────────────────────────
function renderAdminGallery() {
  adminPhotoCount.textContent = photos.length;

  if (!photos.length) {
    adminPhotoList.innerHTML = `
      <p style="color:var(--gray-text); font-size:0.85rem; grid-column:1/-1; text-align:center; padding:30px;">
        Belum ada foto. Tambahkan foto pertamamu! 🌸
      </p>`;
    return;
  }

  adminPhotoList.innerHTML = photos.map(photo => {
    const imgSrc = photo.filename
      ? `photos/${photo.filename}`
      : `https://placehold.co/200x200/fce4ec/c06080?text=🌸`;

    return `
      <div class="admin-photo-item">
        <img
          src="${imgSrc}"
          alt="${photo.title}"
          onerror="this.src='https://placehold.co/200x200/fce4ec/c06080?text=🌸'"
          loading="lazy"
        />
        <div class="item-info">
          <div class="item-title" title="${photo.title}">${photo.title}</div>
          <button class="btn-delete" onclick="deletePhoto(${photo.id})">
            🗑 Hapus
          </button>
        </div>
      </div>`;
  }).join('');
}

// ─── JSON Output ──────────────────────────────────────────────────────────────
function updateJsonOutput() {
  // Exclude internal addedAt field for cleaner output
  const output = photos.map(({ addedAt, ...rest }) => rest);
  jsonOutput.textContent = JSON.stringify(output, null, 2);
}

// ─── Copy & Download JSON ─────────────────────────────────────────────────────
copyJsonBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(jsonOutput.textContent);
    showAdminToast('📋', 'JSON berhasil disalin!', 'success');
    copyJsonBtn.textContent = '✅ Tersalin!';
    setTimeout(() => { copyJsonBtn.innerHTML = '📋 Salin JSON'; }, 2000);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = jsonOutput.textContent;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showAdminToast('📋', 'JSON berhasil disalin!', 'success');
  }
});

downloadJsonBtn.addEventListener('click', () => {
  const blob = new Blob([jsonOutput.textContent], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'photos.json';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('⬇️', 'photos.json didownload!', 'success');
});

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderStats() {
  const catCount = {};
  photos.forEach(p => {
    catCount[p.category || 'Uncategorized'] = (catCount[p.category || 'Uncategorized'] || 0) + 1;
  });

  const statItems = [
    { label: 'Total Foto', value: photos.length, icon: '🖼️' },
    { label: 'Kategori',   value: Object.keys(catCount).length, icon: '🏷️' },
    ...Object.entries(catCount).map(([cat, cnt]) => ({
      label: cat, value: cnt, icon: '🌸'
    }))
  ];

  statsGrid.innerHTML = statItems.map(s => `
    <div style="
      background: linear-gradient(135deg, var(--pink-light), #fff5f8);
      border: 1px solid var(--gray-medium);
      border-radius: var(--radius-sm);
      padding: 16px 14px;
      text-align: center;
    ">
      <div style="font-size:1.5rem; margin-bottom:6px;">${s.icon}</div>
      <div style="font-size:1.4rem; font-weight:700; color:#c06080; font-family:'Cormorant Garamond', serif;">
        ${s.value}
      </div>
      <div style="font-size:0.72rem; color:var(--gray-text); letter-spacing:0.06em; margin-top:3px;">
        ${s.label}
      </div>
    </div>`).join('');
}

// ─── File Preview ─────────────────────────────────────────────────────────────
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect() {
  const file = fileInput.files[0];
  if (!file) return;

  // Auto-fill filename
  if (!photoFilename.value) {
    photoFilename.value = sanitizeFilename(file.name);
  }

  // Auto-fill title from filename if empty
  if (!photoTitle.value) {
    const nameNoExt = file.name.replace(/\.[^/.]+$/, '');
    photoTitle.value = nameNoExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Preview
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src         = e.target.result;
    imagePreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-_]/g, '');
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) {
    showAdminToast('⚠️', 'Hanya file gambar yang diizinkan', 'error');
    return;
  }

  // Simulate input change
  const dt = new DataTransfer();
  dt.items.add(file);
  fileInput.files = dt.files;
  handleFileSelect();
});

// ─── Set default date ────────────────────────────────────────────────────────
photoDate.value = new Date().toISOString().split('T')[0];

// ─── Admin Toast ──────────────────────────────────────────────────────────────
let adminToastTimer;
function showAdminToast(icon, msg, type = '') {
  clearTimeout(adminToastTimer);
  adminToastIcon.textContent = icon;
  adminToastMsg.textContent  = msg;
  adminToast.className = `toast ${type} show`;
  adminToastTimer = setTimeout(() => adminToast.classList.remove('show'), 3200);
}

// ─── Start ────────────────────────────────────────────────────────────────────
if (checkSession()) {
  showPanel();
} else {
  showLogin();
}