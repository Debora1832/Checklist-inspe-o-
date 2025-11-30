// ==============================================
// VARIÁVEIS GLOBAIS
// ==============================================

let pieces = [];
let inspectors = [];
let inspections = [];

let currentPiece = null;
let currentChecklist = [];
let currentInspector = null;

// ==============================================
// FUNÇÕES DE NAVEGAÇÃO ENTRE TELAS
// ==============================================

function selectSidebar(screenId) {
    document.querySelectorAll(".app-screen").forEach(s => s.classList.remove("active-screen"));
    document.getElementById(screenId).classList.add("active-screen");

    document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
    document.querySelector(`.sidebar-item[data-screen="${screenId}"]`).classList.add("active");
}

// ==============================================
// CARREGAMENTO INICIAL
// ==============================================

async function loadSystem() {
    if (window.fbApi && window.fbApi.loadAll) {
        const data = await window.fbApi.loadAll();
        pieces = data.pieces;
        inspectors = data.inspectors;
    }

    renderInspectors();
    renderPieces();
}

document.addEventListener("DOMContentLoaded", () => {
    loadSystem();

    document.querySelectorAll(".sidebar-item").forEach(btn => {
        btn.addEventListener("click", () => {
            selectSidebar(btn.dataset.screen);
        });
    });

    document.getElementById("btn-start-checklist").addEventListener("click", startChecklist);
    document.getElementById("btn-finish-checklist").addEventListener("click", finishChecklist);
    document.getElementById("btn-cancel-checklist").addEventListener("click", () => selectSidebar("screen-start"));
});

// ==============================================
// RENDERIZAR DROPDOWNS
// ==============================================

function renderInspectors() {
    const sel = document.getElementById("insp-selector");
    sel.innerHTML = inspectors.map(i => `<option>${i}</option>`).join("");
}

function renderPieces() {
    const sel = document.getElementById("piece-selector");
    sel.innerHTML = pieces.map(p => `<option value="${p.id}">${p.code}</option>`).join("");
}

// ==============================================
// INICIAR CHECKLIST
// ==============================================

function startChecklist() {
    const insp = document.getElementById("insp-selector").value;
    const pieceId = document.getElementById("piece-selector").value;

    currentInspector = insp;
    currentPiece = pieces.find(p => p.id === pieceId);

    currentChecklist = currentPiece.items.map(i => ({
        name: i.name,
        result: null
    }));

    renderChecklistExecution();

    selectSidebar("screen-checklist");
}

// ==============================================
// RENDER CHECKLIST
// ==============================================

function renderChecklistExecution() {
    const div = document.getElementById("checklist-items");

    div.innerHTML = currentPiece.items.map((item, idx) => `
        <div class="check-item">
            <div class="check-title">${item.name}</div>
            <button class="ok-btn" onclick="markItem(${idx}, true)">OK</button>
            <button class="nok-btn" onclick="markItem(${idx}, false)">NÃO OK</button>
        </div>
    `).join("");
}

function markItem(index, result) {
    currentChecklist[index].result = result;
}

// ==============================================
// FINALIZAR CHECKLIST
// ==============================================

async function finishChecklist() {
    const hasNok = currentChecklist.some(i => i.result === false);
    const obs = document.getElementById("obs-text").value.trim();

    if (hasNok && obs === "") {
        alert("Observações obrigatórias quando houver NÃO OK.");
        return;
    }

    const record = {
        piece: currentPiece.code,
        inspector: currentInspector,
        results: currentChecklist,
        obs,
        timestamp: new Date().toISOString()
    };

    inspections.push(record);

    if (window.fbApi && window.fbApi.saveInspection) {
        await window.fbApi.saveInspection(record);
    }

    alert("Checklist concluído!");
    selectSidebar("screen-start");
}
