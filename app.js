// app.js (lógica de UI)

// senha simples do Admin (mesma que você já usava)
const ADMIN_PASSWORD = "Magius123";
window.adminAuthenticated = false;

/** DADOS EM MEMÓRIA
 *  pieces: [{ code, description, image, imageUrl, items:[{name, description, image, imageUrl}] }]
 *  inspectors: [{ name, photo, photoUrl }]
 *  inspections: [{...}]
 */
let pieces = [
  {
    code: "597-2445#01",
    description: "Longarina",
    image: null,
    imageUrl: null,
    items: [
      { name: "Dimensão A (Ø)", description: "Verificar diâmetro da furação.", image: null, imageUrl: null },
      { name: "Furo B posição", description: "Conferir posição do furo de encaixe.", image: null, imageUrl: null },
      { name: "Solda - qualidade", description: "Avaliar acabamento da solda.", image: null, imageUrl: null }
    ]
  }
];
let inspectors = [
  { name: "João Silva", photo: null, photoUrl: null },
  { name: "Maria Santos", photo: null, photoUrl: null }
];
let inspections = [];

// estado da checklist atual
let checklistItemStates = [];
let checklistCurrentPiece = null;
let currentInspectorName = "";

// telas
const screens = {
  home: document.getElementById("home"),
  checklist: document.getElementById("checklist"),
  reports: document.getElementById("reports"),
  admin: document.getElementById("admin")
};

/* ---------- helpers de imagem ---------- */
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

/* ---------- MODAL ---------- */
function showModal(html, onclose) {
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  box.innerHTML = html;
  overlay.style.display = "flex";

  const closeBtn = box.querySelector(".modal-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      overlay.style.display = "none";
      box.innerHTML = "";
      if (onclose) onclose();
    };
  }
  overlay.onclick = function (e) {
    if (e.target === overlay) {
      overlay.style.display = "none";
      box.innerHTML = "";
      if (onclose) onclose();
    }
  };
}
function showImageModal(src) {
  if (!src) return;
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <img src="${src}" style="max-width:80vw;max-height:80vh;display:block;margin:auto;border-radius:10px;">
  `);
}

/* ---------- ADMIN: acesso ---------- */
function requestAdminAccess() {
  if (window.adminAuthenticated) {
    showScreen("admin");
    return;
  }
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title">Acesso Admin</div>
    <div class="modal-form-row">
      <label for="admin-pass">Digite a senha:</label><br>
      <input id="admin-pass" type="password" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button class="btn-secondary" id="modal-admin-cancel">Cancelar</button>
      <button class="btn-primary" id="modal-admin-login">Entrar</button>
    </div>
  `);

  setTimeout(() => {
    const overlay = document.getElementById("modal-overlay");
    const box = document.getElementById("modal-box");
    const btnLogin = document.getElementById("modal-admin-login");
    const btnCancel = document.getElementById("modal-admin-cancel");
    const passInput = document.getElementById("admin-pass");

    if (btnCancel) {
      btnCancel.onclick = () => {
        overlay.style.display = "none";
        box.innerHTML = "";
      };
    }
    function doLogin() {
      const val = passInput.value || "";
      if (val === ADMIN_PASSWORD) {
        window.adminAuthenticated = true;
        overlay.style.display = "none";
        box.innerHTML = "";
        showScreen("admin");
      } else {
        alert("Senha incorreta.");
        passInput.value = "";
        passInput.focus();
      }
    }
    if (btnLogin) btnLogin.onclick = doLogin;
    if (passInput) {
      passInput.addEventListener("keyup", e => {
        if (e.key === "Enter") doLogin();
      });
      passInput.focus();
    }
  }, 0);
}

/* ---------- NAVEGAÇÃO ENTRE TELAS ---------- */
function showScreen(id) {
  Object.keys(screens).forEach(key => screens[key].classList.remove("active"));
  if (screens[id]) screens[id].classList.add("active");

  if (id === "home") renderHome();
  if (id === "admin") renderAdmin();
  if (id === "checklist") renderChecklist();
  if (id === "reports") renderReports();
}
window.showScreen = showScreen;
window.requestAdminAccess = requestAdminAccess;

/* ---------- HOME ---------- */
function renderInspectorPreview(name) {
  const box = document.getElementById("inspector-preview");
  const insp = inspectors.find(i => i.name === name);
  if (!insp) {
    box.innerHTML = "";
    return;
  }
  const src = getInspectorPhotoSrc(insp);
  box.innerHTML = `
    <div class="inspector-card">
      <div class="inspector-avatar">
        ${src ? `<img src="${src}">` : ""}
      </div>
      <div>
        <div class="inspector-card-name">${insp.name}</div>
        <div class="inspector-card-info">Inspetor responsável pela inspeção atual.</div>
      </div>
    </div>
  `;
}
function renderHome() {
  const inspSel = document.getElementById("inspector");
  const pieceSel = document.getElementById("piece");

  inspSel.innerHTML =
    '<option value="" disabled selected>Selecionar inspetor</option>' +
    inspectors.map(i => `<option value="${i.name}">${i.name}</option>`).join("");

  pieceSel.innerHTML =
    '<option value="" disabled selected>Selecionar peça</option>' +
    pieces.map(p => `<option value="${p.code}">${p.code}</option>`).join("");

  inspSel.onchange = () => {
    currentInspectorName = inspSel.value || "";
    renderInspectorPreview(currentInspectorName);
  };

  // se já havia um inspetor selecionado
  if (currentInspectorName) {
    inspSel.value = currentInspectorName;
    renderInspectorPreview(currentInspectorName);
  } else {
    renderInspectorPreview("");
  }
}

/* ---------- CHECKLIST ---------- */
function showChecklist() {
  const insp = document.getElementById("inspector").value;
  const pieceCode = document.getElementById("piece").value;

  if (!insp || !pieceCode) {
    alert("Selecione um inspetor e uma peça.");
    return;
  }
  currentInspectorName = insp;
  checklistCurrentPiece = pieces.find(p => p.code === pieceCode);
  checklistItemStates = (checklistCurrentPiece?.items || []).map(() => ({
    status: null,
    motivo: "",
    foto: null,
    fotoUrl: null,
    encaminhamento: "",
    nome_terceiro: ""
  }));
  showScreen("checklist");
}

function updateSideStatus() {
  const elOk = document.getElementById("side-count-ok");
  const elNok = document.getElementById("side-count-nok");
  const elPend = document.getElementById("side-count-pend");
  let ok = 0, nok = 0, pend = 0;
  checklistItemStates.forEach(s => {
    if (!s || !s.status) pend++;
    else if (s.status === "OK") ok++;
    else nok++;
  });
  elOk.textContent = ok;
  elNok.textContent = nok;
  elPend.textContent = pend;
}

function renderChecklistSide() {
  // Inspetor
  const insp = inspectors.find(i => i.name === currentInspectorName);
  const nameEl = document.getElementById("side-inspector-name");
  const infoEl = document.getElementById("side-inspector-info");
  const avatarEl = document.getElementById("side-inspector-avatar");

  if (insp) {
    nameEl.textContent = insp.name;
    infoEl.textContent = "Inspetor selecionado para esta inspeção.";
    const src = getInspectorPhotoSrc(insp);
    avatarEl.innerHTML = src ? `<img src="${src}">` : "";
  } else {
    nameEl.textContent = "—";
    infoEl.textContent = "Selecione um inspetor na tela inicial.";
    avatarEl.innerHTML = "";
  }

  // Peça
  const pieceCodeEl = document.getElementById("side-piece-code");
  const pieceDescEl = document.getElementById("side-piece-desc");
  const pieceItemsEl = document.getElementById("side-piece-items");

  if (checklistCurrentPiece) {
    pieceCodeEl.textContent = checklistCurrentPiece.code;
    pieceDescEl.textContent = checklistCurrentPiece.description || "";
    pieceItemsEl.textContent =
      `${(checklistCurrentPiece.items || []).length} itens de inspeção`;
  } else {
    pieceCodeEl.textContent = "—";
    pieceDescEl.textContent = "Selecione a peça na tela inicial.";
    pieceItemsEl.textContent = "0 itens de inspeção";
  }

  updateSideStatus();
}

function renderNokLibrary() {
  const nokDiv = document.getElementById("checklist-nok-library");
  const pieceCode = checklistCurrentPiece?.code || "";
  const nokCases = inspections
    .filter(i => i.piece === pieceCode)
    .flatMap(i =>
      (i.itens || [])
        .map((it, idx) => ({ ...it, inspection: i, idx }))
        .filter(it => it.status === "NOK")
    );

  if (!nokCases.length) {
    nokDiv.innerHTML =
      '<div style="color:#888;font-weight:500;padding:8px 0;">Nenhum caso de reprovação para esta peça.</div>';
    return;
  }

  nokDiv.innerHTML = `
    <div class="checklist-nok-title">
      Histórico de Casos de Reprovação (${nokCases.length})
    </div>
    <div class="checklist-nok-library-list">
      ${nokCases
        .map(caso => {
          const src = getFotoSrc(caso);
          return `
          <div class="checklist-nok-case">
            <strong>${caso.inspection.date}</strong><br/>
            <span style="font-size:92%;">Inspetor:
              <span style="color:#093762;">${caso.inspection.inspector}</span>
            </span><br>
            <span style="font-size:92%;color:#c22;">${caso.motivo}</span><br>
            <span style="font-size:90%;">Encaminhamento:
              <b>${caso.encaminhamento}</b>
              ${
                caso.encaminhamento === "terceiro"
                  ? "<br>Terceiro aprovador: <b>" + (caso.nome_terceiro || "") + "</b>"
                  : ""
              }
            </span><br>
            ${
              src
                ? `<img src="${src}" onclick="showImageModal('${src}')" alt="foto não conforme">`
                : ""
            }
          </div>`;
        })
        .join("")}
    </div>
  `;
}

function renderChecklist() {
  const headerEl = document.getElementById("checklist-header");
  const pieceImgBox = document.getElementById("piece-image-box");

  headerEl.textContent = checklistCurrentPiece ? checklistCurrentPiece.code : "";

  const mainImgSrc = getPieceImageSrc(checklistCurrentPiece);
  pieceImgBox.innerHTML = mainImgSrc
    ? `<img src="${mainImgSrc}" style="max-width:100%;max-height:210px;border-radius:10px;cursor:pointer;" onclick="showImageModal('${mainImgSrc}')">`
    : "[Imagem aqui]";

  // Render itens
  const listEl = document.getElementById("checklist-item-list");
  listEl.innerHTML = (checklistCurrentPiece?.items || [])
    .map((item, idx) => {
      const state = checklistItemStates[idx] || {};
      let divClass = "checklist-item";
      if (state.status === "OK") divClass += " ok";
      if (state.status === "NOK") divClass += " not-ok";

      const itemImgSrc = getItemImageSrc(item);
      const thumb = itemImgSrc
        ? `<img src="${itemImgSrc}" style="width:110px;height:110px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="showImageModal('${itemImgSrc}')">`
        : `<div style="width:110px;height:110px;background:#e4e7f1;border-radius:8px;"></div>`;

      let extra = "";
      if (state.status === "NOK") {
        const fotoExistingSrc = getFotoSrc(state);
        extra = `
          <div class="checklist-extra-wrapper">
            <div class="checklist-extra-block" id="extra_box_${idx}">
              <div class="checklist-extra-label">
                Descrição da não conformidade (obrigatório):
              </div>
              <textarea id="motivo_${idx}" placeholder="Descreva o motivo">${state.motivo || ""}</textarea>
              <div class="checklist-extra-label" style="margin-bottom:2px;">
                Foto (obrigatório):
              </div>
              <input type="file" id="foto_${idx}" accept="image/*">
              <div class="checklist-radio-group" style="margin-top:8px;">
                <label>
                  <input type="radio" name="encaminhar_${idx}" value="retrabalho"
                    ${state.encaminhamento === "retrabalho" ? "checked" : ""}>
                  Encaminhar para retrabalho
                </label>
                <label>
                  <input type="radio" name="encaminhar_${idx}" value="terceiro"
                    ${state.encaminhamento === "terceiro" ? "checked" : ""}>
                  Aprovado por terceiro
                </label>
              </div>
              ${
                state.encaminhamento === "terceiro"
                  ? `
                <div class="checklist-terceiro-nome-box">
                  <label for="nome_terceiro_${idx}">Nome ou matrícula do aprovador:</label>
                  <input type="text" id="nome_terceiro_${idx}" value="${state.nome_terceiro || ""}">
                </div>`
                  : ""
              }
              ${
                fotoExistingSrc
                  ? `<img src="${fotoExistingSrc}"
                      style="width:120px;height:120px;object-fit:cover;border-radius:10px;margin-top:8px;cursor:pointer;"
                      onclick="showImageModal('${fotoExistingSrc}')">`
                  : ""
              }
            </div>
          </div>
        `;
      }

      return `
        <div class="${divClass}">
          <div style="display:flex;flex-direction:column;flex-grow:1;">
            <div style="display:flex;align-items:center;gap:10px;">
              ${thumb}
              <div class="checklist-item-info">
                <strong>${item.name}</strong><br>
                <small>${item.description || ""}</small>
              </div>
              <div class="checklist-item-actions">
                <button class="btn-ok" data-idx="${idx}">OK</button>
                <button class="btn-nao-ok" data-idx="${idx}">NÃO OK</button>
              </div>
            </div>
            ${extra}
          </div>
        </div>
      `;
    })
    .join("");

  // Ações OK / NOK
  listEl.querySelectorAll(".btn-ok").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      checklistItemStates[idx] = {
        status: "OK",
        motivo: "",
        foto: null,
        fotoUrl: null,
        encaminhamento: "",
        nome_terceiro: ""
      };
      renderChecklist();
    };
  });
  listEl.querySelectorAll(".btn-nao-ok").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const prev = checklistItemStates[idx] || {};
      checklistItemStates[idx] = {
        ...prev,
        status: "NOK"
      };
      renderChecklist();
    };
  });

  // Inputs adicionais de NOK
  checklistItemStates.forEach((st, idx) => {
    if (st.status === "NOK") {
      const motivoEl = document.getElementById("motivo_" + idx);
      const fotoEl = document.getElementById("foto_" + idx);
      const nomeTerceiroEl = document.getElementById("nome_terceiro_" + idx);
      const retrabalhoRadio = document.querySelector(
        `input[name="encaminhar_${idx}"][value="retrabalho"]`
      );
      const terceiroRadio = document.querySelector(
        `input[name="encaminhar_${idx}"][value="terceiro"]`
      );

      motivoEl.oninput = () => {
        checklistItemStates[idx].motivo = motivoEl.value;
      };
      fotoEl.onchange = () => {
        checklistItemStates[idx].foto = fotoEl.files[0] || null;
        checklistItemStates[idx].fotoUrl = null;
        renderChecklist();
      };
      if (retrabalhoRadio) {
        retrabalhoRadio.onchange = () => {
          checklistItemStates[idx].encaminhamento = "retrabalho";
          renderChecklist();
        };
      }
      if (terceiroRadio) {
        terceiroRadio.onchange = () => {
          checklistItemStates[idx].encaminhamento = "terceiro";
          renderChecklist();
        };
      }
      if (nomeTerceiroEl) {
        nomeTerceiroEl.oninput = () => {
          checklistItemStates[idx].nome_terceiro = nomeTerceiroEl.value;
        };
      }
    }
  });

  renderChecklistSide();
  renderNokLibrary();

  document.getElementById("finalizar-inspecao-btn").onclick = finalizarInspecao;
}

/* ---------- FINALIZAR INSPEÇÃO ---------- */
async function finalizarInspecao() {
  // validação
  for (let i = 0; i < checklistItemStates.length; i++) {
    const st = checklistItemStates[i];
    if (!st.status) {
      alert("Responda todos os itens do checklist.");
      return;
    }
    if (st.status === "NOK") {
      if (!st.motivo || !st.motivo.trim()) {
        alert("Preencha o motivo para todos itens NÃO OK.");
        return;
      }
      if (!st.foto && !st.fotoUrl) {
        alert("Insira uma foto evidência para todos itens NÃO OK.");
        return;
      }
      if (!st.encaminhamento) {
        alert("Escolha um encaminhamento para todos itens NÃO OK.");
        return;
      }
      if (
        st.encaminhamento === "terceiro" &&
        (!st.nome_terceiro || !st.nome_terceiro.trim())
      ) {
        alert("Informe o nome ou matrícula do aprovador terceiro.");
        return;
      }
    }
  }

  const now = new Date();
  const inspectionToSave = {
    date: now.toLocaleDateString("pt-BR"),
    inspector: currentInspectorName,
    piece: checklistCurrentPiece.code,
    descricao: "Inspeção realizada com sucesso",
    itens: checklistItemStates.map(s => ({
      status: s.status,
      motivo: s.motivo,
      encaminhamento: s.encaminhamento,
      nome_terceiro: s.nome_terceiro,
      foto: s.foto || null,
      fotoUrl: s.fotoUrl || null
    }))
  };

  if (window.fbApi && window.fbApi.saveInspection) {
    try {
      const saved = await window.fbApi.saveInspection(inspectionToSave);
      inspections.push(saved);
      alert("Inspeção finalizada e salva no Firebase!");
    } catch (e) {
      console.error("Erro ao salvar inspeção:", e);
      inspections.push({
        ...inspectionToSave,
        itens: inspectionToSave.itens.map(it => ({ ...it, foto: null, fotoUrl: null }))
      });
      alert("Erro ao salvar no servidor. Inspeção salva apenas localmente.");
    }
  } else {
    inspections.push({
      ...inspectionToSave,
      itens: inspectionToSave.itens.map(it => ({ ...it, foto: null, fotoUrl: null }))
    });
    alert("Inspeção finalizada (somente local).");
  }

  showScreen("home");
  renderReports();
}

/* ---------- ADMIN: PEÇAS / ITENS / INSPETORES ---------- */

// cliques nos botões de editar / remover (delegação)
document.addEventListener("click", ev => {
  const editBtn = ev.target.closest(".edit-btn");
  const removeBtn = ev.target.closest(".remove-btn");

  if (editBtn) {
    const pieceIdx = editBtn.getAttribute("data-pieceidx");
    const itemIdx = editBtn.getAttribute("data-itemidx");
    if (itemIdx !== null && itemIdx !== "") {
      editPieceItem(parseInt(pieceIdx, 10), parseInt(itemIdx, 10));
    } else {
      editPiece(parseInt(pieceIdx, 10));
    }
  }

  if (removeBtn) {
    const pieceIdx = removeBtn.getAttribute("data-pieceidx");
    const itemIdx = removeBtn.getAttribute("data-itemidx");
    const inspIdx = removeBtn.getAttribute("data-inspectoridx");

    if (inspIdx !== null && inspIdx !== "") {
      removeInspector(parseInt(inspIdx, 10));
    } else if (itemIdx !== null && itemIdx !== "") {
      removePieceItem(parseInt(pieceIdx, 10), parseInt(itemIdx, 10));
    } else if (pieceIdx !== null && pieceIdx !== "") {
      removePiece(parseInt(pieceIdx, 10));
    }
  }
});

// Adicionar peça
document.getElementById("add-piece-btn").onclick = async () => {
  const code = document.getElementById("new-code").value.trim();
  const desc = document.getElementById("new-description").value.trim();
  const imgFile = document.getElementById("new-image").files[0];

  if (!code || !desc || !imgFile) {
    alert("Preencha código, descrição e imagem da peça.");
    return;
  }

  const newPiece = { code, description: desc, image: imgFile, imageUrl: null, items: [] };
  pieces.push(newPiece);
  renderAdmin();
  renderHome();

  if (window.fbApi && window.fbApi.savePiece) {
    try {
      await window.fbApi.savePiece(newPiece);
    } catch (e) {
      console.error("Erro ao salvar peça:", e);
    }
  }
};
document.getElementById("clear-piece-btn").onclick = () => {
  document.getElementById("new-code").value = "";
  document.getElementById("new-description").value = "";
  document.getElementById("new-image").value = "";
  document.getElementById("image-file-info").textContent = "Nenhum arquivo escolhido";
};
document.getElementById("new-image").onchange = e => {
  const txt = e.target.files[0] ? e.target.files[0].name : "Nenhum arquivo escolhido";
  document.getElementById("image-file-info").textContent = txt;
};

// Adicionar item
document.getElementById("add-piece-item-btn").onclick = async () => {
  const idxStr = document.getElementById("select-piece-item").value;
  const name = document.getElementById("new-item-name").value.trim();
  const desc = document.getElementById("new-item-description").value.trim();
  const imgFile = document.getElementById("new-item-image").files[0];

  if (idxStr === "" || idxStr === null) {
    alert("Selecione uma peça.");
    return;
  }
  if (!name || !desc || !imgFile) {
    alert("Preencha nome, descrição e imagem do item.");
    return;
  }

  const idx = parseInt(idxStr, 10);
  pieces[idx].items.push({ name, description: desc, image: imgFile, imageUrl: null });
  renderAdminPieceItems();
  document.getElementById("new-item-name").value = "";
  document.getElementById("new-item-description").value = "";
  document.getElementById("new-item-image").value = "";
  document.getElementById("item-image-file-info").textContent = "Nenhum arquivo escolhido";

  if (window.fbApi && window.fbApi.savePiece) {
    try {
      await window.fbApi.savePiece(pieces[idx]);
    } catch (e) {
      console.error("Erro ao salvar item:", e);
    }
  }
};
document.getElementById("select-piece-item").onchange = renderAdminPieceItems;
document.getElementById("new-item-image").onchange = e => {
  const txt = e.target.files[0] ? e.target.files[0].name : "Nenhum arquivo escolhido";
  document.getElementById("item-image-file-info").textContent = txt;
};

// Inspetores
document.getElementById("inspector-new-photo").onchange = e => {
  const txt = e.target.files[0] ? e.target.files[0].name : "Nenhum arquivo escolhido";
  document.getElementById("inspector-photo-info").textContent = txt;
};
document.getElementById("add-inspector-btn").onclick = async () => {
  const name = document.getElementById("inspector-new-name").value.trim();
  const photoFile = document.getElementById("inspector-new-photo").files[0];

  if (!name) {
    alert("Digite o nome do inspetor.");
    return;
  }
  if (inspectors.some(i => i.name === name)) {
    alert("Já existe um inspetor com esse nome.");
    return;
  }

  inspectors.push({ name, photo: photoFile || null, photoUrl: null });
  renderAdmin();
  renderHome();

  if (window.fbApi && window.fbApi.setInspectors) {
    try {
      await window.fbApi.setInspectors(inspectors);
    } catch (e) {
      console.error("Erro ao salvar inspetores:", e);
    }
  }
};
document.getElementById("clear-inspector-btn").onclick = () => {
  document.getElementById("inspector-new-name").value = "";
  document.getElementById("inspector-new-photo").value = "";
  document.getElementById("inspector-photo-info").textContent = "Nenhum arquivo escolhido";
};

function removeInspector(idx) {
  inspectors.splice(idx, 1);
  renderAdmin();
  renderHome();
  if (window.fbApi && window.fbApi.setInspectors) {
    window.fbApi
      .setInspectors(inspectors)
      .catch(e => console.error("Erro ao salvar inspetores:", e));
  }
}

// Editar / remover peças e itens (modais simples)
function editPiece(idx) {
  const p = pieces[idx];
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title">Editar Peça</div>
    <div class="modal-form-row">
      <label>Código:</label>
      <input type="text" id="modal-edit-code" value="${p.code}">
    </div>
    <div class="modal-form-row">
      <label>Descrição:</label>
      <input type="text" id="modal-edit-desc" value="${p.description}">
    </div>
    <div class="modal-form-row">
      <label>Imagem:</label>
      <input type="file" id="modal-edit-img" accept="image/*">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button class="btn-primary" id="modal-save-edit">Salvar</button>
    </div>
  `);

  setTimeout(() => {
    document.getElementById("modal-save-edit").onclick = async () => {
      const code = document.getElementById("modal-edit-code").value.trim();
      const desc = document.getElementById("modal-edit-desc").value.trim();
      const imgFile = document.getElementById("modal-edit-img").files[0];

      if (!code || !desc) {
        alert("Preencha código e descrição.");
        return;
      }
      p.code = code;
      p.description = desc;
      if (imgFile) {
        p.image = imgFile;
        p.imageUrl = null;
      }

      document.getElementById("modal-overlay").style.display = "none";
      renderAdmin();
      renderHome();

      if (window.fbApi && window.fbApi.savePiece) {
        try {
          await window.fbApi.savePiece(p);
        } catch (e) {
          console.error("Erro ao salvar peça:", e);
        }
      }
    };
  }, 0);
}
function removePiece(idx) {
  const p = pieces[idx];
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title">Excluir peça</div>
    <div class="modal-form-row">Confirma excluir a peça <b>${p.code}</b>?</div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button class="btn-primary" id="modal-confirm-del">Excluir</button>
    </div>
  `);

  setTimeout(() => {
    document.getElementById("modal-confirm-del").onclick = async () => {
      const codeToDelete = p.code;
      pieces.splice(idx, 1);
      document.getElementById("modal-overlay").style.display = "none";
      renderAdmin();
      renderHome();
      if (window.fbApi && window.fbApi.deletePiece) {
        try {
          await window.fbApi.deletePiece(codeToDelete);
        } catch (e) {
          console.error("Erro ao excluir peça:", e);
        }
      }
    };
  }, 0);
}

function editPieceItem(pieceIdx, itemIdx) {
  const item = pieces[pieceIdx].items[itemIdx];
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title">Editar Item</div>
    <div class="modal-form-row">
      <label>Nome:</label>
      <input type="text" id="modal-edit-name" value="${item.name}">
    </div>
    <div class="modal-form-row">
      <label>Descrição:</label>
      <input type="text" id="modal-edit-desc" value="${item.description}">
    </div>
    <div class="modal-form-row">
      <label>Imagem:</label>
      <input type="file" id="modal-edit-img" accept="image/*">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button class="btn-primary" id="modal-save-item-edit">Salvar</button>
    </div>
  `);

  setTimeout(() => {
    document.getElementById("modal-save-item-edit").onclick = async () => {
      const name = document.getElementById("modal-edit-name").value.trim();
      const desc = document.getElementById("modal-edit-desc").value.trim();
      const imgFile = document.getElementById("modal-edit-img").files[0];

      if (!name || !desc) {
        alert("Preencha nome e descrição.");
        return;
      }
      item.name = name;
      item.description = desc;
      if (imgFile) {
        item.image = imgFile;
        item.imageUrl = null;
      }

      document.getElementById("modal-overlay").style.display = "none";
      renderAdminPieceItems();

      if (window.fbApi && window.fbApi.savePiece) {
        try {
          await window.fbApi.savePiece(pieces[pieceIdx]);
        } catch (e) {
          console.error("Erro ao salvar item:", e);
        }
      }
    };
  }, 0);
}
function removePieceItem(pieceIdx, itemIdx) {
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title">Excluir item</div>
    <div class="modal-form-row">Confirma excluir este item?</div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button class="btn-primary" id="modal-confirm-del-item">Excluir</button>
    </div>
  `);

  setTimeout(() => {
    document.getElementById("modal-confirm-del-item").onclick = async () => {
      pieces[pieceIdx].items.splice(itemIdx, 1);
      document.getElementById("modal-overlay").style.display = "none";
      renderAdminPieceItems();
      if (window.fbApi && window.fbApi.savePiece) {
        try {
          await window.fbApi.savePiece(pieces[pieceIdx]);
        } catch (e) {
          console.error("Erro ao salvar peça:", e);
        }
      }
    };
  }, 0);
}

function renderAdmin() {
  // peças
  const list = document.getElementById("admin-piece-list");
  list.innerHTML = pieces
    .map((p, idx) => {
      const src = getPieceImageSrc(p);
      const thumb = src
        ? `<img src="${src}" style="width:50px;height:40px;object-fit:cover;margin-right:8px;">`
        : `<div style="width:50px;height:40px;background:#e4e7f1;margin-right:8px;border-radius:4px;"></div>`;
      return `
        <div class="admin-piece-item">
          <div style="display:flex;align-items:center;">
            ${thumb}
            <span>${p.code} — ${p.description}</span>
          </div>
          <div>
            <button class="edit-btn" data-pieceidx="${idx}"></button>
            <button class="remove-btn" data-pieceidx="${idx}"></button>
          </div>
        </div>
      `;
    })
    .join("");

  const selectPieceItem = document.getElementById("select-piece-item");
  selectPieceItem.innerHTML = pieces
    .map((p, idx) => `<option value="${idx}">${p.code} — ${p.description}</option>`)
    .join("");
  renderAdminPieceItems();

  // inspetores
  const inspList = document.getElementById("admin-inspector-list");
  inspList.innerHTML = inspectors
    .map((i, idx) => {
      const src = getInspectorPhotoSrc(i);
      return `
        <div class="admin-inspector-item">
          <div class="admin-inspector-name">
            <div class="inspector-list-avatar">${src ? `<img src="${src}">` : ""}</div>
            <span>${i.name}</span>
          </div>
          <button class="remove-btn" data-inspectoridx="${idx}"></button>
        </div>
      `;
    })
    .join("");

  document.getElementById("inspector-new-name").value = "";
  document.getElementById("inspector-new-photo").value = "";
  document.getElementById("inspector-photo-info").textContent = "Nenhum arquivo escolhido";
}

function renderAdminPieceItems() {
  const idxStr = document.getElementById("select-piece-item").value;
  if (idxStr === "" || idxStr === null) return;
  const idx = parseInt(idxStr, 10);
  const items = pieces[idx].items || [];
  const box = document.getElementById("admin-piece-items-list");
  box.innerHTML = items
    .map((item, i) => {
      const src = getItemImageSrc(item);
      const icon = src
        ? `<img src="${src}" style="width:22px;height:22px;object-fit:cover;">`
        : "";
      return `
        <div class="admin-item-line">
          <div class="item-label-box">
            ${icon}
            <span>${item.name}</span>
          </div>
          <div>
            <button class="edit-btn" data-pieceidx="${idx}" data-itemidx="${i}"></button>
            <button class="remove-btn" data-pieceidx="${idx}" data-itemidx="${i}"></button>
          </div>
        </div>
      `;
    })
    .join("");
}

/* ---------- RELATÓRIOS ---------- */

const ctx = document.getElementById("graficoRosca").getContext("2d");
const graficoRosca = new Chart(ctx, {
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
    plugins: { legend: { display: false } },
    cutout: "60%"
  }
});
document.getElementById("report-month-select").onchange = renderReports;

function renderReports() {
  const selectMonth = document.getElementById("report-month-select");
  const monthsSet = new Set();

  inspections.forEach(i => {
    if (!i.date) return;
    const [d, m, y] = i.date.split("/");
    if (m && y) monthsSet.add(`${m}/${y}`);
  });

  const months = Array.from(monthsSet).sort().reverse();
  selectMonth.innerHTML =
    months.map(m => `<option value="${m}">${m}</option>`).join("") ||
    '<option value="">---</option>';

  const currentMonth = selectMonth.value || months[0] || "";
  let embarcadas = 0;
  let retrabalho = 0;
  let volumeMes = 0;

  inspections.forEach(i => {
    if (!i.date) return;
    const [d, m, y] = i.date.split("/");
    if (`${m}/${y}` !== currentMonth) return;
    volumeMes++;
    (i.itens || []).forEach(it => {
      if (it.status === "OK") embarcadas++;
      else if (it.encaminhamento === "retrabalho") retrabalho++;
      else embarcadas++;
    });
  });

  document.getElementById("total-inspecoes").textContent = inspections.length;
  document.getElementById("volume-mensal-num").textContent = volumeMes;
  graficoRosca.data.datasets[0].data = [embarcadas, retrabalho];
  graficoRosca.update();

  const tbody = document.getElementById("reports-history-body");
  const filtered = inspections.filter(i => {
    if (!i.date) return false;
    const [d, m, y] = i.date.split("/");
    return `${m}/${y}` === currentMonth;
  });

  tbody.innerHTML = filtered.length
    ? filtered
        .map(
          i => `
      <tr>
        <td>${i.date}</td>
        <td>${i.inspector}</td>
        <td>${i.piece}</td>
        <td>${i.descricao || "-"}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="4">Nenhum histórico encontrado.</td></tr>`;
}

function exportCSV() {
  if (!inspections.length) {
    alert("Sem inspeções para exportar.");
    return;
  }
  const csv =
    "Data,Inspetor,Peça,Descrição\n" +
    inspections
      .map(
        i =>
          `${i.date},"${i.inspector}","${i.piece}","${(i.descricao || "").replace(
            /"/g,
            '""'
          )}"`
      )
      .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "relatorio.csv";
  a.click();
  URL.revokeObjectURL(url);
}
window.exportCSV = exportCSV;

/* ---------- INICIALIZAÇÃO ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  if (window.fbApi && window.fbApi.loadAll) {
    try {
      const data = await window.fbApi.loadAll();
      if (data.pieces && data.pieces.length) pieces = data.pieces;
      if (data.inspectors && data.inspectors.length) inspectors = data.inspectors;
      if (data.inspections && data.inspections.length) inspections = data.inspections;
    } catch (e) {
      console.error("Erro ao carregar dados do Firebase:", e);
    }
  }

  showScreen("home");
  renderHome();
  renderReports();
});
