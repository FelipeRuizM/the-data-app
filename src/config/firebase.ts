import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database'; // Realtime DB
import { getFirestore } from 'firebase/firestore'; // Firestore
import { getAuth } from 'firebase/auth';

// You can find these values in your Firebase Console:
// 1. Go to Project Overview -> Project Settings (gear icon in the top left)
// 2. Scroll down to the "Your apps" section
// 3. Select your Web app (</>) or click "Add app" to register a new one and get this exact block.
export const firebaseConfig = {
  apiKey: "AIzaSyDdHiMPD7T7CjScKYOd4S8Na0QmMXlzXsM",
  authDomain: "hevy-visualizer.firebaseapp.com",
  databaseURL: "https://hevy-visualizer-default-rtdb.firebaseio.com",
  projectId: "hevy-visualizer",
  storageBucket: "hevy-visualizer.firebasestorage.app",
  messagingSenderId: "511160423504",
  appId: "1:511160423504:web:5479a0d97c12108698ad55",
  measurementId: "G-C7JH311XJ7"
};

const app = initializeApp(firebaseConfig);

// Depending on if you stick with Firestore (like your py script) or RealtimeDB, both fallbacks are cleanly linked globally
export const realtimeDb = getDatabase(app);
export const firestoreDb = getFirestore(app);
export const auth = getAuth(app);
