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
let CURRENT_SESSION = null;
let FILTER_STATE = {
  status: [],
  search: "",
  persona: [],
  minScore: 0,
  phone_type: [] // "mobile", "fixe", "à enrichir"
};

/* Détecte automatiquement le type de numéro */
function detectPhoneType(telephone) {
  if (!telephone || !telephone.trim()) return "à enrichir";
  const cleaned = telephone.replace(/\s/g, "");
  if (/^(\+33|0)(6|7)/.test(cleaned)) return "mobile";
  return "fixe";
}

export async function loadWorkstationClients() {
  // Try to load from localStorage first
  let storedClients = getJSON("s3k_clients", null);

  // If empty, load from clients-import.json
  if (!storedClients || storedClients.length === 0) {
    try {
      const response = await fetch("js/data/clients-import.json?v=" + Date.now());
      storedClients = await response.json();
      // Save to localStorage for future loads
      setJSON("s3k_clients", storedClients);
    } catch (err) {
      console.warn("Could not load clients-import.json:", err);
      storedClients = [];
    }
  }

  CLIENTS = storedClients.map(c => ({
    ...c,
    status: c.status || "nouveau",
    lastCallDate: c.lastCallDate || null,
    nextFollowUp: c.nextFollowUp || null,
    phone_type: detectPhoneType(c.telephone),
    tentatives: c.tentatives || 0,
    date_relance: c.date_relance || null,
    lead_entrant_date: c.lead_entrant_date || null,
    created_at: c.created_at || new Date().toISOString()
  }));
  applyFilters();
  return CLIENTS;
}

export function applyFilters() {
  FILTERED = CLIENTS.filter(c => {
    if (FILTER_STATE.status.length > 0 && !FILTER_STATE.status.includes(c.status)) return false;
    if (FILTER_STATE.persona.length > 0 && !FILTER_STATE.persona.includes(c.persona)) return false;
    if (FILTER_STATE.phone_type.length > 0 && !FILTER_STATE.phone_type.includes(c.phone_type)) return false;
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
  window.CURRENT_PROSPECT_OBJ = client;
  renderProspectPanel();
}

export function getNextProspectPile() {
  // Pile intelligente avec ordre strict
  // 1. Relance + date <= aujourd'hui
  // 2. Lead entrant (< 48h)
  // 3. Mobiles (score DESC)
  // 4. Fixes (score DESC)
  // Exclusions: sans numéro, statut Refus/Hors cible/Client, tentatives >= 5

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates = (CURRENT_SESSION ? FILTERED.filter(c => {
    // Session filtering: persona + phone_type
    if (CURRENT_SESSION.persona && c.persona !== CURRENT_SESSION.persona) return false;
    if (CURRENT_SESSION.phone_type && c.phone_type !== CURRENT_SESSION.phone_type) return false;
    return true;
  }) : FILTERED).filter(c => {
    // Exclusions
    if (c.phone_type === "à enrichir") return false;
    if (["refus", "hors_cible", "client"].includes(c.status)) return false;
    if ((c.tentatives || 0) >= 5) return false;
    return true;
  });

  // Étape 1: Relance + date <= aujourd'hui
  const relances = candidates.filter(c => {
    if (c.status !== "relance") return false;
    if (!c.date_relance) return false;
    const relanceDate = new Date(c.date_relance);
    relanceDate.setHours(0, 0, 0, 0);
    return relanceDate <= today;
  });
  if (relances.length > 0) return relances[0];

  // Étape 2: Lead entrant (< 48h)
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const hotLeads = candidates.filter(c => {
    if (!c.lead_entrant_date) return false;
    return new Date(c.lead_entrant_date) >= fortyEightHoursAgo;
  });
  if (hotLeads.length > 0) return hotLeads[0];

  // Étape 3: Mobiles (score DESC)
  const mobiles = candidates.filter(c => c.phone_type === "mobile").sort((a, b) => (b.score || 0) - (a.score || 0));
  if (mobiles.length > 0) return mobiles[0];

  // Étape 4: Fixes (score DESC)
  const fixes = candidates.filter(c => c.phone_type === "fixe").sort((a, b) => (b.score || 0) - (a.score || 0));
  if (fixes.length > 0) return fixes[0];

  return null;
}

export function getNextProspect() {
  return getNextProspectPile();
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

export function exportClients() {
  if (!CLIENTS || CLIENTS.length === 0) {
    const flash = document.getElementById("clientsFlash");
    if (flash) flash.textContent = "Aucun client à exporter";
    return;
  }

  const header = "Nom;Entreprise;Email;Téléphone;Ville;Persona;Score;Site;Notes";
  const lines = CLIENTS.map(c =>
    [c.nom, c.entreprise, c.email, c.telephone, c.ville, c.persona, c.score, c.site, c.notes]
      .map(v => (v || "").replace(/;/g, ","))
      .join(";")
  );

  const csv = [header, ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Prospects_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();

  const flash = document.getElementById("clientsFlash");
  if (flash) {
    flash.textContent = "✓ Exporté en CSV";
    setTimeout(() => { flash.textContent = ""; }, 2500);
  }
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
        <span class="ws-phone-badge phone-${c.phone_type}">${c.phone_type === "mobile" ? "📱" : c.phone_type === "fixe" ? "☎" : "❓"}</span>
        ${c.tentatives > 0 ? `<span class="ws-tentatives">${c.tentatives}x</span>` : ''}
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
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn btn-primary" onclick="launchCallWithProspect(window.CURRENT_PROSPECT_OBJ)" style="font-size:14px;padding:6px 12px;">🔴 Appel</button>
        <button class="btn ghost" onclick="closeWorkstationPanel()">✕</button>
      </div>
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

/* Session: choose persona + phone_type, filters pile for that lot */
export function startSession(persona, phone_type) {
  CURRENT_SESSION = { persona, phone_type };
  applyFilters();
  renderClientsList();
}

export function endSession() {
  CURRENT_SESSION = null;
  applyFilters();
  renderClientsList();
}

/* Get prospects without phone for enrichment */
export function getEnrichedNeeded() {
  return CLIENTS.filter(c => c.phone_type === "à enrichir").sort((a, b) => (b.score || 0) - (a.score || 0));
}

/* Export à enrichir to CSV */
export function exportEnrichNeeded() {
  const needed = getEnrichedNeeded();
  if (needed.length === 0) {
    alert("Aucun prospect à enrichir");
    return;
  }

  const header = "Nom;Entreprise;LinkedIn;Localisation";
  const lines = needed.map(c => [c.nom, c.entreprise, c.site || "", c.ville].map(v => (v || "").replace(/;/g, ",")).join(";"));
  const csv = [header, ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "A_enrichir_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
}

/* Import JSON from Notion format */
export function importNotionJSON(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    const contacts = Array.isArray(data) ? data : data.contacts || [];

    if (contacts.length === 0) {
      alert("Aucun contact trouvé dans le JSON");
      return;
    }

    // Dédoublonnage par nom
    const existingNames = new Set(CLIENTS.map(c => c.nom.toLowerCase()));
    const newContacts = contacts.filter(c => !existingNames.has(c.nom.toLowerCase()));

    const imported = newContacts.map((c, idx) => ({
      id: c.email || c.telephone?.replace(/\s/g, "") || ("imported_" + Date.now() + "_" + idx),
      nom: c.nom,
      entreprise: c.fonction || c.segment || "",
      email: c.email || "",
      telephone: c.telephone || "",
      site: c.linkedin || "",
      ville: c.localisation || "",
      persona: c.persona_app === "Non défini" ? "Professionnel" : c.persona_app,
      score: 80,
      notes: (c.hook ? "HOOK: " + c.hook + "\n" : "") + (c.priorite ? "Priorité: " + c.priorite : ""),
      phone_type: detectPhoneType(c.telephone),
      tentatives: 0,
      date_relance: null,
      lead_entrant_date: new Date().toISOString(),
      status: c.telephone ? "a_appeler" : "nouveau",
      created_at: new Date().toISOString()
    }));

    CLIENTS = [...imported, ...CLIENTS];
    setJSON("s3k_clients", CLIENTS);
    applyFilters();
    renderClientsList();

    alert("✓ " + imported.length + " contacts importés");
  } catch (err) {
    alert("Erreur JSON: " + err.message);
  }
}

/* Listen to call-finished event from Copilote */
export function initCallFinishedListener() {
  document.addEventListener("3kos:call-finished", (e) => {
    const { prospectId, outcome } = e.detail;
    if (!prospectId) return;

    const client = CLIENTS.find(c => c.id === prospectId || c.email === prospectId);
    if (!client) return;

    // Incrément tentatives
    client.tentatives = (client.tentatives || 0) + 1;

    // Proposition date relance
    const today = new Date();
    const relanceDate = new Date(today);

    if (outcome === "conversation") {
      relanceDate.setDate(relanceDate.getDate() + 1);
    } else if (outcome === "voicemail") {
      relanceDate.setDate(relanceDate.getDate() + 7);
    } else if (outcome === "voicemail_2") {
      relanceDate.setDate(relanceDate.getDate() + 30);
    } else {
      // Pas de relance pour autres outcomes
      relanceDate.setDate(relanceDate.getDate() + 1);
    }

    client.date_relance = relanceDate.toISOString().split("T")[0];
    if (client.tentatives >= 2) {
      client.status = "relance";
    }

    setJSON("s3k_clients", CLIENTS);
    applyFilters();
    renderClientsList();
  });
}

/* Import modal */
function showImportModal() {
  const modal = document.getElementById("importModal");
  if (modal) modal.style.display = "flex";
  document.getElementById("importJsonInput").value = "";
  document.getElementById("importStatus").textContent = "";
}

function closeImportModal() {
  const modal = document.getElementById("importModal");
  if (modal) modal.style.display = "none";
}

function executeImport() {
  const json = document.getElementById("importJsonInput").value.trim();
  const status = document.getElementById("importStatus");

  if (!json) {
    status.textContent = "⚠ Colle du JSON valide";
    return;
  }

  try {
    const data = JSON.parse(json);
    const contacts = Array.isArray(data) ? data : (data.contacts || []);

    if (contacts.length === 0) {
      status.textContent = "⚠ Aucun contact dans le JSON";
      return;
    }

    // Dédoublonnage par nom
    const existingNames = new Set(CLIENTS.map(c => c.nom?.toLowerCase()));
    let imported = 0;

    contacts.forEach((c, idx) => {
      if (existingNames.has(c.nom?.toLowerCase())) return;

      const newClient = {
        id: c.email || c.telephone?.replace(/\s/g, "") || ("import_" + Date.now() + "_" + idx),
        nom: c.nom || "",
        entreprise: c.fonction || "",
        email: c.email || "",
        telephone: c.telephone || "",
        site: c.linkedin || "",
        ville: c.localisation || "",
        persona: (c.persona_app && c.persona_app !== "Non défini") ? c.persona_app : "Professionnel",
        score: 80,
        notes: (c.hook ? "HOOK: " + c.hook + "\n" : "") + (c.priorite ? "Priorité: " + c.priorite : ""),
        status: c.telephone ? "a_appeler" : "nouveau",
        phone_type: detectPhoneType(c.telephone),
        tentatives: 0,
        date_relance: null,
        lead_entrant_date: c.telephone ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      };

      CLIENTS.push(newClient);
      existingNames.add(c.nom?.toLowerCase());
      imported++;
    });

    setJSON("s3k_clients", CLIENTS);
    applyFilters();
    renderClientsList();
    status.textContent = "✓ " + imported + " prospect" + (imported > 1 ? "s" : "") + " importé" + (imported > 1 ? "s" : "");
    setTimeout(() => closeImportModal(), 1500);
  } catch (err) {
    status.textContent = "✗ Erreur JSON: " + err.message;
  }
}

/* Session management UI */
function showSessionSelector() {
  const modal = document.getElementById("sessionSelectorModal");
  if (modal) modal.style.display = "flex";
  updateSessionCount();
}

function closeSessionSelector() {
  const modal = document.getElementById("sessionSelectorModal");
  if (modal) modal.style.display = "none";
}

function updateSessionCount() {
  const persona = document.getElementById("sessionPersona")?.value || "";
  const phoneType = document.getElementById("sessionPhoneType")?.value || "";
  let count = FILTERED.length;
  if (persona) count = FILTERED.filter(c => !c.persona || c.persona === persona).length;
  if (phoneType) count = FILTERED.filter(c => c.phone_type === phoneType).length;
  if (persona && phoneType) count = FILTERED.filter(c => (!c.persona || c.persona === persona) && c.phone_type === phoneType).length;

  const el = document.getElementById("sessionRemainingCount");
  if (el) el.textContent = count + " prospect" + (count > 1 ? "s" : "");
}

function guessPersona(client) {
  const text = ((client.entreprise || "") + " " + (client.notes || "") + " " + (client.nom || "")).toLowerCase();

  if (text.includes("expert-comptable") || text.includes("expertise comptable") || text.includes("comptable") || text.includes("cabinet comptable") || text.includes("expert comptable")) return "Expert-comptable";
  if (text.includes("avocat") || text.includes("cabinet juridique") || text.includes("droit") || text.includes("juridique") || text.includes("barreau")) return "Avocat";
  if (text.includes("coach") || text.includes("thérapeute") || text.includes("therapie") || text.includes("psychologue") || text.includes("psychothérapeute") || text.includes("therapeute") || text.includes("wellness") || text.includes("bien-être")) return "Coach / Thérapeute";
  if (text.includes("indépendant") || text.includes("artisan") || text.includes("freelance") || text.includes("micro-entrepreneur") || text.includes("auto-entrepreneur")) return "Indépendant local";

  // Par défaut: Dirigeant PME pour tout le reste (c'est le plus courant)
  return "Dirigeant PME";
}

function assignMissingPersonas() {
  let assigned = 0;
  CLIENTS.forEach(c => {
    if (!c.persona || c.persona === "") {
      const guessed = guessPersona(c);
      if (guessed) {
        c.persona = guessed;
        assigned++;
      }
    }
  });

  saveClientsToStorage();
  renderClientsList();

  const msg = assigned + " prospect" + (assigned > 1 ? "s" : "") + " assigné" + (assigned > 1 ? "s" : "");
  const flash = document.getElementById("clientsFlash");
  if (flash) {
    flash.textContent = "✓ " + msg;
    flash.style.color = "var(--laiton)";
    setTimeout(() => flash.textContent = "", 3000);
  }

  console.log("Assigned personas:", assigned);
}

function exportEnrichedNeeded() {
  const enrichNeeded = FILTERED.filter(c => c.status === "a_enrichir" || !c.telephone);
  const csv = [
    ["Nom", "Entreprise", "Email", "Téléphone", "Ville", "Persona", "Score", "Notes"].join(","),
    ...enrichNeeded.map(c => [
      c.nom || "", c.entreprise || "", c.email || "", c.telephone || "",
      c.ville || "", c.persona || "", c.score || 0, (c.notes || "").replace(/"/g, '""')
    ].map(v => typeof v === "string" ? `"${v}"` : v).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prospects_a_enrichir.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function startProspectSession() {
  const persona = document.getElementById("sessionPersona")?.value || "";
  const phoneType = document.getElementById("sessionPhoneType")?.value || "";
  startSession(persona, phoneType);
  closeSessionSelector();
  openNextProspect();
}

export function initWorkstation() {
  window.openProspect = openProspect;
  window.openNextProspect = openNextProspect;
  window.closeWorkstationPanel = closeWorkstationPanel;
  window.updateProspectStatus = updateProspectStatus;
  window.recordCall = recordCall;
  window.scheduleFollowUp = scheduleFollowUp;
  window.exportClients = exportClients;
  window.exportEnrichedNeeded = exportEnrichedNeeded;
  window.assignMissingPersonas = assignMissingPersonas;
  window.showSessionSelector = showSessionSelector;
  window.closeSessionSelector = closeSessionSelector;
  window.startProspectSession = startProspectSession;
  window.showImportModal = showImportModal;
  window.closeImportModal = closeImportModal;
  window.executeImport = executeImport;
  window.CURRENT_PROSPECT_OBJ = null;
  window.addProspectNote = (id) => {
    const note = document.getElementById("wsNoteInput").value.trim();
    if (!note) return;
    addProspectNote(id, note);
    document.getElementById("wsNoteInput").value = "";
    renderProspectPanel();
  };

  initCallFinishedListener();

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

    // View filters (Tous / À enrichir)
    const viewAllBtn = document.getElementById("viewAllBtn");
    const viewEnrichBtn = document.getElementById("viewEnrichBtn");
    if (viewAllBtn) {
      viewAllBtn.addEventListener("click", () => {
        viewAllBtn.classList.add("active");
        viewEnrichBtn?.classList.remove("active");
        setFilters({ search: "" });
        document.getElementById("wsSearch").value = "";
      });
      viewAllBtn.classList.add("active");
    }
    if (viewEnrichBtn) {
      viewEnrichBtn.addEventListener("click", () => {
        viewEnrichBtn.classList.add("active");
        viewAllBtn?.classList.remove("active");
        FILTERED = getEnrichedNeeded();
        renderClientsList();
      });
    }

    // Session selector updates
    const sessionPersona = document.getElementById("sessionPersona");
    const sessionPhoneType = document.getElementById("sessionPhoneType");
    [sessionPersona, sessionPhoneType].forEach(el => {
      if (el) el.addEventListener("change", updateSessionCount);
    });
  }, 0);

  renderClientsList();
  renderProspectPanel();
}
