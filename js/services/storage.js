/* Wrapper localStorage sécurisé (échoue silencieusement en navigation privée / quota dépassé) */

export function getJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    return JSON.parse(raw);
  }catch(e){
    console.warn("[storage] lecture impossible pour", key, e);
    return fallback;
  }
}

export function setJSON(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  }catch(e){
    console.warn("[storage] écriture impossible pour", key, e);
    return false;
  }
}

export function remove(key){
  try{ localStorage.removeItem(key); }catch(e){ /* ignore */ }
}

/* Clés historiques conservées telles quelles (fiches et KPI déjà utilisés en production) */
export const KEYS = {
  FICHES: "fiches3k",
  KPI: "kpi3k",
  STATE: "s3k_state"
};
