/* ===========================================================
   APP.JS – Lógica Principal do Sistema
   Estrutura Enterprise, Modular, Firebase v9
   =========================================================== */

/* ===========================================================
   IMPORTAÇÃO DOS MÓDULOS FIREBASE (de firebase.js)
   =========================================================== */
import {
    Auth,
    Firestore,
    Storage,
    firebaseLoginInspector,
    firebaseLoginAdmin,
    firebaseGetInspectors,
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
   ESTADO GLOBAL
=========================================================== */
let currentUser = null;
let currentRole = null;   // "inspector" | "admin"
let currentChecklistPiece = null;
let currentChecklistItems = [];

/* ===========================================================
   UTILITÁRIOS DE NAVEGAÇÃO SPA
=========================================================== */
const screens = document.querySelectorAll(".screen");
const sidebarButtons = document.querySelectorAll(".menu-item");

function showScreen(name) {
    screens.forEach(s => s.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
}

/* Navegação da sidebar */
sidebarButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const screen = btn.dataset.screen;
        showScreen(screen);
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
   TELA DE LOGIN – Tabs
=========================================================== */
const loginTabs = document.querySelectorAll(".login-tab");
const loginInspectorForm = document.getElementById("login-inspector-form");
const loginAdminForm = document.getElementById("login-admin-form");
const loginErrorBox = document.getElementById("login-error");

loginTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        loginTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const mode = tab.dataset.mode;
        loginErrorBox.textContent = "";

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

/* Carregar inspetores ao abrir o sistema */
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

    } catch (e) {
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

    const pin = loginAdminPin.value;
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
   CHECKLIST – Seleção de peças
=========================================================== */
const checklistPieceSelect = document.getElementById("checklist-piece-select");
const btnStartChecklist = document.getElementById("btn-start-checklist");
const checklistExec = document.getElementById("checklist-exec");
const checklistItemsContainer = document.getElementById("checklist-items-container");
const checklistPieceTitle = document.getElementById("checklist-piece-title");
const btnFinishChecklist = document.getElementById("btn-finish-checklist");

/* Carregar peças em vários lugares */
async function loadPieces() {
    const list = await firebaseGetPieces();

    /* Checklist select */
    checklistPieceSelect.innerHTML = "";
    list.forEach(p => {
        const op = document.createElement("option");
        op.value = p.id;
        op.textContent = `${p.code} – ${p.desc}`;
        checklistPieceSelect.appendChild(op);
    });

    /* Peças – listagem */
    renderPiecesList(list);
}

/* Iniciar checklist */
btnStartChecklist.addEventListener("click", async () => {
    const pieceId = checklistPieceSelect.value;

    const pieces = await firebaseGetPieces();
    const piece = pieces.find(p => p.id === pieceId);

    if (!piece) return;

    currentChecklistPiece = piece;

    checklistPieceTitle.textContent = `${piece.code} – ${piece.desc}`;
    currentChecklistItems = piece.items || [];

    checklistItemsContainer.innerHTML = "";
    currentChecklistItems.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "list-item";

        div.innerHTML = `
            <span>${item.text}</span>
            <select data-item-index="${idx}">
                <option value="ok">OK</option>
                <option value="nc">NC</option>
            </select>
        `;

        checklistItemsContainer.appendChild(div);
    });

    checklistExec.classList.remove("hidden");
});

/* Finalizar checklist */
btnFinishChecklist.addEventListener("click", async () => {
    const results = [];

    checklistItemsContainer.querySelectorAll("select").forEach(sel => {
        results.push({
            itemIndex: sel.dataset.itemIndex,
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
    const code = pieceCodeInput.value;
    const desc = pieceDescInput.value;
    const file = pieceImgInput.files[0];

    if (!code || !desc) {
        alert("Preencha o código e a descrição.");
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

        div.querySelector("button").addEventListener("click", async () => {
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
    const name = inspNameInput.value;
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

/* Exibir inspetores */
async function loadInspectors() {
    const list = await firebaseGetInspectors();

    inspectorsListDiv.innerHTML = "";

    list.forEach(insp => {
        const div = document.createElement("div");
        div.className = "list-item";

        div.innerHTML = `
            <span>${insp.name}</span>
        `;

        inspectorsListDiv.appendChild(div);
    });
}

/* ===========================================================
   BIBLIOTECA DE VÍDEOS
=========================================================== */
const videoPieceSelect = document.getElementById("video-piece-select");
const videoFileInput = document.getElementById("video-file-input");
const btnAddVideoBtn = document.getElementById("btn-add-video");
const videosListDiv = document.getElementById("videos-list");

/* Carregar peças no select de vídeos */
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

/* Adicionar vídeo */
btnAddVideoBtn.addEventListener("click", async () => {
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

/* Listar vídeos */
async function loadVideos() {
    const list = await firebaseGetVideos();
    videosListDiv.innerHTML = "";

    list.forEach(video => {
        const div = document.createElement("div");
        div.className = "video-item";

        div.innerHTML = `
            <video controls src="${video.url}"></video>
            <button class="btn-danger mt-12" data-id="${video.id}">Excluir</button>
        `;

        div.querySelector("button").addEventListener("click", async () => {
            await firebaseDeleteVideo(video.id);
            loadVideos();
        });

        videosListDiv.appendChild(div);
    });
}

/* ===========================================================
   DASHBOARD – CHART.JS
=========================================================== */
let chartDashboard = null;

async function loadDashboard() {
    const ctx = document.getElementById("chart-dashboard");
    const data = await firebaseAddInspection(); /* apenas placeholder, ajuste conforme dados reais */

    if (chartDashboard) chartDashboard.destroy();

    chartDashboard = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["OK", "NC"],
            datasets: [{
                data: [12, 3],
            }]
        }
    });
}

/* ===========================================================
   RELATÓRIOS
=========================================================== */
const reportMonthSelect = document.getElementById("report-month-select");
const btnExportCsv = document.getElementById("btn-export-csv");
const reportsTable = document.getElementById("reports-table");

function loadReportMonths() {
    reportMonthSelect.innerHTML = "";
    for (let m = 1; m <= 12; m++) {
        const op = document.createElement("option");
        op.value = m;
        op.textContent = `Mês ${m}`;
        reportMonthSelect.appendChild(op);
    }
}

/* CSV */
btnExportCsv.addEventListener("click", () => {
    alert("Exportação CSV será implementada conforme sua necessidade.");
});

/* ===========================================================
   INICIALIZAÇÃO DO APP
=========================================================== */
async function init() {
    await loadInspectorsForLogin();
    await loadPieces();
    await loadPiecesForVideos();
    await loadVideos();
    loadReportMonths();
}

init();
