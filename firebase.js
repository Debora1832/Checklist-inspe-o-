// firebase.js
// Integração com Firebase (Auth anônima, Firestore e Storage)
// Expondo API global window.fbApi para o app.js

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

// ==== CONFIG DO SEU PROJETO ====
const firebaseConfig = {
  apiKey: "AIzaSyCAAowsqkoUjIAPhSvq6dUlKMZGdXOO1b0",
  authDomain: "magiuschecklist-9ad0f.firebaseapp.com",
  projectId: "magiuschecklist-9ad0f",
  storageBucket: "magiuschecklist-9ad0f.appspot.com",
  messagingSenderId: "14669686712",
  appId: "1:14669686712:web:1c205b1111cde18379114d",
  measurementId: "G-GQS591WCBD",
};

// ==== INICIALIZAÇÃO ====
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Auth anônima – importante se suas regras pedem usuário autenticado
signInAnonymously(auth).catch((err) => {
  console.error("Erro ao autenticar anonimamente:", err);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Firebase auth OK, uid:", user.uid);
  } else {
    console.warn("Sem usuário autenticado.");
  }
});

// ===== Upload genérico para Storage =====
async function uploadFileAndGetUrl(path, file) {
  if (!file) return null;
  const ref = sRef(storage, path);
  const metadata = { contentType: file.type || "image/jpeg" };
  const snap = await uploadBytes(ref, file, metadata);
  const url = await getDownloadURL(snap.ref);
  return url;
}

// ===== Carregar tudo =====
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
    console.error("Erro ao carregar peças:", e);
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
    console.error("Erro ao carregar inspetores:", e);
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
          encaminhamento: it.encaminhamento || "",
          nomeTerceiro: it.nome_terceiro || "",
          fotoUrl: it.fotoUrl || null,
        })),
      });
    });
  } catch (e) {
    console.error("Erro ao carregar inspeções:", e);
  }

  return { pieces, inspectors, inspections };
}

// ===== Salvar / atualizar peça =====
async function savePiece(piece) {
  if (!piece || !piece.code) return;

  let imageUrl = piece.imageUrl || null;
  if (piece.image instanceof File) {
    const ext =
      (piece.image.name && piece.image.name.split(".").pop()) || "jpg";
    imageUrl = await uploadFileAndGetUrl(
      `pieces/${piece.code}/main_${Date.now()}.${ext}`,
      piece.image
    );
  }

  const itemsToSave = [];
  for (let i = 0; i < (piece.items || []).length; i++) {
    const it = piece.items[i];
    let itemImageUrl = it.imageUrl || null;
    if (it.image instanceof File) {
      const ext =
        (it.image.name && it.image.name.split(".").pop()) || "jpg";
      itemImageUrl = await uploadFileAndGetUrl(
        `pieces/${piece.code}/items/${i}_${Date.now()}.${ext}`,
        it.image
      );
    }
    itemsToSave.push({
      name: it.name,
      description: it.description,
      imageUrl: itemImageUrl,
    });
  }

  const ref = doc(db, "pieces", piece.code);
  await setDoc(ref, {
    code: piece.code,
    description: piece.description || "",
    imageUrl,
    items: itemsToSave,
  });
}

// ===== Deletar peça =====
async function deletePiece(code) {
  if (!code) return;
  await deleteDoc(doc(db, "pieces", code));
}

// ===== Salvar lista de inspetores =====
async function setInspectors(list) {
  const ref = doc(db, "config", "inspectors");
  await setDoc(ref, { list: list || [] });
}

// ===== Salvar inspeção (com upload de fotos dos NOK) =====
async function saveInspection(inspec) {
  const timeStamp = Date.now();
  const itensToSave = [];

  for (let i = 0; i < (inspec.items || []).length; i++) {
    const it = inspec.items[i];
    let fotoUrl = it.fotoUrl || null;

    if (it.fotoFile instanceof File) {
      const ext =
        (it.fotoFile.name && it.fotoFile.name.split(".").pop()) || "jpg";
      fotoUrl = await uploadFileAndGetUrl(
        `inspections/${inspec.piece}/${timeStamp}_${i}.${ext}`,
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

  const docData = {
    date: inspec.date,
    inspector: inspec.inspector,
    piece: inspec.piece,
    descricao: inspec.description || "",
    itens: itensToSave,
  };

  const ref = await addDoc(collection(db, "inspections"), docData);
  return {
    id: ref.id,
    date: docData.date,
    inspector: docData.inspector,
    piece: docData.piece,
    description: docData.descricao,
    items: itensToSave.map((it) => ({
      status: it.status,
      motivo: it.motivo,
      encaminhamento: it.encaminhamento,
      nomeTerceiro: it.nome_terceiro,
      fotoUrl: it.fotoUrl,
    })),
  };
}

// ===== API GLOBAL PARA O app.js =====
window.fbApi = {
  loadAll,
  savePiece,
  deletePiece,
  setInspectors,
  saveInspection,
};
