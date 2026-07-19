/* State management centralisé.
   Mémorise : mode courant (Mission/Copilote/Bibliothèque), onglet Bibliothèque actif, persona
   sélectionné, diagnostics cochés, objectif du jour, thème et dernière recherche — pour que
   l'utilisateur retrouve exactement où il était. */
import { getJSON, setJSON, KEYS } from "./services/storage.js";

const DEFAULT_STATE = {
  currentMode: "mission",
  libTab: "formation",
  persona: "pme",
  objTab: "temps",
  qualTab: "q-bao",
  diagChecked: [],
  dailyObjective: 300,
  theme: "dark",
  lastQuery: "",
  settings: {}
};

let state = { ...DEFAULT_STATE, ...getJSON(KEYS.STATE, {}) };
const listeners = new Set();

export function getState(){
  return state;
}

export function setState(partial){
  state = { ...state, ...partial };
  setJSON(KEYS.STATE, state);
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn){
  listeners.add(fn);
  return () => listeners.delete(fn);
}
