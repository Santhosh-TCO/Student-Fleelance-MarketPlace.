/* CampusGig – Student Freelance Marketplace
   Vanilla JS single-page app (hash router). Data is kept in localStorage so the
   site works on GitHub Pages with no server. The `API` object below mirrors the
   REST modules from the project report (User, Job, Service, Application,
   Message, Payment, Review) so it can later be swapped for real fetch() calls
   to a Node.js / Express backend. */

'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const catName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || 'Other';
const catIcon = (id) => (CATEGORIES.find((c) => c.id === id) || {}).icon || '🧩';
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

/* ---------- storage (stands in for the database) ---------- */
const KEY = 'campusgig_db_v1';
let db;
function loadDB() {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
  if (!db || !db.users) { db = seedDB(); saveDB(); }
}
function saveDB() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable: keep in-memory */ }
}
function resetDB() { db = seedDB(); saveDB(); }

/* ---------- API layer (mirrors the REST modules in the report) ---------- */
const API = {
  user: {
    byId: (id) => db.users.find((u) => u.id === id),
    me: () => (db.session ? API.user.byId(db.session) : null),
    students: () => db.users.filter((u) => u.role === 'student'),
    login(email, password) {
      const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
      if (!u) return null;
      db.session = u.id; saveDB(); return u;
    },
    register(data) {
      if (db.users.some((x) => x.email.toLowerCase() === data.email.trim().toLowerCase())) return { error: 'That email is already registered.' };
      const u = { id: uid('u_'), role: data.role, name: data.name.trim(), email: data.email.trim(), password: data.password, bio: '', skills: [], college: data.role === 'student' ? data.college.trim() : '', dept: '', year: '', portfolio: '' };
      db.users.push(u); db.session = u.id; saveDB(); return { user: u };
    },
    logout() { db.session = null; saveDB(); },
    update(id, patch) { Object.assign(API.user.byId(id), patch); saveDB(); }
  },
  service: {
    all: () => db.services.slice().sort((a, b) => b.date.localeCompare(a.date)),
    byId: (id) => db.services.find((s) => s.id === id),
    byStudent: (sid) => db.services.filter((s) => s.studentId === sid),
    create(s) { const n = { id: uid('s_'), date: new Date().toISOString(), ...s }; db.services.push(n); saveDB(); return n; },
    remove(id) { db.services = db.services.filter((s) => s.id !== id); saveDB(); }
  },
  job: {
    all: () => db.jobs.slice().sort((a, b) => b.date.localeCompare(a.date)),
    byId: (id) => db.jobs.find((j) => j.id === id),
    byClient: (cid) => db.jobs.filter((j) => j.clientId === cid),
    create(j) { const n = { id: uid('j_'), date: new Date().toISOString(), status: 'open', ...j }; db.jobs.push(n); saveDB(); return n; },
    remove(id) { db.jobs = db.jobs.filter((j) => j.id !== id); db.applications = db.applications.filter((a) => a.jobId !== id); saveDB(); }
  },
  application: {
    forJob: (jid) => db.applications.filter((a) => a.jobId === jid),
    byStudent: (sid) => db.applications.filter((a) => a.studentId === sid),
    has: (jid, sid) => db.applications.some((a) => a.jobId === jid && a.studentId === sid),
    create(a) { db.applications.push({ id: uid('a_'), status: 'pending', date: new Date().toISOString(), ...a }); saveDB(); },
    accept(id) {
      const a = db.applications.find((x) => x.id === id); if (!a) return;
      const job = API.job.byId(a.jobId);
      a.status = 'accepted';
      db.applications.filter((x) => x.jobId === a.jobId && x.id !== id).forEach((x) => { x.status = 'rejected'; });
      job.status = 'filled';
      API.order.create({ title: job.title, studentId: a.studentId, clientId: job.clientId, amount: a.bid, source: 'job' });
      saveDB();
    },
    reject(id) { const a = db.applications.find((x) => x.id === id); if (a) { a.status = 'rejected'; saveDB(); } }
  },
  order: {
    create(o) { const n = { id: uid('o_'), status: 'awaiting_payment', date: new Date().toISOString(), ...o }; db.orders.push(n); saveDB(); return n; },
    byId: (id) => db.orders.find((o) => o.id === id),
    forUser: (u) => db.orders.filter((o) => (u.role === 'student' ? o.studentId : o.clientId) === u.id).sort((a, b) => b.date.localeCompare(a.date)),
    setStatus(id, status) { API.order.byId(id).status = status; saveDB(); }
  },
  payment: {
    pay(orderId, method) {
      const o = API.order.byId(orderId);
      db.payments.push({ id: uid('p_'), orderId, amount: o.amount, method, date: new Date().toISOString() });
      o.status = 'in_progress'; saveDB();
    },
    forOrder: (oid) => db.payments.find((p) => p.orderId === oid)
  },
  message: {
    thread: (a, b) => db.messages.filter((m) => (m.from === a && m.to === b) || (m.from === b && m.to === a)).sort((x, y) => x.date.localeCompare(y.date)),
    partners(me) {
      const ids = new Set();
      db.messages.forEach((m) => { if (m.from === me) ids.add(m.to); if (m.to === me) ids.add(m.from); });
      return [...ids].map(API.user.byId).filter(Boolean).sort((x, y) => {
        const lx = API.message.thread(me, x.id).slice(-1)[0], ly = API.message.thread(me, y.id).slice(-1)[0];
        return ly.date.localeCompare(lx.date);
      });
    },
    send(from, to, text) { db.messages.push({ id: uid('m_'), from, to, text, date: new Date().toISOString() }); saveDB(); }
  },
  review: {
    all: () => db.reviews.slice().sort((a, b) => b.date.localeCompare(a.date)),
    forStudent: (sid) => db.reviews.filter((r) => r.studentId === sid).sort((a, b) => b.date.localeCompare(a.date)),
    forOrder: (oid) => db.reviews.find((r) => r.orderId === oid),
    create(r) { db.reviews.push({ id: uid('r_'), date: new Date().toISOString(), ...r }); saveDB(); },
    avg(sid) {
      const rs = API.review.forStudent(sid);
      return rs.length ? rs.reduce((t, r) => t + r.rating, 0) / rs.length : 0;
    }
  }
};

/* ---------- UI primitives ---------- */
const COLORS = ['#4f46e5', '#0d9488', '#db2777', '#ea580c', '#2563eb', '#7c3aed', '#059669', '#b45309'];
function avatar(u, size = '') {
  const h = [...(u.id || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  const initials = (u.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return `<span class="avatar ${size}" style="background:${COLORS[h % COLORS.length]}" aria-hidden="true">${esc(initials)}</span>`;
}
function stars(avg, count) {
  if (!count && !avg) return '<span class="muted small">No reviews yet</span>';
  const full = Math.round(avg);
  return `<span class="stars" aria-label="${avg.toFixed(1)} out of 5">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> <span class="small muted">${avg.toFixed(1)}${count != null ? ` (${count})` : ''}</span>`;
}
function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg; t.setAttribute('role', 'status');
  $('#toast-root').appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}
let lastFocus = null;
function openModal(html, wide = false) {
  lastFocus = document.activeElement;
  $('#modal-root').innerHTML = `<div class="backdrop" data-act="close-backdrop"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <button class="modal-x" data-act="close" aria-label="Close">×</button>${html}</div></div>`;
  document.body.classList.add('noscroll');
  const f = $('#modal-root input, #modal-root textarea, #modal-root select, #modal-root .btn');
  if (f) f.focus();
}
function closeModal() {
  $('#modal-root').innerHTML = ''; document.body.classList.remove('noscroll');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function statusBadge(s) {
  const map = { open: ['Open', 'green'], filled: ['Filled', 'gray'], pending: ['Pending', 'amber'], accepted: ['Accepted', 'green'], rejected: ['Not selected', 'gray'],
    awaiting_payment: ['Awaiting payment', 'amber'], in_progress: ['In progress', 'blue'], completed: ['Completed', 'green'] };
  const [label, color] = map[s] || [s, 'gray'];
  return `<span class="badge ${color}">${label}</span>`;
}
function emptyState(icon, title, text, action = '') {
  return `<div class="empty"><div class="empty-i">${icon}</div><h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>${action}</div>`;
}

/* ---------- shared chrome ---------- */
function renderNav() {
  const me = API.user.me();
  const cur = (location.hash || '#/').split('/')[1] || '';
  const link = (href, label, key) => `<a href="${href}" class="${cur === key ? 'active' : ''}">${label}</a>`;
  $('#nav').innerHTML = `<div class="wrap nav-in">
    <a class="brand" href="#/"><span class="brand-i">🎓</span><span>Campus<b>Gig</b></span></a>
    <button class="burger" data-act="toggle-nav" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="links" id="links">
      ${link('#/services', 'Services', 'services')}
      ${link('#/jobs', 'Jobs', 'jobs')}
      ${link('#/students', 'Students', 'students')}
      ${link('#/reviews', 'Reviews', 'reviews')}
      ${link('#/about', 'About', 'about')}
      ${me ? `${link('#/dashboard', 'Dashboard', 'dashboard')}${link('#/messages', 'Messages', 'messages')}${link('#/payments', 'Payments', 'payments')}
        <span class="user-chip">${avatar(me, 'sm')}<span>${esc(me.name.split(' ')[0])}</span><button class="btn ghost sm" data-act="logout">Log out</button></span>`
      : `<a class="btn ghost sm" href="#/login">Log in</a><a class="btn sm" href="#/register">Sign up</a>`}
    </nav></div>`;
}
function renderFooter() {
  $('#footer').innerHTML = `<div class="wrap foot-in">
    <div><div class="brand"><span class="brand-i">🎓</span><span>Campus<b>Gig</b></span></div>
      <p class="muted small">A student-focused freelance marketplace. Project for U24IT503 – Web Technologies, Team 11, Meenakshi Sundararajan Engineering College (An Autonomous Institution).</p></div>
    <div><h4>Explore</h4><a href="#/services">Services</a><a href="#/jobs">Jobs</a><a href="#/students">Students</a><a href="#/about">About the project</a></div>
    <div><h4>Our goals</h4><p class="small muted">SDG 8 – Decent Work &amp; Economic Growth<br>SDG 4 – Quality Education</p>
      <button class="btn ghost sm" data-act="reset-demo">Reset demo data</button></div>
  </div>`;
}

/* ---------- cards ---------- */
function serviceCard(s) {
  const u = API.user.byId(s.studentId); if (!u) return '';
  const rs = API.review.forStudent(u.id);
  return `<article class="card service" data-act="open-service" data-id="${s.id}" tabindex="0" role="button" aria-label="${esc(s.title)}">
    <div class="card-top"><span class="chip">${catIcon(s.category)} ${catName(s.category)}</span></div>
    <h3>${esc(s.title)}</h3>
    <div class="seller">${avatar(u, 'sm')}<div><div class="strong">${esc(u.name)}</div>${stars(API.review.avg(u.id), rs.length)}</div></div>
    <div class="card-foot"><span class="muted small">⏱ ${s.days} day${s.days > 1 ? 's' : ''}</span><span class="price">From ${inr(s.price)}</span></div>
  </article>`;
}
function jobCard(j) {
  const c = API.user.byId(j.clientId); if (!c) return '';
  return `<article class="card job" data-act="open-job" data-id="${j.id}" tabindex="0" role="button" aria-label="${esc(j.title)}">
    <div class="card-top"><span class="chip">${catIcon(j.category)} ${catName(j.category)}</span>${statusBadge(j.status)}</div>
    <h3>${esc(j.title)}</h3>
    <p class="muted clamp">${esc(j.desc)}</p>
    <div class="card-foot"><span class="small muted">${avatar(c, 'xs')} ${esc(c.name)} · ⏳ ${esc(j.deadline)}</span><span class="price">${inr(j.budget)}</span></div>
  </article>`;
}
function studentCard(u) {
  const rs = API.review.forStudent(u.id);
  return `<a class="card student" href="#/student/${u.id}">
    <div class="student-head">${avatar(u, 'lg')}<div><h3>${esc(u.name)}</h3><div class="small muted">${esc(u.dept || 'Student')}${u.year ? ' · ' + esc(u.year) : ''}</div>${stars(API.review.avg(u.id), rs.length)}</div></div>
    <p class="muted clamp">${esc(u.bio || 'New to CampusGig.')}</p>
    <div class="tags">${(u.skills || []).slice(0, 4).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
  </a>`;
}

/* ---------- views ---------- */
const views = {};

views.home = () => {
  const me = API.user.me();
  const sv = API.service.all().slice(0, 6);
  const jb = API.job.all().filter((j) => j.status === 'open').slice(0, 3);
  const students = API.user.students().length;
  return `
  <section class="hero"><div class="wrap hero-in">
    <div>
      <span class="eyebrow">Built by students, for students</span>
      <h1>Real projects for <span class="grad">real student skills.</span></h1>
      <p class="lead">CampusGig connects talented students with clients who need work done – without the crowded competition of general freelance sites.</p>
      <form class="hero-search" data-form="hero-search" role="search">
        <input name="q" placeholder="Try “logo”, “website” or “Excel”…" aria-label="Search services" />
        <button class="btn">Search</button>
      </form>
      <div class="hero-cta">${me ? `<a class="btn ghost" href="#/dashboard">Go to dashboard</a>` : `<a class="btn ghost" href="#/register">Join as student</a><a class="link-btn" href="#/register">Hire a student →</a>`}</div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="float f1"><span>🎨</span><b>Logo design</b><small>${inr(1500)}</small></div>
      <div class="float f2"><span>💻</span><b>Website build</b><small>${inr(2500)}</small></div>
      <div class="float f3"><span>🎬</span><b>Reel editing</b><small>${inr(500)}</small></div>
      <div class="orb"></div>
    </div>
  </div></section>

  <section class="wrap stats">
    <div><b>${students}</b><span>Student freelancers</span></div>
    <div><b>${db.services.length}</b><span>Services offered</span></div>
    <div><b>${db.jobs.filter((j) => j.status === 'open').length}</b><span>Open jobs</span></div>
    <div><b>${db.reviews.length}</b><span>Client reviews</span></div>
  </section>

  <section class="wrap section">
    <div class="sec-head"><h2>Browse by category</h2></div>
    <div class="cats">${CATEGORIES.map((c) => `<a class="cat" href="#/services?cat=${c.id}"><span>${c.icon}</span>${c.name}</a>`).join('')}</div>
  </section>

  <section class="wrap section">
    <div class="sec-head"><h2>Popular services</h2><a href="#/services">View all →</a></div>
    <div class="grid">${sv.map(serviceCard).join('')}</div>
  </section>

  <section class="band"><div class="wrap section">
    <div class="sec-head"><h2>How it works</h2></div>
    <ol class="steps">
      <li><b>1</b><h3>Create a profile</h3><p>Students add skills and a portfolio. Clients describe what they need.</p></li>
      <li><b>2</b><h3>Offer or post</h3><p>List a service you provide, or post a job and receive applications.</p></li>
      <li><b>3</b><h3>Chat &amp; agree</h3><p>Talk through details in built-in messaging, then hire or accept an offer.</p></li>
      <li><b>4</b><h3>Pay &amp; review</h3><p>Pay securely, receive the work, and leave a rating that builds the student’s reputation.</p></li>
    </ol>
  </div></section>

  <section class="wrap section">
    <div class="sec-head"><h2>Latest jobs</h2><a href="#/jobs">View all →</a></div>
    <div class="grid">${jb.map(jobCard).join('')}</div>
  </section>

  <section class="wrap section">
    <div class="sdg">
      <div><span class="sdg-n">SDG 8</span><h3>Decent Work &amp; Economic Growth</h3><p>Creates freelance opportunities, helps students earn income and supports skill-based employment.</p></div>
      <div><span class="sdg-n alt">SDG 4</span><h3>Quality Education</h3><p>Gives practical project experience and helps students build professional skills.</p></div>
    </div>
  </section>`;
};

views.services = (q) => {
  const term = (q.get('q') || '').toLowerCase(), cat = q.get('cat') || '', sort = q.get('sort') || 'new';
  let list = API.service.all().filter((s) => {
    const u = API.user.byId(s.studentId) || {};
    const hay = (s.title + ' ' + s.desc + ' ' + (u.name || '') + ' ' + (u.skills || []).join(' ')).toLowerCase();
    return (!term || hay.includes(term)) && (!cat || s.category === cat);
  });
  if (sort === 'low') list.sort((a, b) => a.price - b.price);
  if (sort === 'high') list.sort((a, b) => b.price - a.price);
  if (sort === 'rating') list.sort((a, b) => API.review.avg(b.studentId) - API.review.avg(a.studentId));
  return `<section class="wrap page">
    <div class="page-head"><h1>Services</h1><p class="muted">Ready-to-order offers from student freelancers.</p></div>
    ${filterBar('services', term, cat, sort, true)}
    <p class="muted small" id="count">${list.length} service${list.length === 1 ? '' : 's'} found</p>
    ${list.length ? `<div class="grid">${list.map(serviceCard).join('')}</div>` : emptyState('🔍', 'No services match', 'Try a different keyword or category.')}
  </section>`;
};

views.jobs = (q) => {
  const term = (q.get('q') || '').toLowerCase(), cat = q.get('cat') || '', sort = q.get('sort') || 'new';
  let list = API.job.all().filter((j) => {
    const c = API.user.byId(j.clientId) || {};
    return (!term || (j.title + ' ' + j.desc + ' ' + (c.name || '')).toLowerCase().includes(term)) && (!cat || j.category === cat);
  });
  if (sort === 'low') list.sort((a, b) => a.budget - b.budget);
  if (sort === 'high') list.sort((a, b) => b.budget - a.budget);
  const me = API.user.me();
  return `<section class="wrap page">
    <div class="page-head row"><div><h1>Jobs</h1><p class="muted">Projects posted by clients who want student talent.</p></div>
      ${me && me.role === 'client' ? `<button class="btn" data-act="new-job">+ Post a job</button>` : ''}</div>
    ${filterBar('jobs', term, cat, sort, false)}
    <p class="muted small">${list.length} job${list.length === 1 ? '' : 's'} found</p>
    ${list.length ? `<div class="grid">${list.map(jobCard).join('')}</div>` : emptyState('📭', 'No jobs match', 'Try clearing the filters.')}
  </section>`;
};

function filterBar(page, term, cat, sort, rating) {
  return `<form class="filters" data-form="filter" data-page="${page}" role="search">
    <input name="q" value="${esc(term)}" placeholder="Search ${page}…" aria-label="Search" />
    <select name="cat" aria-label="Category"><option value="">All categories</option>${CATEGORIES.map((c) => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
    <select name="sort" aria-label="Sort"><option value="new" ${sort === 'new' ? 'selected' : ''}>Newest</option><option value="low" ${sort === 'low' ? 'selected' : ''}>Price: low to high</option><option value="high" ${sort === 'high' ? 'selected' : ''}>Price: high to low</option>${rating ? `<option value="rating" ${sort === 'rating' ? 'selected' : ''}>Top rated</option>` : ''}</select>
    <button class="btn">Apply</button>
  </form>`;
}

views.students = (q) => {
  const term = (q.get('q') || '').toLowerCase();
  const list = API.user.students().filter((u) => !term || (u.name + ' ' + u.bio + ' ' + (u.skills || []).join(' ') + ' ' + (u.dept || '')).toLowerCase().includes(term));
  return `<section class="wrap page">
    <div class="page-head"><h1>Student directory</h1><p class="muted">Find a student by name or skill.</p></div>
    <form class="filters" data-form="filter" data-page="students" role="search"><input name="q" value="${esc(term)}" placeholder="Search by name or skill…" aria-label="Search students" /><button class="btn">Search</button></form>
    ${list.length ? `<div class="grid">${list.map(studentCard).join('')}</div>` : emptyState('🧑‍🎓', 'No students found', 'Try another skill.')}
  </section>`;
};

views.student = (id) => {
  const u = API.user.byId(id);
  if (!u || u.role !== 'student') return emptyState('🤷', 'Student not found', 'This profile does not exist.', '<a class="btn" href="#/students">Back to directory</a>');
  const me = API.user.me(), rs = API.review.forStudent(u.id), sv = API.service.byStudent(u.id);
  const done = db.orders.filter((o) => o.studentId === u.id && o.status === 'completed').length;
  return `<section class="wrap page">
    <div class="profile-head card">
      ${avatar(u, 'xl')}
      <div class="grow"><h1>${esc(u.name)}</h1>
        <p class="muted">${esc(u.dept || 'Student')}${u.year ? ' · ' + esc(u.year) : ''}${u.college ? ' · ' + esc(u.college) : ''}</p>
        <div>${stars(API.review.avg(u.id), rs.length)} <span class="small muted"> · ${done} project${done === 1 ? '' : 's'} completed</span></div></div>
      <div class="actions">
        ${me && me.id === u.id ? `<button class="btn" data-act="edit-profile">Edit profile</button>` : `<a class="btn" href="#/messages/${u.id}">💬 Message</a>`}
        ${safeUrl(u.portfolio) ? `<a class="btn ghost" href="${esc(safeUrl(u.portfolio))}" target="_blank" rel="noopener noreferrer">Portfolio ↗</a>` : ''}
      </div>
    </div>
    <div class="two">
      <div><h2>About</h2><p>${esc(u.bio || 'No bio yet.')}</p>
        <h2>Skills</h2><div class="tags">${(u.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join('') || '<span class="muted">No skills listed.</span>'}</div></div>
      <div><h2>Reviews</h2>${rs.length ? rs.map(reviewItem).join('') : '<p class="muted">No reviews yet.</p>'}</div>
    </div>
    <h2>Services by ${esc(u.name.split(' ')[0])}</h2>
    ${sv.length ? `<div class="grid">${sv.map(serviceCard).join('')}</div>` : '<p class="muted">No services listed yet.</p>'}
  </section>`;
};

function reviewItem(r) {
  const who = API.user.byId(r.reviewerId) || { name: 'Client', id: 'x' };
  const st = API.user.byId(r.studentId);
  return `<div class="review"><div class="review-h">${avatar(who, 'sm')}<div><b>${esc(who.name)}</b><div class="small muted">${fmtDate(r.date)}${st ? ' · for ' + esc(st.name) : ''}</div></div><span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span></div><p>${esc(r.text)}</p></div>`;
}

views.reviews = () => {
  const list = API.review.all();
  const avg = list.length ? list.reduce((t, r) => t + r.rating, 0) / list.length : 0;
  return `<section class="wrap page">
    <div class="page-head"><h1>Reviews</h1><p class="muted">Ratings help new student freelancers build trust.</p></div>
    <div class="card review-sum"><b class="big">${avg.toFixed(1)}</b><div>${stars(avg)}<div class="small muted">${list.length} reviews overall</div></div></div>
    <div class="reviews">${list.map(reviewItem).join('')}</div>
  </section>`;
};

views.login = () => `<section class="wrap auth">
  <div class="card auth-card"><h1>Welcome back</h1><p class="muted">Log in to manage your services, jobs and messages.</p>
    <form data-form="login"><label>Email<input type="email" name="email" required autocomplete="email" /></label>
      <label>Password<input type="password" name="password" required autocomplete="current-password" /></label>
      <button class="btn block">Log in</button></form>
    <div class="divider"><span>or try the demo</span></div>
    <div class="demo-row"><button class="btn ghost" data-act="demo" data-role="student">🎓 Demo student</button><button class="btn ghost" data-act="demo" data-role="client">🏢 Demo client</button></div>
    <p class="small muted center">New here? <a href="#/register">Create an account</a></p></div></section>`;

views.register = () => `<section class="wrap auth">
  <div class="card auth-card"><h1>Create your account</h1><p class="muted">Join as a student freelancer or as a client.</p>
    <form data-form="register">
      <div class="seg" role="radiogroup" aria-label="Account type"><label><input type="radio" name="role" value="student" checked /><span>🎓 I’m a student</span></label><label><input type="radio" name="role" value="client" /><span>🏢 I’m a client</span></label></div>
      <label>Full name<input name="name" required minlength="2" autocomplete="name" /></label>
      <label>Email<input type="email" name="email" required autocomplete="email" /></label>
      <label id="college-field">College<input name="college" value="Meenakshi Sundararajan Engineering College" /></label>
      <label>Password <span class="muted small">(min 6 characters)</span><input type="password" name="password" required minlength="6" autocomplete="new-password" /></label>
      <button class="btn block">Create account</button></form>
    <p class="small muted center">Already registered? <a href="#/login">Log in</a></p></div></section>`;

views.dashboard = () => {
  const me = API.user.me();
  if (!me) { location.hash = '#/login'; return ''; }
  return me.role === 'student' ? studentDash(me) : clientDash(me);
};

function orderRow(o, me) {
  const other = API.user.byId(me.role === 'student' ? o.clientId : o.studentId) || { name: 'User', id: 'x' };
  const pay = API.payment.forOrder(o.id), rev = API.review.forOrder(o.id);
  let act = '';
  if (me.role === 'client') {
    if (o.status === 'awaiting_payment') act = `<button class="btn sm" data-act="pay" data-id="${o.id}">Pay ${inr(o.amount)}</button>`;
    if (o.status === 'completed' && !rev) act = `<button class="btn sm" data-act="review" data-id="${o.id}">Leave review</button>`;
    if (o.status === 'completed' && rev) act = `<span class="small muted">Reviewed ${'★'.repeat(rev.rating)}</span>`;
  } else {
    if (o.status === 'in_progress') act = `<button class="btn sm" data-act="deliver" data-id="${o.id}">Mark delivered</button>`;
    if (o.status === 'awaiting_payment') act = `<span class="small muted">Waiting for client</span>`;
  }
  return `<tr><td><b>${esc(o.title)}</b><div class="small muted">${me.role === 'student' ? 'Client' : 'Student'}: ${esc(other.name)} · ${fmtDate(o.date)}</div></td>
    <td>${inr(o.amount)}</td><td>${statusBadge(o.status)}${pay ? `<div class="small muted">via ${esc(pay.method)}</div>` : ''}</td>
    <td class="right">${act} <a class="btn ghost sm" href="#/messages/${other.id}" aria-label="Message ${esc(other.name)}">💬</a></td></tr>`;
}
function ordersTable(list, me) {
  return list.length ? `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${list.map((o) => orderRow(o, me)).join('')}</tbody></table></div>`
    : emptyState('🧾', 'No orders yet', me.role === 'student' ? 'Orders appear when a client orders your service or accepts your application.' : 'Order a service or hire an applicant to get started.');
}

function studentDash(me) {
  const orders = API.order.forUser(me), apps = API.application.byStudent(me.id), sv = API.service.byStudent(me.id);
  const earned = orders.filter((o) => o.status === 'completed').reduce((t, o) => t + o.amount, 0);
  const pending = orders.filter((o) => o.status === 'in_progress').reduce((t, o) => t + o.amount, 0);
  const rs = API.review.forStudent(me.id);
  return `<section class="wrap page">
    <div class="page-head row"><div><h1>Hi ${esc(me.name.split(' ')[0])} 👋</h1><p class="muted">Student dashboard</p></div>
      <div class="actions"><a class="btn ghost" href="#/student/${me.id}">View public profile</a><button class="btn" data-act="edit-profile">Edit profile</button></div></div>
    <div class="kpis"><div class="card kpi"><span>Earned</span><b>${inr(earned)}</b></div><div class="card kpi"><span>In progress</span><b>${inr(pending)}</b></div>
      <div class="card kpi"><span>Active services</span><b>${sv.length}</b></div><div class="card kpi"><span>Rating</span><b>${rs.length ? API.review.avg(me.id).toFixed(1) + ' ★' : '—'}</b></div></div>

    <div class="sec-head"><h2>My services</h2><button class="btn sm" data-act="new-service">+ Add service</button></div>
    ${sv.length ? `<div class="grid">${sv.map((s) => `<div class="stack">${serviceCard(s)}<button class="btn danger sm" data-act="del-service" data-id="${s.id}">Remove</button></div>`).join('')}</div>` : emptyState('🛠️', 'You have not listed a service', 'Offer something you are good at, like design, writing or coding.', '<button class="btn" data-act="new-service">Add your first service</button>')}

    <div class="sec-head"><h2>My orders</h2></div>${ordersTable(orders, me)}

    <div class="sec-head"><h2>My applications</h2><a href="#/jobs">Find jobs →</a></div>
    ${apps.length ? `<div class="table-wrap"><table><thead><tr><th>Job</th><th>My bid</th><th>Status</th></tr></thead><tbody>${apps.map((a) => { const j = API.job.byId(a.jobId); return j ? `<tr><td><b>${esc(j.title)}</b><div class="small muted">${fmtDate(a.date)}</div></td><td>${inr(a.bid)}</td><td>${statusBadge(a.status)}</td></tr>` : ''; }).join('')}</tbody></table></div>` : emptyState('📨', 'No applications yet', 'Browse open jobs and send a proposal.', '<a class="btn" href="#/jobs">Browse jobs</a>')}
  </section>`;
}

function clientDash(me) {
  const jobs = API.job.byClient(me.id), orders = API.order.forUser(me);
  const spent = orders.filter((o) => o.status !== 'awaiting_payment').reduce((t, o) => t + o.amount, 0);
  const apps = jobs.reduce((t, j) => t + API.application.forJob(j.id).length, 0);
  return `<section class="wrap page">
    <div class="page-head row"><div><h1>Hi ${esc(me.name.split(' ')[0])} 👋</h1><p class="muted">Client dashboard</p></div>
      <div class="actions"><button class="btn" data-act="new-job">+ Post a job</button></div></div>
    <div class="kpis"><div class="card kpi"><span>Jobs posted</span><b>${jobs.length}</b></div><div class="card kpi"><span>Applications received</span><b>${apps}</b></div>
      <div class="card kpi"><span>Orders</span><b>${orders.length}</b></div><div class="card kpi"><span>Total paid</span><b>${inr(spent)}</b></div></div>

    <div class="sec-head"><h2>My jobs</h2></div>
    ${jobs.length ? jobs.map((j) => {
      const ap = API.application.forJob(j.id);
      return `<div class="card jobbox"><div class="row"><div><h3>${esc(j.title)}</h3><div class="small muted">${catName(j.category)} · Budget ${inr(j.budget)} · ${esc(j.deadline)}</div></div><div class="actions">${statusBadge(j.status)}<button class="btn danger sm" data-act="del-job" data-id="${j.id}">Delete</button></div></div>
        ${ap.length ? `<div class="applicants">${ap.map((a) => { const s = API.user.byId(a.studentId); return s ? `<div class="applicant">${avatar(s, 'sm')}<div class="grow"><a href="#/student/${s.id}"><b>${esc(s.name)}</b></a> · <b>${inr(a.bid)}</b> ${statusBadge(a.status)}<p class="small muted">${esc(a.message)}</p></div>
          <div class="actions">${a.status === 'pending' && j.status === 'open' ? `<button class="btn sm" data-act="accept" data-id="${a.id}">Accept</button><button class="btn ghost sm" data-act="reject" data-id="${a.id}">Decline</button>` : ''}<a class="btn ghost sm" href="#/messages/${s.id}" aria-label="Message ${esc(s.name)}">💬</a></div></div>` : ''; }).join('')}</div>` : '<p class="small muted">No applications yet.</p>'}</div>`;
    }).join('') : emptyState('📝', 'No jobs posted', 'Describe what you need and students will apply.', '<button class="btn" data-act="new-job">Post your first job</button>')}

    <div class="sec-head"><h2>My orders</h2></div>${ordersTable(orders, me)}
  </section>`;
}

views.messages = (partnerId) => {
  const me = API.user.me();
  if (!me) { location.hash = '#/login'; return ''; }
  const partners = API.message.partners(me.id);
  const active = partnerId ? API.user.byId(partnerId) : partners[0];
  if (active && !partners.some((p) => p.id === active.id) && active.id !== me.id) partners.unshift(active);
  const thread = active ? API.message.thread(me.id, active.id) : [];
  return `<section class="wrap page">
    <div class="page-head"><h1>Messages</h1></div>
    <div class="chat card">
      <aside class="chat-list">${partners.length ? partners.map((p) => {
        const last = API.message.thread(me.id, p.id).slice(-1)[0];
        return `<a class="chat-item ${active && p.id === active.id ? 'on' : ''}" href="#/messages/${p.id}">${avatar(p, 'sm')}<div><b>${esc(p.name)}</b><div class="small muted clamp1">${last ? esc(last.text) : 'Start a conversation'}</div></div></a>`;
      }).join('') : '<p class="muted pad">No conversations yet. Visit a profile and press “Message”.</p>'}</aside>
      <div class="chat-main">${active ? `<div class="chat-head">${avatar(active, 'sm')}<b>${esc(active.name)}</b><span class="small muted">${active.role}</span></div>
        <div class="chat-body" id="chat-body">${thread.length ? thread.map((m) => `<div class="bubble ${m.from === me.id ? 'me' : ''}"><p>${esc(m.text)}</p><span>${fmtTime(m.date)}</span></div>`).join('') : '<p class="muted center">Say hello 👋</p>'}</div>
        <form class="chat-form" data-form="send" data-to="${active.id}"><input name="text" placeholder="Type a message…" autocomplete="off" required aria-label="Message" /><button class="btn">Send</button></form>`
        : '<div class="pad">' + emptyState('💬', 'No conversation selected', 'Pick someone from the list.') + '</div>'}</div>
    </div></section>`;
};

views.payments = () => {
  const me = API.user.me();
  if (!me) { location.hash = '#/login'; return ''; }
  const orders = API.order.forUser(me);
  const pays = orders.map((o) => ({ o, p: API.payment.forOrder(o.id) })).filter((x) => x.p);
  const total = pays.reduce((t, x) => t + x.p.amount, 0);
  const due = orders.filter((o) => o.status === 'awaiting_payment');
  return `<section class="wrap page">
    <div class="page-head"><h1>Payments</h1><p class="muted">${me.role === 'client' ? 'Pay for orders and view receipts.' : 'Track payments received for your work.'} <span class="badge amber">Demo mode – no real money moves</span></p></div>
    <div class="kpis"><div class="card kpi"><span>${me.role === 'client' ? 'Total paid' : 'Total received'}</span><b>${inr(total)}</b></div><div class="card kpi"><span>Transactions</span><b>${pays.length}</b></div>
      ${me.role === 'client' ? `<div class="card kpi"><span>Awaiting payment</span><b>${due.length}</b></div>` : ''}</div>
    ${me.role === 'client' && due.length ? `<div class="sec-head"><h2>Pending</h2></div><div class="table-wrap"><table><tbody>${due.map((o) => `<tr><td><b>${esc(o.title)}</b></td><td>${inr(o.amount)}</td><td class="right"><button class="btn sm" data-act="pay" data-id="${o.id}">Pay now</button></td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="sec-head"><h2>History</h2></div>
    ${pays.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>For</th><th>Method</th><th>Amount</th></tr></thead><tbody>${pays.map((x) => `<tr><td>${fmtDate(x.p.date)}</td><td>${esc(x.o.title)}</td><td>${esc(x.p.method)}</td><td><b>${inr(x.p.amount)}</b></td></tr>`).join('')}</tbody></table></div>` : emptyState('💳', 'No payments yet', 'Payments will show here once an order is paid.')}
  </section>`;
};

views.about = () => `<section class="wrap page about">
  <div class="page-head"><span class="eyebrow">Project Review 1 · U24IT503 Web Technologies</span><h1>Student Freelance Marketplace</h1>
    <p class="muted">Meenakshi Sundararajan Engineering College (An Autonomous Institution) · Department of Information Technology · Team 11</p></div>

  <div class="two">
    <div class="card"><h2>Motivation</h2><ul><li>Students have useful skills but struggle to find freelance work.</li><li>General platforms have high competition.</li><li>Clients need an easy way to find student talent.</li><li>Our platform connects students and clients.</li></ul></div>
    <div class="card"><h2>Problem statement</h2><ul><li>Students find it difficult to get freelance opportunities.</li><li>Beginners face high competition.</li><li>Clients may struggle to find suitable student freelancers.</li><li>Existing platforms are not specifically student-focused.</li></ul></div>
  </div>

  <h2>Objectives</h2>
  <div class="objs">${['Create student profiles', 'Add skills and portfolios', 'Post and apply for jobs', 'Offer freelance services', 'Enable messaging', 'Support payments and reviews'].map((o, i) => `<div class="obj"><b>${i + 1}</b>${o}</div>`).join('')}</div>

  <h2>Literature review</h2>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Title</th><th>Dataset</th><th>Advantage</th><th>Disadvantage</th><th>Performance</th></tr></thead><tbody>
    <tr><td>1</td><td>Freelance Marketplace</td><td>User &amp; Job Data</td><td>Connects users</td><td>High competition</td><td>Good</td></tr>
    <tr><td>2</td><td>Skill-Based Matching</td><td>Skill &amp; Job Data</td><td>Better job matching</td><td>Needs accurate skills</td><td>Improved</td></tr>
    <tr><td>3</td><td>Online Labor Market</td><td>Job Data</td><td>Provides opportunities</td><td>Not student-focused</td><td>Effective</td></tr></tbody></table></div>

  <div class="two">
    <div class="card"><h2>Existing systems</h2><p class="muted">General freelance platforms provide profiles, service listings, job posting and applications, messaging, payments and reviews.</p><h3>Limitations</h3><ul><li>High competition</li><li>Difficult for beginners</li><li>Not student-focused</li><li>Limited focus on academic skills</li></ul></div>
    <div class="card"><h2>System architecture</h2>
      <div class="arch"><span>Student / Client</span>↓<span>Frontend</span>↓<span>REST API</span>↓<span>Backend server</span>↓<span>Database</span></div>
      <p class="small muted">Modules: User → Profile → Services → Jobs → Messaging → Payments → Reviews</p></div>
  </div>

  <h2>API integration</h2>
  <div class="table-wrap"><table><thead><tr><th>API</th><th>Purpose</th><th>Used in this demo</th></tr></thead><tbody>
    ${[['User API', 'Login & Profile', 'API.user'], ['Job API', 'Job Management', 'API.job'], ['Service API', 'Service Management', 'API.service'], ['Application API', 'Job Applications', 'API.application'], ['Message API', 'Communication', 'API.message'], ['Payment API', 'Payments', 'API.payment'], ['Review API', 'Ratings', 'API.review']].map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td><code>${r[2]}</code></td></tr>`).join('')}</tbody></table></div>
  <p class="small muted">Flow: Frontend → API → Backend → Database. In this static demo the API layer is implemented in <code>js/app.js</code> on top of <code>localStorage</code>.</p>

  <div class="two">
    <div class="card"><h2>Front end</h2><ul><li><b>HTML5</b> – page structure</li><li><b>CSS3</b> – styling and responsive layout</li><li><b>JavaScript</b> – dynamic interactions</li><li><b>React.js / Bootstrap</b> – planned reusable components</li></ul><p class="small muted">Components: Navbar · Cards · Forms · Dashboard · Search · Chat</p></div>
    <div class="card"><h2>Client-side &amp; server-side</h2><p><b>Client:</b> form validation, search &amp; filtering, dynamic UI, API requests.</p><p><b>Planned server (Node.js / Express.js):</b> authentication, job management, service management, payment handling, database operations.</p></div>
  </div>

  <h2>Team 11</h2>
  <div class="team">${[['Santhosh R', '243115205094'], ['Prasanth Rathnam J', '243115205076'], ['Thilak S', '243115205116']].map((t) => `<div class="card member">${avatar({ id: t[0], name: t[0] }, 'lg')}<b>${t[0]}</b><span class="muted small">Reg no. ${t[1]}</span></div>`).join('')}</div>
</section>`;

/* ---------- modals / forms ---------- */
function openServiceModal(id) {
  const s = API.service.byId(id); if (!s) return;
  const u = API.user.byId(s.studentId), me = API.user.me(), rs = API.review.forStudent(u.id);
  openModal(`<span class="chip">${catIcon(s.category)} ${catName(s.category)}</span><h2>${esc(s.title)}</h2>
    <a class="seller" href="#/student/${u.id}" data-act="close">${avatar(u, 'sm')}<div><b>${esc(u.name)}</b><div>${stars(API.review.avg(u.id), rs.length)}</div></div></a>
    <p>${esc(s.desc)}</p>
    <div class="facts"><div><span class="muted small">Price</span><b>${inr(s.price)}</b></div><div><span class="muted small">Delivery</span><b>${s.days} day${s.days > 1 ? 's' : ''}</b></div></div>
    <div class="actions end">${me && me.id === u.id ? '<span class="muted">This is your service.</span>' : `<a class="btn ghost" href="#/messages/${u.id}" data-act="close">💬 Message</a><button class="btn" data-act="order-service" data-id="${s.id}">Order for ${inr(s.price)}</button>`}</div>`);
}
function openJobModal(id) {
  const j = API.job.byId(id); if (!j) return;
  const c = API.user.byId(j.clientId), me = API.user.me();
  const applied = me && API.application.has(j.id, me.id);
  let action = '';
  if (me && me.id === j.clientId) action = '<span class="muted">This is your job.</span>';
  else if (j.status !== 'open') action = '<span class="muted">This job is no longer open.</span>';
  else if (applied) action = '<span class="badge green">You have applied</span>';
  else action = `<a class="btn ghost" href="#/messages/${c.id}" data-act="close">💬 Message client</a><button class="btn" data-act="apply" data-id="${j.id}">Apply now</button>`;
  openModal(`<div class="row"><span class="chip">${catIcon(j.category)} ${catName(j.category)}</span>${statusBadge(j.status)}</div><h2>${esc(j.title)}</h2>
    <div class="seller">${avatar(c, 'sm')}<div><b>${esc(c.name)}</b><div class="small muted">Client</div></div></div>
    <p>${esc(j.desc)}</p>
    <div class="facts"><div><span class="muted small">Budget</span><b>${inr(j.budget)}</b></div><div><span class="muted small">Timeline</span><b>${esc(j.deadline)}</b></div><div><span class="muted small">Posted</span><b>${fmtDate(j.date)}</b></div></div>
    <div class="actions end">${action}</div>`);
}
function catOptions() { return CATEGORIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join(''); }

const actions = {
  'close': closeModal,
  'close-backdrop': (el, e) => { if (e.target === el) closeModal(); },
  'toggle-nav': (el) => { const open = $('#links').classList.toggle('open'); el.setAttribute('aria-expanded', open); },
  'logout': () => { API.user.logout(); toast('Logged out.'); location.hash = '#/'; render(); },
  'reset-demo': () => { if (confirm('Reset all demo data (accounts, jobs, messages)?')) { resetDB(); toast('Demo data reset.'); location.hash = '#/'; render(); } },
  'demo': (el) => { API.user.login(el.dataset.role === 'student' ? 'aarav@demo.com' : 'client@demo.com', 'demo123'); toast('Logged in as demo ' + el.dataset.role + '.'); location.hash = '#/dashboard'; },
  'open-service': (el) => openServiceModal(el.dataset.id),
  'open-job': (el) => openJobModal(el.dataset.id),
  'order-service': (el) => {
    const me = API.user.me();
    if (!me) { closeModal(); toast('Please log in as a client to order.', 'err'); location.hash = '#/login'; return; }
    if (me.role !== 'client') return toast('Only clients can order services. Log in as a client.', 'err');
    const s = API.service.byId(el.dataset.id);
    API.order.create({ title: s.title, studentId: s.studentId, clientId: me.id, amount: s.price, source: 'service' });
    closeModal(); toast('Order placed! Complete payment to start the work.'); location.hash = '#/dashboard';
  },
  'apply': (el) => {
    const me = API.user.me();
    if (!me) { closeModal(); toast('Please log in as a student to apply.', 'err'); location.hash = '#/login'; return; }
    if (me.role !== 'student') return toast('Only students can apply. Log in as a student.', 'err');
    const j = API.job.byId(el.dataset.id);
    openModal(`<h2>Apply: ${esc(j.title)}</h2><form data-form="apply" data-id="${j.id}">
      <label>Your bid (₹)<input type="number" name="bid" min="100" step="50" value="${j.budget}" required /></label>
      <label>Why are you a good fit?<textarea name="message" rows="4" minlength="10" required placeholder="Share relevant skills and past work…"></textarea></label>
      <button class="btn block">Send proposal</button></form>`);
  },
  'accept': (el) => { API.application.accept(el.dataset.id); toast('Applicant accepted. An order was created – please pay to start.'); render(); },
  'reject': (el) => { API.application.reject(el.dataset.id); toast('Applicant declined.'); render(); },
  'new-service': () => openModal(`<h2>Add a service</h2><form data-form="new-service">
    <label>Title<input name="title" required minlength="8" placeholder="I will design…" /></label>
    <label>Category<select name="category">${catOptions()}</select></label>
    <label>Description<textarea name="desc" rows="4" required minlength="20"></textarea></label>
    <div class="two-in"><label>Price (₹)<input type="number" name="price" min="100" step="50" required /></label><label>Delivery (days)<input type="number" name="days" min="1" max="60" value="3" required /></label></div>
    <button class="btn block">Publish service</button></form>`),
  'new-job': () => openModal(`<h2>Post a job</h2><form data-form="new-job">
    <label>Title<input name="title" required minlength="8" placeholder="Need a poster for…" /></label>
    <label>Category<select name="category">${catOptions()}</select></label>
    <label>Description<textarea name="desc" rows="4" required minlength="20"></textarea></label>
    <div class="two-in"><label>Budget (₹)<input type="number" name="budget" min="100" step="50" required /></label><label>Timeline<input name="deadline" placeholder="e.g. 1 week" required /></label></div>
    <button class="btn block">Post job</button></form>`),
  'del-service': (el) => { if (confirm('Remove this service?')) { API.service.remove(el.dataset.id); toast('Service removed.'); render(); } },
  'del-job': (el) => { if (confirm('Delete this job and its applications?')) { API.job.remove(el.dataset.id); toast('Job deleted.'); render(); } },
  'pay': (el) => {
    const o = API.order.byId(el.dataset.id);
    openModal(`<h2>Pay ${inr(o.amount)}</h2><p class="muted">${esc(o.title)}</p><p class="badge amber">Demo mode – no real payment is made</p>
      <form data-form="pay" data-id="${o.id}"><div class="seg col" role="radiogroup" aria-label="Payment method">
        ${['UPI', 'Card', 'Net banking'].map((m, i) => `<label><input type="radio" name="method" value="${m}" ${i === 0 ? 'checked' : ''} /><span>${m}</span></label>`).join('')}</div>
      <button class="btn block">Confirm payment</button></form>`);
  },
  'deliver': (el) => { API.order.setStatus(el.dataset.id, 'completed'); toast('Marked as delivered. The client can now review your work.'); render(); },
  'review': (el) => openModal(`<h2>Leave a review</h2><form data-form="review" data-id="${el.dataset.id}">
    <div class="rate" role="radiogroup" aria-label="Rating">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="st${n}" name="rating" value="${n}" ${n === 5 ? 'checked' : ''}><label for="st${n}" title="${n} stars">★</label>`).join('')}</div>
    <label>Your feedback<textarea name="text" rows="4" required minlength="5" placeholder="How was the work?"></textarea></label>
    <button class="btn block">Submit review</button></form>`),
  'edit-profile': () => {
    const me = API.user.me();
    openModal(`<h2>Edit profile</h2><form data-form="profile">
      <label>Name<input name="name" value="${esc(me.name)}" required /></label>
      <label>Bio<textarea name="bio" rows="3">${esc(me.bio)}</textarea></label>
      ${me.role === 'student' ? `<label>Skills <span class="muted small">(comma separated)</span><input name="skills" value="${esc((me.skills || []).join(', '))}" /></label>
      <div class="two-in"><label>Department<input name="dept" value="${esc(me.dept)}" /></label><label>Year<input name="year" value="${esc(me.year)}" /></label></div>
      <label>Portfolio link<input type="url" name="portfolio" value="${esc(me.portfolio)}" placeholder="https://…" /></label>` : ''}
      <button class="btn block">Save</button></form>`);
  }
};

const forms = {
  'hero-search': (f) => { location.hash = '#/services?q=' + encodeURIComponent(f.q.value.trim()); },
  'filter': (f) => {
    const p = new URLSearchParams(); ['q', 'cat', 'sort'].forEach((k) => { if (f[k] && f[k].value && !(k === 'sort' && f[k].value === 'new')) p.set(k, f[k].value.trim()); });
    const s = p.toString(); location.hash = '#/' + f.dataset.page + (s ? '?' + s : '');
    if (location.hash === '#/' + f.dataset.page + (s ? '?' + s : '')) render();
  },
  'login': (f) => {
    const u = API.user.login(f.email.value, f.password.value);
    if (!u) return toast('Incorrect email or password.', 'err');
    toast('Welcome back, ' + u.name.split(' ')[0] + '!'); location.hash = '#/dashboard';
  },
  'register': (f) => {
    const r = API.user.register({ role: f.role.value, name: f.name.value, email: f.email.value, password: f.password.value, college: f.college ? f.college.value : '' });
    if (r.error) return toast(r.error, 'err');
    toast('Account created! Complete your profile.'); location.hash = '#/dashboard';
  },
  'new-service': (f, me) => {
    API.service.create({ studentId: me.id, title: f.title.value.trim(), category: f.category.value, desc: f.desc.value.trim(), price: +f.price.value, days: +f.days.value });
    closeModal(); toast('Service published!'); render();
  },
  'new-job': (f, me) => {
    API.job.create({ clientId: me.id, title: f.title.value.trim(), category: f.category.value, desc: f.desc.value.trim(), budget: +f.budget.value, deadline: f.deadline.value.trim() });
    closeModal(); toast('Job posted!'); location.hash = '#/dashboard'; render();
  },
  'apply': (f, me) => {
    if (API.application.has(f.dataset.id, me.id)) return toast('You already applied.', 'err');
    API.application.create({ jobId: f.dataset.id, studentId: me.id, bid: +f.bid.value, message: f.message.value.trim() });
    closeModal(); toast('Proposal sent!'); location.hash = '#/dashboard';
  },
  'pay': (f) => { API.payment.pay(f.dataset.id, f.method.value); closeModal(); toast('Payment successful – work can begin!'); render(); },
  'review': (f, me) => {
    const o = API.order.byId(f.dataset.id);
    API.review.create({ orderId: o.id, reviewerId: me.id, studentId: o.studentId, rating: +f.rating.value, text: f.text.value.trim() });
    closeModal(); toast('Thanks for your review!'); render();
  },
  'profile': (f, me) => {
    const patch = { name: f.name.value.trim(), bio: f.bio.value.trim() };
    if (me.role === 'student') Object.assign(patch, { skills: f.skills.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12), dept: f.dept.value.trim(), year: f.year.value.trim(), portfolio: f.portfolio.value.trim() });
    API.user.update(me.id, patch); closeModal(); toast('Profile saved.'); render();
  },
  'send': (f, me) => {
    const t = f.text.value.trim(); if (!t) return;
    API.message.send(me.id, f.dataset.to, t); render();
    const i = $('.chat-form input'); if (i) i.focus();
  }
};
const needsUser = new Set(['new-service', 'new-job', 'apply', 'review', 'profile', 'send']);

/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = actions[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A' && el.dataset.act !== 'close') e.preventDefault();
  fn(el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#modal-root .modal')) closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-act]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const name = f.dataset.form, me = API.user.me();
  if (needsUser.has(name) && !me) return toast('Please log in first.', 'err');
  forms[name] && forms[name](f, me);
});
document.addEventListener('change', (e) => {
  if (e.target.name === 'role' && $('#college-field')) $('#college-field').style.display = e.target.value === 'student' ? '' : 'none';
});

/* ---------- router ---------- */
function parseHash() {
  const raw = (location.hash || '#/').slice(1);
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
}
function render() {
  const { parts, q } = parseHash();
  const [page, arg] = parts;
  let html;
  switch (page) {
    case undefined: html = views.home(); break;
    case 'services': html = views.services(q); break;
    case 'jobs': html = views.jobs(q); break;
    case 'students': html = views.students(q); break;
    case 'student': html = views.student(arg); break;
    case 'reviews': html = views.reviews(); break;
    case 'login': html = views.login(); break;
    case 'register': html = views.register(); break;
    case 'dashboard': html = views.dashboard(); break;
    case 'messages': html = views.messages(arg); break;
    case 'payments': html = views.payments(); break;
    case 'about': html = views.about(); break;
    default: html = emptyState('🧭', 'Page not found', 'That page does not exist.', '<a class="btn" href="#/">Go home</a>');
  }
  const app = $('#app'); app.innerHTML = html;
  renderNav(); renderFooter();
  const cb = $('#chat-body'); if (cb) cb.scrollTop = cb.scrollHeight;
}
let prevPage = null;
window.addEventListener('hashchange', () => {
  if ($('#modal-root .modal')) closeModal();
  render();
  const page = parseHash().parts[0];
  if (page !== prevPage) { window.scrollTo(0, 0); prevPage = page; }
});
loadDB();
render();
