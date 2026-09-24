// ============================================
// TRAINER SERVICE — trainer-side operations
// Intake notes, versioned workout plans, and per-day attendance.
// All writes here only succeed if request.auth.uid matches the
// client's assignedTrainerId (enforced in firestore.rules).
// ============================================
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- intake ----------
export async function saveIntake(clientId, trainerId, {
  fitnessLevel, heightCm, weightKg, healthNotes, target
}) {
  await setDoc(doc(db, "clients", clientId, "intake", "current"), {
    fitnessLevel, heightCm, weightKg, healthNotes, target,
    updatedBy: trainerId,
    updatedAt: serverTimestamp()
  });
}

export async function getIntake(clientId) {
  const snap = await getDoc(doc(db, "clients", clientId, "intake", "current"));
  return snap.exists() ? snap.data() : null;
}

// ---------- workout plans (versioned — new doc each time) ----------
export async function createWorkoutPlan(clientId, trainerId, { days, notes = "" }) {
  const ref = await addDoc(collection(db, "clients", clientId, "workoutPlans"), {
    days, notes,
    createdBy: trainerId,
    createdAt: serverTimestamp(),
    sentAt: null
  });
  return ref.id;
}

export async function markPlanSent(clientId, planId) {
  await updateDoc(doc(db, "clients", clientId, "workoutPlans", planId), {
    sentAt: serverTimestamp()
  });
}

export async function getLatestPlan(clientId) {
  const q = query(
    collection(db, "clients", clientId, "workoutPlans"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getPlanById(clientId, planId) {
  const snap = await getDoc(doc(db, "clients", clientId, "workoutPlans", planId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------- attendance (one doc per day, ID = YYYY-MM-DD) ----------
function todayId() {
  return new Date().toISOString().split("T")[0];
}

export async function markCheckIn(clientId, trainerId) {
  await setDoc(doc(db, "clients", clientId, "attendance", todayId()), {
    checkInTime: serverTimestamp(),
    checkOutTime: null,
    markedBy: trainerId
  }, { merge: true });
}

export async function markCheckOut(clientId) {
  await setDoc(doc(db, "clients", clientId, "attendance", todayId()), {
    checkOutTime: serverTimestamp()
  }, { merge: true });
}

export async function getTodayAttendance(clientId) {
  const snap = await getDoc(doc(db, "clients", clientId, "attendance", todayId()));
  return snap.exists() ? snap.data() : null;
}

// Recent attendance days for the owner's read-only view — orders by document
// ID (which is the YYYY-MM-DD date string) since that sorts chronologically
// as plain text, no extra date field needed.
export async function getRecentAttendance(clientId, days = 7) {
  const { collection, query, orderBy, limit, getDocs, documentId } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const q = query(
    collection(db, "clients", clientId, "attendance"),
    orderBy(documentId(), "desc"),
    limit(days)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ date: d.id, ...d.data() }));
}
