import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC7_CFEbaC9cy2tcyR5JbHqsS5HfskAHo4",
  authDomain: "intouch-v2-92217.firebaseapp.com",
  projectId: "intouch-v2-92217",
  storageBucket: "intouch-v2-92217.firebasestorage.app",
  messagingSenderId: "1031162649483",
  appId: "1:1031162649483:web:0920bb8e9843c1058fad8e",
  measurementId: "G-ZGJP388BSB",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { app, auth, onAuthStateChanged, type User };

export async function registerUser(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  return signOut(auth);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}
