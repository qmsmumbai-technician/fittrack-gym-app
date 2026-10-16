// ============================================
// ENQUIRY SERVICE — owner-only
// Tracks leads/walk-ins who haven't joined as a client yet: name, phone,
// what they're interested in, and a follow-up date to call them back on.
// status: "open" (needs follow-up) | "converted" (became a client) | "lost"
// ============================================
import { db } from "./firebase-config.js?v=2";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function addEnquiry({ name, phone, interest = "", followUpDate, note = "" }) {
  await addDoc(collection(db, "enquiries"), {
    name, phone, interest, note,
    followUpDate: followUpDate ? Timestamp.fromDate(new Date(followUpDate)) : null,
    status: "open",
    createdAt: serverTimestamp()
  });
}

export async function getAllEnquiries() {
  const snap = await getDocs(query(collection(db, "enquiries"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setEnquiryStatus(enquiryId, status) {
  await updateDoc(doc(db, "enquiries", enquiryId), { status });
}

export async function updateFollowUpDate(enquiryId, followUpDate) {
  await updateDoc(doc(db, "enquiries", enquiryId), {
    followUpDate: followUpDate ? Timestamp.fromDate(new Date(followUpDate)) : null
  });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Open enquiries whose follow-up date is today — used by the dashboard's
// "Today's Follow-Ups" card and by the enquiry list screen's "Today" filter.
export function filterTodayFollowUps(enquiries) {
  const today = new Date();
  return enquiries.filter(e =>
    e.status === "open" && e.followUpDate && isSameDay(e.followUpDate.toDate(), today)
  );
}
