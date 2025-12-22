/* ===========================================================
   FIREBASE – MÓDULO PRINCIPAL
   Correções:
   - Import ES Module funcionando no GitHub Pages
   - Config.dev no localhost, config.prod no GitHub Pages
   - Auth anônima
   - CRUD completo
   =========================================================== */

import { firebaseConfigDev } from "./config.dev.js";
import { firebaseConfigProd } from "./config.prod.js";

const isDev =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

const firebaseConfig = isDev ? firebaseConfigDev : firebaseConfigProd;

/* SDK Firebase v9 (modular) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
    getFirestore, collection, doc, addDoc, getDoc, getDocs, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
    getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import {
    getAuth, signInAnonymously
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
export const Firestore = getFirestore(app);
export const Storage = getStorage(app);
export const Auth = getAuth(app);

/* Login anônimo obrigatório para usar Firestore/Storage */
signInAnonymously(Auth).catch(err => console.warn("Auth anônima falhou:", err));

async function uploadFile(path, file) {
    const storageRef = ref(Storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

/* ===========================================================
   INSPECTORS
   =========================================================== */
export async function firebaseGetInspectors() {
    const snap = await getDocs(collection(Firestore, "Inspectors"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function firebaseLoginInspector(id, pin) {
    const refDoc = doc(Firestore, "Inspectors", id);
    const data = await getDoc(refDoc);
    if (!data.exists()) return null;

    const insp = data.data();
    return String(insp.pin) === String(pin)
        ? { id, ...insp }
        : null;
}

export async function firebaseLoginAdmin(pin) {
    const refDoc = doc(Firestore, "Settings", "admin");
    const snap = await getDoc(refDoc);
    if (!snap.exists()) return null;

    return snap.data().adminPin === pin ? { role: "admin" } : null;
}

export async function firebaseAddInspector({ name, photo }) {
    let url = null;

    if (photo) {
        const ext = photo.name.split(".").pop();
        url = await uploadFile(`inspectors/${Date.now()}.${ext}`, photo);
    }

    await addDoc(collection(Firestore, "Inspectors"), {
        name,
        photoUrl: url,
        pin: null
    });
}

/* ===========================================================
   PIECES
   =========================================================== */
export async function firebaseGetPieces() {
    const snap = await getDocs(collection(Firestore, "Pieces"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function firebaseAddPiece({ code, desc, file }) {
    let url = null;

    if (file) {
        const ext = file.name.split(".").pop();
        url = await uploadFile(`pieces/${code}_${Date.now()}.${ext}`, file);
    }

    await addDoc(collection(Firestore, "Pieces"), {
        code,
        desc,
        imageUrl: url,
        items: []
    });
}

export async function firebaseDeletePiece(id) {
    await deleteDoc(doc(Firestore, "Pieces", id));
}

/* ===========================================================
   INSPECTIONS
   =========================================================== */
export async function firebaseAddInspection(data) {
    await addDoc(collection(Firestore, "Inspections"), data);
}

/* ===========================================================
   VIDEOS
   =========================================================== */
export async function firebaseGetVideos() {
    const snap = await getDocs(collection(Firestore, "Videos"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function firebaseAddVideo(pieceId, file) {
    const ext = file.name.split(".").pop();
    const url = await uploadFile(`videos/${pieceId}_${Date.now()}.${ext}`, file);

    await addDoc(collection(Firestore, "Videos"), {
        pieceId,
        url,
        createdAt: Date.now()
    });
}

export async function firebaseDeleteVideo(id) {
    await deleteDoc(doc(Firestore, "Videos", id));
}
