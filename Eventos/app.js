/* Eventos Culturales - Vanilla SPA (GitHub Pages ready)
   - Routes: home, events, detail, mylist
   - Login modal (simulated)
   - Reserve confirmation modal
   - Saved / Reserved stored in localStorage
   - Basic accessibility: focus trap, aria-live, keyboard support
*/

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel, root)];

const LS_KEYS = {
  session: "ec_session",
  city: "ec_city",
  saved: "ec_saved",
  reserved: "ec_reserved",
};

const state = {
  route: "home",
  selectedEventId: null,
  session: null,
  city: "",
  filters: { q: "", category: "", date: "" },
  saved: new Set(),
  reserved: new Set(),
};

const eventsDb = [
  {
    id: "e1",
    title: "Summer Music Festival",
    date: "2025-06-15",
    city: "Vigo",
    venue: "Castrelos Park Arena",
    category: "Music",
    featured: true,
    upcoming: true,
    desc:
      "A full-day festival with local and international artists across multiple stages.",
    extra: ["Outdoor event", "All ages", "Food trucks available"],
  },
  {
    id: "e2",
    title: "Tech Conference 2025",
    date: "2025-02-22",
    city: "Madrid",
    venue: "Convention Center",
    category: "Technology",
    featured: true,
    upcoming: true,
    desc:
      "Talks and workshops on software, AI, security, and product design.",
    extra: ["Workshops included", "Networking", "Badge required"],
  },
  {
    id: "e3",
    title: "Food & Wine Expo",
    date: "2025-03-10",
    city: "Barcelona",
    venue: "Harbor Exhibition Hall",
    category: "Gastronomy",
    featured: true,
    upcoming: false,
    desc:
      "Regional producers, tastings, and live cooking shows all weekend.",
    extra: ["Tastings", "Family-friendly", "Indoor venue"],
  },
  {
    id: "e4",
    title: "Art Gallery Opening",
    date: "2025-01-17",
    city: "Vigo",
    venue: "Modern Art Museum",
    category: "Art",
    featured: false,
    upcoming: true,
    desc:
      "New contemporary exhibit with guided tour and artist Q&A session.",
    extra: ["Guided tour", "Limited capacity", "Wheelchair access"],
  },
  {
    id: "e5",
    title: "Theatre: Classic Play",
    date: "2025-02-05",
    city: "Valencia",
    venue: "Teatro Municipal",
    category: "Theatre",
    featured: false,
    upcoming: true,
    desc:
      "A modern staging of a classic play with an award-winning cast.",
    extra: ["Seated", "Subtitles available", "90 minutes"],
  },
  {
    id: "e6",
    title: "Jazz Night in the Park",
    date: "2025-12-05",
    city: "Vigo",
    venue: "Parque Central - Main Stage",
    category: "Music",
    featured: false,
    upcoming: false,
    desc:
      "A magical evening under the stars with a live jazz ensemble.",
    extra: ["Free entry", "Bring a blanket", "Refreshments nearby"],
  },
  {
    id: "e7",
    title: "Book Fair Annual",
    date: "2025-05-18",
    city: "Sevilla",
    venue: "Centro de Convenciones",
    category: "Literature",
    featured: false,
    upcoming: true,
    desc:
      "Stands from publishers and authors, readings, and book signings.",
    extra: ["Talks", "Kids area", "Accessible venue"],
  },
  {
    id: "e8",
    title: "Folk Dance Festival",
    date: "2025-07-07",
    city: "Bilbao",
    venue: "Plaza Mayor",
    category: "Dance",
    featured: false,
    upcoming: false,
    desc:
      "Traditional dance groups with live music and local crafts.",
    extra: ["Outdoor", "Free entry", "Local market"],
  },
];

const categories = [...new Set(eventsDb.map(e => e.category))].sort();
const cities = [...new Set(eventsDb.map(e => e.city))].sort();

function loadFromStorage() {
  try {
    state.session = JSON.parse(localStorage.getItem(LS_KEYS.session) || "null");
  } catch { state.session = null; }

  state.city = localStorage.getItem(LS_KEYS.city) || "";

  try {
    state.saved = new Set(JSON.parse(localStorage.getItem(LS_KEYS.saved) || "[]"));
  } catch { state.saved = new Set(); }

  try {
    state.reserved = new Set(JSON.parse(localStorage.getItem(LS_KEYS.reserved) || "[]"));
  } catch { state.reserved = new Set(); }
}

function saveToStorage() {
  localStorage.setItem(LS_KEYS.session, JSON.stringify(state.session));
  localStorage.setItem(LS_KEYS.city, state.city);
  localStorage.setItem(LS_KEYS.saved, JSON.stringify([...state.saved]));
  localStorage.setItem(LS_KEYS.reserved, JSON.stringify([...state.reserved]));
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function matchesFilters(ev) {
  const { q, category, date } = state.filters;

  if (state.city && ev.city !== state.city) return false;

  if (category && ev.category !== category) return false;
  if (date && ev.date !== date) return false;

  if (q) {
    const hay = (ev.title + " " + ev.venue + " " + ev.city).toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  return true;
}

function getFilteredEvents() {
  return eventsDb.filter(matchesFilters);
}

function renderEventCard(ev, { onDetails = true } = {}) {
  const el = document.createElement("div");
  el.className = "event";
  el.innerHTML = `
    <h3 class="event__title">${escapeHtml(ev.title)}</h3>
    <p class="event__meta"><strong>Date:</strong> ${escapeHtml(formatDate(ev.date))}</p>
    <p class="event__meta"><strong>Place:</strong> ${escapeHtml(ev.venue)} · ${escapeHtml(ev.city)}</p>
    <p class="event__meta"><strong>Category:</strong> ${escapeHtml(ev.category)}</p>
    ${onDetails ? `<button class="btn btn--primary" type="button" data-details="${ev.id}">View details</button>` : ``}
  `;
  return el;
}

function renderCards(container, list) {
  container.innerHTML = "";
  list.forEach(ev => container.appendChild(renderEventCard(ev)));
  // Wire “View details”
  $$("[data-details]", container).forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-details");
      goDetail(id);
    });
  });
}

function renderHome() {
  const featured = eventsDb.filter(e => e.featured).slice(0, 3);
  const upcoming = eventsDb.filter(e => e.upcoming).slice(0, 3);

  renderCards($("#featuredGrid"), featured);
  renderCards($("#upcomingGrid"), upcoming);

  // Cities select
  const citySelect = $("#citySelect");
  citySelect.innerHTML = `<option value="">Select city</option>` + cities.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  citySelect.value = state.city;

  $("#useGpsBtn").onclick = async () => {
    // Demo: try to get geolocation, then pick a city heuristically (no reverse geocoding offline).
    if (!navigator.geolocation) {
      toast("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        // In this demo we simply set a default city to show the UX flow.
        state.city = state.city || "Vigo";
        saveToStorage();
        citySelect.value = state.city;
        toast(`Location set to: ${state.city}`);
        renderEvents(); // refresh list if user goes to events
      },
      () => toast("Could not access location. Please choose a city manually.")
    );
  };

  citySelect.onchange = () => {
    state.city = citySelect.value;
    saveToStorage();
    toast(state.city ? `Location set to: ${state.city}` : "Location cleared");
    renderEvents();
  };
}

function renderEvents() {
  // Categories select
  const catSelect = $("#category");
  catSelect.innerHTML = `<option value="">All categories</option>` + categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  catSelect.value = state.filters.category;

  // Inputs
  $("#q").value = state.filters.q;
  $("#date").value = state.filters.date;

  // Render list
  const list = getFilteredEvents();
  $("#resultsMeta").textContent = `${list.length} event(s) found` + (state.city ? ` in ${state.city}` : "");

  const grid = $("#eventsGrid");
  const empty = $("#emptyState");
  if (list.length === 0) {
    grid.innerHTML = "";
    empty.hidden = false;
  } else {
    empty.hidden = true;
    renderCards(grid, list);
  }
}

function renderDetail() {
  const ev = eventsDb.find(e => e.id === state.selectedEventId);
  if (!ev) {
    navigate("events");
    return;
  }

  $("#detailTitle").textContent = ev.title;

  const meta = $("#detailMeta");
  meta.innerHTML = `
    <li><strong>Date:</strong> <span class="muted">${escapeHtml(formatDate(ev.date))}</span></li>
    <li><strong>Place:</strong> <span class="muted">${escapeHtml(ev.venue)} · ${escapeHtml(ev.city)}</span></li>
    <li><strong>Category:</strong> <span class="muted">${escapeHtml(ev.category)}</span></li>
  `;

  $("#detailDesc").textContent = ev.desc;

  const extra = $("#detailExtra");
  extra.innerHTML = ev.extra.map(x => `<li>${escapeHtml(x)}</li>`).join("");

  // Buttons state
  const addBtn = $("#addToListBtn");
  const isSaved = state.saved.has(ev.id);
  addBtn.textContent = isSaved ? "Remove from My List" : "Add to My List";
  addBtn.className = "btn " + (isSaved ? "btn--ghost" : "btn--primary");

  addBtn.onclick = () => {
    if (!requireLogin()) return;
    toggleSaved(ev.id);
    renderDetail();
  };

  $("#reserveBtn").onclick = () => {
    if (!requireLogin()) return;
    state.reserved.add(ev.id);
    saveToStorage();
    openConfirmModal(`Your reservation for “${ev.title}” is confirmed.`);
    renderMyList();
  };

  // Share
  $$("[data-share]").forEach(b => {
    b.onclick = async () => {
      const type = b.getAttribute("data-share");
      const url = location.href.split("#")[0] + "#detail/" + ev.id;

      if (type === "copy") {
        try {
          await navigator.clipboard.writeText(url);
          toast("Link copied!");
        } catch {
          toast("Could not copy. Your browser may block clipboard access.");
        }
      } else {
        // Minimal demo actions (no external windows forced)
        toast(`Share action: ${type} (demo)`);
      }
    };
  });
}

function renderMyList() {
  const loggedIn = !!state.session;
  $("#profileSub").textContent = loggedIn
    ? `Signed in as ${state.session.displayName} (${state.session.provider})`
    : "Not logged in";

  $("#logoutBtn").hidden = !loggedIn;
  $("#logoutBtn").onclick = () => {
    state.session = null;
    saveToStorage();
    toast("Signed out");
    updateNavAuthUI();
    renderMyList();
  };

  $("#savedCount").textContent = String(state.saved.size);
  $("#reservedCount").textContent = String(state.reserved.size);

  const reservedList = eventsDb.filter(e => state.reserved.has(e.id));
  const savedList = eventsDb.filter(e => state.saved.has(e.id));

  // Reserved
  const reservedGrid = $("#reservedGrid");
  reservedGrid.innerHTML = "";
  reservedList.forEach(ev => reservedGrid.appendChild(renderEventCard(ev)));
  wireDetailButtons(reservedGrid);
  $("#reservedEmpty").hidden = reservedList.length !== 0;

  // Saved
  const savedGrid = $("#savedGrid");
  savedGrid.innerHTML = "";
  savedList.forEach(ev => savedGrid.appendChild(renderEventCard(ev)));
  wireDetailButtons(savedGrid);
  $("#savedEmpty").hidden = savedList.length !== 0;

  // Tabs
  $("#tabReserved").onclick = () => setTab("reserved");
  $("#tabSaved").onclick = () => setTab("saved");
}

function setTab(which) {
  const tabReserved = $("#tabReserved");
  const tabSaved = $("#tabSaved");
  const panelReserved = $("#panelReserved");
  const panelSaved = $("#panelSaved");

  if (which === "reserved") {
    tabReserved.classList.add("is-active");
    tabSaved.classList.remove("is-active");
    tabReserved.setAttribute("aria-selected", "true");
    tabSaved.setAttribute("aria-selected", "false");
    panelReserved.hidden = false;
    panelSaved.hidden = true;
    tabReserved.focus();
  } else {
    tabSaved.classList.add("is-active");
    tabReserved.classList.remove("is-active");
    tabSaved.setAttribute("aria-selected", "true");
    tabReserved.setAttribute("aria-selected", "false");
    panelSaved.hidden = false;
    panelReserved.hidden = true;
    tabSaved.focus();
  }
}

function wireDetailButtons(root) {
  $$("[data-details]", root).forEach(btn => {
    btn.addEventListener("click", () => goDetail(btn.getAttribute("data-details")));
  });
}

function toggleSaved(eventId) {
  if (state.saved.has(eventId)) state.saved.delete(eventId);
  else state.saved.add(eventId);
  saveToStorage();
  renderMyList();
}

function goDetail(id) {
  state.selectedEventId = id;
  navigate(`detail/${id}`);
}

function navigate(route) {
  // route can be: home | events | mylist | detail/<id>
  state.route = route;
  location.hash = "#" + route;
  applyRoute();
}

function applyRoute() {
  const hash = location.hash.replace(/^#/, "") || "home";
  const [base, param] = hash.split("/");

  // Hide all views
  $("#view-home").hidden = true;
  $("#view-events").hidden = true;
  $("#view-detail").hidden = true;
  $("#view-mylist").hidden = true;

  if (base === "detail" && param) {
    state.selectedEventId = param;
  }

  // Show view
  if (base === "home") {
    $("#view-home").hidden = false;
    renderHome();
  } else if (base === "events") {
    $("#view-events").hidden = false;
    renderEvents();
  } else if (base === "mylist") {
    $("#view-mylist").hidden = false;
    renderMyList();
  } else if (base === "detail") {
    $("#view-detail").hidden = false;
    renderDetail();
  } else {
    $("#view-home").hidden = false;
    renderHome();
  }

  updateActiveNav(base);
}

function updateActiveNav(base) {
  $$(".nav__link").forEach(a => a.classList.remove("is-active"));
  const map = { home: "home", events: "events", mylist: "mylist", detail: "events" };
  const key = map[base] || "home";
  const link = $(`[data-route="${key}"]`);
  if (link) link.classList.add("is-active");
}

/* ---------- Auth / Modals ---------- */

let lastFocused = null;

function updateNavAuthUI() {
  const loggedIn = !!state.session;
  $("#loginBtn").textContent = loggedIn ? "Account" : "Login";
}

function requireLogin() {
  if (state.session) return true;
  openLoginModal();
  toast("Please sign in to continue.");
  return false;
}

function openLoginModal() {
  lastFocused = document.activeElement;
  openModal($("#loginModal"));
  $("#email").focus();
}

function closeLoginModal() {
  closeModal($("#loginModal"));
  $("#loginError").hidden = true;
  if (lastFocused) lastFocused.focus();
}

function openConfirmModal(text) {
  $("#confirmText").textContent = text;
  lastFocused = document.activeElement;
  openModal($("#confirmModal"));
  $("#goMyListBtn").focus();
}

function closeConfirmModal() {
  closeModal($("#confirmModal"));
  if (lastFocused) lastFocused.focus();
}

function openModal(modalEl) {
  modalEl.hidden = false;
  document.body.style.overflow = "hidden";
  trapFocus(modalEl);
}

function closeModal(modalEl) {
  modalEl.hidden = true;
  document.body.style.overflow = "";
  releaseFocusTrap(modalEl);
}

function signIn(provider, displayName) {
  state.session = { provider, displayName };
  saveToStorage();
  updateNavAuthUI();
  closeLoginModal();
  toast(`Signed in as ${displayName}`);
  renderMyList();
}

/* Focus trap */
let trapHandler = null;
function trapFocus(modalEl) {
  const focusables = () => $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalEl)
    .filter(el => !el.disabled && el.offsetParent !== null);

  trapHandler = (e) => {
    if (e.key !== "Tab") return;
    const els = focusables();
    if (els.length === 0) return;
    const first = els[0];
    const last = els[els.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  modalEl.addEventListener("keydown", trapHandler);
}

function releaseFocusTrap(modalEl) {
  if (trapHandler) modalEl.removeEventListener("keydown", trapHandler);
  trapHandler = null;
}

/* Toast (simple non-intrusive feedback) */
let toastTimer = null;
function toast(msg) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "18px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 12px";
    el.style.background = "rgba(17,24,39,.92)";
    el.style.color = "#fff";
    el.style.borderRadius = "12px";
    el.style.boxShadow = "0 10px 26px rgba(0,0,0,.18)";
    el.style.zIndex = "999";
    el.style.maxWidth = "min(520px, calc(100% - 28px))";
    el.style.textAlign = "center";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* Security-ish escaping for demo */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) { return escapeHtml(s); }

/* ---------- Wire UI ---------- */

function wireNavigation() {
  // Nav links
  $$("[data-route]").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const route = a.getAttribute("data-route");
      navigate(route);
      closeMobileNav();
    });
  });

  // Burger menu
  $("#navToggle").addEventListener("click", () => {
    const nav = $("#primaryNav");
    const open = nav.classList.toggle("is-open");
    $("#navToggle").setAttribute("aria-expanded", String(open));
  });

  // Close nav on outside click (mobile)
  document.addEventListener("click", (e) => {
    const nav = $("#primaryNav");
    const toggle = $("#navToggle");
    if (!nav.classList.contains("is-open")) return;
    if (nav.contains(e.target) || toggle.contains(e.target)) return;
    closeMobileNav();
  });

  // Login button
  $("#loginBtn").addEventListener("click", () => {
    if (state.session) {
      navigate("mylist");
    } else {
      openLoginModal();
    }
  });

  // Back
  $("#backBtn").addEventListener("click", () => {
    history.length > 1 ? history.back() : navigate("events");
  });

  // Filters form
  $("#filtersForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.filters.q = $("#q").value.trim();
    state.filters.category = $("#category").value;
    state.filters.date = $("#date").value;
    renderEvents();
  });

  $("#resetBtn").addEventListener("click", () => {
    state.filters = { q: "", category: "", date: "" };
    renderEvents();
  });

  // Modals close
  $$("[data-close]").forEach(el => {
    el.addEventListener("click", () => {
      const which = el.getAttribute("data-close");
      if (which === "login") closeLoginModal();
      if (which === "confirm") closeConfirmModal();
    });
  });

  // ESC to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#loginModal").hidden) closeLoginModal();
    if (!$("#confirmModal").hidden) closeConfirmModal();
  });

  // Providers
  $$("[data-provider]").forEach(btn => {
    btn.addEventListener("click", () => {
      const provider = btn.getAttribute("data-provider");
      signIn(provider, "John Doe");
    });
  });

  // Login form (demo validation)
  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#email").value.trim();
    const password = $("#password").value;

    const errorEl = $("#loginError");
    errorEl.hidden = true;

    if (!email || !email.includes("@")) {
      errorEl.textContent = "Please enter a valid email.";
      errorEl.hidden = false;
      $("#email").focus();
      return;
    }
    if (!password || password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      errorEl.hidden = false;
      $("#password").focus();
      return;
    }

    signIn("credentials", email);
  });

  // Confirmation CTA
  $("#goMyListBtn").addEventListener("click", () => {
    closeConfirmModal();
    navigate("mylist");
  });

  // Default tab
  setTab("reserved");
}

function closeMobileNav() {
  const nav = $("#primaryNav");
  nav.classList.remove("is-open");
  $("#navToggle").setAttribute("aria-expanded", "false");
}

function init() {
  loadFromStorage();
  updateNavAuthUI();

  $("#year").textContent = String(new Date().getFullYear());

  wireNavigation();

  // Apply initial route
  window.addEventListener("hashchange", applyRoute);
  applyRoute();

  // If user tried to access restricted area in the design (My List), prompt login.
  // We don't hard-block navigation, but we show login when trying to perform actions.
}

init();
