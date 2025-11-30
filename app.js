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

  currentChecklistItems = currentChecklistPiece.items.map((it) => ({
    name: it.name,
    description: it.description,
    status: null, // "OK" ou "NOK"
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
    const div = document.createElement("div");
    div.className = "check-item";
    div.innerHTML = `
      <div class="check-item-left">
        <div class="check-item-title">${it.name}</div>
        <div class="check-item-desc">${it.description || ""}</div>
      </div>
      <div class="check-item-actions">
        <button class="btn-ok">OK</button>
        <button class="btn-nok">NÃO OK</button>
      </div>
    `;
    const [okBtn, nokBtn] = div.querySelectorAll("button");
    okBtn.addEventListener("click", () => markItem(idx, "OK"));
    nokBtn.addEventListener("click", () => markItem(idx, "NOK"));

    if (it.status === "OK") {
      okBtn.style.opacity = "1";
      nokBtn.style.opacity = "0.4";
    } else if (it.status === "NOK") {
      okBtn.style.opacity = "0.4";
      nokBtn.style.opacity = "1";
    }

    box.appendChild(div);
  });
}

function markItem(index, status) {
  currentChecklistItems[index].status = status;
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
      motivo: it.status === "NOK" ? "NOK registrado" : "",
    })),
  };

  inspections.push(record);

  if (window.fbApi && window.fbApi.saveInspection) {
    try {
      const saved = await window.fbApi.saveInspection(record);
      if (saved && saved.id) console.log("Inspeção salva:", saved.id);
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
// RELATÓRIOS / DASHBOARD
// =========================

function updateDashboard() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const inspecMes = inspections.filter((i) =>
    i.date.startsWith(monthKey)
  );

  document.getElementById("kpi-inspecoes-mes").textContent =
    inspecMes.length;

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
  document.getElementById(
    "kpi-percent-nok"
  ).textContent = `${percentNok.toFixed(1)}%`;

  const topPecas = Object.entries(mapaPecas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pc, qt]) => `${pc}: ${qt} NOK`);

  document.getElementById("kpi-top-pecas").innerHTML =
    topPecas.join("<br>") || "-";

  // Gráfico
  const ok = totalItens - totalNok;
  const data = {
    labels: ["OK", "NÃO OK"],
    datasets: [
      {
        data: [ok, totalNok],
      },
    ],
  };

  if (dashboardChart) {
    dashboardChart.data = data;
    dashboardChart.update();
  } else {
    const ctx = document.getElementById("dashboard-chart").getContext("2d");
    dashboardChart = new Chart(ctx, {
      type: "doughnut",
      data,
    });
  }
}

function fillReportMonthSelect() {
  const sel = document.getElementById("report-month-select");
  sel.innerHTML = "";
  const meses = new Set(
    inspections.map((i) => i.date.substring(0, 7)) // YYYY-MM
  );
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
  const chosen = sel.value || sel.options[0]?.value;
  if (chosen) sel.value = chosen;

  const insMes = inspections.filter((i) => i.date.startsWith(chosen || ""));
  document.getElementById("total-inspecoes").textContent = insMes.length;

  // preencher tabela
  const tb = document.getElementById("reports-history-body");
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

  // gráfico (por peça)
  const counts = {};
  insMes.forEach((i) => {
    counts[i.piece] = (counts[i.piece] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const data = labels.map((l) => counts[l]);

  const chartData = {
    labels,
    datasets: [{ data }],
  };

  if (reportsChart) {
    reportsChart.data = chartData;
    reportsChart.update();
  } else {
    const ctx = document.getElementById("reports-chart").getContext("2d");
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
  // Eventos sidebar
  document.querySelectorAll(".sidebar-item").forEach((btn) => {
    btn.addEventListener("click", () =>
      selectSidebar(btn.dataset.screen)
    );
  });

  document
    .getElementById("piece-items-selector")
    .addEventListener("change", renderPieceItemsList);

  document
    .getElementById("btn-add-inspector")
    .addEventListener("click", addInspector);

  document
    .getElementById("btn-add-piece")
    .addEventListener("click", addPiece);

  document
    .getElementById("btn-add-item")
    .addEventListener("click", addItemToPiece);

  document
    .getElementById("btn-start-checklist")
    .addEventListener("click", startChecklist);

  document
    .getElementById("btn-finish-checklist")
    .addEventListener("click", finishChecklist);

  document
    .getElementById("btn-export-csv")
    .addEventListener("click", exportCsv);

  // Carregar dados do Firebase se disponível
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
    // Dados de exemplo mínimo
    pieces = [
      {
        code: "597-2445#01",
        description: "Longarina",
        image: null,
        imageUrl: null,
        items: [
          {
            name: "Dimensão A (Ø)",
            description: "Verificar diâmetro da furação.",
          },
          {
            name: "Furo B posição",
            description: "Conferir posição do furo de encaixe.",
          },
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
