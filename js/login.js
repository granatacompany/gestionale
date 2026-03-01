/* =========================================================
   LOGIN (robusto, senza conflitti globali)
   File: js/login.js
   ========================================================= */

(() => {
  // Chiave sessione (in window per evitare "already declared")
  window.SPAZIOEXE_AUTH_KEY = window.SPAZIOEXE_AUTH_KEY || "spazioexe_auth";

// Password
const PASSWORD_TITOLARE = "Ismael1";
const PASSWORD_DIPENDENTE = "Tommy04"; // <-- cambiala come vuoi

const ROLE_KEY = "spazioexe_ruolo";

  function setErrore(msg) {
    const errEl = document.getElementById("error");
    if (errEl) errEl.innerText = msg || "";
  }

  // Espongo login in globale perché index.html usa onclick="login()"
  window.login = function () {
    const passEl = document.getElementById("pass");
    const pass = (passEl?.value || "").trim();

    setErrore("");

    if (pass === PASSWORD_TITOLARE) {
      sessionStorage.setItem(window.SPAZIOEXE_AUTH_KEY, "1");
      sessionStorage.setItem(ROLE_KEY, "titolare");
      window.location.href = "dashboard.html";
      return;
    }

    if (pass === PASSWORD_DIPENDENTE) {
      sessionStorage.setItem(window.SPAZIOEXE_AUTH_KEY, "1");
      sessionStorage.setItem(ROLE_KEY, "dipendente");
      window.location.href = "dashboard.html";
      return;
    }

    setErrore("Credenziali errate!");
    passEl?.focus();
  };

  // UX: invio e pulizia messaggi
  document.addEventListener("DOMContentLoaded", () => {
    const passEl = document.getElementById("pass");
    if (!passEl) return;

    passEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") window.login();
    });

    passEl.addEventListener("input", () => setErrore(""));
  });
})();