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
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");

  document.querySelectorAll(".sidebar-item").forEach((b) => b.classList.remove("active"));
  const btn = document.querySelector(`.sidebar-item[data-screen="${screenId}"]`);
  if (btn) btn.classList.add("active");
}

// =========================
// RENDERIZAÇÃO BÁSICA
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
  if (!box) return;
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
  if (!box) return;
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
  if (!box) return;
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

  // estado do checklist com campos extras
  currentChecklistItems = currentChecklistPiece.items.map((it) => ({
    name: it.name,
    description: it.description,
    imageUrl: it.imageUrl || null, // imagem do item (Storage)
    status: null,                  // "OK" ou "NOK"
    motivo: "",                    // descrição da não conformidade
    encaminhamento: "",            // "retrabalho" ou "aprovado_terceiro"
    nomeTerceiro: "",              // se aprovado por terceiros
    fotoFile: null,                // File (para upload)
    fotoUrl: null                  // URL no Storage (opcional)
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
          <textarea data-idx="${idx}" data-field="motivo" rows="2">${it.motivo || ""}</textarea>
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

  // Textareas / inputs texto
  box.querySelectorAll("textarea[data-idx], input[type='text'][data-idx]")
    .forEach((el) => {
      el.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        currentChecklistItems[idx][field] = e.target.value;
      });
    });

  // Input de arquivo (foto)
  box.querySelectorAll("input[type='file'][data-idx']").forEach((el) => {
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
      renderChecklistExecution(); // re-render para mostrar/esconder nome do terceiro
    });
  });
}

function markItem(index, status) {
  currentChecklistItems[index].status = status;
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
    if (!confirm("Existem itens sem responder. Deseja continuar mesmo assim?")) {
      return;
    }
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
      const saved = await window.fbApi.saveInspection(record);
      if (saved && saved.id) {
        console.log("Inspeção salva no Firebase:", saved.id);
      }
    } catch (e) {
      console.warn("Falha ao salvar inspeção no Firebase:", e);
    }
  }

  alert("Checklist finalizado!");
  currentChecklistPiece = null;
  currentChecklistItems = [];
  document.getElementById("checklist-execution").classList.add("hide");
  document.getElementById("obs-text").value = "";
  updateDashboard();
  updateReports();
}

// =========================
// ADIÇÃO DE INSPETORES / PEÇAS / ITENS
// =========================

function addInspector() {
  const nameInput = document.getElementById("insp-name-input");
  const photoInput = document.getElementById("insp-photo-input");
  const name = nameInput.value.trim();
  if (!name) {
    alert("Informe o nome do inspetor.");
    return;
  }

  if (!inspectors.includes(name)) inspectors.push(name);
  nameInput.value = "";
  photoInput.value = "";

  renderInspectorSelect();
  renderInspectorsList();

  if (window.fbApi && window.fbApi.setInspectors) {
    window.fbApi
      .setInspectors(inspectors)
      .catch((e) => console.warn("Falha ao salvar inspetores:", e));
  }
}

function addPiece() {
  const code = document.getElementById("piece-code-input").value.trim();
  const desc = document.getElementById("piece-desc-input").value.trim();

  if (!code) {
    alert("Informe o código da peça.");
    return;
  }

  if (pieces.some((p) => p.code === code)) {
    alert("Já existe uma peça com esse código.");
    return;
  }

  const piece = {
    code,
    description: desc,
    image: null,
    imageUrl: null,
    items: [],
  };

  pieces.push(piece);

  document.getElementById("piece-code-input").value = "";
  document.getElementById("piece-desc-input").value = "";
  document.getElementById("piece-image-input").value = "";

  renderPieceSelects();
  renderPiecesList();

  if (window.fbApi && window.fbApi.savePiece) {
    window.fbApi
      .savePiece(piece)
      .catch((e) => console.warn("Falha ao salvar peça:", e));
  }
}

function addItemToPiece() {
  const sel = document.getElementById("piece-items-selector");
  const idx = parseInt(sel.value, 10);
  if (isNaN(idx)) {
    alert("Selecione a peça para adicionar o item.");
    return;
  }

  const piece = pieces[idx];
  const name = document.getElementById("item-name-input").value.trim();
  const desc = document.getElementById("item-desc-input").value.trim();

  if (!name) {
    alert("Informe o nome do item.");
    return;
  }

  const item = {
    name,
    description: desc,
    image: null,
    imageUrl: null,
  };

  piece.items = piece.items || [];
  piece.items.push(item);

  document.getElementById("item-name-input").value = "";
  document.getElementById("item-desc-input").value = "";
  document.getElementById("item-image-input").value = "";

  renderPiecesList();

  if (window.fbApi && window.fbApi.savePiece) {
    window.fbApi
      .savePiece(piece)
      .catch((e) => console.warn("Falha ao atualizar peça:", e));
  }
}

// =========================
// DASHBOARD / RELATÓRIOS
// =========================

function updateDashboard() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const inspecMes = inspections.filter((i) => i.date.startsWith(monthKey));

  const kpiMes = document.getElementById("kpi-inspecoes-mes");
  if (kpiMes) kpiMes.textContent = inspecMes.length;

  let totalItens = 0;
  let totalNok = 0;
  const mapaPecas = {};

  inspecMes.forEach((ins) => {
    (ins.items || []).forEach((it) => {
      totalItens++;
      if (it.status === "NOK") {
        totalNok++;
        mapaPecas[ins.piece] = (mapaPecas[ins.piece] || 0) + 1;
      }
    });
  });

  const percentNok = totalItens ? (100 * totalNok) / totalItens : 0;
  const kpiNok = document.getElementById("kpi-percent-nok");
  if (kpiNok) kpiNok.textContent = `${percentNok.toFixed(1)}%`;

  const topPecas = Object.entries(mapaPecas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pc, qt]) => `${pc}: ${qt} NOK`);

  const topBox = document.getElementById("kpi-top-pecas");
  if (topBox) topBox.innerHTML = topPecas.join("<br>") || "-";

  const ok = totalItens - totalNok;
  const data = {
    labels: ["OK", "NÃO OK"],
    datasets: [
      {
        data: [ok, totalNok],
      },
    ],
  };

  const canvas = document.getElementById("dashboard-chart");
  if (!canvas) return;

  if (dashboardChart) {
    dashboardChart.data = data;
    dashboardChart.update();
  } else {
    const ctx = canvas.getContext("2d");
    dashboardChart = new Chart(ctx, {
      type: "doughnut",
      data,
    });
  }
}

function fillReportMonthSelect() {
  const sel = document.getElementById("report-month-select");
  if (!sel) return;
  sel.innerHTML = "";
  const meses = new Set(inspections.map((i) => i.date.substring(0, 7)));
  const arr = Array.from(meses).sort().reverse();
  arr.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

function updateReports() {
  fillReportMonthSelect();

  const sel = document.getElementById("report-month-select");
  const chosen = sel && (sel.value || sel.options[0]?.value);
  if (sel && chosen) sel.value = chosen;

  const insMes = inspections.filter((i) =>
    chosen ? i.date.startsWith(chosen) : true
  );

  const totalSpan = document.getElementById("total-inspecoes");
  if (totalSpan) totalSpan.textContent = insMes.length;

  const tb = document.getElementById("reports-history-body");
  if (tb) {
    tb.innerHTML = "";
    insMes.forEach((i) => {
      const tr = document.createElement("tr");
      const dt = new Date(i.date);
      tr.innerHTML = `
        <td>${dt.toLocaleString()}</td>
        <td>${i.inspector}</td>
        <td>${i.piece}</td>
        <td>${i.description || ""}</td>
      `;
      tb.appendChild(tr);
    });
  }

  const counts = {};
  insMes.forEach((i) => {
    counts[i.piece] = (counts[i.piece] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const dataValues = labels.map((l) => counts[l]);
  const chartData = {
    labels,
    datasets: [{ data: dataValues }],
  };

  const canvas = document.getElementById("reports-chart");
  if (!canvas) return;

  if (reportsChart) {
    reportsChart.data = chartData;
    reportsChart.update();
  } else {
    const ctx = canvas.getContext("2d");
    reportsChart = new Chart(ctx, {
      type: "bar",
      data: chartData,
    });
  }
}

function exportCsv() {
  if (!inspections.length) {
    alert("Não há inspeções para exportar.");
    return;
  }
  const header = [
    "data",
    "inspetor",
    "peca",
    "descricao",
    "total_itens",
    "total_nok",
  ];
  const lines = [header.join(";")];

  inspections.forEach((ins) => {
    const total = ins.items?.length || 0;
    const totalNok = (ins.items || []).filter(
      (it) => it.status === "NOK"
    ).length;
    lines.push(
      [
        ins.date,
        ins.inspector,
        ins.piece,
        (ins.description || "").replace(/;/g, ","),
        total,
        totalNok,
      ].join(";")
    );
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inspecoes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// =========================
// INICIALIZAÇÃO
// =========================

async function init() {
  // eventos da sidebar
  document.querySelectorAll(".sidebar-item").forEach((btn) => {
    btn.addEventListener("click", () => selectSidebar(btn.dataset.screen));
  });

  const pieceItemsSelector = document.getElementById("piece-items-selector");
  if (pieceItemsSelector) {
    pieceItemsSelector.addEventListener("change", renderPieceItemsList);
  }

  const btnAddInspector = document.getElementById("btn-add-inspector");
  if (btnAddInspector) {
    btnAddInspector.addEventListener("click", addInspector);
  }

  const btnAddPiece = document.getElementById("btn-add-piece");
  if (btnAddPiece) {
    btnAddPiece.addEventListener("click", addPiece);
  }

  const btnAddItem = document.getElementById("btn-add-item");
  if (btnAddItem) {
    btnAddItem.addEventListener("click", addItemToPiece);
  }

  const btnStart = document.getElementById("btn-start-checklist");
  if (btnStart) {
    btnStart.addEventListener("click", startChecklist);
  }

  const btnFinish = document.getElementById("btn-finish-checklist");
  if (btnFinish) {
    btnFinish.addEventListener("click", finishChecklist);
  }

  const btnExport = document.getElementById("btn-export-csv");
  if (btnExport) {
    btnExport.addEventListener("click", exportCsv);
  }

  // Carrega dados do Firebase se disponível
  if (window.fbApi && window.fbApi.loadAll) {
    try {
      const data = await window.fbApi.loadAll();
      pieces = data.pieces || [];
      inspectors = data.inspectors || [];
      inspections = data.inspections || [];
    } catch (e) {
      console.warn("Falha ao carregar dados do Firebase:", e);
    }
  } else {
    // dados de exemplo se Firebase não estiver configurado
    pieces = [
      {
        code: "597-2445#01",
        description: "Longarina",
        image: null,
        imageUrl: null,
        items: [
          { name: "Dimensão A (Ø)", description: "Verificar diâmetro da furação." },
          { name: "Furo B posição", description: "Conferir posição do furo de encaixe." },
        ],
      },
    ];
    inspectors = ["João Silva", "Maria Santos"];
  }

  renderInspectorSelect();
  renderInspectorsList();
  renderPieceSelects();
  renderPiecesList();
  updateDashboard();
  updateReports();
}

document.addEventListener("DOMContentLoaded", init);
