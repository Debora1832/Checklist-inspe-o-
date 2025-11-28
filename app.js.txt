// app.js

const ADMIN_PASSWORD = "Magius123";
window.adminAuthenticated = false;

let pieces = [
    {
        code: "597-2445#01",
        description: "Longarina",
        image: null,
        imageUrl: null,
        items: [
            { name: "Dimensão A (Ø)", description: "Verificar diâmetro da furação.", image: null, imageUrl:null },
            { name: "Furo B posição", description: "Conferir posição do furo de encaixe.", image: null, imageUrl:null },
            { name: "Solda - qualidade", description: "Avaliar acabamento da solda.", image: null, imageUrl:null }
        ]
    },
    {
        code: "597-2435#01",
        description: "Longarina",
        image: null,
        imageUrl: null,
        items: []
    }
];
let inspectors = ["João Silva","Maria Santos"];
let inspections = [];
let checklistItemStates = [];
let checklistCurrentPiece = null;

const screens = {
    'home': document.getElementById('home'),
    'checklist': document.getElementById('checklist'),
    'reports': document.getElementById('reports'),
    'admin': document.getElementById('admin')
};

/* ---------- MODAL GENÉRICO ---------- */
function showModal(html, onclose) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.innerHTML = html;
  overlay.style.display = 'flex';

  const closeBtn = box.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      overlay.style.display = 'none';
      box.innerHTML = '';
      if (onclose) onclose();
    };
  }
  overlay.onclick = function(e) {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      box.innerHTML = '';
      if (onclose) onclose();
    }
  };
}

function showImageModal(src) {
  if (!src) return;
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <img src="${src}" style="max-width:80vw;max-height:80vh;display:block;margin:auto;border-radius:10px;box-shadow:0 6px 22px #0002;">
  `);
}

/* ---------- ACESSO ADMIN ---------- */
function requestAdminAccess() {
  if (window.adminAuthenticated) {
    showScreen('admin');
    return;
  }

  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title">Acesso Admin</div>
    <div class="modal-form-row">
      <label for="admin-pass">Digite a senha:</label><br>
      <input id="admin-pass" type="password" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;">
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button class="btn-secondary" id="modal-admin-cancel">Cancelar</button>
      <button class="btn-primary" id="modal-admin-login">Entrar</button>
    </div>
  `, null);

  setTimeout(() => {
    const box = document.getElementById('modal-box');
    const overlay = document.getElementById('modal-overlay');

    const loginBtn = document.getElementById('modal-admin-login');
    const cancelBtn = document.getElementById('modal-admin-cancel');
    const passInput = document.getElementById('admin-pass');

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        overlay.style.display = 'none';
        box.innerHTML = '';
      };
    }

    function tryLogin() {
      const val = passInput.value || "";
      if (val === ADMIN_PASSWORD) {
        window.adminAuthenticated = true;
        overlay.style.display = 'none';
        box.innerHTML = '';
        showScreen('admin');
      } else {
        alert("Senha incorreta.");
        passInput.value = "";
        passInput.focus();
      }
    }

    if (loginBtn) loginBtn.onclick = tryLogin;

    if (passInput) {
      passInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          tryLogin();
        }
      });
      passInput.focus();
    }
  }, 0);
}

/* ---------- EVENTOS GLOBAIS DE EDIT / REMOVE (ADMIN) ---------- */
document.addEventListener("click", function(event) {
  if(event.target.closest(".edit-btn")) {
    const btn = event.target.closest(".edit-btn");
    const pieceIdx = btn.getAttribute('data-pieceidx');
    const itemIdx = btn.getAttribute('data-itemidx');
    if (itemIdx !== null && itemIdx !== undefined && itemIdx !== "") {
      editPieceItem(parseInt(pieceIdx), parseInt(itemIdx));
    } else {
      editPiece(parseInt(pieceIdx));
    }
  }
  if(event.target.closest(".remove-btn")) {
    const btn = event.target.closest(".remove-btn");
    const pieceIdx = btn.getAttribute('data-pieceidx');
    const itemIdx = btn.getAttribute('data-itemidx');
    const inspIdx = btn.getAttribute('data-inspectoridx');
    if (inspIdx !== null && inspIdx !== undefined && inspIdx !== "") {
      removeInspector(parseInt(inspIdx));
    } else if (itemIdx !== null && itemIdx !== undefined && itemIdx !== "") {
      removePieceItem(parseInt(pieceIdx), parseInt(itemIdx));
    } else {
      removePiece(parseInt(pieceIdx));
    }
  }
});

/* ---------- NAVEGAÇÃO DE TELAS ---------- */
function showScreen(screenId) {
    for (let key in screens) screens[key].classList.remove('active');
    if (screens[screenId]) screens[screenId].classList.add('active');
    if (screenId === "home") renderHome();
    if (screenId === "admin") renderAdmin();
    if (screenId === "checklist") renderChecklist();
    if (screenId === "reports") renderReports();
}

/* ---------- HOME ---------- */
function renderHome() {
    const inspSel = document.getElementById("inspector");
    inspSel.innerHTML =
      '<option value="" disabled selected>Selecionar inspetor</option>' +
      inspectors.map(i=>`<option value="${i}">${i}</option>`).join('');

    const pieceSel = document.getElementById("piece");
    pieceSel.innerHTML =
      '<option value="" disabled selected>Selecionar peça</option>' +
      pieces.map(p=>`<option value="${p.code}">${p.code}</option>`).join('');
}

function showChecklist() {
    const piece = document.getElementById('piece').value;
    const insp = document.getElementById('inspector').value;
    if(!piece || !insp) { alert("Selecione um inspetor e uma peça!"); return;}
    checklistCurrentPiece = pieces.find(p => p.code === piece);
    checklistItemStates = (checklistCurrentPiece?.items||[]).map(()=>({
        status:null,motivo:"",foto:null,fotoUrl:null,encaminhamento:"",nome_terceiro:""
    }));
    showScreen('checklist');
    renderChecklist();
}

/* ---------- HELPERS DE IMAGEM ---------- */
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

/* ---------- CHECKLIST ---------- */
function renderChecklist() {
    const headerEl = document.getElementById('checklist-header');
    const pieceImgBox = document.getElementById("piece-image-box");

    headerEl.textContent = checklistCurrentPiece ? checklistCurrentPiece.code : "";

    const mainImgSrc = getPieceImageSrc(checklistCurrentPiece);
    pieceImgBox.innerHTML = mainImgSrc
        ? `<img src="${mainImgSrc}" style="max-width:100%; max-height:240px; cursor:pointer; border-radius:10px;" onclick="showImageModal('${mainImgSrc}')">`
        : `[Imagem aqui]`;

    document.getElementById("checklist-item-list").innerHTML =
      (checklistCurrentPiece?.items||[]).map((item, idx) => {
        const state = checklistItemStates[idx];
        let divClass = "checklist-item";
        if(state.status==='OK') divClass += " ok";
        if(state.status==='NOK') divClass += " not-ok";

        const itemImgSrc = getItemImageSrc(item);
        let fileThumb = itemImgSrc
            ? `<img src="${itemImgSrc}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;cursor:pointer;" onclick="showImageModal('${itemImgSrc}')">`
            : `<div style="background-color:#e9ecef; width:120px; height:120px; border-radius:10px;"></div>`;

        let extra = "";
        if(state.status==='NOK') {
            const fotoExistingSrc = getFotoSrc(state);
            extra = `
            <div class="checklist-extra-wrapper">
                <div class="checklist-extra-block" id="extra_box_${idx}">
                    <div class="checklist-extra-label">
                      Descrição da não conformidade <span style="color:#e23636">(obrigatório)</span>:
                    </div>
                    <textarea id="motivo_${idx}" placeholder="Descreva o motivo">${state.motivo||''}</textarea>
                    <div class="checklist-extra-label" style="margin-bottom:2px;">
                      Foto <span style="color:#e23636">(obrigatório)</span>:
                    </div>
                    <input type="file" id="foto_${idx}" accept="image/*">
                    <div class="checklist-radio-group" style="margin-top:10px;">
                        <label><input type="radio" name="encaminhar_${idx}" value="retrabalho" ${state.encaminhamento==="retrabalho"?"checked":""}> Encaminhar para retrabalho</label>
                        <label><input type="radio" name="encaminhar_${idx}" value="terceiro" ${state.encaminhamento==="terceiro"?"checked":""}> Aprovado por terceiro</label>
                    </div>
                    ${state.encaminhamento=="terceiro"?`
                    <div class="checklist-terceiro-nome-box">
                        <label for="nome_terceiro_${idx}">Nome ou matrícula do aprovador:</label>
                        <input type="text" id="nome_terceiro_${idx}" value="${state.nome_terceiro||''}">
                    </div>`:""}
                    ${fotoExistingSrc ? `<img src="${fotoExistingSrc}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;margin-top:9px;cursor:pointer;" onclick="showImageModal('${fotoExistingSrc}')">` : ""}
                </div>
            </div>
            `;
        }
        return `<div class="${divClass}">
            <div style="display:flex;flex-direction:column;flex-grow:1;">
              <div style="display:flex;align-items:center;">
                ${fileThumb}
                <div class="checklist-item-info">
                  <strong>${item.name}</strong><br>
                  <small>${item.description||''}</small>
                </div>
                <div class="checklist-item-actions">
                  <button class="btn-ok" data-idx="${idx}">OK</button>
                  <button class="btn-nao-ok" data-idx="${idx}">NÃO OK</button>
                </div>
              </div>
              ${extra}
            </div>
        </div>`;
    }).join('');

    document.querySelectorAll(".checklist-item-actions .btn-ok").forEach(btn=>{
        btn.onclick = function(){
            let idx = parseInt(btn.dataset.idx);
            checklistItemStates[idx] = {
              status:"OK",motivo:"",foto:null,fotoUrl:null,encaminhamento:"",nome_terceiro:""
            };
            renderChecklist();
        };
    });
    document.querySelectorAll(".checklist-item-actions .btn-nao-ok").forEach(btn=>{
        btn.onclick = function(){
            let idx = parseInt(btn.dataset.idx);
            if (!checklistItemStates[idx]) checklistItemStates[idx] = {};
            checklistItemStates[idx].status = "NOK";
            renderChecklist();
        };
    });

    checklistItemStates.forEach((st, idx) => {
        if(st.status==='NOK') {
            let motivoEl = document.getElementById('motivo_'+idx);
            let fotoEl = document.getElementById('foto_'+idx);
            let nomeTerceiroEl = document.getElementById("nome_terceiro_"+idx);
            let retrabalhoRadio = document.querySelector('input[name="encaminhar_'+idx+'"][value="retrabalho"]');
            let terceiroRadio = document.querySelector('input[name="encaminhar_'+idx+'"][value="terceiro"]');
            motivoEl.oninput = ()=>{ checklistItemStates[idx].motivo = motivoEl.value; };
            fotoEl.onchange = ()=>{ 
              checklistItemStates[idx].foto = fotoEl.files[0]||null; 
              checklistItemStates[idx].fotoUrl = null;
              renderChecklist(); 
            };
            if(retrabalhoRadio){
                retrabalhoRadio.onchange = ()=>{
                    checklistItemStates[idx].encaminhamento = "retrabalho";
                    renderChecklist();
                };
            }
            if(terceiroRadio){
                terceiroRadio.onchange = ()=>{
                    checklistItemStates[idx].encaminhamento = "terceiro";
                    renderChecklist();
                };
            }
            if(nomeTerceiroEl){
                nomeTerceiroEl.oninput = ()=>{ checklistItemStates[idx].nome_terceiro = nomeTerceiroEl.value; };
            }
        }
    });

    renderNokLibrary();

    document.getElementById("finalizar-inspecao-btn").onclick = async function() {
      for (let i = 0; i < checklistItemStates.length; i++) {
        const state = checklistItemStates[i];
        if (!state.status) {
          alert("Responda todos os itens do checklist.");
          return;
        }
        if (state.status === "NOK") {
          if (!state.motivo || !state.motivo.trim()) {
            alert("Preencha o motivo para todos itens NÃO OK.");
            return;
          }
          if (!state.foto && !state.fotoUrl) {
            alert("Insira uma foto evidência para todos itens NÃO OK.");
            return;
          }
          if (!state.encaminhamento) {
            alert("Escolha um encaminhamento para todos itens NÃO OK.");
            return;
          }
          if (state.encaminhamento === "terceiro" &&
              (!state.nome_terceiro || !state.nome_terceiro.trim())) {
            alert("Informe o nome ou matrícula do aprovador terceiro.");
            return;
          }
        }
      }
      const now = new Date();
      const inspectionToSave = {
        date: now.toLocaleDateString('pt-BR'),
        inspector: document.getElementById('inspector').value,
        piece: checklistCurrentPiece.code,
        descricao: 'Inspeção realizada com sucesso',
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
          showScreen('home');
          renderReports();
        } catch (e) {
          console.error("Erro ao salvar inspeção no Firebase:", e);
          inspections.push({
            ...inspectionToSave,
            itens: inspectionToSave.itens.map(it => ({ ...it, foto:null, fotoUrl:null }))
          });
          alert("Erro ao salvar no servidor. Inspeção salva só localmente neste navegador.");
          showScreen('home');
          renderReports();
        }
      } else {
        inspections.push({
          ...inspectionToSave,
          itens: inspectionToSave.itens.map(it => ({ ...it, foto:null, fotoUrl:null }))
        });
        alert("Inspeção finalizada (somente local).");
        showScreen('home');
        renderReports();
      }
    };
}

/* ---------- HISTÓRICO NOK ---------- */
function renderNokLibrary() {
  const nokDiv = document.getElementById('checklist-nok-library');
  const pieceCode = checklistCurrentPiece?.code || "";
  const nokCases = inspections
    .filter(i => i.piece === pieceCode)
    .flatMap(i =>
      (i.itens || [])
        .map((it, idx) => ({...it, inspection: i, idx}))
        .filter(it => it.status === 'NOK')
    );
  if (!nokCases.length) {
    nokDiv.innerHTML =
      `<div style="color:#888;font-weight:500;padding:13px 0;">Nenhum caso de reprovação para esta peça.</div>`;
    return;
  }
  nokDiv.innerHTML = `
    <div class="checklist-nok-title">Histórico de Casos de Reprovação (${nokCases.length})</div>
    <div class="checklist-nok-library-list">
      ${nokCases.map(caso => {
        const src = getFotoSrc(caso);
        return `
        <div class="checklist-nok-case">
          <strong>${caso.inspection.date}</strong><br/>
          <span style="font-size:95%;">Inspetor: <span style="color:#093762;">${caso.inspection.inspector}</span></span><br>
          <span style="font-size:95%;color:#c22;">${caso.motivo}</span><br>
          <span style="font-size:90%;">Encaminhamento: <b>${caso.encaminhamento}</b>${caso.encaminhamento==="terceiro"?"<br>Terceiro aprovador: <b>"+caso.nome_terceiro+"</b>":""}</span><br>
          ${src ? `<img src="${src}" onclick="showImageModal('${src}')" alt="foto não conforme">` : ``}
        </div>`;
      }).join('')}
    </div>
  `;
}

/* ---------- ADMIN: PEÇAS / ITENS / INSPETORES ---------- */
function editPiece(idx){
  const p = pieces[idx];
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title">Editar Peça</div>
    <div class="modal-form-row"><label>Código:</label>
      <input type="text" id="modal-edit-code" value="${p.code}">
    </div>
    <div class="modal-form-row"><label>Descrição:</label>
      <input type="text" id="modal-edit-desc" value="${p.description}">
    </div>
    <div class="modal-form-row"><label>Imagem:</label>
      <input type="file" id="modal-edit-img">
      <span>${p.image ? (p.image.name || 'Imagem existente') : (p.imageUrl ? 'Imagem já salva' : "Nenhum arquivo escolhido")}</span>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:15px;">
      <button class="btn-primary" id="modal-save-edit">Salvar</button>
    </div>
  `);
  setTimeout(function() {
    document.getElementById('modal-save-edit').onclick = function(){
      const code = document.getElementById('modal-edit-code').value.trim();
      const desc = document.getElementById('modal-edit-desc').value.trim();
      const imgFile = document.getElementById('modal-edit-img').files[0];
      if (!code || !desc) return alert("Preencha todos os campos!");
      p.code = code; 
      p.description = desc;
      if(imgFile) {
        p.image = imgFile;
        p.imageUrl = null;
      }
      document.getElementById('modal-overlay').style.display = 'none';
      renderAdmin(); 
      renderHome();

      if (window.fbApi && window.fbApi.savePiece) {
        window.fbApi.savePiece(p).catch(e => {
          console.error("Erro ao salvar peça no Firebase:", e);
          alert("Erro ao enviar imagem/peça ao Firebase. Verifique console para detalhes.");
        });
      }
    };
  }, 0);
}

function removePiece(idx){
  const p = pieces[idx];
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title" style="margin-bottom:10px;">Confirma excluir esta Peça?</div>
    <div style="margin-bottom:25px;">Essa ação não pode ser desfeita.</div>
    <div style="display:flex;justify-content:flex-end;gap:15px;">
      <button class="btn-primary" id="modal-confirm-delete">Excluir</button>
    </div>
  `);
  setTimeout(function() {
    document.getElementById('modal-confirm-delete').onclick = function(){
      const codeToDelete = p.code;
      pieces.splice(idx,1);
      document.getElementById('modal-overlay').style.display = 'none';
      renderAdmin(); 
      renderHome();

      if (window.fbApi && window.fbApi.deletePiece) {
        window.fbApi.deletePiece(codeToDelete).catch(e => {
          console.error("Erro ao apagar peça no Firebase:", e);
        });
      }
    };
  }, 0);
}

function editPieceItem(pieceIdx,itemIdx){
  const item = pieces[pieceIdx].items[itemIdx];
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title">Editar Item</div>
    <div class="modal-form-row"><label>Nome:</label>
      <input type="text" id="modal-edit-name" value="${item.name}">
    </div>
    <div class="modal-form-row"><label>Descrição:</label>
      <input type="text" id="modal-edit-desc" value="${item.description}">
    </div>
    <div class="modal-form-row"><label>Imagem:</label>
      <input type="file" id="modal-edit-img">
      <span>${item.image ? (item.image.name || 'Imagem existente') : (item.imageUrl ? 'Imagem já salva' : "Nenhum arquivo escolhido")}</span>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:15px;">
      <button class="btn-primary" id="modal-save-edit">Salvar</button>
    </div>
  `);
  setTimeout(function() {
    document.getElementById('modal-save-edit').onclick = function(){
      const name = document.getElementById('modal-edit-name').value.trim();
      const desc = document.getElementById('modal-edit-desc').value.trim();
      const imgFile = document.getElementById('modal-edit-img').files[0];
      if (!name || !desc) return alert("Preencha todos os campos!");
      item.name = name; 
      item.description = desc;
      if(imgFile) {
        item.image = imgFile;
        item.imageUrl = null;
      }
      document.getElementById('modal-overlay').style.display = 'none';
      renderAdminPieceItems();

      if (window.fbApi && window.fbApi.savePiece) {
        window.fbApi.savePiece(pieces[pieceIdx]).catch(e => {
          console.error("Erro ao salvar item no Firebase:", e);
        });
      }
    };
  }, 0);
}

function removePieceItem(pieceIdx,itemIdx){
  showModal(`
    <button class="modal-close" title="Fechar">&times;</button>
    <div class="modal-title" style="margin-bottom:10px;">Confirma excluir este Item?</div>
    <div style="margin-bottom:25px;">Esta ação não pode ser desfeita.</div>
    <div style="display:flex;justify-content:flex-end;gap:15px;">
      <button class="btn-primary" id="modal-confirm-del-item">Excluir</button>
    </div>
  `);
  setTimeout(function () {
    document.getElementById('modal-confirm-del-item').onclick = function(){
      pieces[pieceIdx].items.splice(itemIdx,1);
      document.getElementById('modal-overlay').style.display = 'none';
      renderAdminPieceItems();

      if (window.fbApi && window.fbApi.savePiece) {
        window.fbApi.savePiece(pieces[pieceIdx]).catch(e => {
          console.error("Erro ao salvar peça no Firebase:", e);
        });
      }
    };
  }, 0);
}

/* BOTÕES ADMIN PRINCIPAIS */
document.getElementById("add-piece-btn").onclick = function() {
    const code = document.getElementById("new-code").value.trim();
    const desc = document.getElementById("new-description").value.trim();
    const imgInput = document.getElementById("new-image");
    const imgFile = imgInput.files[0];
    if (!code || !desc || !imgFile) {
        alert("Preencha todos os campos de peça!");
        return;
    }
    const newPiece = {code, description:desc, image:imgFile, imageUrl:null, items:[]};
    pieces.push(newPiece);
    renderAdmin(); 
    renderHome();

    if (window.fbApi && window.fbApi.savePiece) {
      window.fbApi.savePiece(newPiece).catch(e => {
        console.error("Erro ao salvar peça no Firebase:", e);
        alert("Erro ao enviar imagem/peça ao Firebase. Verifique as regras de Storage e o console.");
      });
    }
};

document.getElementById("clear-piece-btn").onclick = function(){
    document.getElementById('new-code').value = "";
    document.getElementById('new-description').value = "";
    document.getElementById('new-image').value = "";
    document.getElementById('image-file-info').textContent = "Nenhum arquivo escolhido";
};

document.getElementById("new-image").onchange = function(e){
    let txt = e.target.files[0] ? e.target.files[0].name : "Nenhum arquivo escolhido";
    document.getElementById('image-file-info').textContent = txt;
};

document.getElementById("add-piece-item-btn").onclick = function(){
    let idx = document.getElementById("select-piece-item").value;
    let name = document.getElementById("new-item-name").value.trim();
    let desc = document.getElementById("new-item-description").value.trim();
    let imgFile = document.getElementById("new-item-image").files[0];
    if (!idx && idx !== 0) { alert("Selecione uma peça!"); return; }
    if (!name || !desc || !imgFile) {
        alert("Preencha todos os campos, incluindo imagem!");
        return;
    }
    pieces[idx].items.push({name, description:desc, image:imgFile, imageUrl:null});
    renderAdminPieceItems();
    document.getElementById("new-item-name").value = "";
    document.getElementById("new-item-description").value = "";
    document.getElementById("new-item-image").value = "";
    document.getElementById("item-image-file-info").textContent = "Nenhum arquivo escolhido";

    if (window.fbApi && window.fbApi.savePiece) {
      window.fbApi.savePiece(pieces[idx]).catch(e => {
        console.error("Erro ao salvar peça no Firebase:", e);
      });
    }
};

document.getElementById("select-piece-item").onchange = renderAdminPieceItems;

document.getElementById("new-item-image").onchange = function(e){
    let txt = e.target.files[0] ? e.target.files[0].name : "Nenhum arquivo escolhido";
    document.getElementById('item-image-file-info').textContent = txt;
};

document.getElementById("add-inspector-btn").onclick = function() {
    const name = document.getElementById("inspector-new-name").value.trim();
    if (!name) { alert("Digite o nome do inspetor!"); return; }
    if (inspectors.includes(name)) { alert("Já existe esse inspetor!"); return;}
    inspectors.push(name); 
    renderAdmin(); 
    renderHome();

    if (window.fbApi && window.fbApi.setInspectors) {
      window.fbApi.setInspectors(inspectors).catch(e => {
        console.error("Erro ao salvar inspetores no Firebase:", e);
      });
    }
};

document.getElementById("clear-inspector-btn").onclick = function(){
    document.getElementById("inspector-new-name").value = "";
};

function removeInspector(idx){
    inspectors.splice(idx,1); 
    renderAdmin(); 
    renderHome();

    if (window.fbApi && window.fbApi.setInspectors) {
      window.fbApi.setInspectors(inspectors).catch(e => {
        console.error("Erro ao salvar inspetores no Firebase:", e);
      });
    }
}

/* RENDER ADMIN */
function renderAdmin() {
    let pieceListDiv = document.getElementById("admin-piece-list");
    pieceListDiv.innerHTML = pieces.map((p,idx) => {
        const imgSrc = getPieceImageSrc(p);
        const thumb = imgSrc
          ? `<img src="${imgSrc}" style="width:50px;height:40px;border-radius:4px;object-fit:cover;">`
          : `<div style="width:50px;height:40px;background-color:#eee;margin-right:10px;border-radius:4px;display:flex;align-items:center;justify-content:center;">Sem imagem</div>`;
        return `
        <div class="admin-piece-item">
            ${thumb}
            <span>${p.code} — ${p.description}</span>
            <div>
                <button class="edit-btn" data-pieceidx="${idx}"></button>
                <button class="remove-btn" data-pieceidx="${idx}"></button>
            </div>
        </div>`;
    }).join('');

    let selectPieceItem = document.getElementById("select-piece-item");
    selectPieceItem.innerHTML = pieces
      .map((p,idx)=>`<option value="${idx}">${p.code} — ${p.description}</option>`)
      .join('');
    renderAdminPieceItems();

    let inspList = document.getElementById("admin-inspector-list");
    inspList.innerHTML = inspectors.map((i,idx)=>
        `<div class="admin-inspector-item">
            <span>${i}</span>
            <button class="remove-btn" data-inspectoridx="${idx}"></button>
        </div>`
    ).join('');
    document.getElementById("inspector-new-name").value = "";
}

function renderAdminPieceItems(){
    let idx = document.getElementById("select-piece-item").value;
    if (idx==undefined || idx === "") return;
    let itemsBox = document.getElementById("admin-piece-items-list");
    let items = pieces[idx].items||[];
    itemsBox.innerHTML = items.map((item,i)=>{
        const imgSrc = getItemImageSrc(item);
        const icon = imgSrc ? `<img src="${imgSrc}" style="width:22px;height:22px;border-radius:3px;margin-right:4px;object-fit:cover;">` : "";
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
        </div>`;
    }).join('');
}

/* ---------- RELATÓRIOS ---------- */
let graficoRosca;
function renderReports() {
    let monthsSet = new Set();
    inspections.forEach(i=>{
        if (!i.date) return;
        let [day, month, year] = i.date.split("/");
        if (month && year) monthsSet.add(`${month}/${year}`);
    });
    let selectMonth = document.getElementById("report-month-select");
    let months = Array.from(monthsSet).sort().reverse();
    selectMonth.innerHTML =
      months.map(m=>`<option value="${m}">${m}</option>`).join('') ||
      `<option value="">---</option>`;
    let currentMonth = selectMonth.value || months[0] || "";
    let embarcadas=0, retrabalho=0;
    let t = 0;
    inspections.forEach(i=>{
        if (!i.date) return;
        let [d,m,y]=i.date.split("/");
        let mes = `${m}/${y}`;
        if(mes!==currentMonth) return;
        t++;
        (i.itens || []).forEach(it=>
            (it.status==='OK')? embarcadas++ :
              (it.encaminhamento==='retrabalho')? retrabalho++ : embarcadas++
        );
    });
    document.getElementById("total-inspecoes").textContent = inspections.length;
    document.getElementById("volume-mensal-num").textContent = t;

    if (!graficoRosca) {
      const ctx = document.getElementById('graficoRosca').getContext('2d');
      graficoRosca = new Chart(ctx, {
          type: 'doughnut',
          data: {
              labels: ['Embarcadas', 'Retrabalho'],
              datasets: [{
                  data: [embarcadas, retrabalho],
                  backgroundColor: ['#228be6', '#e23636'],
                  borderColor: '#fff',
                  borderWidth: 2
              }]
          },
          options: {responsive:false,plugins:{legend:{display:false}},cutout:'60%'}
      });
    } else {
      graficoRosca.data.datasets[0].data = [embarcadas,retrabalho];
      graficoRosca.update();
    }

    let tbody = document.getElementById("reports-history-body");
    let filtered = inspections.filter(i=>{
      if (!i.date) return false;
      let [day, month, year] = i.date.split("/");
      return `${month}/${year}` === currentMonth;
    });
    tbody.innerHTML = filtered.length ?
      filtered.map(i=>`
      <tr>
        <td>${i.date}</td>
        <td>${i.inspector}</td>
        <td>${i.piece}</td>
        <td>${i.descricao||'-'}</td>
      </tr>
      `).join('') :
      `<tr><td colspan="4" style="text-align:center;">Nenhum histórico encontrado.</td></tr>`;
}

document.getElementById('report-month-select').onchange = renderReports;

function exportCSV() {
    if (!inspections.length) {
      alert("Sem inspeções!");
      return;
    }
    let csv = "Data,Inspetor,Peça,Descrição\n" +
      inspections.map(i =>
        `${i.date},"${i.inspector}","${i.piece}","${(i.descricao||'').replace(/"/g,'""')}"`
      ).join("\n");
    let blob = new Blob([csv],{type:'text/csv'});
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = "relatorio.csv";
    a.click();
    URL.revokeObjectURL(url);
}

/* ---------- INICIALIZAÇÃO ---------- */
document.addEventListener("DOMContentLoaded", async ()=>{
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
    showScreen('home');
    renderHome();
    renderReports();
});
