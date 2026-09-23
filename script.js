/* ============================================================
   JOSC GALLERY — SCRIPT.JS
   Professional Modern Gallery • Complete
   ============================================================ */
(()=>{
"use strict";

/* ── Config ── */
const CFG = window.JOSC_CONFIG || {};
const API = CFG.WORKER_URL || "";
const CLOUD = CFG.CLOUD_NAME || "";
const PER_PAGE = 24;

/* ── Helpers ── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
const save = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(_){} };
const load = (k,d) => { try { const v=localStorage.getItem(k); return v!==null?JSON.parse(v):d; } catch(_){ return d; } };

/* ── State ── */
const S = {
  photos: [],
  cursor: null,
  hasMore: true,
  loading: false,
  category: "all",
  sort: "newest",
  search: "",
  totalCount: 0,
  categories: [],
  lbIdx: 0,
  lbToken: 0,
  viewMode: "grid",
  dark: false,
};

/* ── Cloudinary URL builder ── */
function cldUrl(publicId, preset, format){
  const presets = {
    thumb:    "w_400,h_300,c_fill,q_auto:low,f_auto",
    preview:  "w_1200,h_900,c_limit,q_auto:good,f_auto",
    original: "fl_attachment",
  };
  const tr = presets[preset] || presets.thumb;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${tr}/${publicId}.${format||"jpg"}`;
}

/* ── Dark Mode ── */
function applyDark(on){
  S.dark = on;
  document.documentElement.setAttribute("data-theme", on ? "dark" : "light");
  const icon = $("darkIcon"), nmIcon = $("nmDarkIcon"), nmText = $("nmDarkText");
  if(icon){ icon.className = on ? "fa-solid fa-sun" : "fa-solid fa-moon"; }
  if(nmIcon){ nmIcon.className = on ? "fa-solid fa-sun" : "fa-solid fa-moon"; }
  if(nmText){ nmText.textContent = on ? "Mode Terang" : "Mode Gelap"; }
  save("josc_dark", on);
}

function toggleDark(){
  applyDark(!S.dark);
}

/* ── Loading Screen ── */
function setProgress(pct){
  const el = $("lsFill");
  if(el) el.style.width = pct + "%";
}

function setLoadText(txt){
  const el = $("lsText");
  if(el) el.textContent = txt;
}

function hideLoader(){
  const ls = $("loadingScreen");
  if(ls){
    ls.classList.add("hidden");
    setTimeout(()=>{ ls.style.display="none"; }, 600);
  }
}

/* ── Scroll Stuff ── */
function updateScrollStuff(){
  const scrolled = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  const pct = max > 0 ? (scrolled/max)*100 : 0;

  /* Progress bar */
  const sp = $("scrollProgress");
  if(sp) sp.style.width = pct + "%";

  /* BTT fill */
  const bttFill = $("bttFill");
  if(bttFill){
    const circ = 100;
    bttFill.style.strokeDashoffset = circ - (pct/100)*circ;
  }

  /* BTT visibility */
  const btt = $("backToTop");
  if(btt) btt.classList.toggle("visible", scrolled > 300);

  /* Nav reveal from filters while scrolling */
  const gallery = $("gallery");
  if(gallery){
    const rect = gallery.getBoundingClientRect();
    $$(".filter-btn").forEach(btn=>{
      btn.classList.toggle("sticky-visible", rect.top < 0);
    });
  }
}

/* ── Reveal on Scroll ── */
function initReveal(){
  const io = new IntersectionObserver(entries=>{
    entries.forEach((en,i)=>{
      if(en.isIntersecting){
        setTimeout(()=>en.target.classList.add("visible"), i*80);
        io.unobserve(en.target);
      }
    });
  },{ threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  $$(".reveal").forEach(el => io.observe(el));
}

/* ── Counter Animate ── */
function animCounter(el, target){
  if(!el) return;
  const dur = 1200;
  const start = performance.now();
  const tick = now=>{
    const p = Math.min((now-start)/dur, 1);
    const ease = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(ease * target);
    if(p < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  };
  requestAnimationFrame(tick);
}

/* ── Typewriter ── */
function initTypewriter(text){
  const el = $("typewriterText");
  if(!el || !text) return;
  let i = 0;
  el.textContent = "";
  const type = ()=>{
    if(i < text.length){
      el.textContent += text[i++];
      setTimeout(type, 50 + Math.random()*30);
    }
  };
  setTimeout(type, 800);
}

/* ── Falling Petals ── */
function spawnPetals(){
  const container = $("petalsContainer");
  if(!container) return;
  if(window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;

  const emojis = ["🌸","🌺","🌼","💮","🏵️"];
  const count = window.innerWidth < 768 ? 8 : 16;

  for(let i = 0; i < count; i++){
    setTimeout(()=>{
      const p = document.createElement("div");
      p.className = "petal";
      p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
      const size = 10 + Math.random()*14;
      Object.assign(p.style,{
        left: Math.random()*100 + "%",
        fontSize: size + "px",
        animationDuration: (8 + Math.random()*12) + "s",
        animationDelay: (Math.random()*8) + "s",
        opacity: 0,
      });
      container.appendChild(p);
    }, i * 300);
  }
}

/* ── Custom Cursor ── */
function initCursor(){
  if(window.matchMedia("(hover:none)").matches) return;
  const dot = $("cursorDot"), ring = $("cursorRing");
  if(!dot || !ring) return;
  let mx=0, my=0, rx=0, ry=0;
  document.addEventListener("mousemove", e=>{
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx+"px"; dot.style.top = my+"px";
  });
  function anim(){
    rx += (mx-rx)*.12;
    ry += (my-ry)*.12;
    ring.style.left = rx+"px";
    ring.style.top = ry+"px";
    requestAnimationFrame(anim);
  }
  anim();
  document.querySelectorAll("a,button,.photo-card,.filter-btn,.social-btn").forEach(el=>{
    el.addEventListener("mouseenter",()=>ring.classList.add("hovered"));
    el.addEventListener("mouseleave",()=>ring.classList.remove("hovered"));
  });
}

/* ── Hero Particles ── */
function spawnHeroParticles(){
  const c = $("heroParticles");
  if(!c) return;
  if(window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  for(let i=0; i<12; i++){
    const d = document.createElement("div");
    d.className = "hp-dot";
    const sz = 3 + Math.random()*6;
    Object.assign(d.style,{
      width: sz+"px", height: sz+"px",
      left: Math.random()*100+"%",
      top: (20+Math.random()*60)+"%",
      background: `hsl(${330+Math.random()*30},80%,70%)`,
      animationDuration: (4+Math.random()*6)+"s",
      animationDelay: (Math.random()*5)+"s",
    });
    c.appendChild(d);
  }
}

/* ── Social Links ── */
function applySocials(p){
  const map = {
    socIg:"instagram", socTt:"tiktok", socTw:"twitter",
    socFb:"facebook", socYt:"youtube",
    footSocIg:"instagram", footSocTt:"tiktok", footSocTw:"twitter",
    footSocFb:"facebook", footSocYt:"youtube",
  };
  Object.entries(map).forEach(([id, key])=>{
    const el=$(id);
    if(!el) return;
    const url = p[key]||"";
    el.href = url || "#";
    el.style.display = url ? "" : "none";
  });
}

/* ── Profile ── */
function loadProfile(){
  const PRF = CFG.PROFILE || {};
  const name = PRF.name || "JOSC Gallery";
  const heroName = $("heroName");
  if(heroName) heroName.textContent = name;
  document.title = name + " 🌸";
  const heroDesc = $("heroDesc");
  if(heroDesc && PRF.bio) heroDesc.textContent = PRF.bio;
  if(PRF.avatar) $("avatarImg").src = PRF.avatar;
  applySocials(PRF);
  initTypewriter(PRF.tagline || "Mengabadikan setiap momen indah dalam satu tempat");
}

/* ── Spinner ── */
const showSpin = ()=>{ $("spinnerWrap").style.display="flex"; };
const hideSpin = ()=>{ $("spinnerWrap").style.display="none"; };

/* ── isNew (< 7 days) ── */
function isNewPhoto(createdAt){
  if(!createdAt) return false;
  return (Date.now()-new Date(createdAt).getTime()) < 7*24*60*60*1000;
}

/* ── Build Filters ── */
function buildFilters(cats, photoCounts={}){
  S.categories = cats;
  const tc = $("totalCat");
  if(tc) tc.textContent = cats.length;
  const all = ["all",...cats];
  const container = $("categoryFilters");
  if(!container) return;

  container.innerHTML = all.map(cat=>{
    const lbl = cat==="all" ? "Semua" : cap(cat);
    const ic  = cat==="all"
      ? '<i class="fa-solid fa-layer-group"></i>'
      : '<i class="fa-solid fa-tag"></i>';
    const cnt = cat==="all" ? S.totalCount : (photoCounts[cat]||"");
    return `<button class="filter-btn${cat===S.category?" active":""}" data-cat="${esc(cat)}">
      ${ic} ${esc(lbl)}
      ${cnt ? `<span class="filter-count">${cnt}</span>` : ""}
    </button>`;
  }).join("");
}

$("categoryFilters") && $("categoryFilters").addEventListener("click", e=>{
  const btn = e.target.closest("[data-cat]");
  if(!btn) return;
  S.category = btn.dataset.cat;
  $$(".filter-btn").forEach(b => b.classList.toggle("active", b===btn));
  resetAndLoad();
});

/* ── Info Bar ── */
function updateInfoBar(){
  const sc = $("shownCount"), tc = $("totalCount");
  if(sc) sc.textContent = S.photos.length;
  if(tc) tc.textContent = S.totalCount;
}

/* ── Error State ── */
function renderError(msg){
  const grid = $("galleryGrid");
  if(!grid) return;
  grid.innerHTML = `
  <div class="state-box">
    <i class="fa-solid fa-triangle-exclamation"></i>
    <p>Gagal memuat foto</p>
    <small>${esc(msg)}</small><br/>
    <button class="btn-retry" onclick="location.reload()">
      <i class="fa-solid fa-rotate"></i> Coba lagi
    </button>
  </div>`;
}

/* ── Empty State ── */
function renderEmpty(){
  const grid = $("galleryGrid");
  if(!grid) return;
  grid.innerHTML = `
  <div class="state-box">
    <i class="fa-solid fa-images"></i>
    <p>Belum ada foto</p>
    <small>Foto yang diupload akan muncul di sini.</small>
  </div>`;
}

/* ── Render Card ── */
function createCard(photo, idx){
  const card = document.createElement("div");
  card.className = "photo-card";
  card.setAttribute("role","listitem");
  card.dataset.idx = idx;

  const thumbUrl = cldUrl(photo.publicId, "thumb", photo.format);
  const isNew    = isNewPhoto(photo.createdAt);

  card.innerHTML = `
    <div class="pc-thumb">
      ${isNew ? '<span class="pc-new-badge">✨ Baru</span>' : ""}
      <img src="${esc(thumbUrl)}"
           alt="${esc(photo.title)}"
           loading="lazy"
           decoding="async"
           onerror="this.src='https://via.placeholder.com/400x300/fce7f3/ec4899?text=🌸'"/>
      <div class="pc-overlay">
        <div class="pc-overlay-btns">
          <button class="pc-ov-btn" data-action="share" data-idx="${idx}" title="Bagikan">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          <a class="pc-ov-btn" href="${esc(cldUrl(photo.publicId,'original',photo.format))}"
             download="${esc(photo.title||'photo')}" title="Unduh"
             onclick="event.stopPropagation()">
            <i class="fa-solid fa-download"></i>
          </a>
        </div>
      </div>
    </div>
    <div class="pc-info">
      <div class="pc-title">${esc(photo.title||"Tanpa Judul")}</div>
      <div class="pc-meta">
        <span class="pc-cat"><i class="fa-solid fa-tag"></i> ${esc(cap(photo.category||"lainnya"))}</span>
        ${photo.sizeMB ? `<span class="pc-size">${photo.sizeMB} MB</span>` : ""}
      </div>
    </div>`;

  /* Click to open lightbox */
  card.addEventListener("click", e=>{
    if(e.target.closest("[data-action='share']")){
      const i = +e.target.closest("[data-action='share']").dataset.idx;
      S.lbIdx = i;
      openShare();
      return;
    }
    if(e.target.closest("a")) return;
    openLightbox(idx);
  });

  return card;
}

/* ── Append Photos ── */
function appendPhotos(photos, startIdx){
  const grid = $("galleryGrid");
  if(!grid) return;
  photos.forEach((photo, i)=>{
    const card = createCard(photo, startIdx + i);
    card.style.animationDelay = (i * 0.05) + "s";
    grid.appendChild(card);
  });
}

/* ── Load Next Page ── */
async function loadNextPage(){
  if(S.loading || !S.hasMore) return;
  S.loading = true;
  showSpin();

  try{
    const params = new URLSearchParams({
      limit: PER_PAGE,
      sort: S.sort,
    });
    if(S.cursor)       params.set("cursor", S.cursor);
    if(S.category !== "all") params.set("category", S.category);
    if(S.search)       params.set("search", S.search);

    const res = await fetch(`${API}/api/photos?${params}`);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const photos = data.photos || [];
    S.totalCount = data.total ?? S.totalCount;
    S.cursor     = data.nextCursor || null;
    S.hasMore    = !!data.nextCursor;

    /* Update stat counter */
    const sp = $("statPhotos");
    if(sp && S.totalCount > 0) animCounter(sp, S.totalCount);

    /* Render */
    const startIdx = S.photos.length;
    S.photos.push(...photos);

    if(S.photos.length === 0){
      renderEmpty();
    } else {
      appendPhotos(photos, startIdx);
    }

    updateInfoBar();

    /* Load more button */
    const lmw = $("loadmoreWrap");
    if(lmw) lmw.style.display = S.hasMore ? "flex" : "none";

  }catch(e){
    if(S.photos.length === 0) renderError(e.message);
    else toast(e.message, "error");
  }finally{
    S.loading = false;
    hideSpin();
  }
}

/* ── Reset & Reload ── */
function resetAndLoad(){
  S.photos  = [];
  S.cursor  = null;
  S.hasMore = true;
  const grid = $("galleryGrid");
  if(grid) grid.innerHTML = "";
  updateInfoBar();
  loadNextPage();
}

/* ── Infinite Scroll ── */
function initInfiniteScroll(){
  const trigger = $("infiniteScrollTrigger");
  if(!trigger) return;
  new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting) loadNextPage();
  },{ rootMargin:"400px" }).observe(trigger);
}

/* ── Search ── */
function initSearch(){
  const input = $("searchInput");
  const clear = $("searchClear");
  if(!input) return;

  let timer;
  input.addEventListener("input", e=>{
    clearTimeout(timer);
    const val = e.target.value.trim();
    S.search = val;
    if(clear) clear.style.opacity = val ? "1" : "0";
    if(clear) clear.style.pointerEvents = val ? "auto" : "none";
    timer = setTimeout(resetAndLoad, 500);
  });

  clear?.addEventListener("click",()=>{
    input.value = "";
    S.search = "";
    clear.style.opacity = "0";
    clear.style.pointerEvents = "none";
    input.focus();
    resetAndLoad();
  });
}

/* ── Sort ── */
function initSort(){
  const sel = $("sortSelect");
  if(!sel) return;
  sel.addEventListener("change", e=>{
    S.sort = e.target.value;
    save("josc_sort", S.sort);
    resetAndLoad();
  });
}

/* ============================================================
   LIGHTBOX
============================================================ */
function openLightbox(idx){
  S.lbIdx = idx;
  updateLightbox();
  $("lightbox").classList.add("active");
  document.body.style.overflow = "hidden";
  $("closeLightbox")?.focus();
}

function closeLightbox(){
  $("lightbox").classList.remove("active");
  document.body.style.overflow = "";
  const img = $("lightboxImg");
  if(img){ img.src=""; img.style.opacity="0"; }
  S.lbToken++;
}

function updateLightbox(){
  const p = S.photos[S.lbIdx];
  if(!p) return;
  const tok = ++S.lbToken;

  const spinner = $("lightboxSpinner");
  const img     = $("lightboxImg");
  if(spinner) spinner.style.display = "flex";
  if(img){ img.style.opacity = "0"; }

  const tmp = new Image();
  tmp.src = cldUrl(p.publicId, "preview", p.format);
  tmp.onload = ()=>{
    if(tok !== S.lbToken) return;
    if(img){ img.src=tmp.src; img.style.opacity="1"; }
    if(spinner) spinner.style.display = "none";
  };
  tmp.onerror = ()=>{
    if(tok !== S.lbToken) return;
    if(img){ img.src=cldUrl(p.publicId,"thumb",p.format); img.style.opacity="1"; }
    if(spinner) spinner.style.display = "none";
  };

  if(img) img.alt = p.title || "Foto";

  const lbTitle = $("lbTitle");
  const lbMeta  = $("lbMeta");
  const lbCtr   = $("lbCounter");
  const lbDl    = $("lbDownload");

  if(lbTitle) lbTitle.textContent = p.title || "Tanpa Judul";
  if(lbMeta){
    const parts = [];
    if(p.category) parts.push(cap(p.category));
    if(p.width && p.height) parts.push(`${p.width}×${p.height}`);
    if(p.sizeMB) parts.push(`${p.sizeMB} MB`);
    lbMeta.textContent = parts.join(" · ");
  }
  if(lbCtr) lbCtr.textContent = `${S.lbIdx+1} / ${S.photos.length}`;
  if(lbDl){
    lbDl.href = cldUrl(p.publicId,"original",p.format);
    lbDl.download = p.title || "photo";
  }
}

const nextPhoto = ()=>{ S.lbIdx=(S.lbIdx+1)%S.photos.length; updateLightbox(); };
const prevPhoto = ()=>{ S.lbIdx=(S.lbIdx-1+S.photos.length)%S.photos.length; updateLightbox(); };

/* ── Swipe (Lightbox) ── */
function initLbSwipe(){
  const lb = $("lightbox");
  if(!lb) return;
  let sx=0, sy=0;
  lb.addEventListener("touchstart", e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{ passive:true });
  lb.addEventListener("touchend", e=>{
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>50){
      dx > 0 ? prevPhoto() : nextPhoto();
    } else if(dy > 80 && Math.abs(dx)<50){
      closeLightbox();
    }
  });
}

/* ── Lightbox Events ── */
function initLightboxEvents(){
  $("closeLightbox")?.addEventListener("click", closeLightbox);
  $("lightboxOverlay")?.addEventListener("click", closeLightbox);
  $("nextBtn")?.addEventListener("click", nextPhoto);
  $("prevBtn")?.addEventListener("click", prevPhoto);
  $("lbShare")?.addEventListener("click", openShare);
  initLbSwipe();
}

/* ============================================================
   SHARE MODAL
============================================================ */
function openShare(){
  const p = S.photos[S.lbIdx];
  if(!p) return;

  const previewUrl = cldUrl(p.publicId, "preview", p.format);
  const dlUrl      = cldUrl(p.publicId, "original", p.format);
  const title      = p.title || "Foto dari JOSC Gallery 🌸";
  const text       = `${title} — JOSC Gallery 🌸`;
  const pageUrl    = window.location.href;

  /* Native Share API */
  if(navigator.share){
    navigator.share({ title, text, url: pageUrl }).catch(()=>{});
    return;
  }

  /* Fallback modal */
  const sp = $("sharePreview"), st=$("shareTitle"), sl=$("shareLink");
  if(sp) sp.src = previewUrl;
  if(st) st.textContent = title;
  if(sl) sl.value = dlUrl;

  const enc = encodeURIComponent;
  const wa=$("shareWa"), tw=$("shareTw"), fb=$("shareFb"), ig=$("shareIg");
  if(wa) wa.href = `https://wa.me/?text=${enc(text+"\n"+dlUrl)}`;
  if(tw) tw.href = `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(dlUrl)}`;
  if(fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${enc(dlUrl)}`;
  if(ig){
    ig.href = "#";
    ig.onclick = e=>{
      e.preventDefault();
      navigator.clipboard?.writeText(dlUrl);
      toast("Link disalin! Paste di Instagram.", "info");
    };
  }

  $("shareModal").classList.add("active");
}

function closeShare(){
  $("shareModal")?.classList.remove("active");
}

function initShareEvents(){
  $("shareClose")?.addEventListener("click", closeShare);
  $("shareOverlay")?.addEventListener("click", closeShare);
  $("shareCopy")?.addEventListener("click",()=>{
    const sl = $("shareLink");
    if(!sl) return;
    navigator.clipboard?.writeText(sl.value)
      .then(()=> toast("Link disalin!", "success"))
      .catch(()=>{ sl.select(); document.execCommand("copy"); toast("Link disalin!","success"); });
  });
}

/* ============================================================
   KEYBOARD SHORTCUTS PANEL
============================================================ */
function openKbPanel(){
  $("kbPanel")?.classList.add("active");
}

function closeKbPanel(){
  $("kbPanel")?.classList.remove("active");
}

function initKeyboard(){
  window.addEventListener("keydown", e=>{
    const tag     = document.activeElement?.tagName;
    const typing  = ["INPUT","TEXTAREA","SELECT"].includes(tag);
    const lbActive = $("lightbox")?.classList.contains("active");
    const kbActive = $("kbPanel")?.classList.contains("active");
    const smActive = $("shareModal")?.classList.contains("active");

    if(lbActive){
      if(e.key==="Escape")   { closeLightbox(); return; }
      if(e.key==="ArrowRight"){ nextPhoto(); return; }
      if(e.key==="ArrowLeft") { prevPhoto(); return; }
      return;
    }

    if(kbActive || smActive){
      if(e.key==="Escape"){ closeKbPanel(); closeShare(); }
      return;
    }

    if(typing) return;

    if(e.key==="?" || e.key==="/")   { e.preventDefault(); openKbPanel(); }
    if(e.key.toLowerCase()==="d")    { toggleDark(); }
    if(e.key.toLowerCase()==="f")    { e.preventDefault(); $("searchInput")?.focus(); }
    if(e.key.toLowerCase()==="g")    { setViewMode("grid"); }
    if(e.key.toLowerCase()==="l")    { setViewMode("list"); }
    if(e.key==="ArrowUp" && e.altKey){ e.preventDefault(); window.scrollTo({top:0,behavior:"smooth"}); }
  });

  $("kbHintBtn")?.addEventListener("click", openKbPanel);
  $("kbClose")?.addEventListener("click", closeKbPanel);
  $("kbOverlay")?.addEventListener("click", closeKbPanel);
}

/* ============================================================
   VIEW MODE
============================================================ */
function setViewMode(mode){
  S.viewMode = mode;
  const grid = $("galleryGrid");
  if(grid) grid.classList.toggle("list-view", mode==="list");
  $("viewGrid")?.classList.toggle("active", mode==="grid");
  $("viewList")?.classList.toggle("active", mode==="list");
  save("josc_view", mode);
}

function initViewToggle(){
  $("viewGrid")?.addEventListener("click",()=> setViewMode("grid"));
  $("viewList")?.addEventListener("click",()=> setViewMode("list"));
}

/* ============================================================
   TOAST
============================================================ */
function toast(msg, type="info", dur=3000){
  const container = $("toastContainer");
  if(!container) return;

  const icons = { success:"fa-circle-check", error:"fa-circle-xmark", info:"fa-circle-info", warning:"fa-triangle-exclamation" };

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.info}"></i><span>${esc(msg)}</span>`;
  container.appendChild(el);

  const remove = ()=>{
    el.classList.add("toast-out");
    el.addEventListener("animationend",()=> el.remove(),{once:true});
    setTimeout(()=> el.remove(), 500);
  };

  el.addEventListener("click", remove);
  setTimeout(remove, dur);
}

/* ============================================================
   NAVBAR
============================================================ */
function initNavbar(){
  const hamburger = $("navHamburger");
  const mobile    = $("navMobile");

  hamburger?.addEventListener("click",()=>{
    const open = mobile?.classList.toggle("open");
    hamburger.classList.toggle("active", !!open);
  });

  /* Close on link click */
  mobile?.querySelectorAll("a").forEach(a=>{
    a.addEventListener("click",()=>{
      mobile.classList.remove("open");
      hamburger?.classList.remove("active");
    });
  });

  /* Active link highlight */
  const links = $$(".nav-link");
  window.addEventListener("scroll",()=>{
    const sections = ["profile","about","gallery"];
    let current = "";
    sections.forEach(id=>{
      const el = $(id);
      if(!el) return;
      if(scrollY >= el.offsetTop - 100) current = id;
    });
    links.forEach(link=>{
      const href = link.getAttribute("href");
      link.classList.toggle("active", href === "#"+current);
    });
  },{ passive:true });
}

/* ============================================================
   FOOTER YEAR
============================================================ */
function setFooterYear(){
  const el = $("footerYear");
  if(el) el.textContent = new Date().getFullYear();
}

/* ============================================================
   DARK TOGGLE EVENTS
============================================================ */
function initDarkToggle(){
  $("darkToggle")?.addEventListener("click", toggleDark);
  $("nmDarkToggle")?.addEventListener("click",()=>{
    toggleDark();
    $("navMobile")?.classList.remove("open");
    $("navHamburger")?.classList.remove("active");
  });
}

/* ============================================================
   LOAD MORE BUTTON
============================================================ */
function initLoadMore(){
  $("loadmoreBtn")?.addEventListener("click", loadNextPage);
}

/* ============================================================
   INIT
============================================================ */
async function init(){
  setProgress(10);
  setLoadText("Mempersiapkan galeri...");

  /* Preferences */
  const savedDark = load("josc_dark", false);
  applyDark(savedDark);

  const savedView = load("josc_view","grid");
  setViewMode(savedView);

  const savedSort = load("josc_sort","newest");
  S.sort = savedSort;
  const ss = $("sortSelect");
  if(ss) ss.value = savedSort;

  /* Announce bar */
  const ab  = $("announceBar");
  const abc = $("abClose");
  if(load("josc_announce_closed", false) && ab) ab.classList.add("hidden");
  abc?.addEventListener("click",()=>{
    ab?.classList.add("hidden");
    save("josc_announce_closed", true);
  });

  /* Profile */
  loadProfile();
  setProgress(25);

  /* UI */
  initNavbar();
  initDarkToggle();
  initReveal();
  initCursor();
  spawnPetals();
  spawnHeroParticles();
  setFooterYear();

  /* Scroll */
  window.addEventListener("scroll",()=>{
    $("navbar")?.classList.toggle("scrolled", scrollY > 40);
    updateScrollStuff();
  },{ passive:true });

  /* Back to top */
  $("backToTop")?.addEventListener("click",()=> window.scrollTo({top:0,behavior:"smooth"}));

  /* Gallery controls */
  initSearch();
  initSort();
  initLightboxEvents();
  initShareEvents();
  initKeyboard();
  initViewToggle();
  initLoadMore();
  initInfiniteScroll();

  /* Fetch config from worker */
  try{
    setLoadText("Menghubungkan ke server...");
    const res = await fetch(`${API}/api/config`);
    const cfg = await res.json();
    if(!res.ok) throw new Error(cfg.error || `HTTP ${res.status}`);
    setProgress(80);
    setLoadText("Memuat koleksi foto...");

    /* Apply profile from KV */
    if(cfg.profile && Object.keys(cfg.profile).length){
      const kp = cfg.profile;
      if(kp.name){
        const hn = $("heroName");
        if(hn) hn.textContent = kp.name;
        document.title = `${kp.name} 🌸`;
      }
      if(kp.tagline){
        const el = $("typewriterText");
        if(el){ el.textContent=""; initTypewriter(kp.tagline); }
      }
      if(kp.bio){ const hd=$("heroDesc"); if(hd) hd.textContent=kp.bio; }
      if(kp.avatar){ $("avatarImg").src = kp.avatar; }
      applySocials(kp);

      const ab2 = $("abText");
      if(ab2 && kp.name) ab2.textContent = `Selamat datang di ${kp.name}! Klik foto untuk melihat versi penuh 🌸`;
    }

    /* Filters */
    const cats  = cfg.categories || [];
    const counts = cfg.categoryCounts || {};
    buildFilters(cats, counts);

    /* Stats */
    const total = cfg.totalResources || 0;
    S.totalCount = total;
    const spEl  = $("statPhotos");
    const scEl  = $("statCats");
    const ccP   = $("ccPhotos");
    const ccC   = $("ccCats");
    if(spEl) animCounter(spEl, total);
    if(scEl) animCounter(scEl, cats.length);
    if(ccP)  animCounter(ccP, total);
    if(ccC)  animCounter(ccC, cats.length);

    setProgress(95);
    loadNextPage();
    setProgress(100);
    setTimeout(hideLoader, 600);

  }catch(e){
    setProgress(100);
    setTimeout(hideLoader, 500);
    hideSpin();
    renderError(e.message);
    toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
})();
