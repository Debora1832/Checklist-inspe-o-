// firebase.js
// Script de integração Firebase (carregado como type="module" no index.html)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// === CONFIG DO PROJETO (a mesma que você já estava usando) ===
const firebaseConfig = {
  apiKey: "AIzaSyCAAowsqkoUjIAPhSvq6dUlKMZGdXOO1b0",
  authDomain: "magiuschecklist-9ad0f.firebaseapp.com",
  projectId: "magiuschecklist-9ad0f",
  storageBucket: "magiuschecklist-9ad0f.appspot.com",
  messagingSenderId: "14669686712",
  appId: "1:14669686712:web:1c205b1111cde18379114d",
  measurementId: "G-GQS591WCBD"
};

// Inicializa
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Login anônimo (para regras de segurança)
signInAnonymously(auth)
  .then(() => console.log("Firebase Auth anônimo ok"))
  .catch(err => console.warn("Falha ao autenticar anonimamente:", err));

onAuthStateChanged(auth, user => {
  if (user) {
    console.log("Auth state: usuário", user.uid);
  } else {
    console.log("Auth state: não autenticado");
  }
});

// ==== Função genérica para upload ====
async function uploadFileAndGetUrl(path, file) {
  if (!file) return null;
  const ref = sRef(storage, path);
  const metadata = { contentType: file.type || "image/jpeg" };
  const result = await uploadBytes(ref, file, metadata);
  const url = await getDownloadURL(result.ref);
  return url;
}

// ==== Carregar tudo (peças, inspetores, inspeções) ====
async function loadAll() {
  const pieces = [];
  let inspectors = [];
  let inspections = [];

  // Peças
  try {
    const piecesSnap = await getDocs(collection(db, "pieces"));
    piecesSnap.docs.forEach(d => {
      const data = d.data();
      pieces.push({
        code: data.code,
        description: data.description,
        image: null,
        imageUrl: data.imageUrl || null,
        items: (data.items || []).map(it => ({
          name: it.name,
          description: it.description,
          image: null,
          imageUrl: it.imageUrl || null
        }))
      });
    });
  } catch (err) {
    console.warn("Erro ao carregar pieces:", err);
  }

  // Inspetores (agora objetos: {name, photoUrl})
  try {
    const inspRef = doc(db, "config", "inspectors");
    const inspSnap = await getDoc(inspRef);
    if (inspSnap && inspSnap.exists()) {
      const rawList = inspSnap.data().list || [];
      inspectors = rawList.map(it =>
        typeof it === "string" ? { name: it, photoUrl: null } : it
      );
    }
  } catch (err) {
    console.warn("Erro ao carregar inspectors:", err);
  }

  // Inspeções
  try {
    const inspecSnap = await getDocs(collection(db, "inspections"));
    inspecSnap.docs.forEach(d => {
      const data = d.data();
      inspections.push({
        id: d.id,
        date: data.date,
        inspector: data.inspector,
        piece: data.piece,
        descricao: data.descricao || "",
        itens: (data.itens || []).map(it => ({
          status: it.status,
          motivo: it.motivo,
          encaminhamento: it.encaminhamento,
          nome_terceiro: it.nome_terceiro || "",
          foto: null,
          fotoUrl: it.fotoUrl || null
        }))
      });
    });
  } catch (err) {
    console.warn("Erro ao carregar inspections:", err);
  }

  return { pieces, inspectors, inspections };
}

// ==== Salvar peça (com itens e imagens) ====
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
  for (let idx = 0; idx < (piece.items || []).length; idx++) {
    const it = piece.items[idx];
    let itemImageUrl = it.imageUrl || null;

    if (it.image instanceof File) {
      const ext =
        (it.image.name && it.image.name.split(".").pop()) || "jpg";
      itemImageUrl = await uploadFileAndGetUrl(
        `pieces/${piece.code}/items/${idx}_${Date.now()}.${ext}`,
        it.image
      );
    }

    itemsToSave.push({
      name: it.name,
      description: it.description,
      imageUrl: itemImageUrl
    });
  }

  const ref = doc(db, "pieces", piece.code);
  await setDoc(ref, {
    code: piece.code,
    description: piece.description,
    imageUrl,
    items: itemsToSave
  });
  console.log("Peça salva:", piece.code);
}

// ==== Deletar peça ====
async function deletePiece(code) {
  if (!code) return;
  await deleteDoc(doc(db, "pieces", code));
  console.log("Peça removida:", code);
}

// ==== Salvar inspetores (com foto) ====
async function setInspectors(list) {
  const processed = [];

  for (let i = 0; i < (list || []).length; i++) {
    const insp = list[i];
    if (!insp || !insp.name) continue;

    let photoUrl = insp.photoUrl || null;
    if (insp.photo instanceof File) {
      const ext =
        (insp.photo.name && insp.photo.name.split(".").pop()) || "jpg";
      const safeName = insp.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      photoUrl = await uploadFileAndGetUrl(
        `inspectors/${safeName}_${Date.now()}.${ext}`,
        insp.photo
      );
    }

    processed.push({
      name: insp.name,
      photoUrl
    });
  }

  const ref = doc(db, "config", "inspectors");
  await setDoc(ref, { list: processed });
  console.log("Inspetores salvos:", processed.length);
}

// ==== Salvar inspeção (com fotos) ====
async function saveInspection(inspec) {
  const timeStamp = Date.now();
  const itensToSave = [];

  for (let idx = 0; idx < (inspec.itens || []).length; idx++) {
    const it = inspec.itens[idx];
    let fotoUrl = it.fotoUrl || null;

    if (it.foto instanceof File) {
      const ext =
        (it.foto.name && it.foto.name.split(".").pop()) || "jpg";
      fotoUrl = await uploadFileAndGetUrl(
        `inspections/${inspec.piece}/${timeStamp}_${idx}.${ext}`,
        it.foto
      );
    }

    itensToSave.push({
      status: it.status,
      motivo: it.motivo,
      encaminhamento: it.encaminhamento,
      nome_terceiro: it.nome_terceiro || "",
      fotoUrl
    });
  }

  const docData = {
    date: inspec.date,
    inspector: inspec.inspector,
    piece: inspec.piece,
    descricao: inspec.descricao || "",
    itens: itensToSave
  };

  const ref = await addDoc(collection(db, "inspections"), docData);
  console.log("Inspeção salva, id:", ref.id);
  return { id: ref.id, ...docData };
}

// ==== Expor para app.js ====
window.fbApi = {
  loadAll,
  savePiece,
  deletePiece,
  setInspectors,
  saveInspection
};
