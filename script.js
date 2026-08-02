/* ============================================================
   DAILY TRACKER — Shared Application Logic
   Vanilla JS only. Data persisted via localStorage.
   ============================================================ */

/* ---------------------- Small utilities ---------------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function pad2(n){ return n.toString().padStart(2, '0'); }
function toDateStr(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function todayStr(){ return toDateStr(new Date()); }
function prettyDate(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
}
function daysAgoStr(n){ const d = new Date(); d.setDate(d.getDate()-n); return toDateStr(d); }

const CATEGORIES = [
  { id:'health',      label:'Health',       color:'#5fb88f' },
  { id:'fitness',     label:'Fitness',      color:'#e2a542' },
  { id:'productivity',label:'Productivity', color:'#6c93c9' },
  { id:'mindfulness', label:'Mindfulness',  color:'#af7fa8' },
  { id:'learning',    label:'Learning',     color:'#7a5075' },
  { id:'social',      label:'Social',       color:'#dd6b7d' },
  { id:'finance',     label:'Finance',      color:'#4a9f7a' },
  { id:'other',       label:'Other',        color:'#93638d' },
];
function categoryInfo(id){ return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length-1]; }

/* ---------------------- Storage layer ---------------------- */
const StorageKeys = {
  users: 'dt_users',
  session: 'dt_session',
};
function getUsers(){ return JSON.parse(localStorage.getItem(StorageKeys.users) || '{}'); }
function saveUsers(u){ localStorage.setItem(StorageKeys.users, JSON.stringify(u)); }
function getSession(){ return localStorage.getItem(StorageKeys.session); }
function setSession(email){ localStorage.setItem(StorageKeys.session, email); }
function clearSession(){ localStorage.removeItem(StorageKeys.session); }
function currentUser(){
  const email = getSession();
  if(!email) return null;
  const users = getUsers();
  return users[email] ? { email, ...users[email] } : null;
}
function nsKey(base){ const u = currentUser(); return `${base}_${u ? u.email : 'guest'}`; }

function getHabits(){ return JSON.parse(localStorage.getItem(nsKey('dt_habits')) || '[]'); }
function saveHabits(list){ localStorage.setItem(nsKey('dt_habits'), JSON.stringify(list)); }
function getGoals(){ return JSON.parse(localStorage.getItem(nsKey('dt_goals')) || '[]'); }
function saveGoals(list){ localStorage.setItem(nsKey('dt_goals'), JSON.stringify(list)); }
function getSettings(){
  const defaults = { theme:'light', notifications:false, reminderTime:'20:00', lastNotified:'' };
  return { ...defaults, ...JSON.parse(localStorage.getItem(nsKey('dt_settings')) || '{}') };
}
function saveSettings(s){ localStorage.setItem(nsKey('dt_settings'), JSON.stringify(s)); }

/* ---------------------- Auth guards ---------------------- */
function requireAuth(){
  if(!getSession()){ window.location.href = 'index.html'; return false; }
  return true;
}
function redirectIfAuthed(){
  if(getSession()){ window.location.href = 'dashboard.html'; return true; }
  return false;
}

/* ---------------------- Toasts ---------------------- */
function ensureToastContainer(){
  let c = $('#toastContainer');
  if(!c){ c = document.createElement('div'); c.id = 'toastContainer'; document.body.appendChild(c); }
  return c;
}
function showToast(message, type = 'default'){
  const c = ensureToastContainer();
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(), 300); }, 2800);
}

/* ---------------------- Habit logic ---------------------- */
function isCompletedOn(habit, dateStr){ return habit.completedDates.includes(dateStr); }

function calcStreak(habit){
  let streak = 0;
  let cursor = new Date();
  // if not done today, streak counts back from yesterday (today can still be "in progress")
  if(!isCompletedOn(habit, todayStr())) cursor.setDate(cursor.getDate() - 1);
  while(isCompletedOn(habit, toDateStr(cursor))){
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
function bestStreak(habit){
  const dates = [...habit.completedDates].sort();
  let best = 0, cur = 0, prev = null;
  for(const ds of dates){
    if(prev){
      const diff = (new Date(ds) - new Date(prev)) / 86400000;
      cur = diff === 1 ? cur + 1 : 1;
    } else cur = 1;
    best = Math.max(best, cur);
    prev = ds;
  }
  return best;
}
function toggleHabitToday(id){
  const habits = getHabits();
  const h = habits.find(x => x.id === id);
  if(!h) return;
  const t = todayStr();
  if(isCompletedOn(h, t)) h.completedDates = h.completedDates.filter(d => d !== t);
  else h.completedDates.push(t);
  saveHabits(habits);
  return h;
}
function todaysProgress(habits = getHabits()){
  if(habits.length === 0) return 0;
  const done = habits.filter(h => isCompletedOn(h, todayStr())).length;
  return Math.round((done / habits.length) * 100);
}

/* ---------------------- Theme ---------------------- */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
}
function initThemeFromStorage(){
  if(!getSession()) { applyTheme('light'); return; }
  applyTheme(getSettings().theme);
}
function toggleTheme(){
  const s = getSettings();
  s.theme = s.theme === 'dark' ? 'light' : 'dark';
  saveSettings(s);
  applyTheme(s.theme);
  return s.theme;
}

/* ---------------------- SVG icon set ---------------------- */
const ICONS = {
  dashboard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  habits:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  calendar:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  stats:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>`,
  goals:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`,
  profile:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>`,
  settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  logout:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
};

/* ---------------------- Sidebar / shell ---------------------- */
const NAV_ITEMS = [
  { page:'dashboard',  href:'dashboard.html',  label:'Dashboard' },
  { page:'habits',     href:'habits.html',     label:'Habits' },
  { page:'calendar',   href:'calendar.html',   label:'Calendar' },
  { page:'statistics', href:'statistics.html', label:'Statistics' },
  { page:'goals',      href:'goals.html',      label:'Goals' },
];
const NAV_ITEMS_BOTTOM = [
  { page:'profile',  href:'profile.html',  label:'Profile' },
  { page:'settings', href:'settings.html', label:'Settings' },
];

function buildShell(activePage){
  const shellHost = $('#shell');
  if(!shellHost) return;
  const user = currentUser();
  const initials = user ? user.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?';

  const navHtml = (items) => items.map(it => `
    <a class="nav-link ${activePage===it.page?'active':''}" href="${it.href}">
      ${ICONS[it.page]}<span>${it.label}</span>
    </a>`).join('');

  shellHost.innerHTML = `
    <div class="overlay" id="overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <span class="logo-dot">✓</span> Daily Tracker
        <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="nav-group-label">Menu</div>
      ${navHtml(NAV_ITEMS)}
      <div class="nav-group-label">Account</div>
      ${navHtml(NAV_ITEMS_BOTTOM)}
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar">${initials}</div>
          <div class="sidebar-user-info">
            <b>${user ? user.name : 'Guest'}</b>
            <span>${user ? user.email : ''}</span>
          </div>
        </div>
        <a href="#" class="nav-link logout-link" id="logoutBtn" style="margin-top:6px;">
          ${ICONS.logout}<span>Log out</span>
        </a>
      </div>
    </aside>`;

  $('#sidebarClose').addEventListener('click', () => closeSidebar());
  $('#overlay').addEventListener('click', () => closeSidebar());
  $('#logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = 'index.html';
  });
}
function openSidebar(){ $('#sidebar').classList.add('open'); $('#overlay').classList.add('show'); }
function closeSidebar(){ $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('show'); }

function buildTopbar(title, sub, opts = {}){
  const host = $('#topbar');
  if(!host) return;
  host.innerHTML = `
    <div class="topbar-left">
      <button class="icon-btn menu-toggle" id="menuToggle" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div>
        <h1 class="page-title">${title}</h1>
        ${sub ? `<div class="page-sub">${sub}</div>` : ''}
      </div>
    </div>
    <div class="topbar-right">
      ${opts.search ? `
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" id="globalSearch" placeholder="${opts.search}">
      </div>` : ''}
      <button class="icon-btn" id="themeToggleBtn" title="Toggle theme">
        <svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
      </button>
      <button class="icon-btn" id="notifBtn" title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
        <span class="badge-dot hidden" id="notifDot"></span>
      </button>
    </div>`;

  $('#menuToggle').addEventListener('click', openSidebar);
  $('#themeToggleBtn').addEventListener('click', () => {
    const theme = toggleTheme();
    updateThemeIcon(theme);
    showToast(`${theme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
  });
  updateThemeIcon(getSettings().theme);
  $('#notifBtn').addEventListener('click', () => {
    showToast(getSettings().notifications ? "You're all caught up! 🎉" : 'Enable notifications in Settings');
  });
  if(getSettings().notifications) $('#notifDot').classList.remove('hidden');

  if(opts.onSearch){
    const input = $('#globalSearch');
    if(input) input.addEventListener('input', () => opts.onSearch(input.value));
  }
}
function updateThemeIcon(theme){
  const icon = $('#themeIcon');
  if(!icon) return;
  icon.innerHTML = theme === 'dark'
    ? `<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>`
    : `<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>`;
}

/* ---------------------- Reminder scheduler ---------------------- */
function initReminders(){
  if(!getSession()) return;
  setInterval(() => {
    const s = getSettings();
    if(!s.notifications) return;
    const now = new Date();
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    if(hhmm === s.reminderTime && s.lastNotified !== todayStr()){
      const progress = todaysProgress();
      const body = progress >= 100
        ? "You've completed all your habits today. Amazing work!"
        : `You're at ${progress}% today. A few habits are still waiting.`;
      if('Notification' in window && Notification.permission === 'granted'){
        new Notification('Daily Tracker reminder', { body });
      } else {
        showToast(body);
      }
      s.lastNotified = todayStr();
      saveSettings(s);
    }
  }, 20000);
}

/* ============================================================
   PAGE: LOGIN
   ============================================================ */
function initLoginPage(){
  if(redirectIfAuthed()) return;
  const form = $('#loginForm');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim().toLowerCase();
    const pass = $('#loginPassword').value;
    const users = getUsers();
    const errBox = $('#loginError');
    errBox.classList.remove('show');
    if(!users[email] || users[email].password !== pass){
      errBox.textContent = 'Incorrect email or password.';
      errBox.classList.add('show');
      return;
    }
    setSession(email);
    window.location.href = 'dashboard.html';
  });
  $('#loginPassToggle').addEventListener('click', () => togglePassVisibility('loginPassword', 'loginPassToggle'));
}

/* ============================================================
   PAGE: SIGNUP
   ============================================================ */
function initSignupPage(){
  if(redirectIfAuthed()) return;
  const form = $('#signupForm');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#signupName').value.trim();
    const email = $('#signupEmail').value.trim().toLowerCase();
    const pass = $('#signupPassword').value;
    const confirm = $('#signupConfirm').value;
    const errBox = $('#signupError');
    errBox.classList.remove('show');

    if(name.length < 2){ return showErr(errBox, 'Please enter your full name.'); }
    if(!/^\S+@\S+\.\S+$/.test(email)){ return showErr(errBox, 'Please enter a valid email address.'); }
    if(pass.length < 6){ return showErr(errBox, 'Password must be at least 6 characters.'); }
    if(pass !== confirm){ return showErr(errBox, 'Passwords do not match.'); }

    const users = getUsers();
    if(users[email]){ return showErr(errBox, 'An account with this email already exists.'); }

    users[email] = { name, password: pass, joinedAt: todayStr() };
    saveUsers(users);
    setSession(email);
    saveSettings(getSettings());
    showToast('Account created! Welcome aboard 🎉', 'success');
    window.location.href = 'dashboard.html';
  });
  $('#signupPassToggle').addEventListener('click', () => togglePassVisibility('signupPassword', 'signupPassToggle'));
}
function showErr(box, msg){ box.textContent = msg; box.classList.add('show'); }
function togglePassVisibility(inputId, btnId){
  const input = $(`#${inputId}`);
  const btn = $(`#${btnId}`);
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.textContent = isPass ? 'Hide' : 'Show';
}

/* ============================================================
   PAGE: DASHBOARD
   ============================================================ */
function initDashboardPage(){
  if(!requireAuth()) return;
  buildShell('dashboard');
  buildTopbar('Dashboard', `Welcome back, ${currentUser().name.split(' ')[0]}! Here's your day at a glance.`);
  renderDashboard();
}
function renderDashboard(){
  const habits = getHabits();
  const goals = getGoals();
  const progress = todaysProgress(habits);
  const activeStreaks = habits.filter(h => calcStreak(h) > 0).length;
  const activeGoals = goals.filter(g => !g.completed).length;

  drawRingProgress('#dashRing', progress);
  $('#dashProgressLabel').textContent = `${progress}%`;

  $('#statTotalHabits').textContent = habits.length;
  $('#statActiveStreaks').textContent = activeStreaks;
  $('#statActiveGoals').textContent = activeGoals;
  const longest = habits.reduce((m,h) => Math.max(m, bestStreak(h)), 0);
  $('#statLongestStreak').textContent = longest;

  // Today's habit list preview
  const listEl = $('#dashTodayList');
  if(habits.length === 0){
    listEl.innerHTML = emptyStateHtml('habits', 'No habits yet', 'Add your first habit to start tracking your streaks.');
  } else {
    listEl.innerHTML = habits.slice(0, 6).map(h => habitCardHtml(h)).join('');
    bindHabitCheckHandlers(listEl, renderDashboard);
  }

  // Weekly mini bar chart
  drawBarChart('#dashWeekChart', last7DaysCompletion(habits));

  // Upcoming goals
  const goalsEl = $('#dashGoalsPreview');
  const activeG = goals.filter(g => !g.completed).slice(0, 3);
  goalsEl.innerHTML = activeG.length
    ? activeG.map(g => goalRowHtml(g)).join('')
    : `<p class="text-soft" style="padding:8px 0;">No active goals. <a href="goals.html" style="color:var(--mauve-700); font-weight:700;">Create one</a>.</p>`;
}
function goalRowHtml(g){
  return `<div class="flex items-center gap-3" style="padding:10px 0; border-bottom:1px solid var(--border-c);">
    <div style="flex:1;">
      <b style="font-size:.88rem;">${escapeHtml(g.title)}</b>
      <div class="progress-bar" style="margin-top:6px;"><span style="width:${g.progress}%"></span></div>
    </div>
    <span class="text-soft" style="font-size:.78rem;">${g.progress}%</span>
  </div>`;
}
function last7DaysCompletion(habits){
  const labels = [], values = [];
  for(let i = 6; i >= 0; i--){
    const d = daysAgoStr(i);
    const dateObj = new Date(d + 'T00:00:00');
    labels.push(dateObj.toLocaleDateString(undefined, { weekday:'short' }).slice(0,3));
    const total = habits.length || 1;
    const done = habits.filter(h => isCompletedOn(h, d)).length;
    values.push(habits.length ? Math.round((done/total)*100) : 0);
  }
  return { labels, values };
}
function emptyStateHtml(iconKey, title, sub){
  return `<div class="empty-state">${ICONS[iconKey] || ''}<h4>${title}</h4><p>${sub}</p></div>`;
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   PAGE: HABITS
   ============================================================ */
let habitEditId = null;
function initHabitsPage(){
  if(!requireAuth()) return;
  buildShell('habits');
  buildTopbar('Habits', 'Build routines that stick, one day at a time.', {
    search:'Search habits...',
    onSearch: (val) => { habitFilterState.search = val.toLowerCase(); renderHabits(); }
  });

  populateCategorySelect($('#habitCategory'));
  populateCategoryFilter($('#habitCategoryFilter'));
  setupColorPicker();

  $('#addHabitBtn').addEventListener('click', () => openHabitModal());
  $('#habitModalClose').addEventListener('click', closeHabitModal);
  $('#habitModalOverlay').addEventListener('click', (e) => { if(e.target.id === 'habitModalOverlay') closeHabitModal(); });
  $('#habitForm').addEventListener('submit', submitHabitForm);
  $('#habitCategoryFilter').addEventListener('change', (e) => { habitFilterState.category = e.target.value; renderHabits(); });
  $('#habitSort').addEventListener('change', (e) => { habitFilterState.sort = e.target.value; renderHabits(); });

  renderHabits();
}
const habitFilterState = { search:'', category:'all', sort:'recent' };

function populateCategorySelect(sel){
  sel.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
}
function populateCategoryFilter(sel){
  sel.innerHTML = `<option value="all">All categories</option>` + CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
}
function setupColorPicker(){
  const wrap = $('#habitColorGrid');
  wrap.innerHTML = CATEGORIES.map((c,i) => `<div class="color-dot ${i===0?'selected':''}" data-color="${c.color}" style="background:${c.color}"></div>`).join('');
  $$('.color-dot', wrap).forEach(dot => dot.addEventListener('click', () => {
    $$('.color-dot', wrap).forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
  }));
}
function getSelectedColor(){
  const el = $('.color-dot.selected');
  return el ? el.dataset.color : CATEGORIES[0].color;
}
function openHabitModal(habit = null){
  habitEditId = habit ? habit.id : null;
  $('#habitModalTitle').textContent = habit ? 'Edit habit' : 'Add new habit';
  $('#habitName').value = habit ? habit.name : '';
  $('#habitCategory').value = habit ? habit.category : CATEGORIES[0].id;
  $('#habitTarget').value = habit ? habit.target : 'Daily';
  const color = habit ? habit.color : CATEGORIES[0].color;
  $$('.color-dot').forEach(d => d.classList.toggle('selected', d.dataset.color === color));
  $('#habitModalOverlay').classList.add('show');
  $('#habitName').focus();
}
function closeHabitModal(){ $('#habitModalOverlay').classList.remove('show'); habitEditId = null; }
function submitHabitForm(e){
  e.preventDefault();
  const name = $('#habitName').value.trim();
  if(!name){ return; }
  const habits = getHabits();
  if(habitEditId){
    const h = habits.find(x => x.id === habitEditId);
    h.name = name;
    h.category = $('#habitCategory').value;
    h.target = $('#habitTarget').value;
    h.color = getSelectedColor();
    showToast('Habit updated', 'success');
  } else {
    habits.push({
      id: uid(), name, category: $('#habitCategory').value, target: $('#habitTarget').value,
      color: getSelectedColor(), createdAt: todayStr(), completedDates: []
    });
    showToast('Habit added', 'success');
  }
  saveHabits(habits);
  closeHabitModal();
  renderHabits();
}
function deleteHabit(id){
  if(!confirm('Delete this habit? This cannot be undone.')) return;
  saveHabits(getHabits().filter(h => h.id !== id));
  showToast('Habit deleted');
  renderHabits();
}
function habitCardHtml(h){
  const cat = categoryInfo(h.category);
  const streak = calcStreak(h);
  const done = isCompletedOn(h, todayStr());
  return `
  <div class="habit-card fade-in" data-id="${h.id}">
    <button class="habit-check ${done ? 'done' : ''}" data-action="toggle" data-id="${h.id}" style="${done?'':`border-color:${cat.color}`}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </button>
    <div class="habit-info">
      <h4>${escapeHtml(h.name)}</h4>
      <div class="habit-meta">
        <span class="chip" style="background:${cat.color}22; color:${cat.color}"><span class="chip-dot" style="background:${cat.color}"></span>${cat.label}</span>
        <span>${h.target || 'Daily'}</span>
        <span class="streak-badge">🔥 ${streak} day${streak===1?'':'s'}</span>
      </div>
    </div>
    <div class="habit-actions">
      <button class="btn-icon" data-action="edit" data-id="${h.id}" title="Edit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>
      <button class="btn-icon" data-action="delete" data-id="${h.id}" title="Delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  </div>`;
}
function bindHabitCheckHandlers(container, rerenderFn){
  $$('[data-action="toggle"]', container).forEach(btn => btn.addEventListener('click', () => {
    toggleHabitToday(btn.dataset.id);
    rerenderFn();
  }));
  $$('[data-action="edit"]', container).forEach(btn => btn.addEventListener('click', () => {
    const h = getHabits().find(x => x.id === btn.dataset.id);
    openHabitModal(h);
  }));
  $$('[data-action="delete"]', container).forEach(btn => btn.addEventListener('click', () => deleteHabit(btn.dataset.id)));
}
function renderHabits(){
  let habits = getHabits();
  if(habitFilterState.search) habits = habits.filter(h => h.name.toLowerCase().includes(habitFilterState.search));
  if(habitFilterState.category !== 'all') habits = habits.filter(h => h.category === habitFilterState.category);
  if(habitFilterState.sort === 'streak') habits = habits.sort((a,b) => calcStreak(b) - calcStreak(a));
  else if(habitFilterState.sort === 'name') habits = habits.sort((a,b) => a.name.localeCompare(b.name));
  else habits = habits.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const listEl = $('#habitsList');
  if(habits.length === 0){
    listEl.innerHTML = emptyStateHtml('habits', 'No habits found', 'Try adjusting filters, or add a new habit to get started.');
  } else {
    listEl.innerHTML = habits.map(habitCardHtml).join('');
    bindHabitCheckHandlers(listEl, renderHabits);
  }
}

/* ============================================================
   PAGE: CALENDAR
   ============================================================ */
let calState = { year: new Date().getFullYear(), month: new Date().getMonth() };
function initCalendarPage(){
  if(!requireAuth()) return;
  buildShell('calendar');
  buildTopbar('Calendar', 'See your completed habits across the month.');
  $('#calPrev').addEventListener('click', () => { shiftMonth(-1); });
  $('#calNext').addEventListener('click', () => { shiftMonth(1); });
  $('#dayModalClose').addEventListener('click', () => $('#dayModalOverlay').classList.remove('show'));
  $('#dayModalOverlay').addEventListener('click', (e) => { if(e.target.id === 'dayModalOverlay') $('#dayModalOverlay').classList.remove('show'); });
  renderCalendar();
}
function shiftMonth(delta){
  calState.month += delta;
  if(calState.month < 0){ calState.month = 11; calState.year--; }
  if(calState.month > 11){ calState.month = 0; calState.year++; }
  renderCalendar();
}
function renderCalendar(){
  const { year, month } = calState;
  const habits = getHabits();
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month:'long', year:'numeric' });
  $('#calMonthLabel').textContent = monthLabel;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const grid = $('#calGrid');
  let cells = '';

  for(let i = firstDay - 1; i >= 0; i--){
    cells += `<div class="cal-day muted">${daysInPrevMonth - i}</div>`;
  }
  const todaysDate = todayStr();
  for(let day = 1; day <= daysInMonth; day++){
    const dateStr = `${year}-${pad2(month+1)}-${pad2(day)}`;
    const completed = habits.filter(h => isCompletedOn(h, dateStr));
    const pct = habits.length ? completed.length / habits.length : 0;
    const isToday = dateStr === todaysDate;
    const fullClass = pct === 1 && habits.length ? 'full' : '';
    const dots = completed.slice(0,4).map(h => `<span class="mini-dot" style="background:${categoryInfo(h.category).color}"></span>`).join('');
    cells += `<div class="cal-day ${isToday?'today':''} ${fullClass}" data-date="${dateStr}">
      <span>${day}</span>
      <div class="dot-row">${fullClass ? '' : dots}</div>
    </div>`;
  }
  const totalCells = firstDay + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for(let i = 1; i <= trailing; i++) cells += `<div class="cal-day muted">${i}</div>`;

  grid.innerHTML = cells;
  $$('.cal-day:not(.muted)', grid).forEach(cell => cell.addEventListener('click', () => showDayModal(cell.dataset.date)));
}
function showDayModal(dateStr){
  const habits = getHabits();
  const completed = habits.filter(h => isCompletedOn(h, dateStr));
  const notCompleted = habits.filter(h => !isCompletedOn(h, dateStr));
  $('#dayModalTitle').textContent = prettyDate(dateStr);
  const body = $('#dayModalBody');
  if(habits.length === 0){
    body.innerHTML = `<p class="text-soft">You have no habits set up yet.</p>`;
  } else {
    body.innerHTML = `
      <p class="text-soft mb-4">${completed.length} of ${habits.length} habits completed</p>
      ${completed.map(h => `<div class="flex items-center gap-2" style="padding:6px 0;">
        <span class="chip-dot" style="background:${categoryInfo(h.category).color}; width:9px; height:9px;"></span>
        <span style="font-weight:600; font-size:.88rem;">${escapeHtml(h.name)}</span>
      </div>`).join('')}
      ${notCompleted.length ? `<p class="text-soft" style="margin-top:12px; font-size:.8rem;">Not completed: ${notCompleted.map(h=>escapeHtml(h.name)).join(', ')}</p>` : ''}
    `;
  }
  $('#dayModalOverlay').classList.add('show');
}

/* ============================================================
   PAGE: STATISTICS
   ============================================================ */
function initStatisticsPage(){
  if(!requireAuth()) return;
  buildShell('statistics');
  buildTopbar('Statistics', 'Understand your patterns and progress over time.');

  $$('.tab-btn', $('#statsTabs')).forEach(btn => btn.addEventListener('click', () => {
    $$('.tab-btn', $('#statsTabs')).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderStatistics(btn.dataset.range);
  }));
  renderStatistics('week');
}
function renderStatistics(range){
  const habits = getHabits();

  // Weekly bar chart (last 7 days completion %)
  drawBarChart('#weekBarChart', last7DaysCompletion(habits));

  // Monthly trend line (last 30 days completion %)
  const labels = [], values = [];
  const span = range === 'month' ? 30 : 7;
  for(let i = span - 1; i >= 0; i--){
    const d = daysAgoStr(i);
    labels.push(new Date(d+'T00:00:00').getDate().toString());
    const total = habits.length || 1;
    const done = habits.filter(h => isCompletedOn(h, d)).length;
    values.push(habits.length ? Math.round((done/total)*100) : 0);
  }
  drawLineChart('#trendChart', { labels, values });

  // Category donut
  const byCat = {};
  habits.forEach(h => { byCat[h.category] = (byCat[h.category]||0) + 1; });
  const catData = Object.entries(byCat).map(([id,count]) => ({ label:categoryInfo(id).label, value:count, color:categoryInfo(id).color }));
  drawDonutChart('#categoryDonut', catData);
  const legend = $('#categoryLegend');
  legend.innerHTML = catData.length ? catData.map(d => `
    <div class="flex items-center gap-2" style="margin-bottom:8px;">
      <span class="legend-swatch" style="background:${d.color}"></span>
      <span style="font-size:.82rem;">${d.label}</span>
      <span class="text-soft" style="margin-left:auto; font-size:.8rem;">${d.value}</span>
    </div>`).join('') : `<p class="text-soft">Add habits to see category breakdown.</p>`;

  // Streak leaderboard
  const sorted = [...habits].sort((a,b) => calcStreak(b) - calcStreak(a)).slice(0,6);
  const board = $('#streakLeaderboard');
  board.innerHTML = sorted.length ? sorted.map((h,i) => `
    <div class="flex items-center gap-3" style="padding:10px 0; border-bottom:1px solid var(--border-c);">
      <span style="font-family:var(--font-display); font-weight:700; color:var(--mauve-500); width:20px;">${i+1}</span>
      <span class="chip-dot" style="background:${categoryInfo(h.category).color}; width:9px; height:9px;"></span>
      <span style="flex:1; font-weight:600; font-size:.88rem;">${escapeHtml(h.name)}</span>
      <span class="streak-badge">🔥 ${calcStreak(h)}</span>
    </div>`).join('') : `<p class="text-soft">No habits tracked yet.</p>`;

  // Summary stat cards
  const total = habits.length;
  const totalCompletions = habits.reduce((s,h) => s + h.completedDates.length, 0);
  const avgStreak = total ? Math.round(habits.reduce((s,h)=>s+calcStreak(h),0)/total) : 0;
  const best = habits.reduce((m,h) => Math.max(m, bestStreak(h)), 0);
  $('#statTotalCompletions').textContent = totalCompletions;
  $('#statAvgStreak').textContent = avgStreak;
  $('#statBestStreak').textContent = best;
  $('#statWeekAvg').textContent = `${Math.round(values.slice(-7).reduce((a,b)=>a+b,0)/Math.min(7,values.length || 1))}%`;
}

/* ---------------------- Canvas chart helpers ---------------------- */
function getCtx(sel){
  const canvas = $(sel);
  if(!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = (rect.height || 200) * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height || 200 };
}
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function drawBarChart(sel, data){
  const setup = getCtx(sel);
  if(!setup) return;
  const { ctx, w, h } = setup;
  ctx.clearRect(0,0,w,h);
  const padBottom = 24, padTop = 10;
  const barAreaH = h - padBottom - padTop;
  const gap = 14;
  const barW = (w - gap*(data.labels.length+1)) / data.labels.length;
  const mauve600 = cssVar('--mauve-600') || '#93638d';
  const mauve300 = cssVar('--mauve-300') || '#e0c3da';
  const textSoft = cssVar('--text-soft') || '#6f5c6b';

  data.values.forEach((v, i) => {
    const x = gap + i*(barW+gap);
    const barH = Math.max((v/100) * barAreaH, 3);
    const y = padTop + (barAreaH - barH);
    const grad = ctx.createLinearGradient(0,y,0,y+barH);
    grad.addColorStop(0, mauve600);
    grad.addColorStop(1, mauve300);
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, barH, 6);
    ctx.fill();
    ctx.fillStyle = textSoft;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.labels[i], x + barW/2, h - 6);
  });
}
function drawLineChart(sel, data){
  const setup = getCtx(sel);
  if(!setup) return;
  const { ctx, w, h } = setup;
  ctx.clearRect(0,0,w,h);
  const padBottom = 22, padTop = 14, padX = 6;
  const areaH = h - padBottom - padTop;
  const step = (w - padX*2) / Math.max(data.values.length - 1, 1);
  const mauve700 = cssVar('--mauve-700') || '#7a5075';
  const mauve200 = cssVar('--mauve-200') || '#efdcea';

  const points = data.values.map((v,i) => ({ x: padX + i*step, y: padTop + areaH - (v/100)*areaH }));

  // Area fill
  ctx.beginPath();
  ctx.moveTo(points[0].x, padTop + areaH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length-1].x, padTop + areaH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0,padTop,0,padTop+areaH);
  grad.addColorStop(0, mauve200);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  points.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.strokeStyle = mauve700;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots on last point
  const last = points[points.length-1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI*2);
  ctx.fillStyle = mauve700;
  ctx.fill();
}
function drawDonutChart(sel, data){
  const setup = getCtx(sel);
  if(!setup) return;
  const { ctx, w, h } = setup;
  ctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 6, thickness = r*0.38;
  const total = data.reduce((s,d)=>s+d.value,0);
  if(total === 0){
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle = cssVar('--mauve-200') || '#efdcea';
    ctx.lineWidth = thickness;
    ctx.stroke();
    return;
  }
  let start = -Math.PI/2;
  data.forEach(d => {
    const angle = (d.value/total) * Math.PI*2;
    ctx.beginPath();
    ctx.arc(cx,cy,r,start,start+angle);
    ctx.strokeStyle = d.color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'butt';
    ctx.stroke();
    start += angle;
  });
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function drawRingProgress(sel, percent){
  const setup = getCtx(sel);
  if(!setup) return;
  const { ctx, w, h } = setup;
  ctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 10;
  ctx.lineWidth = 12;
  ctx.strokeStyle = cssVar('--mauve-200') || '#efdcea';
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();

  const grad = ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0, cssVar('--mauve-700') || '#7a5075');
  grad.addColorStop(1, cssVar('--mauve-400') || '#c9a1c2');
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx,cy,r, -Math.PI/2, -Math.PI/2 + (percent/100)*Math.PI*2);
  ctx.stroke();
}

/* ============================================================
   PAGE: GOALS
   ============================================================ */
let goalEditId = null;
let goalFilterState = 'active';
function initGoalsPage(){
  if(!requireAuth()) return;
  buildShell('goals');
  buildTopbar('Goals', 'Set meaningful targets and track them to completion.');

  $('#addGoalBtn').addEventListener('click', () => openGoalModal());
  $('#goalModalClose').addEventListener('click', closeGoalModal);
  $('#goalModalOverlay').addEventListener('click', (e) => { if(e.target.id === 'goalModalOverlay') closeGoalModal(); });
  $('#goalForm').addEventListener('submit', submitGoalForm);
  $$('.tab-btn', $('#goalTabs')).forEach(btn => btn.addEventListener('click', () => {
    $$('.tab-btn', $('#goalTabs')).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    goalFilterState = btn.dataset.filter;
    renderGoals();
  }));
  renderGoals();
}
function openGoalModal(goal = null){
  goalEditId = goal ? goal.id : null;
  $('#goalModalTitle').textContent = goal ? 'Edit goal' : 'Create new goal';
  $('#goalTitle').value = goal ? goal.title : '';
  $('#goalDesc').value = goal ? goal.desc : '';
  $('#goalDate').value = goal ? goal.targetDate : '';
  $('#goalProgress').value = goal ? goal.progress : 0;
  $('#goalModalOverlay').classList.add('show');
  $('#goalTitle').focus();
}
function closeGoalModal(){ $('#goalModalOverlay').classList.remove('show'); goalEditId = null; }
function submitGoalForm(e){
  e.preventDefault();
  const title = $('#goalTitle').value.trim();
  if(!title) return;
  const goals = getGoals();
  const progress = Math.min(100, Math.max(0, parseInt($('#goalProgress').value || '0', 10)));
  if(goalEditId){
    const g = goals.find(x => x.id === goalEditId);
    g.title = title; g.desc = $('#goalDesc').value.trim(); g.targetDate = $('#goalDate').value;
    g.progress = progress; g.completed = progress >= 100;
    showToast('Goal updated', 'success');
  } else {
    goals.push({ id: uid(), title, desc: $('#goalDesc').value.trim(), targetDate: $('#goalDate').value,
      progress, completed: progress >= 100, createdAt: todayStr() });
    showToast('Goal created', 'success');
  }
  saveGoals(goals);
  closeGoalModal();
  renderGoals();
}
function deleteGoal(id){
  if(!confirm('Delete this goal?')) return;
  saveGoals(getGoals().filter(g => g.id !== id));
  showToast('Goal deleted');
  renderGoals();
}
function toggleGoalComplete(id){
  const goals = getGoals();
  const g = goals.find(x => x.id === id);
  g.completed = !g.completed;
  g.progress = g.completed ? 100 : g.progress;
  saveGoals(goals);
  renderGoals();
}
function goalCardHtml(g){
  const overdue = g.targetDate && new Date(g.targetDate) < new Date(todayStr()) && !g.completed;
  return `
  <div class="card goal-card fade-in">
    <div class="goal-head">
      <div>
        <h4>${escapeHtml(g.title)}</h4>
        ${g.desc ? `<p class="goal-desc">${escapeHtml(g.desc)}</p>` : ''}
      </div>
      <span class="chip" style="background:${g.completed ? '#5fb88f22':'var(--mauve-100)'}; color:${g.completed?'#5fb88f':'var(--mauve-700)'}">${g.completed ? 'Completed' : 'In progress'}</span>
    </div>
    <div class="progress-bar"><span style="width:${g.progress}%"></span></div>
    <div class="goal-foot">
      <span>${g.progress}% complete</span>
      <span style="${overdue ? 'color:var(--danger); font-weight:700;' : ''}">${g.targetDate ? 'Due ' + prettyDate(g.targetDate) : 'No deadline'}</span>
    </div>
    <div class="flex gap-2 mt-4">
      <button class="btn btn-ghost btn-sm" data-action="toggle" data-id="${g.id}" style="flex:1;">${g.completed ? 'Mark active' : 'Mark complete'}</button>
      <button class="btn-icon" data-action="edit" data-id="${g.id}" title="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
      <button class="btn-icon" data-action="delete" data-id="${g.id}" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
    </div>
  </div>`;
}
function renderGoals(){
  let goals = getGoals();
  if(goalFilterState === 'active') goals = goals.filter(g => !g.completed);
  else if(goalFilterState === 'completed') goals = goals.filter(g => g.completed);
  const grid = $('#goalsGrid');
  if(goals.length === 0){
    grid.innerHTML = emptyStateHtml('goals', 'No goals here', 'Create a goal to start tracking meaningful progress.');
    grid.className = '';
  } else {
    grid.className = 'grid grid-3';
    grid.innerHTML = goals.map(goalCardHtml).join('');
    $$('[data-action="toggle"]', grid).forEach(b => b.addEventListener('click', () => toggleGoalComplete(b.dataset.id)));
    $$('[data-action="edit"]', grid).forEach(b => b.addEventListener('click', () => openGoalModal(getGoals().find(g=>g.id===b.dataset.id))));
    $$('[data-action="delete"]', grid).forEach(b => b.addEventListener('click', () => deleteGoal(b.dataset.id)));
  }
}

/* ============================================================
   PAGE: PROFILE
   ============================================================ */
function initProfilePage(){
  if(!requireAuth()) return;
  buildShell('profile');
  buildTopbar('Profile', 'Manage your personal information.');

  const user = currentUser();
  const habits = getHabits();
  const initials = user.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  $('#profileAvatar').textContent = initials;
  $('#profileName').textContent = user.name;
  $('#profileEmail').textContent = user.email;
  $('#profileJoined').textContent = `Member since ${prettyDate(user.joinedAt || todayStr())}`;

  $('#profileTotalHabits').textContent = habits.length;
  $('#profileLongestStreak').textContent = habits.reduce((m,h)=>Math.max(m,bestStreak(h)),0);
  $('#profileTotalCompletions').textContent = habits.reduce((s,h)=>s+h.completedDates.length,0);
  $('#profileGoalsDone').textContent = getGoals().filter(g=>g.completed).length;

  $('#editNameInput').value = user.name;
  $('#profileEditForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const users = getUsers();
    const newName = $('#editNameInput').value.trim();
    if(newName.length < 2) return showToast('Please enter a valid name', 'error');
    users[user.email].name = newName;
    saveUsers(users);
    showToast('Profile updated', 'success');
    initProfilePage();
  });

  $('#passwordChangeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const users = getUsers();
    const cur = $('#curPassword').value, next = $('#newPassword').value, confirm = $('#confirmPassword').value;
    const errBox = $('#passwordError');
    errBox.classList.remove('show');
    if(users[user.email].password !== cur) return showErr(errBox, 'Current password is incorrect.');
    if(next.length < 6) return showErr(errBox, 'New password must be at least 6 characters.');
    if(next !== confirm) return showErr(errBox, 'New passwords do not match.');
    users[user.email].password = next;
    saveUsers(users);
    $('#passwordChangeForm').reset();
    showToast('Password changed', 'success');
  });
}

/* ============================================================
   PAGE: SETTINGS
   ============================================================ */
function initSettingsPage(){
  if(!requireAuth()) return;
  buildShell('settings');
  buildTopbar('Settings', 'Customize your Daily Tracker experience.');

  const settings = getSettings();
  $('#darkModeSwitch').checked = settings.theme === 'dark';
  $('#notifSwitch').checked = settings.notifications;
  $('#reminderTimeInput').value = settings.reminderTime;
  $('#reminderTimeInput').disabled = !settings.notifications;

  $('#darkModeSwitch').addEventListener('change', (e) => {
    const s = getSettings();
    s.theme = e.target.checked ? 'dark' : 'light';
    saveSettings(s);
    applyTheme(s.theme);
    updateThemeIcon(s.theme);
  });

  $('#notifSwitch').addEventListener('change', async (e) => {
    const s = getSettings();
    if(e.target.checked && 'Notification' in window && Notification.permission !== 'granted'){
      const perm = await Notification.requestPermission();
      if(perm !== 'granted'){
        e.target.checked = false;
        showToast('Notification permission denied', 'error');
        return;
      }
    }
    s.notifications = e.target.checked;
    saveSettings(s);
    $('#reminderTimeInput').disabled = !s.notifications;
    showToast(s.notifications ? 'Reminders enabled' : 'Reminders disabled');
  });

  $('#reminderTimeInput').addEventListener('change', (e) => {
    const s = getSettings();
    s.reminderTime = e.target.value;
    s.lastNotified = '';
    saveSettings(s);
    showToast('Reminder time updated', 'success');
  });

  $('#exportDataBtn').addEventListener('click', () => {
    const data = { habits: getHabits(), goals: getGoals(), settings: getSettings() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'daily-tracker-export.json';
    a.click();
    showToast('Data exported', 'success');
  });

  $('#clearDataBtn').addEventListener('click', () => {
    if(!confirm('This will delete all your habits and goals permanently. Continue?')) return;
    saveHabits([]);
    saveGoals([]);
    showToast('All data cleared');
  });

  $('#deleteAccountBtn').addEventListener('click', () => {
    if(!confirm('This will permanently delete your account and all data. Continue?')) return;
    const user = currentUser();
    const users = getUsers();
    delete users[user.email];
    saveUsers(users);
    localStorage.removeItem(nsKey('dt_habits'));
    localStorage.removeItem(nsKey('dt_goals'));
    localStorage.removeItem(nsKey('dt_settings'));
    clearSession();
    window.location.href = 'index.html';
  });
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initThemeFromStorage();
  const page = document.body.dataset.page;
  switch(page){
    case 'login': initLoginPage(); break;
    case 'signup': initSignupPage(); break;
    case 'dashboard': initDashboardPage(); break;
    case 'habits': initHabitsPage(); break;
    case 'calendar': initCalendarPage(); break;
    case 'statistics': initStatisticsPage(); break;
    case 'goals': initGoalsPage(); break;
    case 'profile': initProfilePage(); break;
    case 'settings': initSettingsPage(); break;
  }
  initReminders();
});
