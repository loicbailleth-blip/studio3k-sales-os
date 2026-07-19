/* Fichier Clients — gestion des clients avec sync Notion automatique. */
import { getJSON, setJSON, KEYS } from "../services/storage.js";
import { fetchClientsFromNotion, upsertClient } from "../services/notionSync.js";

let CLIENTS = null;
let SYNC_STATUS = "idle";

export async function loadClients(){
  if(CLIENTS) return CLIENTS;
  const local = getJSON("s3k_clients", []);
  CLIENTS = Array.isArray(local) ? local : [];
  return CLIENTS;
}

export function getClients(){
  return CLIENTS || [];
}

export async function syncClientsFromNotion(){
  SYNC_STATUS = "syncing";
  updateSyncStatus();

  try {
    const remoteClients = await fetchClientsFromNotion();

    CLIENTS = remoteClients.map(rc => {
      const existing = CLIENTS.find(lc => lc.email === rc.email || lc.telephone === rc.telephone);
      return { ...existing, ...rc };
    });

    setJSON("s3k_clients", CLIENTS);
    SYNC_STATUS = "success";

    setTimeout(() => {
      SYNC_STATUS = "idle";
      updateSyncStatus();
    }, 2000);
  } catch(e){
    console.error("[Clients] Sync échouée:", e);
    SYNC_STATUS = "error";
  }

  updateSyncStatus();
}

function flash(msg, ms = 2500){
  const el = document.getElementById("clientsFlash");
  if(!el) return;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, ms);
}

function updateSyncStatus(){
  const el = document.getElementById("syncStatus");
  if(!el) return;

  el.className = "sync-status " + SYNC_STATUS;
  if(SYNC_STATUS === "idle") el.textContent = "✓ À jour";
  else if(SYNC_STATUS === "syncing") el.textContent = "↻ Synchronisation...";
  else if(SYNC_STATUS === "success") el.textContent = "✓ Synchronisé";
  else if(SYNC_STATUS === "error") el.textContent = "✗ Erreur sync";
}

export function renderClients(){
  const el = document.getElementById("clientsContent");
  if(!el) return;

  const clients = getClients();

  if(clients.length === 0){
    el.innerHTML = `
      <div class="card">
        <p class="note">Aucun client enregistré. Commencez à ajouter des clients ci-dessous.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = clients.map(c => `
    <div class="card client-card" data-client-id="${c.id || c.email}">
      <div class="client-header">
        <h3 style="margin:0 0 4px 0">${c.nom || "Sans nom"}</h3>
        <span class="tag ${c.score >= 60 ? 'or' : c.score >= 40 ? 'ag' : 'gr'}">Score: ${c.score}</span>
      </div>
      <p class="note" style="margin:8px 0"><b>${c.entreprise || "—"}</b></p>
      <p class="note" style="margin:4px 0">📍 ${c.ville || "Non renseignée"}</p>
      <p class="note" style="margin:4px 0">👤 ${c.persona || "Non défini"}</p>
      ${c.email ? `<p class="note" style="margin:4px 0">✉️ ${c.email}</p>` : ''}
      ${c.telephone ? `<p class="note" style="margin:4px 0">☎️ ${c.telephone}</p>` : ''}
      ${c.site ? `<p class="note" style="margin:4px 0">🌐 <a href="${c.site}" target="_blank">${c.site}</a></p>` : ''}
      ${c.notes ? `<p style="margin:8px 0; font-size:0.9em">${c.notes}</p>` : ''}
      <div class="client-actions" style="margin-top:12px; display:flex; gap:8px;">
        <button class="btn btn-sm" onclick="editClient('${c.id || c.email}')">Modifier</button>
        <button class="btn btn-sm ghost" onclick="deleteClient('${c.id || c.email}')">Supprimer</button>
      </div>
    </div>
  `).join("");
}

export function showClientForm(clientId = null){
  const el = document.getElementById("clientFormPanel");
  if(!el) return;

  const clients = getClients();
  const client = clientId ? clients.find(c => c.id === clientId || c.email === clientId) : null;

  el.classList.add("visible");
  document.getElementById("clientFormTitle").textContent = client ? "Modifier le client" : "Ajouter un client";

  document.getElementById("cf-nom").value = client?.nom || "";
  document.getElementById("cf-entreprise").value = client?.entreprise || "";
  document.getElementById("cf-email").value = client?.email || "";
  document.getElementById("cf-telephone").value = client?.telephone || "";
  document.getElementById("cf-site").value = client?.site || "";
  document.getElementById("cf-ville").value = client?.ville || "";
  document.getElementById("cf-persona").value = client?.persona || "";
  document.getElementById("cf-score").value = client?.score || 0;
  document.getElementById("cf-notes").value = client?.notes || "";

  window.currentEditClientId = client?.id || client?.email || null;
}

export function hideClientForm(){
  const el = document.getElementById("clientFormPanel");
  if(el) el.classList.remove("visible");
  window.currentEditClientId = null;
}

export function saveClient(){
  const nom = document.getElementById("cf-nom").value.trim();
  const entreprise = document.getElementById("cf-entreprise").value.trim();
  const email = document.getElementById("cf-email").value.trim().toLowerCase();
  const telephone = document.getElementById("cf-telephone").value.trim();
  const site = document.getElementById("cf-site").value.trim();
  const ville = document.getElementById("cf-ville").value.trim();
  const persona = document.getElementById("cf-persona").value;
  const score = parseInt(document.getElementById("cf-score").value, 10) || 0;
  const notes = document.getElementById("cf-notes").value.trim();

  if(!nom && !entreprise){
    flash("Nom ou entreprise requis");
    return;
  }

  if(!CLIENTS) CLIENTS = [];

  const clientId = window.currentEditClientId;
  const idx = CLIENTS.findIndex(c => c.id === clientId || c.email === clientId);

  const clientData = {
    id: clientId || email || Math.random().toString(36).slice(2),
    nom, entreprise, email, telephone, site, ville, persona, score, notes,
    createdAt: idx >= 0 ? CLIENTS[idx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if(idx >= 0){
    CLIENTS[idx] = clientData;
    flash("Client modifié ✓");
  } else {
    CLIENTS.push(clientData);
    flash("Client ajouté ✓");
  }

  setJSON("s3k_clients", CLIENTS);

  // Upsert vers Notion si configuré
  const token = localStorage.getItem("notion_token");
  if(token){
    upsertClient(clientData).catch(e => {
      console.warn("[Clients] Upsert Notion échoué (local sauvegardé):", e);
    });
  }

  hideClientForm();
  renderClients();
}

export function deleteClient(clientId){
  if(!confirm("Supprimer ce client ? Cette action est irréversible.")) return;

  if(!CLIENTS) return;
  const idx = CLIENTS.findIndex(c => c.id === clientId || c.email === clientId);
  if(idx < 0) return;

  CLIENTS.splice(idx, 1);
  setJSON("s3k_clients", CLIENTS);
  flash("Client supprimé");
  renderClients();
}

export function exportClients(){
  const clients = getClients();
  if(!clients.length){
    flash("Aucun client à exporter");
    return;
  }

  const header = "Nom;Entreprise;Email;Téléphone;Ville;Persona;Score;Site;Notes";
  const lines = clients.map(c =>
    [c.nom, c.entreprise, c.email, c.telephone, c.ville, c.persona, c.score, c.site, c.notes]
      .map(v => (v || "").replace(/;/g, ","))
      .join(";")
  );

  const csv = [header, ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Clients_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  flash("Clients exportés ✓");
}

export function initClients(){
  window.showClientForm = showClientForm;
  window.hideClientForm = hideClientForm;
  window.saveClient = saveClient;
  window.deleteClient = deleteClient;
  window.editClient = (id) => showClientForm(id);
  window.exportClients = exportClients;
  window.syncClientsFromNotion = syncClientsFromNotion;

  document.getElementById("closeClientForm")?.addEventListener("click", hideClientForm);
  document.getElementById("saveClientBtn")?.addEventListener("click", saveClient);
  document.getElementById("syncClientsBtn")?.addEventListener("click", syncClientsFromNotion);

  renderClients();
}
