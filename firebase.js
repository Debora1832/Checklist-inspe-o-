// firebase.js
// Integração com Firebase - Firestore e Storage
// API global: window.fbApi

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
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// ===============================
// CONFIGURAÇÃO DO SEU FIREBASE
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyCAAowsqkoUjIAPhSvq6dUlKMZGdXOO1b0",
  authDomain: "magiuschecklist-9ad0f.firebaseapp.com",
  projectId: "magiuschecklist-9ad0f",
  storageBucket: "magiuschecklist-9ad0f.appspot.com",
  messagingSenderId: "14669686712",
  appId: "1:14669686712:web:1c205b1111cde18379114d",
  measurementId: "G-GQS591WCBD",
};

// ===============================
// INICIALIZAÇÃO
// ===============================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// 🔴 DESATIVADO para evitar erro
// HABILITE NO FUTURO SE QUISER
/*
signInAnonymously(auth).catch((err) => {
  console.error("Erro autenticando anonimamente", err);
});

onAuthStateChanged(auth, (user) => {
  if (user) console.log("Auth OK, UID:", user.uid);
});
*/

// ===============================
// FUNÇÃO DE UPLOAD
// ===============================
async function uploadFileAndGetUrl(path, file) {
  if (!file) return null;

  const ref = sRef(storage, path);
  const snap = await uploadBytes(ref, file);
  return await getDownloadURL(snap.ref);
}

// ===============================
// LOAD ALL — CARREGAR PEÇAS, INSPETORES E INSPEÇÕES
// ===============================
async function loadAll() {
  const pieces = [];
  const inspectors = [];
  const inspections = [];

  // PEÇAS
  try {
    const snap = await getDocs(collection(db, "pieces"));
    snap.forEach((d) => {
      const data = d.data();
      pieces.push({
        code: data.code,
        description: data.description,
        imageUrl: data.imageUrl || null,
        items: (data.items || []).map((it) => ({
          name: it.name,
          description: it.description,
          imageUrl: it.imageUrl || null,
        })),
      });
    });
  } catch (e) {
    console.error("Erro carregando peças:", e);
  }

  // INSPETORES
  try {
    const ref = doc(db, "config", "inspectors");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      (snap.data().list || []).forEach((n) => inspectors.push(n));
    }
  } catch (e) {
    console.error("Erro carregando inspetores:", e);
  }

  // INSPEÇÕES
  try {
    const snap = await getDocs(collection(db, "inspections"));
    snap.forEach((d) => {
      const data = d.data();
      inspections.push({
        date: data.date,
        inspector: data.inspector,
        piece: data.piece,
        description: data.descricao || "",
        items: (data.itens || []).map((it) => ({
          status: it.status,
          motivo: it.motivo || "",
          encaminhamento: it.encaminhamento || "",
          nomeTerceiro: it.nome_terceiro || "",
          fotoUrl: it.fotoUrl || null,
        })),
      });
    });
  } catch (e) {
    console.error("Erro carregando inspeções:", e);
  }

  return { pieces, inspectors, inspections };
}

// ===============================
// SALVAR PEÇA
// ===============================
async function savePiece(piece) {
  if (!piece || !piece.code) return;

  let imageUrl = piece.imageUrl || null;

  if (piece.image instanceof File) {
    const ext = piece.image.name.split(".").pop();
    imageUrl = await uploadFileAndGetUrl(
      `pieces/${piece.code}/main_${Date.now()}.${ext}`,
      piece.image
    );
  }

  const itemsProcessed = [];
  for (let i = 0; i < piece.items.length; i++) {
    const it = piece.items[i];
    let itemImageUrl = it.imageUrl || null;

    if (it.image instanceof File) {
      const ext = it.image.name.split(".").pop();
      itemImageUrl = await uploadFileAndGetUrl(
        `pieces/${piece.code}/items/${i}_${Date.now()}.${ext}`,
        it.image
      );
    }

    itemsProcessed.push({
      name: it.name,
      description: it.description,
      imageUrl: itemImageUrl,
    });
  }

  await setDoc(doc(db, "pieces", piece.code), {
    code: piece.code,
    description: piece.description,
    imageUrl,
    items: itemsProcessed,
  });
}

// ===============================
// DELETAR PEÇA
// ===============================
async function deletePiece(code) {
  if (!code) return;
  await deleteDoc(doc(db, "pieces", code));
}

// ===============================
// SALVAR LISTA DE INSPETORES
// ===============================
async function setInspectors(list) {
  await setDoc(doc(db, "config", "inspectors"), {
    list: list || [],
  });
}

// ===============================
// SALVAR INSPEÇÃO
// ===============================
async function saveInspection(inspec) {
  const timestamp = Date.now();
  const itensToSave = [];

  for (let i = 0; i < inspec.items.length; i++) {
    const it = inspec.items[i];
    let fotoUrl = it.fotoUrl || null;

    if (it.fotoFile instanceof File) {
      const ext = it.fotoFile.name.split(".").pop();
      fotoUrl = await uploadFileAndGetUrl(
        `inspections/${inspec.piece}/${timestamp}_${i}.${ext}`,
        it.fotoFile
      );
    }

    itensToSave.push({
      status: it.status,
      motivo: it.motivo || "",
      encaminhamento: it.encaminhamento || "",
      nome_terceiro: it.nomeTerceiro || "",
      fotoUrl,
    });
  }

  const data = {
    date: inspec.date,
    inspector: inspec.inspector,
    piece: inspec.piece,
    descricao: inspec.description,
    itens: itensToSave,
  };

  const ref = await addDoc(collection(db, "inspections"), data);

  return { id: ref.id, ...data };
}

// ===============================
// EXPOSE API
// ===============================
window.fbApi = {
  loadAll,
  savePiece,
  deletePiece,
  setInspectors,
  saveInspection,
};
