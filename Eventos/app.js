const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel, root)];
const FALLBACK_IMAGE = "./placeholder.png";
const cityCoords = {
  Vigo: [42.2406, -8.7207],
  Madrid: [40.4168, -3.7038],
  Barcelona: [41.3851, 2.1734],
  Valencia: [39.4699, -0.3763],
  Sevilla: [37.3891, -5.9845],
  Bilbao: [43.2630, -2.9350],
};
const LS_KEYS = {
  session: "ec_session",
  city: "ec_city",
  saved: "ec_saved",
  reserved: "ec_reserved",
};

const state = {
  session: null,
  city: "",
  filters: { q: "", category: "", date: "" },
  saved: new Set(),
  reserved: new Set(),
};

const eventsDb = [
  { id:"e1", title:"Summer Music Festival", date:"2025-06-15", city:"Vigo", venue:"Castrelos Park Arena", category:"Music", featured:true,  upcoming:true,
    image: "./e1.png", desc:"A full-day festival with local and international artists across multiple stages.",
    extra:["Outdoor event","All ages","Food trucks available"] },
  { id:"e2", title:"Tech Conference 2025", date:"2025-02-22", city:"Madrid", venue:"Convention Center", category:"Technology", featured:true, upcoming:true,
    image: "./e2.png", desc:"Talks and workshops on software, AI, security, and product design.",
    extra:["Workshops included","Networking","Badge required"] },
  { id:"e3", title:"Food & Wine Expo", date:"2025-03-10", city:"Barcelona", venue:"Harbor Exhibition Hall", category:"Gastronomy", featured:true, upcoming:false,
    image: "./e3.png", desc:"Regional producers, tastings, and live cooking shows all weekend.",
    extra:["Tastings","Family-friendly","Indoor venue"] },
  { id:"e4", title:"Art Gallery Opening", date:"2025-01-17", city:"Vigo", venue:"Modern Art Museum", category:"Art", featured:false, upcoming:true,
    image: "./e4.png", desc:"New contemporary exhibit with guided tour and artist Q&A session.",
    extra:["Guided tour","Limited capacity","Wheelchair access"] },
  { id:"e5", title:"Theatre: Classic Play", date:"2025-02-05", city:"Valencia", venue:"Teatro Municipal", category:"Theatre", featured:false, upcoming:true,
    image: "./e5.png", desc:"A modern staging of a classic play with an award-winning cast.",
    extra:["Seated","Subtitles available","90 minutes"] },
  { id:"e6", title:"Jazz Night in the Park", date:"2025-12-05", city:"Vigo", venue:"Parque Central - Main Stage", category:"Music", featured:false, upcoming:false,
    image: "./e6.png", desc:"A magical evening under the stars with a live jazz ensemble.",
    extra:["Free entry","Bring a blanket","Refreshments nearby"] },
  { id:"e7", title:"Book Fair Annual", date:"2025-05-18", city:"Sevilla", venue:"Centro de Convenciones", category:"Literature", featured:false, upcoming:true,
    image: "./e7.png", desc:"Stands from publishers and authors, readings, and book signings.",
    extra:["Talks","Kids area","Accessible venue"] },
  { id:"e8", title:"Folk Dance Festival", date:"2025-07-07", city:"Bilbao", venue:"Plaza Mayor", category:"Dance", featured:false, upcoming:false,
    image: "./e8.png", desc:"Traditional dance groups with live music and local crafts.",
    extra:["Outdoor","Free entry","Local market"] },
];

const categories = [...new Set(eventsDb.map(e => e.category))].sort();
const cities = [...new Set(eventsDb.map(e => e.city))].sort();
let mapInstance = null;
let mapMarker = null;

/* ---------- Storage ---------- */
function loadFromStorage(){
  try { state.session = JSON.parse(localStorage.getItem(LS_KEYS.session) || "null"); } catch { state.session = null; }
  state.city = localStorage.getItem(LS_KEYS.city) || "";
  try { state.saved = new Set(JSON.parse(localStorage.getItem(LS_KEYS.saved) || "[]")); } catch { state.saved = new Set(); }
  try { state.reserved = new Set(JSON.parse(localStorage.getItem(LS_KEYS.reserved) || "[]")); } catch { state.reserved = new Set(); }
}
function saveToStorage(){
  localStorage.setItem(LS_KEYS.session, JSON.stringify(state.session));
  localStorage.setItem(LS_KEYS.city, state.city);
  localStorage.setItem(LS_KEYS.saved, JSON.stringify([...state.saved]));
  localStorage.setItem(LS_KEYS.reserved, JSON.stringify([...state.reserved]));
}

/* ---------- Helpers ---------- */
function formatDate(iso){
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" });
}
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s); }

function toast(msg){
  let el = $("#toast");
  if (!el){
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role","status");
    el.setAttribute("aria-live","polite");
    Object.assign(el.style,{
      position:"fixed", left:"50%", bottom:"18px", transform:"translateX(-50%)",
      padding:"10px 12px", background:"rgba(17,24,39,.92)", color:"#fff",
      borderRadius:"12px", boxShadow:"0 10px 26px rgba(0,0,0,.18)",
      zIndex:"999", maxWidth:"min(520px, calc(100% - 28px))", textAlign:"center"
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ---------- Nav + Mobile ---------- */
function wireNav(){
  const toggle = $("#navToggle");
  const nav = $("#primaryNav");
  if (toggle && nav){
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded","false");
    });
  }

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  const loginBtn = $("#loginBtn");
  if (loginBtn){
    loginBtn.textContent = state.session ? "Account" : "Login";
    loginBtn.addEventListener("click", () => {
      if (state.session) window.location.href = "./mylist.html";
      else openLoginModal();
    });
  }
}

/* ---------- Login Modal (shared) ---------- */
let lastFocused = null;
let trapHandler = null;

function openModal(modalEl){
  modalEl.hidden = false;
  document.body.style.overflow = "hidden";
  trapFocus(modalEl);
}
function closeModal(modalEl){
  modalEl.hidden = true;
  document.body.style.overflow = "";
  releaseFocusTrap(modalEl);
}
function trapFocus(modalEl){
  const focusables = () => $$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', modalEl)
    .filter(el => !el.disabled && el.offsetParent !== null);
  trapHandler = (e) => {
    if (e.key !== "Tab") return;
    const els = focusables();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  modalEl.addEventListener("keydown", trapHandler);
}
function releaseFocusTrap(modalEl){
  if (trapHandler) modalEl.removeEventListener("keydown", trapHandler);
  trapHandler = null;
}

function openLoginModal(){
  const m = $("#loginModal");
  if (!m) return;
  lastFocused = document.activeElement;
  openModal(m);
  const email = $("#email");
  if (email) email.focus();
}
function closeLoginModal(){
  const m = $("#loginModal");
  if (!m) return;
  closeModal(m);
  const err = $("#loginError");
  if (err) err.hidden = true;
  if (lastFocused) lastFocused.focus();
}

function signIn(provider, displayName){
  state.session = { provider, displayName };
  saveToStorage();
  const loginBtn = $("#loginBtn");
  if (loginBtn) loginBtn.textContent = "Account";
  closeLoginModal();
  toast(`Signed in as ${displayName}`);
}

function wireLoginModal(){
  const m = $("#loginModal");
  if (!m) return;

  $$("[data-close]", m).forEach(el => {
    el.addEventListener("click", () => closeLoginModal());
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !m.hidden) closeLoginModal();
  });

  $$("[data-provider]", m).forEach(btn => {
    btn.addEventListener("click", () => {
      signIn(btn.getAttribute("data-provider"), "John Doe");
    });
  });

  const form = $("#loginForm");
  if (form){
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = ($("#email")?.value || "").trim();
      const password = ($("#password")?.value || "");
      const err = $("#loginError");
      if (err) err.hidden = true;

      if (!email.includes("@")){
        if (err){ err.textContent = "Please enter a valid email."; err.hidden = false; }
        $("#email")?.focus();
        return;
      }
      if (password.length < 6){
        if (err){ err.textContent = "Password must be at least 6 characters."; err.hidden = false; }
        $("#password")?.focus();
        return;
      }
      signIn("credentials", email);
    });
  }
}

function requireLogin(){
  if (state.session) return true;
  openLoginModal();
  toast("Please sign in to continue.");
  return false;
}

/* ---------- Events rendering (shared) ---------- */
function eventCard(ev){
  const el = document.createElement("div");
  el.className = "event";
  el.innerHTML = `
    <h3 class="event__title">${escapeHtml(ev.title)}</h3>
    <p class="event__meta"><strong>Date:</strong> ${escapeHtml(formatDate(ev.date))}</p>
    <p class="event__meta"><strong>Place:</strong> ${escapeHtml(ev.venue)} · ${escapeHtml(ev.city)}</p>
    <p class="event__meta"><strong>Category:</strong> ${escapeHtml(ev.category)}</p>
    <a class="btn btn--primary" href="./detail.html?id=${encodeURIComponent(ev.id)}">View details</a>
  `;
  return el;
}

function matchesFilters(ev){
  const { q, category, date } = state.filters;
  if (state.city && ev.city !== state.city) return false;
  if (category && ev.category !== category) return false;
  if (date && ev.date !== date) return false;
  if (q){
    const hay = (ev.title + " " + ev.venue + " " + ev.city).toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  return true;
}

/* ---------- Page inits ---------- */
function initHome(){
  const featured = eventsDb.filter(e => e.featured).slice(0, 3);
  const upcoming = eventsDb.filter(e => e.upcoming).slice(0, 3);

  const fg = $("#featuredGrid");
  const ug = $("#upcomingGrid");
  if (fg){ fg.innerHTML = ""; featured.forEach(e => fg.appendChild(eventCard(e))); }
  if (ug){ ug.innerHTML = ""; upcoming.forEach(e => ug.appendChild(eventCard(e))); }

  const citySelect = $("#citySelect");
  if (citySelect){
    citySelect.innerHTML = `<option value="">Select city</option>` +
      cities.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
    citySelect.value = state.city;

    citySelect.addEventListener("change", () => {
      const c = citySelect.value;
      if (c && cityCoords[c]) {
        setMapTo(cityCoords[c][0], cityCoords[c][1], c);
      }
      state.city = citySelect.value;
      saveToStorage();
      toast(state.city ? `Location set to: ${state.city}` : "Location cleared");
    });
  }
  initLeafletMap();
  const gpsBtn = $("#useGpsBtn");
  if (gpsBtn){
    gpsBtn.addEventListener("click", () => {
      if (!navigator.geolocation){
        toast("Geolocation is not supported in this browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Save coords if you want; for now just show map
          setMapTo(latitude, longitude, "You are here");
          toast("Map centered on your current location.");
        },
        () => toast("Could not access location. Please choose a city manually.")
      );
    });
    
  }
  
}

function initEventsPage(){
  const cat = $("#category");
  if (cat){
    cat.innerHTML = `<option value="">All categories</option>` +
      categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  }

  const q = $("#q");
  const date = $("#date");
  if (q) q.value = state.filters.q;
  if (cat) cat.value = state.filters.category;
  if (date) date.value = state.filters.date;

  function render(){
    const list = eventsDb.filter(matchesFilters);
    const meta = $("#resultsMeta");
    if (meta) meta.textContent = `${list.length} event(s) found` + (state.city ? ` in ${state.city}` : "");

    const grid = $("#eventsGrid");
    const empty = $("#emptyState");
    if (!grid || !empty) return;

    if (!list.length){
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = "";
    list.forEach(ev => grid.appendChild(eventCard(ev)));
  }

  $("#filtersForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    state.filters.q = (q?.value || "").trim();
    state.filters.category = cat?.value || "";
    state.filters.date = date?.value || "";
    render();
  });

  $("#resetBtn")?.addEventListener("click", () => {
    state.filters = { q:"", category:"", date:"" };
    if (q) q.value = "";
    if (cat) cat.value = "";
    if (date) date.value = "";
    render();
  });

  render();
}

function initDetailPage(){
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const ev = eventsDb.find(e => e.id === id);
  if (!ev){
    window.location.href = "./events.html";
    return;
  }

  $("#detailTitle").textContent = ev.title;
  $("#detailDesc").textContent = ev.desc;

  const meta = $("#detailMeta");
  if (meta){
    meta.innerHTML = `
      <li><strong>Date:</strong> <span class="muted">${escapeHtml(formatDate(ev.date))}</span></li>
      <li><strong>Place:</strong> <span class="muted">${escapeHtml(ev.venue)} · ${escapeHtml(ev.city)}</span></li>
      <li><strong>Category:</strong> <span class="muted">${escapeHtml(ev.category)}</span></li>
    `;
  }

  const extra = $("#detailExtra");
  if (extra) extra.innerHTML = ev.extra.map(x => `<li>${escapeHtml(x)}</li>`).join("");

  // Back
  $("#backBtn")?.addEventListener("click", () => {
    // simple back fallback:
    if (document.referrer && document.referrer.includes(location.host)) history.back();
    else window.location.href = "./events.html";
  });

  const addBtn = $("#addToListBtn");
  function paintSave(){
    const isSaved = state.saved.has(ev.id);
    addBtn.textContent = isSaved ? "Remove from My List" : "Add to My List";
    addBtn.className = "btn " + (isSaved ? "btn--ghost" : "btn--primary");
  }
  paintSave();

  addBtn?.addEventListener("click", () => {
    if (!requireLogin()) return;
    if (state.saved.has(ev.id)) state.saved.delete(ev.id);
    else state.saved.add(ev.id);
    saveToStorage();
    paintSave();
    toast(state.saved.has(ev.id) ? "Saved to My List" : "Removed from My List");
  });

  // Confirm modal
  const confirmModal = $("#confirmModal");
  function openConfirm(text){
    if (!confirmModal) return;
    $("#confirmText").textContent = text;
    lastFocused = document.activeElement;
    openModal(confirmModal);
    $("#goMyListBtn")?.focus();
  }
  function closeConfirm(){
    if (!confirmModal) return;
    closeModal(confirmModal);
    if (lastFocused) lastFocused.focus();
  }
  $$("[data-close='confirm']").forEach(el => el.addEventListener("click", closeConfirm));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && confirmModal && !confirmModal.hidden) closeConfirm();
  });
  $("#goMyListBtn")?.addEventListener("click", () => {
    closeConfirm();
    window.location.href = "./mylist.html";
  });

  $("#reserveBtn")?.addEventListener("click", () => {
    if (!requireLogin()) return;
    state.reserved.add(ev.id);
    saveToStorage();
    openConfirm(`Your reservation for “${ev.title}” is confirmed.`);
  });

  // Share
  $$("[data-share]").forEach(b => {
    b.addEventListener("click", async () => {
      const type = b.getAttribute("data-share");
      const url = location.href;

      if (type === "copy"){
        try { await navigator.clipboard.writeText(url); toast("Link copied!"); }
        catch { toast("Could not copy link (clipboard blocked)."); }
      } else {
        toast(`Share action: ${type} (demo)`);
      }
    });
  });
}

function initMyListPage(){
  const loggedIn = !!state.session;
  const sub = $("#profileSub");
  if (sub){
    sub.textContent = loggedIn
      ? `Signed in as ${state.session.displayName} (${state.session.provider})`
      : "Not logged in";
  }

  const logoutBtn = $("#logoutBtn");
  if (logoutBtn){
    logoutBtn.hidden = !loggedIn;
    logoutBtn.addEventListener("click", () => {
      state.session = null;
      saveToStorage();
      toast("Signed out");
      window.location.reload();
    });
  }

  $("#savedCount").textContent = String(state.saved.size);
  $("#reservedCount").textContent = String(state.reserved.size);

  const reservedList = eventsDb.filter(e => state.reserved.has(e.id));
  const savedList = eventsDb.filter(e => state.saved.has(e.id));

  const reservedGrid = $("#reservedGrid");
  const savedGrid = $("#savedGrid");
  if (reservedGrid){
    reservedGrid.innerHTML = "";
    reservedList.forEach(e => reservedGrid.appendChild(eventCard(e)));
  }
  if (savedGrid){
    savedGrid.innerHTML = "";
    savedList.forEach(e => savedGrid.appendChild(eventCard(e)));
  }

  $("#reservedEmpty").hidden = reservedList.length !== 0;
  $("#savedEmpty").hidden = savedList.length !== 0;

  // Tabs
  function setTab(which){
    const tabReserved = $("#tabReserved");
    const tabSaved = $("#tabSaved");
    const panelReserved = $("#panelReserved");
    const panelSaved = $("#panelSaved");

    if (which === "reserved"){
      tabReserved.classList.add("is-active");
      tabSaved.classList.remove("is-active");
      tabReserved.setAttribute("aria-selected","true");
      tabSaved.setAttribute("aria-selected","false");
      panelReserved.hidden = false;
      panelSaved.hidden = true;
    } else {
      tabSaved.classList.add("is-active");
      tabReserved.classList.remove("is-active");
      tabSaved.setAttribute("aria-selected","true");
      tabReserved.setAttribute("aria-selected","false");
      panelSaved.hidden = false;
      panelReserved.hidden = true;
    }
  }
  $("#tabReserved")?.addEventListener("click", () => setTab("reserved"));
  $("#tabSaved")?.addEventListener("click", () => setTab("saved"));
  setTab("reserved");
}

/* ---------- Map management ---------- */
function initLeafletMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  // Avoid double init if user reloads / hot-reloads
  if (mapInstance) return;

  // Default center (Vigo)
  const defaultLatLng = [42.2406, -8.7207];

  mapInstance = L.map("map", { scrollWheelZoom: false }).setView(defaultLatLng, 12);

  // Free OSM tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  mapMarker = L.marker(defaultLatLng).addTo(mapInstance).bindPopup("Default: Vigo").openPopup();
}

function setMapTo(lat, lng, label = "Selected location") {
  if (!mapInstance) return;
  const ll = [lat, lng];
  mapInstance.setView(ll, 13);
  if (!mapMarker) {
    mapMarker = L.marker(ll).addTo(mapInstance);
  } else {
    mapMarker.setLatLng(ll);
  }
  mapMarker.bindPopup(label).openPopup();
}

/* ---------- Boot ---------- */
function init(){
  loadFromStorage();
  wireNav();
  wireLoginModal();

  const page = document.body.getAttribute("data-page");
  if (page === "home") initHome();
  if (page === "events") initEventsPage();
  if (page === "detail") initDetailPage();
  if (page === "mylist") initMyListPage();
}

init();
