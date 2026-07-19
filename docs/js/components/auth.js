/* Auth page - simple team code access */

const AUTH_CODE = "OPUS2024";

export function checkAuth() {
  // Auth disabled for testing
  return true;
  /*
  const stored = localStorage.getItem("3kos_auth");
  if (stored === AUTH_CODE) return true;

  showLoginPage();
  return false;
  */
}

function showLoginPage() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      min-height:100vh;
      background:var(--bg);
      font-family:Arial,sans-serif;
    ">
      <div style="
        text-align:center;
        max-width:400px;
        padding:40px;
        background:var(--bg2);
        border:1px solid var(--border);
        border-radius:12px;
      ">
        <h1 style="color:var(--laiton);font-size:32px;margin:0 0 8px 0;">3KOS SalesOS</h1>
        <p style="color:var(--text-secondary);margin:0 0 32px 0;">Accès réservé à l'équipe</p>

        <input
          type="password"
          id="authCodeInput"
          placeholder="Code d'équipe"
          style="
            width:100%;
            padding:12px;
            border:1px solid var(--border);
            border-radius:6px;
            background:var(--bg);
            color:var(--text);
            font-size:16px;
            box-sizing:border-box;
          "
          onkeypress="if(event.key==='Enter') authenticate()"
        >

        <button
          onclick="authenticate()"
          style="
            width:100%;
            margin-top:16px;
            padding:12px;
            background:var(--laiton);
            color:var(--charbon);
            border:none;
            border-radius:6px;
            font-size:16px;
            font-weight:600;
            cursor:pointer;
          "
        >Accéder</button>

        <p id="authError" style="color:var(--rouge);font-size:14px;margin-top:12px;"></p>
      </div>
    </div>
  `;

  window.authenticate = authenticate;
}

function authenticate() {
  const input = document.getElementById("authCodeInput");
  const error = document.getElementById("authError");

  if (input.value === AUTH_CODE) {
    localStorage.setItem("3kos_auth", AUTH_CODE);
    location.reload();
  } else {
    error.textContent = "Code incorrect";
    input.value = "";
  }
}

export function logout() {
  localStorage.removeItem("3kos_auth");
  location.reload();
}
