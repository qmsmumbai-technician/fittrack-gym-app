// ============================================
// CLIENT SERVICE — owner-side operations
// Matches the schema in firebase-schema.md: clients/{id} core
// record, with payments as a subcollection.
// ============================================
import { db } from "./firebase-config.js?v=2";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Add a new client — owner flow: purpose → plan → finalize.
// planDurationDays is used to compute expiryDate from joiningDate.
export async function addClient({
  name, phone, purpose, planName, planPrice, planDurationDays,
  joiningDate, sessionTimePref, assignedTrainerId
}) {
  const expiry = new Date(joiningDate);
  expiry.setDate(expiry.getDate() + planDurationDays);

  const ref = await addDoc(collection(db, "clients"), {
    name, phone, purpose, planName, planPrice,
    joiningDate: Timestamp.fromDate(new Date(joiningDate)),
    expiryDate: Timestamp.fromDate(expiry),
    sessionTimePref,
    assignedTrainerId,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

// Log a payment under a client (owner-only per security rules).
export async function logPayment(clientId, { amount, method, note = "" }) {
  await addDoc(collection(db, "clients", clientId, "payments"), {
    amount, method, note,
    date: serverTimestamp()
  });
}

export async function getPayments(clientId) {
  const snap = await getDocs(
    query(collection(db, "clients", clientId, "payments"), orderBy("date", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// All clients (owner dashboard / client list).
export async function getAllClients() {
  const snap = await getDocs(query(collection(db, "clients"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Clients assigned to one trainer (trainer's "My Clients" screen).
export async function getClientsForTrainer(trainerId) {
  const q = query(collection(db, "clients"), where("assignedTrainerId", "==", trainerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getClient(clientId) {
  const snap = await getDoc(doc(db, "clients", clientId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function reassignTrainer(clientId, newTrainerId) {
  await updateDoc(doc(db, "clients", clientId), { assignedTrainerId: newTrainerId });
}

// General-purpose edit — name, phone, purpose, session time, trainer.
// Does NOT touch plan/pricing/dates — that's a renewal action, not an edit.
export async function updateClient(clientId, { name, phone, purpose, sessionTimePref, assignedTrainerId }) {
  await updateDoc(doc(db, "clients", clientId), {
    name, phone, purpose, sessionTimePref, assignedTrainerId
  });
}

// Derives active / expiring / expired from expiryDate — avoids a
// stale "status" field that can drift out of sync with reality.
export function getClientStatus(client) {
  const daysLeft = Math.ceil(
    (client.expiryDate.toDate() - new Date()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= 7) return { status: "expiring", daysLeft };
  return { status: "active", daysLeft };
}

// ---------- trainer management (owner-only, per security rules) ----------
// The app can't create a trainer's login itself (no backend/Cloud Functions).
// Flow: owner creates the trainer's account in Firebase Console → Auth → Add
// user, copies the UID, then calls this to write their profile + role doc.
export async function addTrainerRecord(uid, { name, phone }) {
  await setDoc(doc(db, "trainers", uid), {
    name, phone,
    active: true,
    joinedAt: serverTimestamp(),
    clientCount: 0
  });
}

export async function getAllTrainers() {
  const snap = await getDocs(collection(db, "trainers"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setTrainerActive(uid, active) {
  await updateDoc(doc(db, "trainers", uid), { active });
}
