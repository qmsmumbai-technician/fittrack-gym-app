// ============================================
// EQUIPMENT SERVICE — owner-only
// Equipment records + a versioned maintenance/repair log per item,
// same subcollection pattern as workoutPlans for clients.
// ============================================
import { db } from "./firebase-config.js?v=2";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- equipment ----------
export async function addEquipment({
  name, category, supplierName, supplierContact,
  purchaseDate, purchasePrice, warrantyExpiry, notes
}) {
  const ref = await addDoc(collection(db, "equipment"), {
    name, category,
    supplierName: supplierName || "",
    supplierContact: supplierContact || "",
    purchaseDate: purchaseDate ? Timestamp.fromDate(new Date(purchaseDate)) : null,
    purchasePrice: purchasePrice || null,
    warrantyExpiry: warrantyExpiry ? Timestamp.fromDate(new Date(warrantyExpiry)) : null,
    status: "working",
    notes: notes || "",
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function getAllEquipment() {
  const snap = await getDocs(query(collection(db, "equipment"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getEquipment(equipmentId) {
  const snap = await getDoc(doc(db, "equipment", equipmentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateEquipmentStatus(equipmentId, status) {
  await updateDoc(doc(db, "equipment", equipmentId), { status });
}

export async function updateEquipment(equipmentId, {
  name, category, supplierName, supplierContact, warrantyExpiry, notes
}) {
  await updateDoc(doc(db, "equipment", equipmentId), {
    name, category,
    supplierName: supplierName || "",
    supplierContact: supplierContact || "",
    warrantyExpiry: warrantyExpiry ? Timestamp.fromDate(new Date(warrantyExpiry)) : null,
    notes: notes || ""
  });
}

// Derives a warning flag from warrantyExpiry — no stale field to drift.
export function getWarrantyStatus(equipment) {
  if (!equipment.warrantyExpiry) return { status: "none", daysLeft: null };
  const daysLeft = Math.ceil(
    (equipment.warrantyExpiry.toDate() - new Date()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= 30) return { status: "expiring", daysLeft };
  return { status: "covered", daysLeft };
}

// ---------- maintenance log (subcollection, append-only history) ----------
export async function logMaintenance(equipmentId, { issue, actionTaken, cost, servicedBy }) {
  await addDoc(collection(db, "equipment", equipmentId, "maintenanceLog"), {
    issue, actionTaken: actionTaken || "",
    cost: cost || null,
    servicedBy: servicedBy || "",
    date: serverTimestamp()
  });
}

export async function getMaintenanceLog(equipmentId) {
  const snap = await getDocs(
    query(collection(db, "equipment", equipmentId, "maintenanceLog"), orderBy("date", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
