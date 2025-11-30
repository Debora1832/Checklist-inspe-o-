// firebase.js
// Expor window.fbApi para o app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ===== CONFIGURE AQUI SEU PROJETO ===== */
const firebaseConfig = {
  apiKey: "SUA_APIKEY_AQUI",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "ID",
  appId: "APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Carregar peças / inspetores / inspeções
async function loadAll() {
  const pieces = [];
  const inspectors = [];
  const inspections = [];

  // Peças
  try {
    const snap = await getDocs(collection(db, "pieces"));
    snap.forEach((d) => {
      const data = d.data();
      pieces.push({
        code: data.code,
        description: data.description,
        image: null,
        imageUrl: data.imageUrl || null,
        items: (data.items || []).map((it) => ({
          name: it.name,
          description: it.description,
          image: null,
          imageUrl: it.imageUrl || null,
        })),
      });
    });
  } catch (e) {
    console.warn("Erro ao carregar peças:", e);
  }

  // Inspetores
  try {
    const ref = doc(db, "config", "inspectors");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const list = snap.data().list || [];
      list.forEach((n) => {
        if (typeof n === "string" && n) inspectors.push(n);
      });
    }
  } catch (e) {
    console.warn("Erro ao carregar inspetores:", e);
  }

  // Inspeções
  try {
    const snap = await getDocs(collection(db, "inspections"));
    snap.forEach((d) => {
      const data = d.data();
      inspections.push({
        date: data.date,
        inspector: data.inspector,
        piece: data.piece,
        description: data.description || data.descricao || "",
        items: (data.items || data.itens || []).map((it) => ({
          status: it.status,
          motivo: it.motivo || "",
        })),
      });
    });
  } catch (e) {
    console.warn("Erro ao carregar inspeções:", e);
  }

  return { pieces, inspectors, inspections };
}

// Salvar / atualizar peça
async function savePiece(piece) {
  if (!piece || !piece.code) return;
  const ref = doc(db, "pieces", piece.code);
  await setDoc(ref, {
    code: piece.code,
    description: piece.description || "",
    imageUrl: piece.imageUrl || null,
    items: (piece.items || []).map((it) => ({
      name: it.name,
      description: it.description || "",
      imageUrl: it.imageUrl || null,
    })),
  });
}

// Deletar peça
async function deletePiece(code) {
  if (!code) return;
  await deleteDoc(doc(db, "pieces", code));
}

// Salvar inspetores (array de nomes)
async function setInspectors(list) {
  const ref = doc(db, "config", "inspectors");
  await setDoc(ref, { list: list || [] });
}

// Salvar inspeção
async function saveInspection(inspec) {
  const ref = await addDoc(collection(db, "inspections"), {
    date: inspec.date,
    inspector: inspec.inspector,
    piece: inspec.piece,
    description: inspec.description || "",
    items: (inspec.items || []).map((it) => ({
      status: it.status,
      motivo: it.motivo || "",
    })),
  });
  return { id: ref.id };
}

// Expor API global
window.fbApi = {
  loadAll,
  savePiece,
  deletePiece,
  setInspectors,
  saveInspection,
};
