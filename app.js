/* ===========================
   Estado principal
   =========================== */

let pieces = [
  {
    code: "597-2445#01",
    description: "Longarina",
    image: null,
    imageUrl: null,
    items: [
      {
        name: "Dimensão A (Ø)",
        description: "Verificar diâmetro da furação.",
        image: null,
        imageUrl: null
      },
      {
        name: "Furo B posição",
        description: "Conferir posição do furo de encaixe.",
        image: null,
        imageUrl: null
      }
    ]
  }
];

let inspectors = ["João Silva", "Maria Santos"];
let inspectorPhotos = {}; // nome -> dataURL
let inspections = [];

let currentChecklistPiece = null;
let checklistItemStates = [];

let reportsChart = null;
let dashboardChart = null;

/* ===========================
   Utilidades de tela / modal
   =========================== */

function selectSidebar(screenId) {
  document.querySelectorAll(".sidebar-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screenId);
  });

  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.toggle("active", s.id === screenId);
  });

  if (screenId === "checklist") {
    renderChecklistSelectors();
  } else if (screenId === "inspectors") {
    renderInspectors();
  } else if (screenId === "pieces") {
    renderPieces();
  } else if (screenId === "reports") {
    renderReports();
  } else if (screenId === "dashboard") {
    renderDashboard();
  }
}

window.selectSidebar = selectSidebar;

function showModal(innerHtml) {
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  box.innerHTML = innerHtml;
  overlay.style.display = "flex";

  const closeBtn = box.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.onclick = closeModal;
  }
  overlay.onclick = (ev) => {
    if (ev.target === overlay) closeModal();
  };
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  overlay.style.display = "none";
  box.innerHTML = "";
}

function showImageModal(src) {
  if (!src) return;
  showModal(`
    <div class="modal-header">
      <div class="modal-title">Visualizar imagem</div>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div style="margin-top:8px;text-align:center;">
      <img src="${src}" style="max-width:100%;max-height:70vh;border-radius:10px;">
    </div>
  `);
}

/* ===========================
   Checklist (seleção & execução)
   =========================== */

function renderChecklistSelectors() {
  const inspSel = document.getElementById("insp-selector");
  inspSel.innerHTML =
    '<option value="" disabled selected>Selecionar inspetor</option>' +
    inspectors
      .map((n) => `<option value="${n}">${n}</option>`)
      .join("");

  const pieceSel = document.getElementById("piece-selector");
  pieceSel.innerHTML =
    '<option value="" disabled selected>Selecionar peça</option>' +
    pieces.map((p) => `<option value="${p.code}">${p.code}</option>`).join("");

  // esconde execução até clicar em iniciar
  document
    .getElementById("checklist-execution")
    .classList.add("hide");
}

function startChecklist() {
  const inspSel = document.getElementById("insp-selector");
  const pieceSel = document.getElementById("piece-selector");
  const insp = inspSel.value;
  const pieceCode = pieceSel.value;

  if (!insp || !pieceCode) {
    alert("Selecione inspetor e peça.");
    return;
  }

  currentChecklistPiece = pieces.find((p) => p.code === pieceCode);
  if (!currentChecklistPiece) {
    alert("Peça não encontrada.");
    return;
  }

  checklistItemStates = (currentChecklistPiece.items || []).map(() => ({
    status: null,
    motivo: "",
    encaminhamento: "",
    nomeTerceiro: "",
    fotoFile: null,
    fotoUrl: null
  }));

  renderChecklistExecution();
  document
    .getElementById("checklist-execution")
    .classList.remove("hide");
}

function getPieceImageSrc(piece) {
  if (!piece) return null;
  if (piece.image instanceof File) {
    return URL.createObjectURL(piece.image);
  }
  return piece.imageUrl || null;
}

function getItemImageSrc(item) {
  if (!item) return null;
  if (item.image instanceof File) {
    return URL.createObjectURL(item.image);
  }
  return item.imageUrl || null;
}

function getStatePhotoSrc(state) {
  if (!state) return null;
  if (state.fotoFile instanceof File) {
    return URL.createObjectURL(state.fotoFile);
  }
  return state.fotoUrl || null;
}

function renderChecklistExecution() {
  const piece = currentChecklistPiece;
  if (!piece) return;

  document.getElementById("cl-piece-code").textContent = piece.code;
  document.getElementById("cl-piece-desc").textContent =
    piece.description || "";

  const imgBox = document.getElementById("cl-piece-image-box");
  const mainSrc = getPieceImageSrc(piece);
  if (mainSrc) {
    imgBox.innerHTML = `<img src="${mainSrc}" onclick="showImageModal('${mainSrc}')">`;
  } else {
    imgBox.textContent = "[Imagem da peça]";
  }

  const listDiv = document.getElementById("checklist-item-list");
  listDiv.innerHTML = "";

  (piece.items || []).forEach((item, idx) => {
    const state = checklistItemStates[idx] || {};
    const statusClass =
      state.status === "OK"
        ? "ok"
        : state.status === "NOK"
        ? "nok"
        : "";
    const itemSrc = getItemImageSrc(item);

    const wrapper = document.createElement("div");
    wrapper.className = `checklist-item ${statusClass}`;

    wrapper.innerHTML = `
      <div class="checklist-item-thumb">
        ${
          itemSrc
            ? `<img src="${itemSrc}" onclick="showImageModal('${itemSrc}')">`
            : ""
        }
      </div>
      <div class="checklist-item-body">
        <div class="checklist-item-title">${item.name}</div>
        <div class="checklist-item-desc">${
          item.description || ""
        }</div>
        <div class="checklist-item-extra" id="extra-${idx}"></div>
      </div>
      <div class="checklist-item-actions">
        <button class="checklist-status-btn btn-ok" data-idx="${idx}" data-status="OK">OK</button>
        <button class="checklist-status-btn btn-nok" data-idx="${idx}" data-status="NOK">NÃO OK</button>
      </div>
    `;

    listDiv.appendChild(wrapper);

    if (state.status === "NOK") {
      const extraDiv = wrapper.querySelector(`#extra-${idx}`);
      extraDiv.innerHTML = `
        <div class="checklist-extra">
          <label>Descrição da não conformidade (obrigatório):</label>
          <textarea id="motivo-${idx}">${state.motivo || ""}</textarea>

          <label>Foto (obrigatório):</label>
          <input type="file" id="foto-${idx}" accept="image/*">

          <div style="margin-top:6px;">
            <label><input type="radio" name="enc-${idx}" value="retrabalho" ${
        state.encaminhamento === "retrabalho" ? "checked" : ""
      }> Encaminhar para retrabalho</label><br>
            <label><input type="radio" name="enc-${idx}" value="terceiro" ${
        state.encaminhamento === "terceiro" ? "checked" : ""
      }> Aprovado por terceiro</label>
          </div>
          ${
            state.encaminhamento === "terceiro"
              ? `
          <div style="margin-top:6px;">
            <label>Nome / matrícula do aprovador:</label>
            <input type="text" id="terceiro-${idx}" value="${
                  state.nomeTerceiro || ""
                }">
          </div>
          `
              : ""
          }
          ${
            getStatePhotoSrc(state)
              ? `<div style="margin-top:6px;">
                  <img src="${getStatePhotoSrc(
                    state
                  )}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="showImageModal('${getStatePhotoSrc(
                  state
                )}')">
                </div>`
              : ""
          }
        </div>
      `;

      const motivo = extraDiv.querySelector(`#motivo-${idx}`);
      const fotoInput = extraDiv.querySelector(`#foto-${idx}`);
      const radios = extraDiv.querySelectorAll(`input[name="enc-${idx}"]`);
      const terceiroInput = extraDiv.querySelector(`#terceiro-${idx}`);

      motivo.addEventListener("input", () => {
        checklistItemStates[idx].motivo = motivo.value;
      });

      fotoInput.addEventListener("change", () => {
        const file = fotoInput.files[0] || null;
        checklistItemStates[idx].fotoFile = file;
        checklistItemStates[idx].fotoUrl = null;
        renderChecklistExecution();
      });

      radios.forEach((r) =>
        r.addEventListener("change", () => {
          checklistItemStates[idx].encaminhamento = r.value;
          renderChecklistExecution();
        })
      );

      if (terceiroInput) {
        terceiroInput.addEventListener("input", () => {
          checklistItemStates[idx].nomeTerceiro = terceiroInput.value;
        });
      }
    }
  });

  document
    .querySelectorAll(".checklist-status-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const status = btn.dataset.status;
        checklistItemStates[idx].status = status;
        if (status === "OK") {
          checklistItemStates[idx].motivo = "";
          checklistItemStates[idx].fotoFile = null;
          checklistItemStates[idx].fotoUrl = null;
          checklistItemStates[idx].encaminhamento = "";
          checklistItemStates[idx].nomeTerceiro = "";
        }
        renderChecklistExecution();
      });
    });

  renderNokLibrary();
}

function renderNokLibrary() {
  const div = document.getElementById("checklist-nok-library");
  const pieceCode = currentChecklistPiece?.code;
  if (!pieceCode) {
    div.innerHTML = "";
    return;
  }

  const nokCases = inspections
    .filter((i) => i.piece === pieceCode)
    .flatMap((ins) =>
      (ins.items || [])
        .map((it) => ({ ...it, ins }))
        .filter((it) => it.status === "NOK")
    );

  if (!nokCases.length) {
    div.innerHTML =
      '<div style="font-size:12px;color:#555;">Nenhuma reprovação registrada para esta peça.</div>';
    return;
  }

  div.innerHTML = `
    <div class="checklist-nok-title">Histórico de reprovações (${nokCases.length})</div>
    <div class="checklist-nok-grid">
      ${nokCases
        .map((c) => {
          const src = c.fotoUrl || "";
          return `
            <div class="checklist-nok-card">
              <div><strong>${c.ins.date}</strong></div>
              <div>Inspetor: ${c.ins.inspector}</div>
              <div style="margin-top:4px;">${c.motivo || ""}</div>
              ${
                src
                  ? `<img src="${src}" onclick="showImageModal('${src}')">`
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

async function finishChecklist() {
  if (!currentChecklistPiece) {
    alert("Nenhuma peça selecionada.");
    return;
  }

  for (let i = 0; i < checklistItemStates.length; i++) {
    const st = checklistItemStates[i];
    if (!st.status) {
      alert("Responda todos os itens do checklist.");
      return;
    }
    if (st.status === "NOK") {
      if (!st.motivo?.trim()) {
        alert("Preencha o motivo em todos os itens NÃO OK.");
        return;
      }
      if (!st.fotoFile && !st.fotoUrl) {
        alert("Adicione foto em todos os itens NÃO OK.");
        return;
      }
      if (!st.encaminhamento) {
        alert("Selecione o encaminhamento em todos os itens NÃO OK.");
        return;
      }
      if (
        st.encaminhamento === "terceiro" &&
        !st.nomeTerceiro?.trim()
      ) {
        alert("Informe o aprovador em todos os itens aprovados por terceiro.");
        return;
      }
    }
  }

  const now = new Date();
  const insp = document.getElementById("insp-selector").value;

  const inspecToSave = {
    date: now.toLocaleDateString("pt-BR"),
    inspector: insp,
    piece: currentChecklistPiece.code,
    description: "Inspeção realizada",
    items: checklistItemStates.map((s) => ({
      status: s.status,
      motivo: s.motivo,
      encaminhamento: s.encaminhamento,
      nomeTerceiro: s.nomeTerceiro,
      fotoFile: s.fotoFile,
      fotoUrl: s.fotoUrl
    }))
  };

  if (window.fbApi && window.fbApi.saveInspection) {
    try {
      const saved = await window.fbApi.saveInspection(inspecToSave);
      inspections.push(saved);
      alert("Inspeção salva no servidor.");
    } catch (err) {
      console.error("Erro ao salvar inspeção no Firebase:", err);
      // salva local sem fotos
      inspections.push({
        ...inspecToSave,
        items: inspecToSave.items.map((i) => ({
          ...i,
          fotoFile: null,
          fotoUrl: null
        }))
      });
      alert(
        "Erro ao salvar no servidor. Inspeção foi registrada apenas neste navegador."
      );
    }
  } else {
    inspections.push({
      ...inspecToSave,
      items: inspecToSave.items.map((i) => ({
        ...i,
        fotoFile: null,
        fotoUrl: null
      }))
    });
    alert("Inspeção registrada localmente.");
  }

  renderReports();
  renderDashboard();
  renderChecklistExecution();
}

/* ===========================
   Inspetores (com foto)
   =========================== */

function loadInspectorPhotosFromLocalStorage() {
  try {
    const raw = localStorage.getItem("inspPhotos");
    inspectorPhotos = raw ? JSON.parse(raw) : {};
  } catch {
    inspectorPhotos = {};
  }
}

function saveInspectorPhotosToLocalStorage() {
  try {
    localStorage.setItem(
      "inspPhotos",
      JSON.stringify(inspectorPhotos || {})
    );
  } catch (e) {
    console.warn("Não foi possível salvar fotos no localStorage", e);
  }
}

function renderInspectors() {
  const listDiv = document.getElementById("inspectors-list");
  listDiv.innerHTML = "";

  inspectors.forEach((name) => {
    const card = document.createElement("div");
    card.className = "inspector-card";

    const photoSrc = inspectorPhotos[name] || "";
    card.innerHTML = `
      <div class="inspector-avatar">
        ${
          photoSrc
            ? `<img src="${photoSrc}" onclick="showImageModal('${photoSrc}')">`
            : name
                .split(" ")
                .map((p) => p[0])
                .join("")
        }
      </div>
      <div class="inspector-name">${name}</div>
      <div class="inspector-actions">
        <button class="btn-icon btn-edit" data-name="${name}">Editar</button>
        <button class="btn-icon btn-delete" data-name="${name}">Remover</button>
      </div>
    `;

    listDiv.appendChild(card);
  });

  listDiv.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      openEditInspectorModal(name);
    });
  });

  listDiv.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      if (!confirm(`Remover inspetor "${name}"?`)) return;
      inspectors = inspectors.filter((n) => n !== name);
      delete inspectorPhotos[name];
      saveInspectorPhotosToLocalStorage();
      renderInspectors();
      renderChecklistSelectors();
      // não mexo nas inspeções antigas
    });
  });

  document.getElementById("insp-name-input").value = "";
  document.getElementById("insp-photo-input").value = "";
}

function openEditInspectorModal(name) {
  const currentPhoto = inspectorPhotos[name] || "";
  showModal(`
    <div class="modal-header">
      <div class="modal-title">Editar Inspetor</div>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="form-group" style="margin-top:10px;">
      <label>Nome</label>
      <input type="text" id="modal-insp-name" value="${name}">
    </div>
    <div class="form-group">
      <label>Foto</label>
      <input type="file" id="modal-insp-photo" accept="image/*">
    </div>
    ${
      currentPhoto
        ? `<div style="margin-top:6px;text-align:center;">
             <img src="${currentPhoto}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">
           </div>`
        : ""
    }
    <div style="margin-top:12px;text-align:right;">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" id="modal-insp-save">Salvar</button>
    </div>
  `);

  document
    .getElementById("modal-insp-save")
    .addEventListener("click", () => {
      const newName =
        document.getElementById("modal-insp-name").value.trim();
      const fileInput = document.getElementById("modal-insp-photo");
      const file = fileInput.files[0];

      if (!newName) {
        alert("Nome não pode ser vazio.");
        return;
      }

      // atualiza nome na lista
      const idx = inspectors.indexOf(name);
      if (idx >= 0) inspectors[idx] = newName;

      // move foto se nome mudou
      if (newName !== name) {
        inspectorPhotos[newName] = inspectorPhotos[name];
        delete inspectorPhotos[name];
      }

      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          inspectorPhotos[newName] = e.target.result;
          saveInspectorPhotosToLocalStorage();
          closeModal();
          renderInspectors();
          renderChecklistSelectors();
        };
        reader.readAsDataURL(file);
      } else {
        saveInspectorPhotosToLocalStorage();
        closeModal();
        renderInspectors();
        renderChecklistSelectors();
      }
    });
}

/* ===========================
   Peças & Itens
   =========================== */

function renderPieces() {
  const listDiv = document.getElementById("pieces-list");
  const selectItems = document.getElementById("piece-items-selector");

  listDiv.innerHTML = "";
  selectItems.innerHTML = "";

  pieces.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "piece-row";

    const src = getPieceImageSrc(p);

    row.innerHTML = `
      <div class="piece-row-left">
        <div class="piece-thumb">
          ${src ? `<img src="${src}">` : ""}
        </div>
        <div class="piece-label">
          ${p.code} — ${p.description || ""}
        </div>
      </div>
      <div>
        <button class="btn-icon btn-edit" data-idx="${idx}">Editar</button>
        <button class="btn-icon btn-delete" data-idx="${idx}">Remover</button>
      </div>
    `;

    listDiv.appendChild(row);

    selectItems.innerHTML += `<option value="${idx}">${p.code}</option>`;
  });

  document
    .querySelectorAll("#pieces-list .btn-edit")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        openEditPieceModal(idx);
      });
    });

  document
    .querySelectorAll("#pieces-list .btn-delete")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.dataset.idx);
        const p = pieces[idx];
        if (!confirm(`Excluir peça "${p.code}"?`)) return;
        pieces.splice(idx, 1);
        renderPieces();
        renderChecklistSelectors();
        if (window.fbApi && window.fbApi.deletePiece) {
          try {
            await window.fbApi.deletePiece(p.code);
          } catch (err) {
            console.error("Erro ao remover peça no Firebase:", err);
          }
        }
      });
    });

  if (pieces.length) {
    document.getElementById("piece-items-selector").value = 0;
    renderPieceItemsList(0);
  } else {
    document.getElementById("piece-items-list").innerHTML =
      "<div style='font-size:12px;color:#666;'>Nenhuma peça cadastrada.</div>";
  }

  document.getElementById("piece-code-input").value = "";
  document.getElementById("piece-desc-input").value = "";
  document.getElementById("piece-image-input").value = "";
}

function openEditPieceModal(idx) {
  const p = pieces[idx];
  const src = getPieceImageSrc(p) || "";

  showModal(`
    <div class="modal-header">
      <div class="modal-title">Editar Peça</div>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="form-group" style="margin-top:10px;">
      <label>Código</label>
      <input type="text" id="modal-piece-code" value="${p.code}">
    </div>
    <div class="form-group">
      <label>Descrição</label>
      <input type="text" id="modal-piece-desc" value="${
        p.description || ""
      }">
    </div>
    <div class="form-group">
      <label>Imagem</label>
      <input type="file" id="modal-piece-img" accept="image/*">
    </div>
    ${
      src
        ? `<div style="margin-top:6px;text-align:center;">
             <img src="${src}" style="max-width:120px;max-height:80px;border-radius:6px;">
           </div>`
        : ""
    }
    <div style="margin-top:12px;text-align:right;">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" id="modal-piece-save">Salvar</button>
    </div>
  `);

  document
    .getElementById("modal-piece-save")
    .addEventListener("click", async () => {
      const newCode =
        document.getElementById("modal-piece-code").value.trim();
      const newDesc =
        document.getElementById("modal-piece-desc").value.trim();
      const file = document.getElementById("modal-piece-img").files[0];

      if (!newCode || !newDesc) {
        alert("Preencha código e descrição.");
        return;
      }

      p.code = newCode;
      p.description = newDesc;
      if (file) {
        p.image = file;
        p.imageUrl = null;
      }

      closeModal();
      renderPieces();
      renderChecklistSelectors();

      if (window.fbApi && window.fbApi.savePiece) {
        try {
          await window.fbApi.savePiece(p);
        } catch (err) {
          console.error("Erro ao salvar peça no Firebase:", err);
        }
      }
    });
}

function renderPieceItemsList(pieceIdx) {
  const box = document.getElementById("piece-items-list");
  box.innerHTML = "";

  const p = pieces[pieceIdx];
  if (!p) return;

  (p.items || []).forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "piece-item-row";

    const src = getItemImageSrc(it);
    row.innerHTML = `
      <div class="piece-item-main">
        <div class="piece-item-thumb">
          ${src ? `<img src="${src}">` : ""}
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;">${it.name}</div>
          <div style="font-size:11px;color:#555;">${
            it.description || ""
          }</div>
        </div>
      </div>
      <div>
        <button class="btn-icon btn-edit" data-pidx="${pieceIdx}" data-idx="${idx}">Editar</button>
        <button class="btn-icon btn-delete" data-pidx="${pieceIdx}" data-idx="${idx}">Remover</button>
      </div>
    `;

    box.appendChild(row);
  });

  box.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pidx = Number(btn.dataset.pidx);
      const idx = Number(btn.dataset.idx);
      openEditItemModal(pidx, idx);
    });
  });

  box.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pidx = Number(btn.dataset.pidx);
      const idx = Number(btn.dataset.idx);
      const p = pieces[pidx];
      if (!confirm(`Remover item "${p.items[idx].name}"?`)) return;
      p.items.splice(idx, 1);
      renderPieceItemsList(pidx);
      if (window.fbApi && window.fbApi.savePiece) {
        try {
          await window.fbApi.savePiece(p);
        } catch (err) {
          console.error("Erro ao salvar peça no Firebase:", err);
        }
      }
    });
  });
}

function openEditItemModal(pieceIdx, idx) {
  const item = pieces[pieceIdx].items[idx];
  const src = getItemImageSrc(item) || "";

  showModal(`
    <div class="modal-header">
      <div class="modal-title">Editar Item</div>
      <button class="modal-close-btn">&times;</button>
    </div>
    <div class="form-group" style="margin-top:10px;">
      <label>Nome</label>
      <input type="text" id="modal-item-name" value="${item.name}">
    </div>
    <div class="form-group">
      <label>Descrição</label>
      <textarea id="modal-item-desc" rows="2">${item.description || ""}</textarea>
    </div>
    <div class="form-group">
      <label>Imagem</label>
      <input type="file" id="modal-item-img" accept="image/*">
    </div>
    ${
      src
        ? `<div style="margin-top:6px;text-align:center;">
             <img src="${src}" style="max-width:120px;max-height:80px;border-radius:6px;">
           </div>`
        : ""
    }
    <div style="margin-top:12px;text-align:right;">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" id="modal-item-save">Salvar</button>
    </div>
  `);

  document
    .getElementById("modal-item-save")
    .addEventListener("click", async () => {
      const name =
        document.getElementById("modal-item-name").value.trim();
      const desc =
        document.getElementById("modal-item-desc").value.trim();
      const file = document.getElementById("modal-item-img").files[0];

      if (!name || !desc) {
        alert("Preencha nome e descrição.");
        return;
      }

      item.name = name;
      item.description = desc;
      if (file) {
        item.image = file;
        item.imageUrl = null;
      }

      closeModal();
      renderPieceItemsList(pieceIdx);

      if (window.fbApi && window.fbApi.savePiece) {
        try {
          await window.fbApi.savePiece(pieces[pieceIdx]);
        } catch (err) {
          console.error("Erro ao salvar peça no Firebase:", err);
        }
      }
    });
}

/* ===========================
   Relatórios
   =========================== */

function ensureReportsChart() {
  const ctx = document
    .getElementById("reports-chart")
    ?.getContext("2d");
  if (!ctx) return;

  if (!reportsChart) {
    reportsChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Embarcadas", "Retrabalho"],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ["#228be6", "#e23636"],
            borderColor: "#fff",
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: true }
        },
        cutout: "60%"
      }
    });
  }
}

function renderReports() {
  ensureReportsChart();

  const monthSelect = document.getElementById("report-month-select");
  const tbody = document.getElementById("reports-history-body");
  const totalSpan = document.getElementById("total-inspecoes");

  if (!monthSelect || !tbody || !totalSpan) return;

  // meses disponíveis
  const monthsSet = new Set();
  inspections.forEach((i) => {
    if (!i.date) return;
    const [d, m, y] = i.date.split("/");
    if (m && y) monthsSet.add(`${m}/${y}`);
  });
  const months = Array.from(monthsSet).sort().reverse();

  monthSelect.innerHTML = months
    .map((m) => `<option value="${m}">${m}</option>`)
    .join("");

  const current =
    monthSelect.value || (months.length ? months[0] : "");

  monthSelect.value = current;

  let embarcadas = 0;
  let retrabalho = 0;
  let countIns = 0;

  const filtered = inspections.filter((i) => {
    if (!i.date) return false;
    const [d, m, y] = i.date.split("/");
    return `${m}/${y}` === current;
  });

  filtered.forEach((i) => {
    countIns++;
    (i.items || []).forEach((it) => {
      if (it.status === "OK") {
        embarcadas++;
      } else if (it.encaminhamento === "retrabalho") {
        retrabalho++;
      } else {
        embarcadas++;
      }
    });
  });

  totalSpan.textContent = inspections.length;

  tbody.innerHTML = filtered.length
    ? filtered
        .map(
          (i) => `
      <tr>
        <td>${i.date}</td>
        <td>${i.inspector}</td>
        <td>${i.piece}</td>
        <td>${i.description || "-"}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="4" style="text-align:center;">Nenhuma inspeção para o mês selecionado.</td></tr>`;

  if (reportsChart) {
    reportsChart.data.datasets[0].data = [embarcadas, retrabalho];
    reportsChart.update();
  }
}

function exportCSV() {
  if (!inspections.length) {
    alert("Sem inspeções para exportar.");
    return;
  }
  const rows = [
    ["Data", "Inspetor", "Peça", "Descrição"].join(",")
  ];
  inspections.forEach((i) => {
    const desc = (i.description || "").replace(/"/g, '""');
    rows.push(
      `${i.date},"${i.inspector}","${i.piece}","${desc}"`
    );
  });

  const blob = new Blob([rows.join("\n")], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "relatorio_inspecoes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ===========================
   Dashboard
   =========================== */

function ensureDashboardChart() {
  const ctx = document
    .getElementById("dashboard-chart")
    ?.getContext("2d");
  if (!ctx) return;

  if (!dashboardChart) {
    dashboardChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Embarcadas", "Retrabalho"],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ["#228be6", "#e23636"],
            borderColor: "#fff",
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: true }
        },
        cutout: "60%"
      }
    });
  }
}

function renderDashboard() {
  ensureDashboardChart();

  const kpiInsMes = document.getElementById("kpi-inspecoes-mes");
  const kpiPercentNok = document.getElementById("kpi-percent-nok");
  const kpiTopPecas = document.getElementById("kpi-top-pecas");

  if (!kpiInsMes || !kpiPercentNok || !kpiTopPecas) return;

  if (!inspections.length) {
    kpiInsMes.textContent = "0";
    kpiPercentNok.textContent = "0%";
    kpiTopPecas.innerHTML =
      "<div>Sem dados suficientes.</div>";
    if (dashboardChart) {
      dashboardChart.data.datasets[0].data = [0, 0];
      dashboardChart.update();
    }
    return;
  }

  // mês atual (último registro)
  const last = inspections[inspections.length - 1];
  const [d, m, y] = last.date.split("/");
  const currentMonth = `${m}/${y}`;

  let countIns = 0;
  let totalItens = 0;
  let totalNok = 0;
  let embarcadas = 0;
  let retrabalho = 0;
  const nokByPiece = {};

  inspections.forEach((i) => {
    const [dd, mm, yy] = i.date.split("/");
    if (`${mm}/${yy}` !== currentMonth) return;

    countIns++;
    (i.items || []).forEach((it) => {
      totalItens++;
      if (it.status === "NOK") {
        totalNok++;
        nokByPiece[i.piece] = (nokByPiece[i.piece] || 0) + 1;
      }
      if (it.status === "OK") {
        embarcadas++;
      } else if (it.encaminhamento === "retrabalho") {
        retrabalho++;
      } else {
        embarcadas++;
      }
    });
  });

  kpiInsMes.textContent = String(countIns);

  const percent =
    totalItens > 0 ? ((totalNok / totalItens) * 100).toFixed(1) : "0.0";
  kpiPercentNok.textContent = `${percent}%`;

  const top = Object.entries(nokByPiece)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  kpiTopPecas.innerHTML = top.length
    ? top
        .map(
          ([code, q]) =>
            `<div>${code}: <strong>${q}</strong> NOK</div>`
        )
        .join("")
    : "<div>Nenhuma reprovação no mês atual.</div>";

  if (dashboardChart) {
    dashboardChart.data.datasets[0].data = [embarcadas, retrabalho];
    dashboardChart.update();
  }
}

/* ===========================
   Inicialização
   =========================== */

document.addEventListener("DOMContentLoaded", async () => {
  loadInspectorPhotosFromLocalStorage();

  // tenta carregar do Firebase
  if (window.fbApi && window.fbApi.loadAll) {
    try {
      const data = await window.fbApi.loadAll();
      if (data.pieces && data.pieces.length) pieces = data.pieces;
      if (data.inspectors && data.inspectors.length)
        inspectors = data.inspectors;
      if (data.inspections && data.inspections.length)
        inspections = data.inspections;
    } catch (err) {
      console.error("Erro ao carregar dados do Firebase:", err);
    }
  }

  // binds de botões
  document
    .getElementById("btn-start-checklist")
    .addEventListener("click", startChecklist);

  document
    .getElementById("btn-finish-checklist")
    .addEventListener("click", finishChecklist);

  document
    .getElementById("btn-add-inspector")
    .addEventListener("click", () => {
      const name =
        document.getElementById("insp-name-input").value.trim();
      const file = document.getElementById("insp-photo-input")
        .files[0];

      if (!name) {
        alert("Informe o nome do inspetor.");
        return;
      }
      if (inspectors.includes(name)) {
        alert("Já existe um inspetor com esse nome.");
        return;
      }

      const addInspector = (photoDataUrl) => {
        inspectors.push(name);
        if (photoDataUrl) inspectorPhotos[name] = photoDataUrl;
        saveInspectorPhotosToLocalStorage();
        renderInspectors();
        renderChecklistSelectors();
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          addInspector(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        addInspector(null);
      }
    });

  document
    .getElementById("piece-items-selector")
    .addEventListener("change", (e) => {
      const idx = Number(e.target.value);
      renderPieceItemsList(idx);
    });

  document
    .getElementById("btn-add-piece")
    .addEventListener("click", async () => {
      const code =
        document.getElementById("piece-code-input").value.trim();
      const desc =
        document.getElementById("piece-desc-input").value.trim();
      const file =
        document.getElementById("piece-image-input").files[0];

      if (!code || !desc || !file) {
        alert("Preencha código, descrição e imagem.");
        return;
      }

      if (pieces.some((p) => p.code === code)) {
        alert("Já existe uma peça com esse código.");
        return;
      }

      const newPiece = {
        code,
        description: desc,
        image: file,
        imageUrl: null,
        items: []
      };
      pieces.push(newPiece);
      renderPieces();
      renderChecklistSelectors();

      if (window.fbApi && window.fbApi.savePiece) {
        try {
          await window.fbApi.savePiece(newPiece);
        } catch (err) {
          console.error("Erro ao salvar peça no Firebase:", err);
        }
      }
    });

  document
    .getElementById("btn-add-item")
    .addEventListener("click", async () => {
      const pieceIdx = Number(
        document.getElementById("piece-items-selector").value
      );
      if (Number.isNaN(pieceIdx) || !pieces[pieceIdx]) {
        alert("Selecione uma peça.");
        return;
      }

      const name =
        document.getElementById("item-name-input").value.trim();
      const desc =
        document.getElementById("item-desc-input").value.trim();
      const file =
        document.getElementById("item-image-input").files[0];

      if (!name || !desc || !file) {
        alert("Preencha nome, descrição e imagem do item.");
        return;
      }

      pieces[pieceIdx].items.push({
        name,
        description: desc,
        image: file,
        imageUrl: null
      });

      document.getElementById("item-name-input").value = "";
      document.getElementById("item-desc-input").value = "";
      document.getElementById("item-image-input").value = "";

      renderPieceItemsList(pieceIdx);

      if (window.fbApi && window.fbApi.savePiece) {
        try {
          await window.fbApi.savePiece(pieces[pieceIdx]);
        } catch (err) {
          console.error("Erro ao salvar peça no Firebase:", err);
        }
      }
    });

  document
    .getElementById("btn-export-csv")
    .addEventListener("click", exportCSV);

  const reportMonthSelect = document.getElementById(
    "report-month-select"
  );
  if (reportMonthSelect) {
    reportMonthSelect.addEventListener("change", renderReports);
  }

  // primeira renderização
  renderChecklistSelectors();
  renderInspectors();
  renderPieces();
  renderReports();
  renderDashboard();
});

