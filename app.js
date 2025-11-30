// app.js
// Lado visual / regras da aplicação (usa window.fbApi do firebase.js)

let pieces = [];
let inspectors = []; // [{name, photoUrl, photo?}]
let inspections = [];

let checklistItemStates = [];
let checklistCurrentPiece = null;

// ========== UTIL: IMAGENS & AVATAR ==========

function getPieceImageSrc(piece) {
  if (!piece) return null;
  if (piece.image instanceof File) return URL.createObjectURL(piece.image);
  if (piece.imageUrl) return piece.imageUrl;
  return null;
}

function getItemImageSrc(item) {
  if (!item) return null;
  if (item.image instanceof File) return URL.createObjectURL(item.image);
  if (item.imageUrl) return item.imageUrl;
  return null;
}

function getFotoSrc(it) {
  if (!it) return null;
  if (it.foto instanceof File) return URL.createObjectURL(it.foto);
  if (it.fotoUrl) return it.fotoUrl;
  return null;
}

function getInspectorPhotoSrc(insp) {
  if (!insp) return null;
  if (insp.photo instanceof File) return URL.createObjectURL(insp.photo);
  if (insp.photoUrl) return insp.photoUrl;
  return null;
}

// ========== MODAL GENÉRICO ==========

function showModal(html, onclose) {
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  box.innerHTML = html;
  overlay.style.display = "flex";

  const closeAll = () => {
    overlay.style.display = "none";
    box.innerHTML = "";
    if (onclose) onclose();
  };

  const closeBtn = box.querySelector(".modal-close");
  if (closeBtn) closeBtn.onclick = closeAll;

  overlay.onclick = e => {
    if (e.target === overlay) closeAll();
  };
}

function showImageModal(src) {
  if (!src) return;
  showModal(
    `
    <button class="modal-close" title="Fechar">&times;</button>
    <img src="${src}" style="max-width:80vw;max-height:80vh;display:block;margin:auto;border-radius:10px;box-shadow:0 6px 22px #0002;">
  `
  );
}

// ========== NAVEGAÇÃO LATERAL ==========

function selectSidebar(target) {
  document
    .querySelectorAll(".sidebar-item")
    .forEach(btn => btn.classList.remove("active"));

  document
    .querySelectorAll(".screen")
    .forEach(div => div.classList.remove("active"));

  const btn = document.querySelector(
    `.sidebar-item[data-screen="${target}"]`
  );
  if (btn) btn.classList.add("active");

  const screen = document.getElementById(target);
  if (screen) screen.classList.add("active");

  // render específico
  if (target === "checklist") {
    renderChecklistSelectors();
    renderChecklist();
  }
  if (target === "inspectors") {
    renderInspectorsAdmin();
  }
  if (target === "pieces") {
    renderPiecesAdmin();
  }
  if (target === "dashboard") {
    renderDashboardKPIs();
  }
  if (target === "reports") {
    renderReports();
  }
}

// ========== CHECKLIST ==========

function renderChecklistSelectors() {
  const inspSel = document.getElementById("inspector-select");
  const pieceSel = document.getElementById("piece-select");

  inspSel.innerHTML =
    '<option value="" disabled selected>Selecionar inspetor</option>' +
    inspectors
      .map(i => `<option value="${i.name}">${i.name}</option>`)
      .join("");

  pieceSel.innerHTML =
    '<option value="" disabled selected>Selecionar peça</option>' +
    pieces.map(p => `<option value="${p.code}">${p.code}</option>`).join("");
}

function carregarChecklist() {
  const inspSel = document.getElementById("inspector-select");
  const pieceSel = document.getElementById("piece-select");

  const insp = inspSel.value;
  const pieceCode = pieceSel.value;

  if (!insp || !pieceCode) {
    alert("Selecione um inspetor e uma peça.");
    return;
  }

  checklistCurrentPiece = pieces.find(p => p.code === pieceCode) || null;
  checklistItemStates = (checklistCurrentPiece?.items || []).map(() => ({
    status: null,
    motivo: "",
    foto: null,
    fotoUrl: null,
    encaminhamento: "",
    nome_terceiro: ""
  }));

  renderChecklist();
}

function renderChecklist() {
  const headerEl = document.getElementById("checklist-header");
  const pieceImgBox = document
