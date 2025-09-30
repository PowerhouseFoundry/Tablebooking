import {
  addBooking,
  getBookingsForDate,
  subscribeBookingsForDate,
  removeBooking
} from './firebase.js';

/* Firebase-backed booking system
   - 4 tables (1–4)
   - 15-minute slots from 12:00 to 21:00 (1h seating)
   - Each booking lasts 60 minutes
   - Data lives in Firestore (multi-device)
*/

// ====== Time helpers ======
const TIMES = (() => {
  const out = [];
  const start = 12 * 60;  // 12:00
  const end = 21 * 60;    // 21:00 last seating (leaves at 22:00)
  for (let m = start; m <= end; m += 15) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(`${hh}:${mm}`);
  }
  return out;
})();

const TABLES = [1,2,3,4];

// Live cache for the currently viewed admin date
let currentAdminDate = null;
let currentBookings = [];   // latest snapshot from Firestore for currentAdminDate
let unsubscribe = null;

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
function escapeHtml(s){
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

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
  // start live subscription for this date
  startDateSubscription(adminDate.value);
  adminDate.addEventListener('change', () => {
    const d = adminDate.value || todayISO();
    startDateSubscription(d);
    const active = document.querySelector('.time-pill.active');
    const slot = active ? active.dataset.slot : TIMES[0];
    selectTime(slot);
  });
}
function getAdminDate(){
  const adminDate = document.getElementById('adminDate');
  return (adminDate && adminDate.value) ? adminDate.value : todayISO();
}
function startDateSubscription(date){
  currentAdminDate = date;
  if (unsubscribe) { try { unsubscribe(); } catch{}; unsubscribe = null; }
  unsubscribe = subscribeBookingsForDate(date, (docs) => {
    currentBookings = docs;
    // re-render current slot if visible
    const active = document.querySelector('.time-pill.active');
    if (active) selectTime(active.dataset.slot);
  });
}

// ====== Booking logic (uses cache for the selected date) ======
function findFreeTableAt(date, time){
  const overlapping = currentBookings.filter(b => b.date === date && overlapsOneHour(b.time, time));
  const used = new Set(overlapping.map(b => b.table));
  for (const t of TABLES) {
    if (!used.has(t)) return t;
  }
  return null;
}

async function handleBookingSubmit(e){
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

  // Ensure we have the latest bookings for that date (one-off fetch if guest is booking a date
  // different from the current admin subscription date).
  if (currentAdminDate !== date) {
    currentAdminDate = date;
    currentBookings = await getBookingsForDate(date);
  }

  const free = findFreeTableAt(date, time);
  if(!free){
    if(statusEl){ statusEl.textContent = "❌ Sorry — all 4 tables are fully booked for this time."; statusEl.classList.add('show','error'); }
    return;
  }

  try{
    await addBooking({ name, size, notes, date, time, table: free, createdAt: Date.now() });
    if(statusEl){
      statusEl.textContent = `✅ Thank you ${escapeHtml(name)}, your table ${free} is booked for ${size} at ${time} on ${date}.`;
      statusEl.classList.add('show','ok');
    }
    setTimeout(() => {
      const form = document.getElementById('bookingForm');
      if(form) form.reset();
      populateTimeSelect();
    }, 1500);
  }catch(err){
    if(statusEl){
      statusEl.textContent = `❌ ${escapeHtml(err.message || 'Could not book')}`;
      statusEl.classList.add('show','error');
    }
  }
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

  // filter bookings for current admin date & slot (from live cache)
  const d = getAdminDate();
  const bookings = currentBookings
    .filter(b => b.date === d && b.time === slot)
    .sort((a,b) => a.table - b.table);

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

    ul.onclick = async (e) => {
      const btn = e.target.closest('button[data-cancel]');
      if(!btn) return;
      try{
        await removeBooking(btn.dataset.cancel);
        // onSnapshot will refresh the UI automatically
      }catch(err){
        alert('Could not cancel: ' + (err?.message || 'unknown error'));
      }
    };
  }
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

  // Start on first slot and subscribe to today's date by default
  selectTime(TIMES[0]);

  const form = document.getElementById('bookingForm');
  if(form) form.addEventListener('submit', handleBookingSubmit);
  const gBtn = document.getElementById('showGuest');
  const aBtn = document.getElementById('showAdmin');
  if(gBtn) gBtn.addEventListener('click', showGuest);
  if(aBtn) aBtn.addEventListener('click', showAdmin);
  initFromHash();
}

document.addEventListener('DOMContentLoaded', () => { try { init(); } catch(e){ console.error('Init error:', e); }});
