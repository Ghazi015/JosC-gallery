/* ============================================================
   JOSC GALLERY — ADMIN.JS
   Professional Admin Panel • Complete
   ============================================================ */
(()=>{
"use strict";

/* ── Config ── */
const CFG = window.JOSC_CONFIG || {};
const API = CFG.WORKER_URL || "";
const CLOUD = CFG.CLOUD_NAME || "";
const PER_PAGE = 24;

/* ── Helpers ── */
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

/* ── Auth ── */
let TOKEN = sessionStorage.getItem("josc_token") || "";
let curPage = "dashboard";

/* ── Manage State ── */
const mS = {
  photos:   [],
  cursor:   null,
  hasMore:  true,
  loading:  false,
  search:   "",
  category: "all",
  selected: new Set(),
};

/* ── All Categories cache ── */
let allCats = [];

/* ── Cloudinary URL ── */
function cldUrl(publicId, preset, format){
  const presets = {
    thumb:    "w_400,h_300,c_fill,q_auto:low,f_auto",
    preview:  "w_900,h_675,c_limit,q_auto:good,f_auto",
    original: "fl_attachment",
  };
  const tr = presets[preset] || presets.thumb;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${tr}/${publicId}.${format||"jpg"}`;
}

/* ── API fetch with auth ── */
async function api(path, opts={}){
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`,
      ...(opts.headers||{}),
    },
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ── Toast ── */
function toast(msg, type="info", dur=3500){
  const container = $("adminToast");
  if(!container) return;
  const icons = {
    success: "fa-circle-check",
    error:   "fa-circle-xmark",
    info:    "fa-circle-info",
    warning: "fa-triangle-exclamation",
  };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i><span>${esc(msg)}</span>`;
  container.appendChild(el);
  const remove = ()=>{
    el.classList.add("toast-out");
    setTimeout(()=> el.remove(), 400);
  };
  el.addEventListener("click", remove);
  setTimeout(remove, dur);
}

/* ── Show / Hide App ── */
function showApp(){
  $("loginScreen").style.display  = "none";
  $("adminApp").style.display     = "flex";
  goTo("dashboard");
}

function logout(){
  TOKEN = "";
  sessionStorage.removeItem("josc_token");
  $("adminApp").style.display    = "none";
  $("loginScreen").style.display = "flex";
  $("loginUser").value = "";
  $("loginPass").value = "";
  $("loginError").textContent = "";
}

/* ── Page Navigation ── */
function goTo(page){
  if(!page) return;
  curPage = page;

  /* Sections */
  $$(".page-section").forEach(s=> s.classList.remove("active"));
  const section = $("page" + page.charAt(0).toUpperCase() + page.slice(1));
  if(section) section.classList.add("active");

  /* Sidebar items */
  $$(".sb-item").forEach(b=> b.classList.toggle("active", b.dataset.page===page));

  /* Topbar title */
  const titles = {
    dashboard: "Dashboard",
    upload:    "Upload Foto",
    manage:    "Kelola Foto",
    profile:   "Edit Profil",
  };
  const tt = $("topbarTitle");
  if(tt) tt.textContent = titles[page] || cap(page);

  /* Close sidebar on mobile */
  $("sidebar")?.classList.remove("open");
  document.querySelector(".sidebar-overlay")?.classList.remove("active");

  /* Load page data */
  if(page === "dashboard") loadDashboard();
  if(page === "manage"){
    mS.photos   = [];
    mS.cursor   = null;
    mS.hasMore  = true;
    mS.selected = new Set();
    $("adminGrid").innerHTML = "";
    loadManage();
  }
  if(page === "profile") loadProfile();
}

/* ============================================================
   LOGIN
============================================================ */
async function doLogin(user, pass){
  const btn = $("loginBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Masuk...';
  $("loginError").textContent = "";

  try{
    const res = await fetch(`${API}/api/admin/login`,{
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ username:user, password:pass }),
    });
    const data = await res.json();
    if(!res.ok || !data.ok) throw new Error(data.error || "Login gagal");

    TOKEN = data.token;
    sessionStorage.setItem("josc_token", TOKEN);
    $("topbarUser").textContent = user;
    showApp();

  }catch(e){
    $("loginError").textContent = e.message;
    $("loginPass").value = "";
    $("loginPass").focus();
  }finally{
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk';
  }
}

/* ============================================================
   FETCH CATEGORIES
============================================================ */
async function fetchCats(){
  try{
    const res = await fetch(`${API}/api/config`);
    const cfg = await res.json();
    allCats = cfg.categories || [];
    buildCatDatalist("categoryList");
    buildCatDatalist("editCatList");
    buildCatFilter(allCats);
  }catch(_){}
}

function buildCatDatalist(id){
  const dl = $(id);
  if(!dl) return;
  dl.innerHTML = allCats.map(c=>`<option value="${esc(c)}">`).join("");
}

function buildCatFilter(cats){
  const sel = $("manageCatFilter");
  if(!sel) return;
  sel.innerHTML = `<option value="all">Semua Kategori</option>` +
    cats.map(c=>`<option value="${esc(c)}">${esc(cap(c))}</option>`).join("");
}

/* ============================================================
   DASHBOARD
============================================================ */
async function loadDashboard(){
  try{
    const cfg = await api("/api/config");
    const total = cfg.totalResources || 0;
    const cats  = cfg.categories || [];

    $("dashTotal").textContent = total;
    $("dashCats").textContent  = cats.length;
    $("dashSize").textContent  = cfg.totalSize || "—";
    $("dashLast").textContent  = cfg.lastUpload || "—";

    /* Recent grid */
    const rg = $("recentGrid");
    if(rg){
      if(!cfg.recentPhotos || !cfg.recentPhotos.length){
        rg.innerHTML = `<span class="dash-empty">📷 Belum ada foto.</span>`;
      } else {
        rg.innerHTML = cfg.recentPhotos.slice(0,8).map(p=>`
          <div class="recent-thumb" title="${esc(p.title||p.publicId)}">
            <img src="${esc(cldUrl(p.publicId,'thumb',p.format))}"
                 alt="${esc(p.title||'foto')}"
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/120/fce7f3/ec4899?text=🌸'"/>
          </div>`).join("");
      }
    }
  }catch(e){
    toast("Gagal memuat dashboard: "+e.message, "error");
  }
}

/* ============================================================
   UPLOAD
============================================================ */
let selFiles = [];

function renderPreviews(){
  const form = $("uploadForm");
  const prev = $("filePreviews");
  const cnt  = $("ufCount");
  if(!prev || !form) return;

  if(selFiles.length === 0){
    form.style.display = "none";
    return;
  }

  form.style.display = "block";
  if(cnt) cnt.textContent = selFiles.length;

  prev.innerHTML = selFiles.map((f,i)=>{
    const url = URL.createObjectURL(f);
    const name = f.name.replace(/\.[^.]+$/,"");
    return `
    <div class="file-preview-card" id="fpCard${i}">
      <div class="fp-thumb">
        <img src="${url}" alt="${esc(f.name)}" loading="lazy"
             onload="URL.revokeObjectURL(this.src)"/>
      </div>
      <div class="fp-body">
        <div class="fp-name">${esc(f.name)}</div>
        <input type="text" class="fp-input fp-title-input"
               value="${esc(name)}"
               placeholder="Judul foto"
               id="fpTitle${i}"/>
        <button class="fp-remove" data-remove="${i}">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
        <div class="fp-status" id="fpStatus${i}"></div>
      </div>
    </div>`;
  }).join("");

  /* Remove single file */
  prev.querySelectorAll("[data-remove]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx = +btn.dataset.remove;
      selFiles.splice(idx,1);
      renderPreviews();
    });
  });
}

function addFiles(list){
  const valid = Array.from(list).filter(f=>{
    if(!f.type.startsWith("image/")){
      toast(`${f.name} bukan gambar`, "error");
      return false;
    }
    if(f.size > 20*1024*1024){
      toast(`${f.name} lebih dari 20 MB`, "error");
      return false;
    }
    return true;
  });
  selFiles = [...selFiles, ...valid];
  renderPreviews();
}

async function uploadAll(){
  if(!selFiles.length) return;

  const cat  = ($("ufCategory")?.value || "lainnya").trim().toLowerCase();
  const tags = ($("ufTags")?.value || "").split(",").map(t=>t.trim()).filter(Boolean);
  const ttls = Array.from($$(".fp-title-input")).map(i=>i.value.trim());

  $("uploadForm").style.display         = "none";
  $("uploadProgressWrap").style.display = "block";
  $("upTotal").textContent  = selFiles.length;
  $("upDone").textContent   = 0;

  const ul = $("upList");
  if(ul){
    ul.innerHTML = selFiles.map((f,i)=>`
    <div class="up-item" id="upItem${i}">
      <span class="up-item-icon">🌸</span>
      <span class="up-item-name">${esc(ttls[i]||f.name)}</span>
      <span class="up-item-status pending" id="upSt${i}">Menunggu...</span>
    </div>`).join("");
  }

  const pb = $("progressBar");
  let done = 0;

  for(let i=0; i<selFiles.length; i++){
    const file  = selFiles[i];
    const title = ttls[i] || file.name.replace(/\.[^.]+$/,"");
    const st    = $(`upSt${i}`);

    if(st){ st.textContent="Uploading..."; st.className="up-item-status uploading"; }

    try{
      /* 1. Get signed upload params */
      const sigData = await api("/api/admin/sign-upload",{
        method: "POST",
        body: JSON.stringify({ category:cat, tags, title }),
      });

      /* 2. Upload to Cloudinary */
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key",   sigData.apiKey);
      fd.append("timestamp", sigData.timestamp);
      fd.append("signature", sigData.signature);
      fd.append("folder",    sigData.folder || "josc-gallery");
      if(sigData.publicId) fd.append("public_id", sigData.publicId);
      if(tags.length) fd.append("tags", tags.join(","));
      if(sigData.context) fd.append("context", sigData.context);

      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
          method: "POST",
          body: fd,
        }
      );
      const upData = await upRes.json();
      if(!upRes.ok) throw new Error(upData.error?.message || "Upload gagal");

      /* 3. Save metadata to KV */
      await api("/api/admin/save-photo",{
        method: "POST",
        body: JSON.stringify({
          publicId:  upData.public_id,
          title,
          category:  cat,
          tags,
          width:     upData.width,
          height:    upData.height,
          format:    upData.format,
          bytes:     upData.bytes,
          createdAt: upData.created_at,
        }),
      });

      done++;
      if(st){ st.textContent="✓ Selesai"; st.className="up-item-status done"; }

    }catch(e){
      if(st){ st.textContent=`✗ ${e.message}`; st.className="up-item-status error"; }
    }

    if(pb) pb.style.width = Math.round((i+1)/selFiles.length*100)+"%";
    $("upDone").textContent = done;
  }

  toast(`${done} dari ${selFiles.length} foto berhasil diupload!`,
        done===selFiles.length ? "success" : "warning");

  /* Reset after 2s */
  setTimeout(()=>{
    selFiles = [];
    renderPreviews();
    $("uploadProgressWrap").style.display = "none";
    if(pb) pb.style.width = "0%";
    if($("upList")) $("upList").innerHTML = "";
    $("ufCategory") && ($("ufCategory").value="");
    $("ufTags")     && ($("ufTags").value="");
    fetchCats();
  }, 2000);
}

/* ============================================================
   MANAGE
============================================================ */
async function loadManage(){
  if(mS.loading || !mS.hasMore) return;
  mS.loading = true;

  const spinner = $("manageSpinner");
  if(spinner) spinner.style.display = "block";

  try{
    const params = new URLSearchParams({ limit: PER_PAGE });
    if(mS.cursor)           params.set("cursor",   mS.cursor);
    if(mS.category !== "all") params.set("category", mS.category);
    if(mS.search)           params.set("search",   mS.search);

    const data = await api(`/api/photos?${params}`);
    const photos = data.photos || [];

    mS.cursor  = data.nextCursor || null;
    mS.hasMore = !!data.nextCursor;

    const total   = data.total ?? (mS.photos.length + photos.length);
    const startIdx = mS.photos.length;
    mS.photos.push(...photos);

    /* Info bar */
    const ms = $("manageShown"), mt = $("manageTotal");
    if(ms) ms.textContent = mS.photos.length;
    if(mt) mt.textContent = total;

    /* Render cards */
    const grid = $("adminGrid");
    if(grid){
      if(mS.photos.length === 0){
        grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📷</div>
          <h4>Belum ada foto</h4>
          <p>Upload foto pertama kamu!</p>
        </div>`;
      } else {
        photos.forEach((p, i)=>{
          const card = createAdminCard(p, startIdx + i);
          grid.appendChild(card);
        });
      }
    }

    /* Load more */
    const lm = $("manageLoadmore");
    if(lm) lm.style.display = mS.hasMore ? "flex" : "none";

  }catch(e){
    toast("Gagal memuat foto: "+e.message, "error");
  }finally{
    mS.loading = false;
    if(spinner) spinner.style.display = "none";
  }
}

function createAdminCard(photo, idx){
  const card = document.createElement("div");
  card.className = "admin-card";
  card.dataset.pid = photo.publicId;
  card.dataset.idx = idx;

  const thumbUrl = cldUrl(photo.publicId, "thumb", photo.format);
  const selected = mS.selected.has(photo.publicId);
  if(selected) card.classList.add("selected");

  card.innerHTML = `
    <div class="ac-select${selected?" checked":""}" data-sel>
      <i class="fa-solid fa-check" style="display:${selected?"block":"none"};color:#fff;font-size:12px"></i>
    </div>
    <div class="ac-thumb">
      <img src="${esc(thumbUrl)}"
           alt="${esc(photo.title||photo.publicId)}"
           loading="lazy"
           onerror="this.src='https://via.placeholder.com/200x150/fce7f3/ec4899?text=🌸'"/>
    </div>
    <div class="ac-body">
      <div class="ac-title">${esc(photo.title||"Tanpa Judul")}</div>
      <div class="ac-cat">${esc(cap(photo.category||"—"))} · ${photo.width||"?"}×${photo.height||"?"}</div>
      <div class="ac-actions">
        <button class="ac-btn ac-btn-edit" data-edit="${idx}">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="ac-btn ac-btn-del" data-del="${idx}">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </div>
    </div>`;

  /* Select toggle */
  card.querySelector("[data-sel]").addEventListener("click", e=>{
    e.stopPropagation();
    if(mS.selected.has(photo.publicId)) mS.selected.delete(photo.publicId);
    else mS.selected.add(photo.publicId);
    updateSel();
  });

  /* Edit */
  card.querySelector(`[data-edit="${idx}"]`).addEventListener("click", e=>{
    e.stopPropagation();
    openEdit(photo, idx);
  });

  /* Delete */
  card.querySelector(`[data-del="${idx}"]`).addEventListener("click", e=>{
    e.stopPropagation();
    openDel([photo.publicId]);
  });

  return card;
}

function updateSel(){
  const sel = mS.selected;
  $$(".admin-card").forEach(card=>{
    const pid = card.dataset.pid;
    const on  = sel.has(pid);
    card.classList.toggle("selected", on);
    const sb = card.querySelector(".ac-select");
    const ic = sb?.querySelector("i");
    if(sb){ sb.classList.toggle("checked", on); }
    if(ic){ ic.style.display = on ? "block" : "none"; }
  });
  const n = sel.size;
  const sc = $("selectedCount");
  const bd = $("btnDeleteSelected");
  if(sc) sc.textContent = n;
  if(bd) bd.style.display = n > 0 ? "inline-flex" : "none";
}

/* ── Edit Modal ── */
let editTarget = null;

function openEdit(photo, idx){
  editTarget = { photo, idx };
  $("editPreview").src       = cldUrl(photo.publicId,"preview",photo.format);
  $("editTitle").value       = photo.title    || "";
  $("editCategory").value    = photo.category || "";
  buildCatDatalist("editCatList");
  $("editModal").style.display = "flex";
}

function closeEdit(){
  $("editModal").style.display = "none";
  editTarget = null;
}

async function saveEdit(){
  if(!editTarget) return;
  const title    = $("editTitle").value.trim();
  const category = $("editCategory").value.trim().toLowerCase();
  const btn      = $("editModalSave");
  btn.disabled   = true;
  btn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i> Simpan...';

  try{
    await api("/api/admin/update-photo",{
      method: "POST",
      body: JSON.stringify({
        publicId: editTarget.photo.publicId,
        title,
        category,
      }),
    });

    /* Update local state */
    mS.photos[editTarget.idx].title    = title;
    mS.photos[editTarget.idx].category = category;

    /* Update card DOM */
    const card = $("adminGrid").querySelector(`[data-idx="${editTarget.idx}"]`);
    if(card){
      const t = card.querySelector(".ac-title");
      const c = card.querySelector(".ac-cat");
      if(t) t.textContent = title || "Tanpa Judul";
      if(c) c.textContent = `${cap(category)} · ${editTarget.photo.width||"?"}×${editTarget.photo.height||"?"}`;
    }

    toast("Foto berhasil diperbarui!", "success");
    closeEdit();
    fetchCats();

  }catch(e){
    toast(e.message, "error");
  }finally{
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan';
  }
}

/* ── Delete Modal ── */
let delTargets = [];

function openDel(publicIds){
  delTargets = publicIds;
  const txt = $("deleteModalText");
  if(txt){
    txt.textContent = publicIds.length > 1
      ? `Hapus ${publicIds.length} foto? Tindakan ini tidak bisa dibatalkan.`
      : "Hapus foto ini? Tindakan ini tidak bisa dibatalkan.";
  }
  $("deleteModal").style.display = "flex";
}

function closeDel(){
  $("deleteModal").style.display = "none";
  delTargets = [];
}

async function confirmDel(){
  if(!delTargets.length) return;
  const btn = $("deleteModalConfirm");
  btn.disabled  = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Hapus...';

  try{
    await api("/api/admin/delete-photos",{
      method: "POST",
      body: JSON.stringify({ publicIds: delTargets }),
    });

    /* Remove from DOM & state */
    delTargets.forEach(pid=>{
      const card = $("adminGrid").querySelector(`[data-pid="${CSS.escape(pid)}"]`);
      if(card){
        card.style.transition = "all 0.3s";
        card.style.opacity    = "0";
        card.style.transform  = "scale(0.85)";
        setTimeout(()=> card.remove(), 300);
      }
      mS.photos   = mS.photos.filter(p=> p.publicId !== pid);
      mS.selected.delete(pid);
    });

    const ms = $("manageShown");
    if(ms) ms.textContent = mS.photos.length;

    updateSel();
    toast(`${delTargets.length} foto dihapus!`, "success");
    closeDel();
    fetchCats();

  }catch(e){
    toast(e.message, "error");
  }finally{
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-trash"></i> Hapus';
  }
}

/* ============================================================
   PROFILE
============================================================ */
async function loadProfile(){
  try{
    const res = await fetch(`${API}/api/config`);
    const cfg = await res.json();
    const p   = cfg.profile || {};

    $("pfName")    && ($("pfName").value    = p.name      || CFG.PROFILE?.name    || "");
    $("pfTagline") && ($("pfTagline").value = p.tagline   || CFG.PROFILE?.tagline || "");
    $("pfBio")     && ($("pfBio").value     = p.bio       || CFG.PROFILE?.bio     || "");
    $("pfAvatar")  && ($("pfAvatar").value  = p.avatar    || CFG.PROFILE?.avatar  || "");
    $("pfIg")      && ($("pfIg").value      = p.instagram || CFG.PROFILE?.instagram || "");
    $("pfTt")      && ($("pfTt").value      = p.tiktok   || CFG.PROFILE?.tiktok   || "");
    $("pfTw")      && ($("pfTw").value      = p.twitter  || CFG.PROFILE?.twitter  || "");
    $("pfFb")      && ($("pfFb").value      = p.facebook || CFG.PROFILE?.facebook || "");
    $("pfYt")      && ($("pfYt").value      = p.youtube  || CFG.PROFILE?.youtube  || "");

  }catch(e){
    toast("Gagal memuat profil: "+e.message, "error");
  }
}

async function saveProfile(){
  const btn = $("btnSaveProfile");
  btn.disabled  = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  const newPass  = $("pfNewPass")?.value.trim()  || "";
  const confPass = $("pfConfPass")?.value.trim() || "";

  if(newPass && newPass !== confPass){
    toast("Password tidak cocok!", "error");
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Semua Perubahan';
    return;
  }

  try{
    const payload = {
      profile: {
        name:      $("pfName")?.value.trim()    || "",
        tagline:   $("pfTagline")?.value.trim() || "",
        bio:       $("pfBio")?.value.trim()     || "",
        avatar:    $("pfAvatar")?.value.trim()  || "",
        instagram: $("pfIg")?.value.trim()      || "",
        tiktok:    $("pfTt")?.value.trim()      || "",
        twitter:   $("pfTw")?.value.trim()      || "",
        facebook:  $("pfFb")?.value.trim()      || "",
        youtube:   $("pfYt")?.value.trim()      || "",
      },
    };

    if(newPass) payload.newPassword = newPass;

    await api("/api/admin/save-profile",{
      method: "POST",
      body: JSON.stringify(payload),
    });

    toast("Profil berhasil disimpan! 🌸", "success");

    /* Clear password fields */
    if($("pfNewPass"))  $("pfNewPass").value  = "";
    if($("pfConfPass")) $("pfConfPass").value = "";

  }catch(e){
    toast(e.message, "error");
  }finally{
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Semua Perubahan';
  }
}

/* ============================================================
   SIDEBAR OVERLAY (mobile)
============================================================ */
function initSidebarOverlay(){
  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);
  overlay.addEventListener("click",()=>{
    $("sidebar")?.classList.remove("open");
    overlay.classList.remove("active");
  });

  $("topbarHamburger")?.addEventListener("click",()=>{
    $("sidebar")?.classList.toggle("open");
    overlay.classList.toggle("active",
      $("sidebar")?.classList.contains("open") ?? false);
  });

  $("sidebarClose")?.addEventListener("click",()=>{
    $("sidebar")?.classList.remove("open");
    overlay.classList.remove("active");
  });
}

/* ============================================================
   INIT
============================================================ */
function init(){

  /* ── Auto-login check ── */
  if(TOKEN){
    try{
      const payload = JSON.parse(atob(TOKEN.split(".")[1]));
      if(payload.exp && payload.exp * 1000 > Date.now()){
        $("topbarUser").textContent = payload.sub || "Admin";
        showApp();
      } else {
        TOKEN = "";
        sessionStorage.removeItem("josc_token");
      }
    }catch(_){
      TOKEN = "";
      sessionStorage.removeItem("josc_token");
    }
  }

  /* ── Login Form ── */
  $("loginForm")?.addEventListener("submit", e=>{
    e.preventDefault();
    const user = $("loginUser")?.value.trim();
    const pass = $("loginPass")?.value;
    if(!user || !pass){
      $("loginError").textContent = "Username dan password wajib diisi.";
      return;
    }
    doLogin(user, pass);
  });

  /* Password toggle */
  $("passToggle")?.addEventListener("click",()=>{
    const inp = $("loginPass");
    const ico = $("passToggle")?.querySelector("i");
    if(!inp) return;
    if(inp.type === "password"){
      inp.type = "text";
      if(ico) ico.className = "fa-solid fa-eye-slash";
    } else {
      inp.type = "password";
      if(ico) ico.className = "fa-solid fa-eye";
    }
  });

  /* ── Sidebar Navigation ── */
  $$(".sb-item").forEach(b=>{
    b.addEventListener("click",()=> goTo(b.dataset.page));
  });

  /* Quick actions */
  $$(".qa-btn").forEach(b=>{
    if(b.dataset.page) b.addEventListener("click",()=> goTo(b.dataset.page));
  });

  /* Dashboard "Lihat Semua" */
  $$(".ds-more").forEach(b=>{
    b.addEventListener("click",()=> goTo(b.dataset.page || "manage"));
  });

  /* Sidebar overlay (mobile) */
  initSidebarOverlay();

  /* Logout */
  $("logoutBtn")?.addEventListener("click", logout);

  /* ── Upload ── */
  const dz = $("dropzone");
  if(dz){
    dz.addEventListener("click",()=> $("fileInput")?.click());
    dz.addEventListener("keydown", e=>{ if(e.key==="Enter") $("fileInput")?.click(); });
    dz.addEventListener("dragover", e=>{ e.preventDefault(); dz.classList.add("drag-over"); });
    dz.addEventListener("dragleave",()=> dz.classList.remove("drag-over"));
    dz.addEventListener("drop", e=>{
      e.preventDefault();
      dz.classList.remove("drag-over");
      addFiles(e.dataTransfer.files);
    });
  }

  $("fileInput")?.addEventListener("change", e=> addFiles(e.target.files));

  $("ufClear")?.addEventListener("click",()=>{
    selFiles = [];
    renderPreviews();
  });

  $("btnUploadAll")?.addEventListener("click", uploadAll);

  /* ── Manage ── */
  let mst;
  $("manageSearch")?.addEventListener("input", e=>{
    clearTimeout(mst);
    mst = setTimeout(()=>{
      mS.search  = e.target.value.trim();
      mS.photos  = [];
      mS.cursor  = null;
      mS.hasMore = true;
      $("adminGrid").innerHTML = "";
      loadManage();
    }, 400);
  });

  $("manageCatFilter")?.addEventListener("change", e=>{
    mS.category = e.target.value;
    mS.photos   = [];
    mS.cursor   = null;
    mS.hasMore  = true;
    $("adminGrid").innerHTML = "";
    loadManage();
  });

  $("manageRefresh")?.addEventListener("click",()=>{
    mS.photos   = [];
    mS.cursor   = null;
    mS.hasMore  = true;
    mS.selected = new Set();
    $("adminGrid").innerHTML = "";
    loadManage();
  });

  $("btnSelectAll")?.addEventListener("click",()=>{
    if(mS.selected.size === mS.photos.length){
      mS.selected.clear();
    } else {
      mS.photos.forEach(p=> mS.selected.add(p.publicId));
    }
    updateSel();
  });

  $("btnDeleteSelected")?.addEventListener("click",()=>{
    if(mS.selected.size) openDel([...mS.selected]);
  });

  /* Infinite scroll (manage) */
  const trigger = $("manageTrigger");
  if(trigger){
    new IntersectionObserver(en=>{
      if(en[0].isIntersecting && curPage==="manage") loadManage();
    },{ rootMargin:"300px" }).observe(trigger);
  }

  $("manageLoadmoreBtn")?.addEventListener("click", loadManage);

  /* ── Modals ── */
  $("editModalClose")?.addEventListener("click",   closeEdit);
  $("editModalCancel")?.addEventListener("click",  closeEdit);
  $("editModalSave")?.addEventListener("click",    saveEdit);

  $("deleteModalClose")?.addEventListener("click",   closeDel);
  $("deleteModalCancel")?.addEventListener("click",  closeDel);
  $("deleteModalConfirm")?.addEventListener("click", confirmDel);

  /* Close modal on overlay click */
  $("editModal")?.addEventListener("click", e=>{
    if(e.target === $("editModal")) closeEdit();
  });
  $("deleteModal")?.addEventListener("click", e=>{
    if(e.target === $("deleteModal")) closeDel();
  });

  /* ── Profile ── */
  $("btnSaveProfile")?.addEventListener("click", saveProfile);

  /* ── Keyboard (admin) ── */
  window.addEventListener("keydown", e=>{
    if(e.key === "Escape"){
      if($("editModal")?.style.display   === "flex") closeEdit();
      if($("deleteModal")?.style.display === "flex") closeDel();
    }
  });

  /* ── Fetch Categories ── */
  fetchCats();

  /* ── Topbar "Lihat Web" ── */
  // Already href="index.html" in HTML
}

document.addEventListener("DOMContentLoaded", init);
})();
