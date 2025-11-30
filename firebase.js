// ==============================
// FIREBASE CONFIG
// ==============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==============================
// FUNÇÕES EXPORTADAS
// ==============================

async function loadAll() {
  const pieces = [];
  const inspectors = [];

  const q1 = await getDocs(collection(db, "pieces"));
  q1.forEach(p => pieces.push({ id: p.id, ...p.data() }));

  const q2 = await getDocs(collection(db, "inspectors"));
  q2.forEach(i => inspectors.push(i.data().name));

  return { pieces, inspectors };
}

async function savePiece(piece) {
  if (piece.id) {
    await updateDoc(doc(db, "pieces", piece.id), piece);
  } else {
    await addDoc(collection(db, "pieces"), piece);
  }
}

async function deletePiece(id) {
  await deleteDoc(doc(db, "pieces", id));
}

async function setInspectors(list) {
  const ref = doc(db, "inspectors", "main");
  await setDoc(ref, { list }, { merge: true });
}

async function saveInspection(obj) {
  await addDoc(collection(db, "inspections"), obj);
}

// Disponibiliza ao app.js
window.fbApi = {
  loadAll,
  savePiece,
  deletePiece,
  setInspectors,
  saveInspection
};
