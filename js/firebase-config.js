// ============================================
// FIREBASE CONFIG — FitTrack Gym
// Loaded once, shared across the whole app.
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAs7XpZJym3oW3bi8IEoDHPcCpeCtWEs0M",
  authDomain: "fittrack-gym-ca756.firebaseapp.com",
  projectId: "fittrack-gym-ca756",
  storageBucket: "fittrack-gym-ca756.firebasestorage.app",
  messagingSenderId: "317497474135",
  appId: "1:317497474135:web:67cf06af01cd43ab44b712",
  measurementId: "G-76NL8M0Y0D"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
