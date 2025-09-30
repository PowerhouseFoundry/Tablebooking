// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  query, where, getDocs, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Your Firebase config from the console
const firebaseConfig = {
  apiKey: "AIzaSyBuWdyOZVa79VO8gBbRlhK7p1AU4q6M0eA",
  authDomain: "table-booking-d306f.firebaseapp.com",
  projectId: "table-booking-d306f",
  storageBucket: "table-booking-d306f.firebasestorage.app",
  messagingSenderId: "371925755387",
  appId: "1:371925755387:web:e6f16160fd2858fd2f975e",
  measurementId: "G-QTH15Q4JZN"   // <-- optional, doesn’t hurt to keep
};

// Initialize Firebase + Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- Helpers used in app.js ----
const col = (name) => collection(db, name);

export async function addBooking(data) {
  const ref = await addDoc(col("bookings"), data);
  return { id: ref.id, ...data };
}

export async function getBookingsForDate(date) {
  const q = query(col("bookings"), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeBookingsForDate(date, cb) {
  const q = query(col("bookings"), where("date", "==", date));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function removeBooking(id) {
  await deleteDoc(doc(db, "bookings", id));
}
