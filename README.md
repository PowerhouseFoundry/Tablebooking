# Peri‑Peri Grill — Table Booking (Mock Nando’s)

A single‑page, professional‑looking table reservation app designed for a teaching environment. It has:

- **Guest Booking:** name, party size (1–4), special requests (allergies etc.), and time.
- **Admin / Maitre D’:** 4‑table floor plan (Tables 1–4), time slots along the top, bookings list with cancel option.
- **Auto Table Allocation:** picks the first free table at the chosen time (uses browser `localStorage`).

> 🔧 **Swap the branding** by replacing `assets/logo.svg` and `assets/bg.jpg` with your own files. No build step required.

---

## 1) Open & Run

### Option A — Double‑click
1. **Unzip** the downloaded file.
2. Open the folder and double‑click **`index.html`**.  
   Most browsers will open it directly.

### Option B — Live Server (recommended, VS Code)
1. Open the folder in **VS Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right‑click **`index.html`** → **Open with Live Server**.

This gives you clean URLs and avoids any local file restrictions some browsers apply.

---

## 2) Using the App

- Start on **Guest Booking** (default). Fill the form and **Reserve Table**.
- If the chosen time is **fully booked** (all 4 tables taken), you’ll see a message.
- Click **Admin / Maitre D’** to see the floor plan and bookings.
- Select a **time pill** at the top to switch time slots.
- You can **Cancel** a booking from the list; the table becomes free again.

All data is stored **locally in your browser** (no server). To reset everything, clear **Local Storage** for this page or use your browser’s “Clear site data”.

---

## 3) Customising

- Replace images:
  - `assets/logo.svg` — your logo.
  - `assets/bg.jpg` — your background photo.
- Colours and spacing live in **`css/styles.css`** (top of file, `:root` variables).
- Open hours/time slots are set in **`js/app.js`** (`TIMES` generator: 12:00–21:30 in 30‑min steps).
- Table count is set by **`TABLES = [1,2,3,4]`** in `js/app.js` (keep to 4 for this mock‑up).

---

## 4) Admin Tips for the Lesson

- Use the URL hash to deep‑link:
  - `index.html#admin` loads the **Admin** view on open.
  - `index.html#guest` loads the **Guest** view.
- Ask learners to make a booking, then refresh **Admin** to see it appear.
- Practise cancelling and re‑booking at different times to explore conflicts.

---

## 5) Notes

- This demo does not send emails or store data on a server.
- It is designed to look **industry standard** while staying simple for classroom use.
- Accessibility: visible focus states, clear labels, good contrast, keyboard‑friendly controls.

© 2025-09-29
