// ============================================
// AUTH SERVICE
// Handles login/logout and figures out whether the signed-in
// user is the Owner or a Trainer (by checking which collection
// their UID exists in — see firebase-schema.md).
// ============================================
import { auth, db } from "./firebase-config.js?v=2";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// Creates a brand-new Firebase Auth account and signs them in as that user.
// Used by trainer self-signup — no Firebase Console access needed.
export async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

// Returns { role: "owner" | "trainer" | null, profile: {...} | null }
export async function getCurrentRole(uid) {
  const ownerSnap = await getDoc(doc(db, "owners", uid));
  if (ownerSnap.exists()) {
    return { role: "owner", profile: ownerSnap.data() };
  }
  const trainerSnap = await getDoc(doc(db, "trainers", uid));
  if (trainerSnap.exists()) {
    if (trainerSnap.data().active === false) {
      return { role: "trainer_inactive", profile: trainerSnap.data() };
    }
    return { role: "trainer", profile: trainerSnap.data() };
  }
  return { role: null, profile: null };
}

// Call this once on app load to redirect based on role.
// callback receives ({ user, role, profile }) or (null) if signed out.
export function watchAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    const { role, profile } = await getCurrentRole(user.uid);
    callback({ user, role, profile });
  });
}
