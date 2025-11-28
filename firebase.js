// firebase.js  (carregado como <script type="module">)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, addDoc,
  getDocs, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAAowsqkoUjIAPhSvq6dUlKMZGdXOO1b0",
  authDomain: "magiuschecklist-9ad0f.firebaseapp.com",
  projectId: "magiuschecklist-9ad0f",
  storageBucket: "magiuschecklist-9ad0f.appspot.com",
  messagingSenderId: "14669686712",
  appId: "1:14669686712:web:1c205b1111cde18379114d",
  measurementId: "G-GQS591WCBD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Auth anônimo
const auth = getAuth(app);
signInAnonymously(auth).catch(err => {
  console.warn("Falha ao autenticar anonimamente:", err);
});
onAuthStateChanged(auth, user => {
  if (user) console.log("Auth OK:", user.uid);
});

// upload helper
async function uploadFileAndGetUrl(path, file) {
  if (!file) return null;
  const ref = sRef(storage, path);
  const metadata = { contentType: file.type || "image/jpeg" };
  const snap = await uploadBytes(ref, file, metadata);
  const url = await getDownloadURL(snap.ref);
  return url;
}

// Carrega tudo
async function loadAll() {
  const pieces = [];
  let inspectors = [];
  const inspections = [];

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
  } catch (e) {
    console.warn("Erro ao carregar 'pieces':", e);
  }

  // Inspetores
  try {
    const inspRef = doc(db, "config", "inspectors");
    const inspSnap = await getDoc(inspRef);
    if (inspSnap.exists()) {
      const raw = inspSnap.data().list || [];
      inspectors = raw
        .map(it => ({
          name: it.name || "",
          photoUrl: it.photoUrl || null
        }))
        .filter(it => it.name);
    }
  } catch (e) {
    console.warn("Erro ao carregar 'inspectors':", e);
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
  } catch (e) {
    console.warn("Erro ao carregar 'inspections':", e);
  }

  return { pieces, inspectors, inspections };
}

// Salvar peça
async function savePiece(piece) {
  if (!piece || !piece.code) return;

  let imageUrl = piece.imageUrl || null;
  if (piece.image instanceof File) {
    const ext = (piece.image.name && piece.image.name.split(".").pop()) || "jpg";
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
      const ext = (it.image.name && it.image.name.split(".").pop()) || "jpg";
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
}

// Remover peça
async function deletePiece(code) {
  if (!code) return;
  await deleteDoc(doc(db, "pieces", code));
}

// Salvar inspetores com foto
async function setInspectors(list) {
  const sanitized = [];
  for (const insp of (list || [])) {
    if (!insp || !insp.name) continue;
    let photoUrl = insp.photoUrl || null;
    if (insp.photo instanceof File) {
      const safeName = encodeURIComponent(insp.name.replace(/\s+/g, "_"));
      const ext = (insp.photo.name && insp.photo.name.split(".").pop()) || "jpg";
      photoUrl = await uploadFileAndGetUrl(
        `inspectors/${safeName}_${Date.now()}.${ext}`,
        insp.photo
      );
    }
    sanitized.push({ name: insp.name, photoUrl });
  }
  const ref = doc(db, "config", "inspectors");
  await setDoc(ref, { list: sanitized });
}

// Salvar inspeção e fotos de NOK
async function saveInspection(inspec) {
  const timestamp = Date.now();
  const itensToSave = [];

  for (let idx = 0; idx < (inspec.itens || []).length; idx++) {
    const it = inspec.itens[idx];
    let fotoUrl = it.fotoUrl || null;
    if (it.foto instanceof File) {
      const ext = (it.foto.name && it.foto.name.split(".").pop()) || "jpg";
      fotoUrl = await uploadFileAndGetUrl(
        `inspections/${inspec.piece}/${timestamp}_${idx}.${ext}`,
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

  const data = {
    date: inspec.date,
    inspector: inspec.inspector,
    piece: inspec.piece,
    descricao: inspec.descricao || "",
    itens: itensToSave
  };
  const ref = await addDoc(collection(db, "inspections"), data);
  return { id: ref.id, ...data };
}

// Expor global
window.fbApi = {
  loadAll,
  savePiece,
  deletePiece,
  setInspectors,
  saveInspection
};
