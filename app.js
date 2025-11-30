/* ==========================================================
   ESTADO PRINCIPAL
   ========================================================== */

let pieces = [];
let inspectors = [];
let inspections = [];

let inspectorPhotos = {}; // nome -> dataURL

let currentChecklistPiece = null;
let currentChecklistItems = [];

let reportsChart = null;
let dashboardChart = null;

/* ==========================================================
   NAVEGAÇÃO ENTRE TELAS
   ========================================================== */

function selectSidebar(screenId) {
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");

  document.querySelectorAll(".sidebar-item").forEach((b) => {
    b.classList.remove("active");
  });

  const btn = document.querySelector(`.sidebar-item[data-screen="${screenId}"]`);
  if (btn) btn.classList.add("active");
}

/* ==========================================================
   RENDERIZAÇÃO — SELETORES E LISTAS
   ========================================================== */

function renderInspectorSelect() {
  const sel = document.getElementById("insp-selector");
  const current = sel.value;

  sel.innerHTML =
    '<option value="" disabled selected>Selecione o inspetor</option>' +
    inspectors.map((n) => `<option value="${n}">${n}</option>`).join("");

  if (inspectors.includes(current)) sel.value = current;
}

function renderPieceSelects() {
  const selects = [
    document.getElementById("piece-selector"),
    document.getElementById("piece-items-selector"),
  ];

  const options =
    '<option value="" disabled selected>Selecione a peça</option>' +
    pieces
      .map(
        (p, idx) =>
          `<option value="${idx}">${p.code} - ${p.description || ""}</option>`
      )
      .join("");

  selects.forEach((sel) => (sel.innerHTML = options));
}

function renderInspectorsList() {
  const box = document.getElementById("inspectors-list");
  box.innerHTML = "";

  inspectors.forEach((name) => {
    const card = document.createElement("div");
    card.className = "inspector-card";

    const avatar = document.createElement("div");
    avatar.className = "inspector-avatar";
    avatar.textContent = name[0] || "?";

    const text = document.createElement("div");
    text.textContent = name;

    card.appendChild(avatar);
    card.appendChild(text);
    box.appendChild(card);
  });
}

function renderPiecesList() {
  const box = document.getElementById("pieces-list");
  box.innerHTML = "";

  pieces.forEach((p) => {
    const row = document.createElement("div");
    row.className = "piece-row";

    const left = document.createElement("div");
    left.innerHTML = `<strong>${p.code}</strong><br><small>${p.description || ""}</small>`;

    const right = document.createElement("div");
    right.textContent = `${p.items?.length || 0} itens`;

    row.appendChild(left);
    row.appendChild(right);
    box.appendChild(row);
  });

  renderPieceItemsList();
}

function renderPieceItemsList() {
  const sel = document.getElementById("piece-items-selector");
  const idx = parseInt(sel.value, 10);
  const box = document.getElementById("piece-items-list");

  box.innerHTML = "";
  const piece = pieces[idx];
  if (!piece) return;

  piece.items.forEach((it, i) => {
    const div = document.createElement("div");
    div.className = "check-item";
    div.innerHTML = `
      <div class="check-item-left">
        <div class="check-item-title">${it.name}</div>
        <div class="check-item-desc">${it.description || ""}</div>
      </div>
      <div class="check-item-actions">
        <button class="btn-secondary" data-idx="${i}">Remover</button>
      </div>
    `;

    div.querySelector("button").addEventListener("click", () => {
      piece.items.splice(i, 1);
      renderPiecesList();
    });
    box.appendChild(div);
  });
}

/* ==========================================================
   CHECKLIST — INICIAR
   ========================================================== */

function startChecklist() {
  const inspName = document.getElementById("insp-selector").value;
  const pieceIdx = parseInt(document.getElementById("piece-selector").value, 10);

  if (!inspName) return alert("Selecione um inspetor.");
  if (isNaN(pieceIdx)) return alert("Selecione uma peça.");

  currentChecklistPiece = pieces[pieceIdx];
  if (!currentChecklistPiece.items.length)
    return alert("Esta peça não possui itens cadastrados.");

  // Criar estado do checklist
  currentChecklistItems = currentChecklistPiece.items.map((it) => ({
    name: it.name,
    description: it.description,
    imageUrl: it.imageUrl || null,
    status: null,
    motivo: "",
    encaminhamento: "",
    nomeTerceiro: "",
    fotoFile: null,
    fotoUrl: null,
  }));

  document.getElementById("cl-piece-code").textContent =
    currentChecklistPiece.code;
  document.getElementById("cl-piece-desc").textContent =
    currentChecklistPiece.description;

  renderChecklistExecution();
  selectSidebar("screen-checklist");
}

/* ==========================================================
   CHECKLIST — RENDER
   ========================================================== */

function renderChecklistExecution() {
  const box = document.getElementById("checklist-item-list");
  box.innerHTML = "";

  currentChecklistItems.forEach((it, idx) => {
    const extraVisible = it.status === "NOK" ? "" : "display:none";

    const html = `
    <div class="check-item">
      <div class="check-item-left">
        <div class="check-item-title">${it.name}</div>
        <div class="check-item-desc">${it.description || ""}</div>
        ${
          it.imageUrl
            ? `<img src="${it.imageUrl}" class="check-item-img" />`
            : ""
        }
      </div>

      <div class="check-item-actions">
        <button class="btn-ok" data-idx="${idx}">OK</button>
        <button class="btn-nok" data-idx="${idx}">NÃO OK</button>
      </div>
    </div>

    <div class="nok-extra" id="nok-extra-${idx}" style="${extraVisible}">
      <div class="form-group">
        <label>Descrição da não conformidade</label>
        <textarea data-idx="${idx}" data-field="motivo">${it.motivo}</textarea>
      </div>

      <div class="form-group">
        <label>Foto da não conformidade</label>
        <input type="file" accept="image/*" data-idx="${idx}" data-field="fotoFile">
      </div>

      <div class="form-group">
        <label>Encaminhamento</label>
        <label><input type="radio" name="enc-${idx}" value="retrabalho" ${
      it.encaminhamento === "retrabalho" ? "checked" : ""
    }> Retrabalho</label>

        <label><input type="radio" name="enc-${idx}" value="aprovado_terceiro" ${
      it.encaminhamento === "aprovado_terceiro" ? "checked" : ""
    }> Aprovado por terceiros</label>
      </div>

      <div class="form-group" id="terceiro-box-${idx}" style="${
      it.encaminhamento === "aprovado_terceiro" ? "" : "display:none"
    }">
        <label>Nome do aprovador</label>
        <input type="text" data-idx="${idx}" data-field="nomeTerceiro" value="${
      it.nomeTerceiro
    }">
      </div>
    </div>
    `;

    box.insertAdjacentHTML("beforeend", html);
  });

  // Botões OK
  box.querySelectorAll(".btn-ok").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      currentChecklistItems[idx].status = "OK";

      currentChecklistItems[idx].motivo = "";
      currentChecklistItems[idx].encaminhamento = "";
      currentChecklistItems[idx].nomeTerceiro = "";
      currentChecklistItems[idx].fotoFile = null;

      renderChecklistExecution();
    });
  });

  // Botões NOK
  box.querySelectorAll(".btn-nok").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      currentChecklistItems[idx].status = "NOK";
      renderChecklistExecution();
    });
  });

  // Textos e textarea
  box.querySelectorAll("textarea[data-idx], input[type='text'][data-idx]").forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const field = e.target.dataset.field;
      currentChecklistItems[idx][field] = e.target.value;
    });
  });

  // Input de arquivo — CORRIGIDO
  box.querySelectorAll("input[data-idx]").forEach((input) => {
    if (input.type !== "file") return;
    input.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      currentChecklistItems[idx].fotoFile = e.target.files[0] || null;
    });
  });

  // Radio buttons
  box.querySelectorAll("input[type='radio']").forEach((r) => {
    r.addEventListener("change", (e) => {
      const idx = parseInt(e.target.name.split("-")[1], 10);
      currentChecklistItems[idx].encaminhamento = e.target.value;
      renderChecklistExecution();
    });
  });
}

/* ==========================================================
   FINALIZAR CHECKLIST
   ========================================================== */

async function finishChecklist() {
  const obs = document.getElementById("obs-text").value.trim();
  const inspector = document.getElementById("insp-selector").value;

  if (currentChecklistItems.some((it) => it.status === null))
    if (!confirm("Existem itens sem resposta. Deseja continuar?")) return;

  if (currentChecklistItems.some((it) => it.status === "NOK") && !obs)
    return alert("Preencha observações quando houver itens NÃO OK.");

  const now = new Date();

  const record = {
    date: now.toISOString(),
    inspector,
    piece: currentChecklistPiece.code,
    description: obs,
    items: currentChecklistItems,
  };

  inspections.push(record);

  if (window.fbApi && window.fbApi.saveInspection) {
    try {
      await window.fbApi.saveInspection(record);
      alert("Checklist salvo!");
    } catch (e) {
      console.error("Erro salvando:", e);
    }
  }

  selectSidebar("screen-dashboard");
}

/* ==========================================================
   DASHBOARD
   ========================================================== */

function updateDashboard() {
  if (!inspections.length) return;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const inspecMes = inspections.filter(
    (i) => typeof i.date === "string" && i.date.startsWith(monthKey)
  );

  document.getElementById("dash-total").textContent = inspecMes.length;

  const nok = inspecMes.filter((i) =>
    i.items.some((it) => it.status === "NOK")
  ).length;

  document.getElementById("dash-nok").textContent = nok;
}

/* ==========================================================
   RELATÓRIOS
   ========================================================== */

function fillReportMonthSelect() {
  const sel = document.getElementById("report-month-select");

  const meses = new Set(
    inspections
      .filter((i) => typeof i.date === "string")
      .map((i) => i.date.substring(0, 7))
  );

  sel.innerHTML =
    '<option value="" disabled selected>Selecione o mês</option>' +
    [...meses]
      .sort()
      .map((m) => `<option value="${m}">${m}</option>`)
      .join("");
}

/* ==========================================================
   CARREGAR DADOS DO FIREBASE
   ========================================================== */

async function init() {
  if (window.fbApi && window.fbApi.loadAll) {
    const data = await window.fbApi.loadAll();
    pieces = data.pieces || [];
    inspectors = data.inspectors || [];
    inspections = data.inspections || [];
  }

  renderInspectorSelect();
  renderPieceSelects();
  renderInspectorsList();
  renderPiecesList();
  fillReportMonthSelect();
  updateDashboard();
}

document.addEventListener("DOMContentLoaded", init);
