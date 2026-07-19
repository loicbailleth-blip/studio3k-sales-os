/* Synchronisation avec Notion Database : lecture, création, mise à jour de clients.
   Upsert automatique (créer ou mettre à jour sans doublons). */

export async function fetchClientsFromNotion(){
  try {
    const token = localStorage.getItem("notion_token");
    if(!token){
      console.warn("[Notion] Token non configuré");
      return [];
    }

    const dbId = localStorage.getItem("notion_db_id");
    if(!dbId){
      console.warn("[Notion] Database ID non configuré");
      return [];
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        page_size: 100,
        filter: {
          property: "archived",
          checkbox: { equals: false }
        }
      })
    });

    if(!response.ok){
      const err = await response.json();
      console.error("[Notion] Erreur requête:", err);
      return [];
    }

    const data = await response.json();
    return data.results.map(notionPageToClient);
  } catch(e){
    console.error("[Notion] Sync lecture échouée:", e);
    return [];
  }
}

function notionPageToClient(page){
  const props = page.properties;

  function getText(p){
    if(!p) return "";
    if(p.type === "title") return p.title.map(x => x.plain_text).join("");
    if(p.type === "rich_text") return p.rich_text.map(x => x.plain_text).join("");
    if(p.type === "email") return p.email || "";
    if(p.type === "phone_number") return p.phone_number || "";
    if(p.type === "url") return p.url || "";
    if(p.type === "select") return p.select?.name || "";
    if(p.type === "number") return String(p.number || "");
    return "";
  }

  return {
    id: page.id,
    notionId: page.id,
    nom: getText(props.Nom),
    entreprise: getText(props.Entreprise),
    email: getText(props.Email),
    telephone: getText(props.Téléphone),
    site: getText(props.Site),
    ville: getText(props.Ville),
    persona: getText(props.Persona),
    score: parseInt(getText(props.Score) || "0", 10),
    notes: getText(props.Notes),
    lastSync: new Date().toISOString(),
    lastUpdate: page.last_edited_time
  };
}

export async function createClientInNotion(client){
  try {
    const token = localStorage.getItem("notion_token");
    const dbId = localStorage.getItem("notion_db_id");
    if(!token || !dbId) throw new Error("Notion non configuré");

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          "Nom": { title: [{ text: { content: client.nom || "" } }] },
          "Entreprise": { rich_text: [{ text: { content: client.entreprise || "" } }] },
          "Email": { email: client.email || "" },
          "Téléphone": { phone_number: client.telephone || "" },
          "Site": { url: client.site || "" },
          "Ville": { rich_text: [{ text: { content: client.ville || "" } }] },
          "Persona": { select: { name: client.persona || "Non défini" } },
          "Score": { number: client.score || 0 },
          "Notes": { rich_text: [{ text: { content: client.notes || "" } }] }
        }
      })
    });

    if(!response.ok){
      const err = await response.json();
      console.error("[Notion] Création échouée:", err);
      return null;
    }

    const page = await response.json();
    return { ...client, notionId: page.id };
  } catch(e){
    console.error("[Notion] Création client échouée:", e);
    return null;
  }
}

export async function updateClientInNotion(notionId, client){
  try {
    const token = localStorage.getItem("notion_token");
    if(!token) throw new Error("Notion non configuré");

    const response = await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: {
          "Nom": { title: [{ text: { content: client.nom || "" } }] },
          "Entreprise": { rich_text: [{ text: { content: client.entreprise || "" } }] },
          "Email": { email: client.email || "" },
          "Téléphone": { phone_number: client.telephone || "" },
          "Site": { url: client.site || "" },
          "Ville": { rich_text: [{ text: { content: client.ville || "" } }] },
          "Persona": { select: { name: client.persona || "Non défini" } },
          "Score": { number: client.score || 0 },
          "Notes": { rich_text: [{ text: { content: client.notes || "" } }] }
        }
      })
    });

    if(!response.ok){
      const err = await response.json();
      console.error("[Notion] Mise à jour échouée:", err);
      return null;
    }

    return client;
  } catch(e){
    console.error("[Notion] Mise à jour client échouée:", e);
    return null;
  }
}

export async function findClientByEmail(email){
  const clients = await fetchClientsFromNotion();
  return clients.find(c => c.email === email || c.email.toLowerCase() === email.toLowerCase());
}

export async function findClientByPhoneNumber(phone){
  const clients = await fetchClientsFromNotion();
  const normalize = p => (p || "").replace(/\D/g, "");
  const norm = normalize(phone);
  return clients.find(c => normalize(c.telephone) === norm);
}

export async function upsertClient(client){
  const emailKey = (client.email || "").toLowerCase();

  if(emailKey){
    const existing = await findClientByEmail(emailKey);
    if(existing){
      client.notionId = existing.notionId;
      return await updateClientInNotion(existing.notionId, client);
    }
  }

  if(client.telephone){
    const existingPhone = await findClientByPhoneNumber(client.telephone);
    if(existingPhone){
      client.notionId = existingPhone.notionId;
      return await updateClientInNotion(existingPhone.notionId, client);
    }
  }

  return await createClientInNotion(client);
}
