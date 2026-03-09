/* =========================================================
   LOGIN via Supabase Auth
   File: js/login.js
   ========================================================= */

(() => {
  const AUTH_KEY = "spazioexe_auth";
  const ROLE_KEY = "spazioexe_ruolo";

  // 🔧 INCOLLA QUI I TUOI DATI SUPABASE
  const SUPABASE_URL = "https://ncvtjvsqnedpisnnflod.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_QhkbuhieU8AdHbAeIR1p1g_lBS3G_EM";

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Mappa password -> utente (2 ruoli)
  // Puoi cambiare le password mantenendo queste email “tecniche”
  const UTENTE_TITOLARE = "titolare@spazioexe.local";
  const UTENTE_DIPENDENTE = "dipendente@spazioexe.local";

  // Se vuoi: usa le stesse password che avevi già
  const PASSWORD_TITOLARE = "Ismael1";
  const PASSWORD_DIPENDENTE = "Tommy04";

  function setErrore(msg) {
    const errEl = document.getElementById("error");
    if (errEl) errEl.innerText = msg || "";
  }

  async function provaLogin(email, password, ruolo) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: error.message };

    // ok: salvo “guard locale” + ruolo
    sessionStorage.setItem(AUTH_KEY, "1");
    sessionStorage.setItem(ROLE_KEY, ruolo);

    return { ok: true };
  }

  window.login = async function () {
    const passEl = document.getElementById("pass");
    const pass = (passEl?.value || "").trim();

    setErrore("");

    // 1) prova titolare
    if (pass === PASSWORD_TITOLARE) {
      const res = await provaLogin(UTENTE_TITOLARE, pass, "titolare");
      if (res.ok) { window.location.href = "dashboard.html"; return; }
      setErrore(res.msg); return;
    }

    // 2) prova dipendente
    if (pass === PASSWORD_DIPENDENTE) {
      const res = await provaLogin(UTENTE_DIPENDENTE, pass, "dipendente");
      if (res.ok) { window.location.href = "dashboard.html"; return; }
      setErrore(res.msg); return;
    }

    setErrore("Credenziali errate!");
    passEl?.focus();
  };

  document.addEventListener("DOMContentLoaded", () => {
    const passEl = document.getElementById("pass");
    if (!passEl) return;

    passEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") window.login();
    });

    passEl.addEventListener("input", () => setErrore(""));
  });
})();