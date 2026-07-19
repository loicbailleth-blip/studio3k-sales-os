/* Thème clair / sombre — nouveau réglage utilisateur, persisté dans l'état applicatif */
import { getState, setState } from "../state.js";

export function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content", theme === "light" ? "#f4f1ea" : "#161513");
}

export function initTheme(){
  applyTheme(getState().theme || "dark");
}

export function toggleTheme(){
  const next = (getState().theme === "light") ? "dark" : "light";
  setState({ theme: next });
  applyTheme(next);
  return next;
}
