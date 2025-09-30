import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  query, where, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  // paste your values from the console here
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// (export helper functions here if you’re using the firebase.js wrapper I gave you)
