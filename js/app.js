
/* Booking system (clean v13)
   - 4 tables (1–4)
   - 15-minute slots from 12:00 to 21:00 (1h seating -> last out 22:00)
   - Each booking lasts 60 minutes
   - Data stored in localStorage
*/

// ====== Time helpers ======
const TIMES = (() => {
  const out = [];
  const start = 12 * 60;  // 12:00
  const end = 21 * 60;    // 21:00 last seating
  for (let m = start; m <= end; m += 15) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(`${hh}:${mm}`);
  }
  return out;
})();

const TABLES = [1,2,3,4];
const lsKey = "ppg_bookings_v1";

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function timeToMin(t){ const [h,m] = t.split(':').map(Number); return h*60 + m; }
function overlapsOneHour(t1, t2){
  const a1 = timeToMin(t1), a2 = a1 + 60;
  const b1 = timeToMin(t2), b2 = b1 + 60;
  return a1 < b2 && b1 < a2;
}

// ====== Storage ======
function readBookings(){
  try{ return JSON.parse(localStorage.getItem(lsKey)) || []; }
  catch(e){ return []; }
}
function writeBookings(list){
  localStorage.setItem(lsKey, JSON.stringify(list));
}
function uid(){ return Math.random().toString(36).slice(2,9); }

// ====== Guest form ======
function populateTimeSelect(){
  const sel = document.getElementById('time');
  if(!sel) return;
  sel.innerHTML = TIMES.map(t => `<option value="${t}">${t}</option>`).join('');
}
function setupDateControls(){
  const todayRadio = document.getElementById('dateToday');
  const pickRadio = document.getElementById('datePick');
  const dateInput = document.getElementById('dateInput');
  if(!todayRadio || !pickRadio || !dateInput) return;

  dateInput.value = todayISO();
  dateInput.disabled = true;

  todayRadio.addEventListener('change', () => {
    dateInput.value = todayISO();
    dateInput.disabled = true;
  });
  pickRadio.addEventListener('change', () => {
    dateInput.disabled = false;
    if(!dateInput.value) dateInput.value = todayISO();
    dateInput.focus();
  });
}
function getSelectedGuestDate(){
  const todayRadio = document.getElementById('dateToday');
  const dateInput = document.getElementById('dateInput');
  return (todayRadio && todayRadio.checked) ? todayISO() : (dateInput.value || todayISO());
}

// ====== Admin controls ======
function populateAdminTimeSelect(){
  const sel = document.getElementById('adminTimeSelect');
  if(!sel) return;
  sel.innerHTML = TIMES.map(t => `<option value="${t}">${t}</option>`).join('');
  sel.onchange = () => selectTime(sel.value);
}
function setupAdminDate(){
  const adminDate = document.getElementById('adminDate');
  if(!adminDate) return;
  if(!adminDate.value) adminDate.value = todayISO();
  adminDate.addEventListener('change', () => {
    const active = document.querySelector('.time-pill.active');
    const slot = active ? active.dataset.slot : TIMES[0];
    selectTime(slot);
  });
}
function getAdminDate(){
  const adminDate = document.getElementById('adminDate');
  return (adminDate && adminDate.value) ? adminDate.value : todayISO();
}

// ====== Booking logic ======
function findFreeTableAt(date, time){
  const bookings = readBookings().filter(b => b.date === date && overlapsOneHour(b.time, time));
  const used = new Set(bookings.map(b => b.table));
  for (const t of TABLES) {
    if (!used.has(t)) return t;
  }
  return null;
}

function handleBookingSubmit(e){
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const size = parseInt(document.getElementById('size').value,10);
  const notes = document.getElementById('notes').value.trim();
  const time = document.getElementById('time').value;
  const date = getSelectedGuestDate();
  const statusEl = document.getElementById('formStatus');
  if (statusEl) statusEl.className = "status";

  if(!name){
    if(statusEl){ statusEl.textContent = "⚠ Please enter the name for the booking."; statusEl.classList.add('show','error'); }
    return;
  }

  const free = findFreeTableAt(date, time);
  if(!free){
    if(statusEl){ statusEl.textContent = "❌ Sorry — all 4 tables are fully booked for this time."; statusEl.classList.add('show','error'); }
    return;
  }

  const bookings = readBookings();
  bookings.push({ id: uid(), name, size, notes, date, time, table: free, createdAt: Date.now() });
  writeBookings(bookings);

  if(statusEl){
    statusEl.textContent = `✅ Thank you ${name}, your table ${free} is booked for ${size} at ${time} on ${date}.`;
    statusEl.classList.add('show','ok');
  }

  setTimeout(() => {
    const form = document.getElementById('bookingForm');
    if(form) form.reset();
    populateTimeSelect();
  }, 1500);
}

// ====== Admin rendering ======
function renderTimebar(){
  const tb = document.getElementById('timebar');
  if(!tb) return;
  tb.innerHTML = TIMES.map(t => `<button class="time-pill" data-slot="${t}">${t}</button>`).join('');
  tb.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-slot]');
    if(b){ selectTime(b.dataset.slot); }
  });
}

function selectTime(slot){
  // highlight selected pill
  document.querySelectorAll('.time-pill').forEach(p => p.classList.toggle('active', p.dataset.slot === slot));

  const header = document.getElementById('currentSlot');
  if(header) header.textContent = `${getAdminDate()} @ ${slot}`;

  const asel = document.getElementById('adminTimeSelect');
  if(asel && asel.value !== slot){ asel.value = slot; }

  // reset floorplan
  document.querySelectorAll('.table').forEach(el => {
    el.classList.remove('booked');
    const badge = el.querySelector('.badge');
    if(badge) badge.textContent = '';
  });

  // filter bookings for date & slot
  const bookings = readBookings().filter(b => b.date === getAdminDate() && b.time === slot).sort((a,b) => a.table - b.table);

  // annotate tables
  for(const bk of bookings){
    const badge = document.getElementById(`t${bk.table}`);
    if(badge){
      const initials = bk.name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0,3);
      badge.textContent = `${initials} • ${bk.size}`;
      badge.parentElement.classList.add('booked');
    }
  }

  // render list
  const ul = document.getElementById('bookingList');
  if(ul){
    ul.innerHTML = bookings.map(b => `
      <li class="booking-item">
        <div>
          <div class="name">${escapeHtml(b.name)} <span class="meta">(${b.size} people) — Table ${b.table}</span></div>
          ${b.notes ? `<div class="meta">Notes: ${escapeHtml(b.notes)}</div>` : ``}
        </div>
        <button class="danger" data-cancel="${b.id}">Cancel</button>
      </li>
    `).join('');

    ul.onclick = (e) => {
      const btn = e.target.closest('button[data-cancel]');
      if(!btn) return;
      const id = btn.dataset.cancel;
      const all = readBookings();
      const next = all.filter(b => b.id !== id);
      writeBookings(next);
      selectTime(slot);
    };
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

// ====== Nav + init ======
function showGuest(){
  document.getElementById('guestView').classList.add('active');
  document.getElementById('adminView').classList.remove('active');
  const g = document.getElementById('showGuest'); const a = document.getElementById('showAdmin');
  if(g){ g.setAttribute('aria-pressed','true'); g.classList.add('primary'); g.classList.remove('ghost'); }
  if(a){ a.setAttribute('aria-pressed','false'); a.classList.add('ghost'); a.classList.remove('primary'); }
  window.location.hash = '#guest';
}
function showAdmin(){
  document.getElementById('adminView').classList.add('active');
  document.getElementById('guestView').classList.remove('active');
  const g = document.getElementById('showGuest'); const a = document.getElementById('showAdmin');
  if(g){ g.setAttribute('aria-pressed','false'); g.classList.add('ghost'); g.classList.remove('primary'); }
  if(a){ a.setAttribute('aria-pressed','true'); a.classList.add('primary'); a.classList.remove('ghost'); }
  window.location.hash = '#admin';
}

function initFromHash(){
  if(location.hash === '#admin'){ showAdmin(); }
  else{ showGuest(); }
}

function init(){
  populateTimeSelect();
  populateAdminTimeSelect();
  setupDateControls();
  setupAdminDate();
  renderTimebar();
  const defaultSlot = TIMES[0];
  selectTime(defaultSlot);

  const form = document.getElementById('bookingForm');
  if(form) form.addEventListener('submit', handleBookingSubmit);
  const gBtn = document.getElementById('showGuest');
  const aBtn = document.getElementById('showAdmin');
  if(gBtn) gBtn.addEventListener('click', showGuest);
  if(aBtn) aBtn.addEventListener('click', showAdmin);
  initFromHash();
}

document.addEventListener('DOMContentLoaded', () => { try { init(); } catch(e){ console.error('Init error:', e); }});
