/* Poste de travail du commercial — optimisé pour plusieurs centaines d'appels/semaine */
import { getJSON, setJSON } from "../services/storage.js";
import { getHistory, addCall, addStatus, addNote, scheduleFollowUp as scheduleFollowUpService, getLastCall, getNextFollowUp } from "../services/prospectHistory.js";

const STATUSES = ["nouveau", "a_appeler", "appele", "relance", "rdv", "client", "refus", "hors_cible"];
const STATUS_LABELS = {
  nouveau: "Nouveau",
  a_appeler: "À appeler",
  appele: "Appelé",
  relance: "Relance",
  rdv: "RDV",
  client: "Client",
  refus: "Refus",
  hors_cible: "Hors cible"
};

let CLIENTS = [];
let FILTERED = [];
let CURRENT_PROSPECT = null;
let FILTER_STATE = {
  status: [],
  search: "",
  persona: [],
  minScore: 0
};

export async function loadWorkstationClients() {
  CLIENTS = getJSON("s3k_clients", []);
  CLIENTS = CLIENTS.map(c => ({
    ...c,
    status: c.status || "nouveau",
    lastCallDate: c.lastCallDate || null,
    nextFollowUp: c.nextFollowUp || null
  }));
  applyFilters();
  return CLIENTS;
}

export function applyFilters() {
  FILTERED = CLIENTS.filter(c => {
    if (FILTER_STATE.status.length > 0 && !FILTER_STATE.status.includes(c.status)) return false;
    if (FILTER_STATE.persona.length > 0 && !FILTER_STATE.persona.includes(c.persona)) return false;
    if (c.score < FILTER_STATE.minScore) return false;
    if (FILTER_STATE.search) {
      const q = FILTER_STATE.search.toLowerCase();
      const searchableFields = [c.nom, c.entreprise, c.email, c.telephone, c.ville].filter(Boolean);
      if (!searchableFields.some(f => f.toLowerCase().includes(q))) return false;
    }
    return true;
  });
  return FILTERED;
}

export function setFilters(partial) {
  FILTER_STATE = { ...FILTER_STATE, ...partial };
  applyFilters();
  renderClientsList();
}

export function getFilteredClients() {
  return FILTERED;
}

export function openProspect(clientId) {
  const client = CLIENTS.find(c => c.id === clientId || c.email === clientId);
  if (!client) return;
  CURRENT_PROSPECT = client;
  renderProspectPanel();
}

export function getNextProspect() {
  if (!FILTERED.length) return null;

  // Priorité: À appeler > Relance > Nouveau > Appelé
  const priorityOrder = ["a_appeler", "relance", "nouveau", "appele"];
  for (const status of priorityOrder) {
    const candidates = FILTERED.filter(c => c.status === status);
    if (candidates.length > 0) {
      return candidates[0];
    }
  }
  return FILTERED[0];
}

export function openNextProspect() {
  const next = getNextProspect();
  if (next) openProspect(next.id || next.email);
}

export function updateProspectStatus(clientId, newStatus) {
  const client = CLIENTS.find(c => c.id === clientId || c.email === clientId);
  if (!client) return;

  const oldStatus = client.status;
  client.status = newStatus;
  client.statusChangedAt = new Date().toISOString();

  setJSON("s3k_clients", CLIENTS);
  addStatus(clientId || client.email, oldStatus, newStatus);

  applyFilters();
  renderClientsList();
  if (CURRENT_PROSPECT?.id === client.id || CURRENT_PROSPECT?.email === client.email) {
    CURRENT_PROSPECT = client;
    renderProspectPanel();
  }
}

export function recordCall(clientId, result, notes = "") {
  const client = CLIENTS.find(c => c.id === clientId || c.email === clientId);
  if (!client) return;

  client.lastCallDate = new Date().toISOString();
  client.lastCallResult = result;

  setJSON("s3k_clients", CLIENTS);
  addCall(clientId || client.email, result, notes);

  if (CURRENT_PROSPECT?.id === client.id || CURRENT_PROSPECT?.email === client.email) {
    CURRENT_PROSPECT = client;
  }
}

export function scheduleFollowUp(clientId, date, reason = "") {
  const client = CLIENTS.find(c => c.id === clientId || c.email === clientId);
  if (!client) return;

  client.nextFollowUp = date;
  setJSON("s3k_clients", CLIENTS);
  scheduleFollowUpService(clientId || client.email, date, reason);
}

export function addProspectNote(clientId, note, category = "general") {
  const client = CLIENTS.find(c => c.id === clientId || c.email === clientId);
  if (!client) return;

  if (!client.notes) client.notes = "";
  const timestamp = new Date().toLocaleString("fr-FR");
  client.notes = `[${timestamp}] ${note}\n${client.notes}`;

  setJSON("s3k_clients", CLIENTS);
  addNote(clientId || client.email, note, category);
}

function renderClientsList() {
  const el = document.getElementById("workstationList");
  if (!el) return;

  if (FILTERED.length === 0) {
    el.innerHTML = '<div class="ws-empty">Aucun prospect trouvé. Affinez votre recherche.</div>';
    return;
  }

  const html = FILTERED.map(c => `
    <div class="ws-client-row ${CURRENT_PROSPECT?.id === c.id || CURRENT_PROSPECT?.email === c.email ? 'active' : ''}"
         onclick="openProspect('${c.id || c.email}')">
      <div class="ws-client-main">
        <div class="ws-client-name">${c.nom || "—"}</div>
        <div class="ws-client-company">${c.entreprise || "—"}</div>
      </div>
      <div class="ws-client-meta">
        <span class="ws-status-badge status-${c.status}">${STATUS_LABELS[c.status] || c.status}</span>
        <span class="ws-score ${c.score >= 60 ? 'hot' : c.score >= 40 ? 'warm' : 'cold'}">${c.score}</span>
      </div>
    </div>
  `).join("");

  el.innerHTML = html;
}

function renderProspectPanel() {
  const el = document.getElementById("workstationPanel");
  if (!el || !CURRENT_PROSPECT) {
    el.innerHTML = '<div class="ws-empty">Sélectionnez un prospect</div>';
    return;
  }

  const c = CURRENT_PROSPECT;
  const lastCall = getLastCall(c.id || c.email);
  const nextFollowUp = getNextFollowUp(c.id || c.email);
  const history = getHistory(c.id || c.email);

  el.innerHTML = `
    <div class="ws-panel-header">
      <h2>${c.nom || "Prospect sans nom"}</h2>
      <button class="btn ghost" onclick="closeWorkstationPanel()">✕</button>
    </div>

    <div class="ws-panel-body">
      <div class="ws-section">
        <h3>Contact</h3>
        <div class="ws-field">
          <span class="label">Entreprise</span>
          <span class="value">${c.entreprise || "—"}</span>
        </div>
        ${c.email ? `<div class="ws-field"><span class="label">Email</span><span class="value"><a href="mailto:${c.email}">${c.email}</a></span></div>` : ''}
        ${c.telephone ? `<div class="ws-field"><span class="label">Téléphone</span><span class="value"><a href="tel:${c.telephone}">${c.telephone}</a></span></div>` : ''}
        ${c.site ? `<div class="ws-field"><span class="label">Site</span><span class="value"><a href="${c.site}" target="_blank">${c.site}</a></span></div>` : ''}
        ${c.ville ? `<div class="ws-field"><span class="label">Ville</span><span class="value">${c.ville}</span></div>` : ''}
      </div>

      <div class="ws-section">
        <h3>Pipeline</h3>
        <div class="ws-status-selector">
          ${STATUSES.map(s => `
            <button class="status-btn ${c.status === s ? 'active' : ''}"
                    onclick="updateProspectStatus('${c.id || c.email}', '${s}')">
              ${STATUS_LABELS[s]}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="ws-section">
        <h3>Suivi</h3>
        ${lastCall ? `
          <div class="ws-field">
            <span class="label">Dernier appel</span>
            <span class="value">${new Date(lastCall.timestamp).toLocaleString("fr-FR")} (${lastCall.result})</span>
          </div>
        ` : '<div class="ws-empty-line">Aucun appel enregistré</div>'}

        ${nextFollowUp ? `
          <div class="ws-field">
            <span class="label">Prochaine relance</span>
            <span class="value">${new Date(nextFollowUp.followupDate).toLocaleString("fr-FR")}</span>
          </div>
        ` : ''}
      </div>

      <div class="ws-section">
        <h3>Notes</h3>
        <textarea id="wsNoteInput" placeholder="Ajouter une note..." class="ws-notepad"></textarea>
        <button class="btn" onclick="addProspectNote('${c.id || c.email}')">Ajouter</button>
      </div>

      <div class="ws-section">
        <h3>Historique</h3>
        <div class="ws-history">
          ${history.slice(0, 10).map(h => `
            <div class="ws-history-item">
              <span class="time">${new Date(h.timestamp).toLocaleString("fr-FR")}</span>
              <span class="type">${h.type === 'call' ? '📞 Appel' : h.type === 'status_change' ? '→ Statut' : h.type === 'note' ? '📝 Note' : '⏰ Relance'}</span>
              ${h.type === 'call' ? `<span class="detail">${h.result}</span>` : ''}
              ${h.type === 'status_change' ? `<span class="detail">${STATUS_LABELS[h.from]} → ${STATUS_LABELS[h.to]}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function closeWorkstationPanel() {
  CURRENT_PROSPECT = null;
  renderProspectPanel();
}

export function initWorkstation() {
  window.openProspect = openProspect;
  window.openNextProspect = openNextProspect;
  window.closeWorkstationPanel = closeWorkstationPanel;
  window.updateProspectStatus = updateProspectStatus;
  window.recordCall = recordCall;
  window.scheduleFollowUp = scheduleFollowUp;
  window.addProspectNote = (id) => {
    const note = document.getElementById("wsNoteInput").value.trim();
    if (!note) return;
    addProspectNote(id, note);
    document.getElementById("wsNoteInput").value = "";
    renderProspectPanel();
  };

  // Defer event listeners until next tick
  setTimeout(() => {
    // Search
    const searchInput = document.getElementById("wsSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        setFilters({ search: e.target.value });
      });
    }

    // Min score filter
    const minScoreInput = document.getElementById("wsMinScore");
    if (minScoreInput) {
      minScoreInput.addEventListener("input", (e) => {
        document.getElementById("wsMinScoreLabel").textContent = e.target.value;
        setFilters({ minScore: parseInt(e.target.value, 10) });
      });
    }

    // Status filters
    document.querySelectorAll(".filter-btn[data-filter='status']").forEach(btn => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.value;
        if (value === "") {
          setFilters({ status: [] });
          document.querySelectorAll(".filter-btn[data-filter='status']").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        } else {
          document.querySelectorAll(".filter-btn[data-filter='status']").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          setFilters({ status: [value] });
        }
      });
    });
  }, 0);

  renderClientsList();
  renderProspectPanel();
}
