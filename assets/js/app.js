/* ===========================================================
   APP.JS – Lógica Principal do Sistema
   Sistema SPA + Firebase Firestore
   =========================================================== */

/* ===========================================================
   IMPORTAÇÕES FIREBASE (via módulo firebase.js)
   =========================================================== */
import {
    Firestore,
    Storage,
    Auth,
    firebaseGetInspectors,
    firebaseLoginInspector,
    firebaseLoginAdmin,
    firebaseAddInspector,
    firebaseGetPieces,
    firebaseAddPiece,
    firebaseDeletePiece,
    firebaseAddInspection,
    firebaseGetVideos,
    firebaseAddVideo,
    firebaseDeleteVideo
} from "./firebase/firebase.js";

/* ===========================================================
   VARIÁVEIS GLOBAIS
   =========================================================== */
let currentUser = null;
let currentRole = null;
let currentChecklistPiece = null;
let currentChecklistItems = [];

/* ===========================================================
   SISTEMA DE NAVEGAÇÃO (SPA)
   =========================================================== */
const screens = document.querySelectorAll(".screen");
const sidebarButtons = document.querySelectorAll(".menu-item");

function showScreen(name) {
    screens.forEach(s => s.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
}

sidebarButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.screen;
        showScreen(target);
    });
});

/* ===========================================================
   SIDEBAR RETRÁTIL
   =========================================================== */
const sidebar = document.getElementById("sidebar");
const btnSidebar = document.getElementById("btn-toggle-sidebar");

btnSidebar.addEventListener("click", () => {
    sidebar.classList.toggle("closed");
});

/* ===========================================================
   TELA DE LOGIN
   =========================================================== */
const loginTabs = document.querySelectorAll(".login-tab");
const loginInspectorForm = document.getElementById("login-inspector-form");
const loginAdminForm = document.getElementById("login-admin-form");
const loginErrorBox = document.getElementById("login-error");

loginTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        loginTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        loginErrorBox.textContent = "";

        const mode = tab.dataset.mode;
        if (mode === "inspector") {
            loginInspectorForm.classList.remove("hidden");
            loginAdminForm.classList.add("hidden");
        } else {
            loginInspectorForm.classList.add("hidden");
            loginAdminForm.classList.remove("hidden");
        }
    });
});

/* ===========================================================
   LOGIN – INSPECTOR
   =========================================================== */
const loginInspSelect = document.getElementById("login-insp-select");
const loginInspPin = document.getElementById("login-insp-pin");
const btnLoginInsp = document.getElementById("btn-login-insp");

async function loadInspectorsForLogin() {
    const list = await firebaseGetInspectors();
    loginInspSelect.innerHTML = "";

    list.forEach(insp => {
        const op = document.createElement("option");
        op.value = insp.id;
        op.textContent = insp.name;
        loginInspSelect.appendChild(op);
    });
}

btnLoginInsp.addEventListener("click", async () => {
    loginErrorBox.textContent = "";

    try {
        const userId = loginInspSelect.value;
        const pin = loginInspPin.value;

        const user = await firebaseLoginInspector(userId, pin);

        if (!user) {
            loginErrorBox.textContent = "PIN incorreto.";
            return;
        }

        currentUser = user;
        currentRole = "inspector";

        document.getElementById("user-info").textContent = `Inspetor: ${user.name}`;

        showScreen("checklist");

    } catch (err) {
        loginErrorBox.textContent = "Erro no login.";
    }
});

/* ===========================================================
   LOGIN – ADMIN
   =========================================================== */
const loginAdminPin = document.getElementById("login-admin-pin");
const btnLoginAdmin = document.getElementById("btn-login-admin");

btnLoginAdmin.addEventListener("click", async () => {
    loginErrorBox.textContent = "";

    const pin = loginAdminPin.value.trim();
    const admin = await firebaseLoginAdmin(pin);

    if (!admin) {
        loginErrorBox.textContent = "Senha incorreta.";
        return;
    }

    currentUser = admin;
    currentRole = "admin";

    document.getElementById("user-info").textContent = "Administrador";

    showScreen("pieces");
});

/* ===========================================================
   CHECKLIST – Seleção de Peças
   =========================================================== */
const checklistPieceSelect = document.getElementById("checklist-piece-select");
const btnStartChecklist = document.getElementById("btn-start-checklist");
const checklistExec = document.getElementById("checklist-exec");
const checklistItemsContainer = document.getElementById("checklist-items-container");
const checklistPieceTitle = document.getElementById("checklist-piece-title");
const btnFinishChecklist = document.getElementById("btn-finish-checklist");

async function loadPieces() {
    const list = await firebaseGetPieces();

    checklistPieceSelect.innerHTML = "";
    list.forEach(piece => {
        const op = document.createElement("option");
        op.value = piece.id;
        op.textContent = `${piece.code} – ${piece.desc}`;
        checklistPieceSelect.appendChild(op);
    });

    renderPiecesList(list);
}

btnStartChecklist.addEventListener("click", async () => {
    const pieceId = checklistPieceSelect.value;

    const pieces = await firebaseGetPieces();
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return;

    currentChecklistPiece = piece;
    currentChecklistItems = piece.items || [];

    checklistPieceTitle.textContent = `${piece.code} – ${piece.desc}`;
    checklistItemsContainer.innerHTML = "";

    currentChecklistItems.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "list-item";

        div.innerHTML = `
            <span>${item.text}</span>
            <select data-i="${idx}">
                <option value="ok">OK</option>
                <option value="nc">NC</option>
            </select>
        `;

        checklistItemsContainer.appendChild(div);
    });

    checklistExec.classList.remove("hidden");
});

btnFinishChecklist.addEventListener("click", async () => {
    const results = [];

    checklistItemsContainer.querySelectorAll("select").forEach(sel => {
        results.push({
            itemIndex: Number(sel.dataset.i),
            result: sel.value
        });
    });

    await firebaseAddInspection({
        inspectorId: currentUser.id,
        pieceId: currentChecklistPiece.id,
        results,
        timestamp: Date.now()
    });

    alert("Checklist concluído com sucesso.");
    checklistExec.classList.add("hidden");
});

/* ===========================================================
   PEÇAS – CRUD
   =========================================================== */
const pieceCodeInput = document.getElementById("piece-code-input");
const pieceDescInput = document.getElementById("piece-desc-input");
const pieceImgInput = document.getElementById("piece-img-input");
const btnAddPiece = document.getElementById("btn-add-piece");
const piecesListDiv = document.getElementById("pieces-list");

btnAddPiece.addEventListener("click", async () => {
    const code = pieceCodeInput.value.trim();
    const desc = pieceDescInput.value.trim();
    const file = pieceImgInput.files[0];

    if (!code || !desc) {
        alert("Preencha código e descrição.");
        return;
    }

    await firebaseAddPiece({ code, desc, file });

    pieceCodeInput.value = "";
    pieceDescInput.value = "";
    pieceImgInput.value = "";

    loadPieces();
});

function renderPiecesList(list) {
    piecesListDiv.innerHTML = "";

    list.forEach(piece => {
        const div = document.createElement("div");
        div.className = "list-item";

        div.innerHTML = `
            <span>${piece.code} – ${piece.desc}</span>
            <button class="btn-danger" data-id="${piece.id}">Excluir</button>
        `;

        div.querySelector("button")
            .addEventListener("click", async () => {
                await firebaseDeletePiece(piece.id);
                loadPieces();
            });

        piecesListDiv.appendChild(div);
    });
}

/* ===========================================================
   INSPETORES – CRUD
   =========================================================== */
const inspNameInput = document.getElementById("insp-name-input");
const inspPhotoInput = document.getElementById("insp-photo-input");
const btnAddInspector = document.getElementById("btn-add-inspector");
const inspectorsListDiv = document.getElementById("inspectors-list");

btnAddInspector.addEventListener("click", async () => {
    const name = inspNameInput.value.trim();
    const photo = inspPhotoInput.files[0];

    if (!name) {
        alert("Informe o nome.");
        return;
    }

    await firebaseAddInspector({ name, photo });

    inspNameInput.value = "";
    inspPhotoInput.value = "";

    loadInspectors();
});

async function loadInspectors() {
    const list = await firebaseGetInspectors();

    inspectorsListDiv.innerHTML = "";
    list.forEach(insp => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `<span>${insp.name}</span>`;
        inspectorsListDiv.appendChild(div);
    });
}

/* ===========================================================
   VÍDEOS – CRUD
   =========================================================== */
const videoPieceSelect = document.getElementById("video-piece-select");
const videoFileInput = document.getElementById("video-file-input");
const btnAddVideo = document.getElementById("btn-add-video");
const videosListDiv = document.getElementById("videos-list");

async function loadPiecesForVideos() {
    const list = await firebaseGetPieces();

    videoPieceSelect.innerHTML = "";
    list.forEach(p => {
        const op = document.createElement("option");
        op.value = p.id;
        op.textContent = `${p.code} – ${p.desc}`;
        videoPieceSelect.appendChild(op);
    });
}

btnAddVideo.addEventListener("click", async () => {
    const pieceId = videoPieceSelect.value;
    const file = videoFileInput.files[0];

    if (!file) {
        alert("Selecione um vídeo.");
        return;
    }

    await firebaseAddVideo(pieceId, file);
    videoFileInput.value = "";
    loadVideos();
});

async function loadVideos() {
    const list = await firebaseGetVideos();

    videosListDiv.innerHTML = "";
    list.forEach(video => {
        const div = document.createElement("div");
        div.className = "video-item";

        div.innerHTML = `
            <video controls src="${video.url}"></video>
            <button class="btn-danger" data-id="${video.id}">Excluir</button>
        `;

        div.querySelector("button").addEventListener("click", async () => {
            await firebaseDeleteVideo(video.id);
            loadVideos();
        });

        videosListDiv.appendChild(div);
    });
}

/* ===========================================================
   RELATÓRIOS (placeholder)
   =========================================================== */
const reportMonthSelect = document.getElementById("report-month-select");

function loadReportMonths() {
    for (let m = 1; m <= 12; m++) {
        const op = document.createElement("option");
        op.value = m;
        op.textContent = `Mês ${m}`;
        reportMonthSelect.appendChild(op);
    }
}

/* ===========================================================
   INICIALIZAÇÃO
   =========================================================== */
async function init() {
    await loadInspectorsForLogin();
    await loadPieces();
    await loadPiecesForVideos();
    await loadVideos();
    loadReportMonths();
}

init();
