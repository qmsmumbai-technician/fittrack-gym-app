// ============================================
// EXPENSE SERVICE — owner-only
// Simple flat expense log (rent, salaries, utilities, supplies...).
// No UI screen yet to add these from the app — for now, add/edit
// expense documents from the Firebase Console under the "expenses"
// collection; the dashboard reads and totals whatever is there.
// ============================================
import { db } from "./firebase-config.js?v=2";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function addExpense({ category, amount, note = "", date }) {
  await addDoc(collection(db, "expenses"), {
    category, amount, note,
    date: date ? Timestamp.fromDate(new Date(date)) : serverTimestamp(),
    createdAt: serverTimestamp()
  });
}

export async function getAllExpenses() {
  const snap = await getDocs(query(collection(db, "expenses"), orderBy("date", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
