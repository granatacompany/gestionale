/* =========================================================
   LOGIN via Supabase Auth - PASSWORD SICURE
   File: js/login.js
   ========================================================= */

(() => {
  const AUTH_KEY = "spazioexe_auth";
  const ROLE_KEY = "spazioexe_ruolo";

  // stessa configurazione già usata nel progetto
  const SUPABASE_URL = "https://ncvtjvsqnedpisnnflod.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_QhkbuhieU8AdHbAeIR1p1g_lBS3G_EM";

  const supabase = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  // email tecniche dei 2 ruoli
  const UTENTE_TITOLARE = "titolare@spazioexe.local";
  const UTENTE_DIPENDENTE = "dipendente@spazioexe.local";

  function setErrore(msg) {
    const errEl = document.getElementById("error");
    if (errEl) errEl.innerText = msg || "";
  }

  function setLoading(attivo) {
    const btn = document.querySelector(".login-container button");
    const passEl = document.getElementById("pass");

    if (btn) {
      btn.disabled = attivo;
      btn.innerText = attivo ? "Accesso..." : "Entra";
    }

    if (passEl) {
      passEl.disabled = attivo;
    }
  }

  async function logoutSilenzioso() {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
    } catch (_) {
      // nessun blocco: serve solo a pulire sessioni residue
    }
  }

  async function provaLogin(email, password, ruolo) {
    if (!supabase) {
      return { ok: false, msg: "Supabase non disponibile" };
    }

    // pulizia preventiva: evita sessioni sporche tra un tentativo e l'altro
    await logoutSilenzioso();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { ok: false, msg: error.message };
    }

    sessionStorage.setItem(AUTH_KEY, "1");
    sessionStorage.setItem(ROLE_KEY, ruolo);

    return { ok: true };
  }

  window.login = async function () {
    const passEl = document.getElementById("pass");
    const password = (passEl?.value || "").trim();

    setErrore("");

    if (!password) {
      setErrore("Inserisci la password");
      passEl?.focus();
      return;
    }

    if (!supabase) {
      setErrore("Libreria Supabase non caricata");
      return;
    }

    setLoading(true);

    try {
      // 1) provo dipendente
      let res = await provaLogin(UTENTE_DIPENDENTE, password, "dipendente");
      if (res.ok) {
        window.location.href = "dashboard.html";
        return;
      }

      // 2) provo titolare
      res = await provaLogin(UTENTE_TITOLARE, password, "titolare");
      if (res.ok) {
        window.location.href = "dashboard.html";
        return;
      }

      // se nessuno dei due entra, credenziali errate
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(ROLE_KEY);
      setErrore("Credenziali errate!");
      passEl?.focus();
      passEl?.select();
    } catch (err) {
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(ROLE_KEY);
      setErrore("Errore durante il login");
      console.error("Errore login:", err);
    } finally {
      setLoading(false);
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const passEl = document.getElementById("pass");
    if (!passEl) return;

    // pulizia iniziale: quando arrivi alla pagina login, azzero la sessione locale
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(ROLE_KEY);

    // pulizia sessione Supabase eventuale
    await logoutSilenzioso();

    passEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        window.login();
      }
    });

    passEl.addEventListener("input", () => setErrore(""));
  });
})();