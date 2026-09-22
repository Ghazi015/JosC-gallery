/* ============================================
   SAKURA GALLERY — Gallery Script
   File: js/gallery.js
   ============================================ */

'use strict';

// ─── Config ───────────────────────────────────────────────────────────────────
const CONFIG = {
  photosJsonPath: 'photos.json',
  photosFolder:   'photos/',
  placeholderImg: 'https://placehold.co/600x400/fce4ec/c06080?text=🌸+Photo',
};

// ─── State ────────────────────────────────────────────────────────────────────
let allPhotos    = [];
let filtered     = [];
let activeFilter = 'all';
let searchQuery  = '';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const photoGrid     = document.getElementById('photoGrid');
const filterButtons = document.getElementById('filterButtons');
const photoCountEl  = document.getElementById('photoCount');
const searchInput   = document.getElementById('searchInput');

const lightboxOverlay  = document.getElementById('lightboxOverlay');
const lightboxImg      = document.getElementById('lightboxImg');
const lightboxTitle    = document.getElementById('lightboxTitle');
const lightboxMeta     = document.getElementById('lightboxMeta');
const lightboxCategory = document.getElementById('lightboxCategory');
const lightboxDownload = document.getElementById('lightboxDownload');
const lightboxClose    = document.getElementById('lightboxClose');
const lightboxClose2   = document.getElementById('lightboxClose2');

const toast    = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const toastIcon = document.getElementById('toastIcon');

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    await loadPhotos();
    buildFilterButtons();
    renderGallery();
    bindEvents();
  } catch (err) {
    console.error('Gallery init error:', err);
    showError();
  }
}

// ─── Load Photos ─────────────────────────────────────────────────────────────
async function loadPhotos() {
  try {
    // Try fetching photos.json (works on server/GitHub Pages)
    const res = await fetch(CONFIG.photosJsonPath + '?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allPhotos = await res.json();
  } catch (err) {
    // Fallback: use localStorage data (useful for local admin management)
    const stored = localStorage.getItem('sakura_gallery_photos');
    if (stored) {
      allPhotos = JSON.parse(stored);
      showToast('🌸', 'Memuat foto dari data lokal', 'success');
    } else {
      allPhotos = getDemoPhotos();
      showToast('ℹ️', 'Menggunakan foto demo', '');
    }
  }
}

// Demo photos when no JSON available
function getDemoPhotos() {
  return [
    { id: 1, title: 'Cherry Blossom Dreams',  filename: '', category: 'Nature', date: '2025-01-10' },
    { id: 2, title: 'Soft Pink Morning',       filename: '', category: 'Lifestyle', date: '2025-01-15' },
    { id: 3, title: 'Sakura Petals',           filename: '', category: 'Nature', date: '2025-01-20' },
    { id: 4, title: 'Delicate Bloom',          filename: '', category: 'Flower', date: '2025-02-01' },
    { id: 5, title: 'Gentle Breeze',           filename: '', category: 'Lifestyle', date: '2025-02-10' },
    { id: 6, title: 'Pastel Garden',           filename: '', category: 'Flower', date: '2025-02-14' },
  ];
}

// ─── Build Category Filters ───────────────────────────────────────────────────
function buildFilterButtons() {
  const categories = ['all', ...new Set(allPhotos.map(p => p.category).filter(Boolean))];
  filterButtons.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (cat === 'all' ? ' active' : '');
    btn.dataset.filter = cat;
    btn.textContent = cat === 'all' ? '🌸 All' : cat;
    filterButtons.appendChild(btn);
  });
}

// ─── Render Gallery ───────────────────────────────────────────────────────────
function renderGallery() {
  // Apply filter & search
  filtered = allPhotos.filter(photo => {
    const matchCat    = activeFilter === 'all' || photo.category === activeFilter;
    const matchSearch = !searchQuery
      || photo.title.toLowerCase().includes(searchQuery.toLowerCase())
      || (photo.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  photoCountEl.textContent = filtered.length;

  if (filtered.length === 0) {
    photoGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🌸</span>
        <h3>Tidak ada foto ditemukan</h3>
        <p>Coba ubah filter atau kata kunci pencarian kamu.</p>
      </div>`;
    return;
  }

  photoGrid.innerHTML = filtered.map((photo, idx) => buildCard(photo, idx)).join('');

  // Bind card events
  photoGrid.querySelectorAll('.photo-card').forEach(card => {
    card.addEventListener('click', e => {
      if (!e.target.closest('.btn-download')) {
        openLightbox(parseInt(card.dataset.id));
      }
    });
  });
}

// ─── Build Card HTML ──────────────────────────────────────────────────────────
function buildCard(photo, idx) {
  const imgSrc  = photo.filename
    ? CONFIG.photosFolder + photo.filename
    : getPlaceholder(photo.title);
  const imgAlt  = photo.title;
  const delay   = Math.min(idx * 60, 500);
  const dateStr = photo.date
    ? new Date(photo.date).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' })
    : '';
  const dlHref  = photo.filename ? CONFIG.photosFolder + photo.filename : '#';
  const dlAttr  = photo.filename ? `download="${photo.filename}"` : '';

  return `
    <article
      class="photo-card"
      data-id="${photo.id}"
      style="animation-delay:${delay}ms"
      role="button"
      tabindex="0"
      aria-label="Lihat foto: ${photo.title}"
    >
      <div class="photo-img-wrap">
        <img
          src="${imgSrc}"
          alt="${imgAlt}"
          loading="lazy"
          onerror="this.src='${getPlaceholder(photo.title)}'"
        />
        ${photo.category
          ? `<span class="category-badge">${photo.category}</span>`
          : ''}
        <div class="photo-overlay">
          <div class="overlay-actions">
            <button class="btn-view" onclick="openLightbox(${photo.id})">
              👁 View
            </button>
            <a
              href="${dlHref}"
              ${dlAttr}
              class="btn-download-overlay"
              onclick="event.stopPropagation(); handleDownload(event, '${photo.title}')"
            >
              ⬇ Save
            </a>
          </div>
        </div>
      </div>
      <div class="photo-body">
        <h3 class="photo-title">${photo.title}</h3>
        ${dateStr ? `<p class="photo-date">📅 ${dateStr}</p>` : ''}
        <a
          href="${dlHref}"
          ${dlAttr}
          class="btn-download"
          onclick="event.stopPropagation(); handleDownload(event, '${photo.title}')"
        >
          ⬇️ &nbsp;Download Foto
        </a>
      </div>
    </article>`;
}

// ─── Placeholder URL ──────────────────────────────────────────────────────────
function getPlaceholder(title) {
  const encoded = encodeURIComponent('🌸 ' + (title || 'Photo'));
  return `https://placehold.co/600x400/fce4ec/c06080?text=${encoded}`;
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function openLightbox(id) {
  const photo = allPhotos.find(p => p.id === id);
  if (!photo) return;

  const imgSrc  = photo.filename
    ? CONFIG.photosFolder + photo.filename
    : getPlaceholder(photo.title);
  const dateStr = photo.date
    ? new Date(photo.date).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' })
    : '';
  const dlHref  = photo.filename ? CONFIG.photosFolder + photo.filename : '#';

  lightboxImg.src = imgSrc;
  lightboxImg.alt = photo.title;
  lightboxTitle.textContent    = photo.title;
  lightboxMeta.textContent     = dateStr ? `📅 ${dateStr}` : '';
  lightboxCategory.textContent = photo.category || 'Gallery';
  lightboxDownload.href        = dlHref;
  if (photo.filename) {
    lightboxDownload.setAttribute('download', photo.filename);
    lightboxDownload.removeAttribute('onclick');
  } else {
    lightboxDownload.removeAttribute('download');
    lightboxDownload.addEventListener('click', e => {
      e.preventDefault();
      showToast('⚠️', 'File foto belum tersedia untuk di-download', '');
    }, { once: true });
  }

  lightboxOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxOverlay.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => { lightboxImg.src = ''; }, 350);
}

// ─── Download Handler ─────────────────────────────────────────────────────────
function handleDownload(event, title) {
  const el = event.currentTarget;
  if (!el.getAttribute('download') || el.href.endsWith('#')) {
    event.preventDefault();
    showToast('⚠️', 'File foto belum tersedia untuk didownload', '');
    return;
  }
  showToast('🌸', `Mendownload "${title}"...`, 'success');
}
window.handleDownload = handleDownload;
window.openLightbox   = openLightbox;

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(icon, msg, type = '') {
  clearTimeout(toastTimer);
  toastIcon.textContent = icon;
  toastMsg.textContent  = msg;
  toast.className       = `toast ${type} show`;
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3200);
}

// ─── Error State ──────────────────────────────────────────────────────────────
function showError() {
  photoGrid.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">🌸</span>
      <h3>Gagal memuat galeri</h3>
      <p>Pastikan file <code>photos.json</code> tersedia dan formatnya benar.</p>
    </div>`;
}

// ─── Event Bindings ───────────────────────────────────────────────────────────
function bindEvents() {
  // Filter buttons
  filterButtons.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderGallery();
  });

  // Search
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    renderGallery();
  });

  // Lightbox close
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxClose2.addEventListener('click', closeLightbox);
  lightboxOverlay.addEventListener('click', e => {
    if (e.target === lightboxOverlay) closeLightbox();
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();

    // Arrow key navigation in lightbox
    if (lightboxOverlay.classList.contains('active')) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const currentId   = parseInt(lightboxImg.closest('.lightbox-box') ? lightboxTitle.getAttribute('data-id') : 0);
        const currentIdx  = filtered.findIndex(p => p.id === currentId);
        const nextIdx     = e.key === 'ArrowRight'
          ? (currentIdx + 1) % filtered.length
          : (currentIdx - 1 + filtered.length) % filtered.length;
        if (filtered[nextIdx]) openLightbox(filtered[nextIdx].id);
      }
    }
  });

  // Keyboard card access
  photoGrid.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      const card = e.target.closest('.photo-card');
      if (card) openLightbox(parseInt(card.dataset.id));
    }
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();