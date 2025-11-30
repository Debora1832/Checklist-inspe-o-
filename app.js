// =========================
// ESTADO PRINCIPAL
// =========================

let pieces = [];
let inspectors = [];
let inspections = [];

let inspectorPhotos = {}; // nome -> dataURL

let currentChecklistPiece = null;
let currentChecklistItems = [];

let reportsChart = null;
let dashboardChart = null;

// =========================
// NAVIGAÇÃO ENTRE TELAS
// =========================

function selectSidebar(screenId) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");

  document
    .querySelectorAll(".sidebar-item")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelector(`.sidebar-item[data-screen="${screenId}"]`)
    ?.classList.add("active");
}

// =========================
– RENDERIZAÇÃO BÁSICA
// =========================

function renderInspectorSelect() {
  const sel = document.getElementById("insp-selector");
  const current = sel.value;
  sel.innerHTML =
    '<option value="" disabled selected>Selecione o inspetor</option>' +
    inspectors.map((n) => `<option value="${n}">${n}</option>`).join("");
  if (inspectors.includes(current)) sel.value = current;
}

function renderPieceSelects() {
  const sel1 = document.getElementById("piece-selector");
  const sel2 = document.getElementById("piece-items-selector");
  const options =
    '<option value="" disabled selected>Selecione a peça</option>' +
    pieces
      .map(
        (p, idx) =>
          `<option value="${idx}">${p.code} - ${p.description || ""}</option>`
      )
      .join("");

  sel1.innerHTML = options;
  sel2.innerHTML = options;
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

    const span = document.createElement("div");
    span.textContent = name;

    card.appendChild(avatar);
    card.appendChild(span);
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
    left.innerHTML = `<span>${p.code}</span><small>${p.description || ""}</small>`;
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
  if (!piece || !piece.items) return;

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

// =========================
// CHECKLIST
// =========================

function startChecklist() {
  const inspSel = document.getElementById("insp-selector");
  const pieceSel = document.getElementById("piece-selector");

  const inspName = inspSel.value;
  const pieceIdx = parseInt(pieceSel.value, 10);

  if (!inspName) {
    alert("Selecione um inspetor.");
    return;
  }
  if (isNaN(pieceIdx)) {
    alert("Selecione uma peça.");
    return;
  }

  currentChecklistPiece = pieces[pieceIdx];
  if (!currentChecklistPiece || !currentChecklistPiece.items?.length) {
    alert("A peça selecionada não possui itens cadastrados.");
    return;
  }

  // cria estado do checklist com os novos campos
  currentChecklistItems = currentChecklistPiece.items.map((it) => ({
    name: it.name,
    description: it.description,
    imageUrl: it.imageUrl || null, // imagem do item (Storage)
    status: null,                 // "OK" ou "NOK"
    motivo: "",                   // descrição da não conformidade
    encaminhamento: "",           // "retrabalho" ou "aprovado_terceiro"
    nomeTerceiro: "",             // se aprovado por terceiros
    fotoFile: null,               // File (para upload)
    fotoUrl: null                 // URL no Storage (opcional)
  }));

  document.getElementById("cl-piece-code").textContent =
    currentChecklistPiece.code;
  document.getElementById("cl-piece-desc").textContent =
    currentChecklistPiece.description || "";

  renderChecklistExecution();
  document.getElementById("checklist-execution").classList.remove("hide");
  selectSidebar("screen-checklist");
}

function renderChecklistExecution() {
  const box = document.getElementById("checklist-item-list");
  box.innerHTML = "";

  currentChecklistItems.forEach((it, idx) => {
    const html = `
      <div class="check-item">
        <div class="check-item-left">
          <div class="check-item-title">${it.name}</div>
          <div class="check-item-desc">${it.description || ""}</div>
          ${
            it.imageUrl
              ? `<img src="${it.imageUrl}" class="check-item-img" alt="Imagem do item" />`
              : ""
          }
        </div>
        <div class="check-item-actions">
          <button class="btn-ok" data-idx="${idx}">OK</button>
          <button class="btn-nok" data-idx="${idx}">NÃO OK</button>
        </div>
      </div>

      <div class="nok-extra" id="nok-extra-${idx}" style="${
      it.status === "NOK" ? "" : "display:none"
    }">
        <div class="form-group">
          <label>Descrição da não conformidade</label>
          <textarea data-idx="${idx}" data-field="motivo" rows="2">${
      it.motivo || ""
    }</textarea>
        </div>

        <div class="form-group">
          <label>Foto da não conformidade</label>
          <input type="file" accept="image/*" data-idx="${idx}" data-field="fotoFile">
        </div>

        <div class="form-group">
          <label>Encaminhamento</label>
          <div class="nok-options">
            <label>
              <input type="radio" name="enc-${idx}" value="retrabalho" ${
      it.encaminhamento === "retrabalho" ? "checked" : ""
    }>
              Encaminhar para retrabalho
            </label>
            <label>
              <input type="radio" name="enc-${idx}" value="aprovado_terceiro" ${
      it.encaminhamento === "aprovado_terceiro" ? "checked" : ""
    }>
              Aprovado por terceiros
            </label>
          </div>
        </div>

        <div class="form-group" id="terceiro-box-${idx}" style="${
      it.encaminhamento === "aprovado_terceiro" ? "" : "display:none"
    }">
          <label>Nome do aprovador</label>
          <input type="text" data-idx="${idx}" data-field="nomeTerceiro" value="${
      it.nomeTerceiro || ""
    }">
        </div>
      </div>
    `;
    box.insertAdjacentHTML("beforeend", html);
  });

  // Botões OK / NÃO OK
  box.querySelectorAll(".btn-ok").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      markItem(idx, "OK");
    });
  });

  box.querySelectorAll(".btn-nok").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      markItem(idx, "NOK");
    });
  });

  // Textareas / inputs de texto (motivo, nomeTerceiro)
  box.querySelectorAll("textarea[data-idx], input[type='text'][data-idx]")
    .forEach((el) => {
      el.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        currentChecklistItems[idx][field] = e.target.value;
      });
    });

  // Input de arquivo (foto)
  box.querySelectorAll("input[type='file'][data-idx]").forEach((el) => {
    el.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const file = e.target.files[0] || null;
      currentChecklistItems[idx].fotoFile = file;
    });
  });

  // Radios de encaminhamento
  box.querySelectorAll("input[type='radio'][name^='enc-']").forEach((el) => {
    el.addEventListener("change", (e) => {
      const idx = parseInt(e.target.name.split("-")[1], 10);
      currentChecklistItems[idx].encaminhamento = e.target.value;
      renderChecklistExecution(); // re-render para mostrar / esconder nome do terceiro
    });
  });
}

function markItem(index, status) {
  currentChecklistItems[index].status = status;
  // Se colocar OK, limpa dados de NOK
  if (status === "OK") {
    currentChecklistItems[index].motivo = "";
    currentChecklistItems[index].encaminhamento = "";
    currentChecklistItems[index].nomeTerceiro = "";
    currentChecklistItems[index].fotoFile = null;
  }
  renderChecklistExecution();
}

async function finishChecklist() {
  if (!currentChecklistPiece || !currentChecklistItems.length) {
    alert("Nenhum checklist em execução.");
    return;
  }

  const hasNok = currentChecklistItems.some((it) => it.status === "NOK");
  const obs = document.getElementById("obs-text").value.trim();

  if (currentChecklistItems.some((it) => it.status === null)) {
    if (!confirm("Existem itens sem responder. Deseja continuar mesmo assim?"))
      return;
  }

  if (hasNok && !obs) {
    alert("Observações obrigatórias quando houver item NÃO OK.");
    return;
  }

  const now = new Date();
  const record = {
    date: now.toISOString(),
    inspector: document.getElementById("insp-selector").value,
    piece: currentChecklistPiece.code,
    description: obs || "Checklist concluído.",
    items: currentChecklistItems.map((it) => ({
      status: it.status,
      motivo: it.motivo || "",
      encaminhamento: it.encaminhamento || "",
      nomeTerceiro: it.nomeTerceiro || "",
      fotoFile: it.fotoFile || null,
      fotoUrl: it.fotoUrl || null,
    })),
  };

  inspections.push(record);

  if (window.fbApi && window.fbApi.saveInspection) {
    try {
      co
