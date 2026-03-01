/* =========================================================
   SERVIZI
   - salva contratti per cliente (luce/gas/fibra/mobile + compagnia)
   - tabella con semaforo e data ultimo aggiornamento
   - click riga -> compila form -> modifica
   - ricerca + filtri + ordine data
   ========================================================= */

let rigaSelezionata = null;
let clienteSelezionatoCodice = "";   // codice cliente attualmente selezionato
let servizi = [];                    // array record servizi

const KEY_SERVIZI = "servizi";

/* -------------------------
   UTIL
------------------------- */

function oggiISO() {
  // ISO completo per ordinamento, ma mostreremo una versione leggibile
  return new Date().toISOString();
}

function formatData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("it-IT", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function mesiTrascorsi(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  let mesi = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());

  // micro correzione: se il giorno del mese non è ancora passato, tolgo 1
  if (now.getDate() < d.getDate()) mesi -= 1;

  return Math.max(0, mesi);
}

function caricaServizi() {
  servizi = JSON.parse(localStorage.getItem(KEY_SERVIZI)) || [];
}

function salvaServizi() {
  localStorage.setItem(KEY_SERVIZI, JSON.stringify(servizi));
}

function getClienti() {
  return JSON.parse(localStorage.getItem("clienti")) || [];
}

function trovaRecordServizi(codiceCliente) {
  return servizi.find(s => s.clienteCodice === codiceCliente) || null;
}

function haAlmenoUnContratto(rec) {
  if (!rec) return false;
  return Boolean(rec.luce || rec.gas || rec.fibra || rec.mobile);
}

function calcolaSemaforo(rec) {
  // regole richieste:
  // - rosso: nessun contratto
  // - verde: contratto da meno di 10 mesi
  // - giallo: contratto da più di 10 mesi
  if (!rec || !haAlmenoUnContratto(rec)) return "rosso";

  const mesi = mesiTrascorsi(rec.dataAggiornamento);
  if (mesi === null) return "verde"; // fallback gentile

  return mesi > 10 ? "giallo" : "verde";
}

/* -------------------------
   ELEMENTI DOM
------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  // input/checkbox
  const srvCliente = document.getElementById("srvCliente");

  const chkLuce = document.getElementById("chkLuce");
  const chkGas = document.getElementById("chkGas");
  const chkFibra = document.getElementById("chkFibra");
  const chkMobile = document.getElementById("chkMobile");

  const compLuce = document.getElementById("compLuce");
  const compGas = document.getElementById("compGas");
  const compFibra = document.getElementById("compFibra");
  const compMobile = document.getElementById("compMobile");

  const btnSalva = document.getElementById("btnSalvaServizio");

  const search = document.getElementById("searchServizi");
  const filtroStato = document.getElementById("filtroStato");
  const ordineData = document.getElementById("ordineData");

  // carichi iniziali
  caricaServizi();
  setupAutocompleteClienti();
  setupCheckboxUX();

  renderTabella();

  // eventi
  btnSalva.addEventListener("click", () => {
    salvaOModifica();
  });

  search.addEventListener("input", renderTabella);
  filtroStato.addEventListener("change", renderTabella);
  ordineData.addEventListener("change", renderTabella);

  /* ---------- funzioni locali con accesso DOM ---------- */

  function setupCheckboxUX() {
    function lega(checkbox, input) {
      checkbox.addEventListener("change", () => {
        input.disabled = !checkbox.checked;
        if (!checkbox.checked) input.value = "";
      });
    }
    lega(chkLuce, compLuce);
    lega(chkGas, compGas);
    lega(chkFibra, compFibra);
    lega(chkMobile, compMobile);
  }

  function resetForm() {
    srvCliente.value = "";
    srvCliente.dataset.codice = "";
    clienteSelezionatoCodice = "";
    if (rigaSelezionata) rigaSelezionata.classList.remove("selected");
    rigaSelezionata = null;

    chkLuce.checked = false; compLuce.value = ""; compLuce.disabled = true;
    chkGas.checked = false; compGas.value = ""; compGas.disabled = true;
    chkFibra.checked = false; compFibra.value = ""; compFibra.disabled = true;
    chkMobile.checked = false; compMobile.value = ""; compMobile.disabled = true;

    srvCliente.focus();
  }

  function riempiFormDaRecord(cliente, rec) {
    // cliente: oggetto clienti
    srvCliente.value = `${cliente.nome || ""} ${cliente.cognome || ""} (${cliente.telefono || ""})`.trim();
    srvCliente.dataset.codice = cliente.codice || "";
    clienteSelezionatoCodice = cliente.codice || "";

    const r = rec || {};

    chkLuce.checked = Boolean(r.luce);
    compLuce.disabled = !chkLuce.checked;
    compLuce.value = r.compLuce || "";

    chkGas.checked = Boolean(r.gas);
    compGas.disabled = !chkGas.checked;
    compGas.value = r.compGas || "";

    chkFibra.checked = Boolean(r.fibra);
    compFibra.disabled = !chkFibra.checked;
    compFibra.value = r.compFibra || "";

    chkMobile.checked = Boolean(r.mobile);
    compMobile.disabled = !chkMobile.checked;
    compMobile.value = r.compMobile || "";
  }

  function salvaOModifica() {
    const codice = (srvCliente.dataset.codice || "").trim();
    if (!codice) {
      alert("Seleziona un cliente valido");
      srvCliente.focus();
      return;
    }

    // costruisco record
    const nuovo = {
      clienteCodice: codice,
      luce: chkLuce.checked,
      compLuce: chkLuce.checked ? compLuce.value.trim() : "",
      gas: chkGas.checked,
      compGas: chkGas.checked ? compGas.value.trim() : "",
      fibra: chkFibra.checked,
      compFibra: chkFibra.checked ? compFibra.value.trim() : "",
      mobile: chkMobile.checked,
      compMobile: chkMobile.checked ? compMobile.value.trim() : "",
      dataAggiornamento: oggiISO()
    };

    // se esiste aggiorno, altrimenti creo
    const idx = servizi.findIndex(s => s.clienteCodice === codice);
    if (idx >= 0) {
      servizi[idx] = { ...servizi[idx], ...nuovo };
    } else {
      servizi.push(nuovo);
    }

    salvaServizi();
    caricaServizi();
    renderTabella();
    resetForm();
  }

  function renderTabella() {
    const tbody = document.querySelector("#tabServizi tbody");
    tbody.innerHTML = "";

    const clienti = getClienti();
    const testo = (search.value || "").toLowerCase().trim();
    const filtro = filtroStato.value;
    const ord = ordineData.value; // desc/asc

    // join clienti + servizi
    let righe = clienti.map(c => {
      const rec = trovaRecordServizi(c.codice);
      const sem = calcolaSemaforo(rec);
      const data = rec?.dataAggiornamento || null;
      return { cliente: c, rec, sem, data };
    });

    // ricerca testuale
    if (testo) {
      righe = righe.filter(x => {
        const c = x.cliente;
        const hay = `${c.codice || ""} ${c.nome || ""} ${c.cognome || ""} ${c.telefono || ""}`.toLowerCase();
        return hay.includes(testo);
      });
    }

    // filtri
    righe = righe.filter(x => {
      const rec = x.rec;
      const ha = haAlmenoUnContratto(rec);

      if (filtro === "tutti") return true;

      if (filtro === "da_contattare") {
        // rosso + giallo
        return x.sem === "rosso" || x.sem === "giallo";
      }

      if (filtro === "senza_contratto") return !ha;

      if (!rec) return false;

      if (filtro === "luce") return Boolean(rec.luce);
      if (filtro === "gas") return Boolean(rec.gas);
      if (filtro === "fibra") return Boolean(rec.fibra);
      if (filtro === "mobile") return Boolean(rec.mobile);

      return true;
    });

    // ordinamento per data aggiornamento
    righe.sort((a, b) => {
      const ta = a.data ? new Date(a.data).getTime() : 0;
      const tb = b.data ? new Date(b.data).getTime() : 0;
      return ord === "asc" ? (ta - tb) : (tb - ta);
    });

    // render
    righe.forEach(x => {
      const c = x.cliente;
      const rec = x.rec;

      const tr = tbody.insertRow();
      tr.addEventListener("click", () => {
        // selezione riga + riempimento form
        if (rigaSelezionata) rigaSelezionata.classList.remove("selected");
        rigaSelezionata = tr;
        tr.classList.add("selected");

        const record = trovaRecordServizi(c.codice);
        riempiFormDaRecord(c, record);
      });

      // Stato (semaforo)
      const tdStato = tr.insertCell(0);
      const dot = document.createElement("span");
      dot.className = `semaforo ${x.sem}`;
      tdStato.appendChild(dot);

      // Cliente
      tr.insertCell(1).innerText = `${c.nome || ""} ${c.cognome || ""}`.trim();

      // Celle servizi con ✅ + compagnia
      tr.insertCell(2).innerHTML = renderCellServizio(rec?.luce, rec?.compLuce);
      tr.insertCell(3).innerHTML = renderCellServizio(rec?.gas, rec?.compGas);
      tr.insertCell(4).innerHTML = renderCellServizio(rec?.fibra, rec?.compFibra);
      tr.insertCell(5).innerHTML = renderCellServizio(rec?.mobile, rec?.compMobile);

      // Data
      tr.insertCell(6).innerText = formatData(rec?.dataAggiornamento);

      // dataset utile
      tr.dataset.codiceCliente = c.codice || "";
    });
  }

  function renderCellServizio(attivo, compagnia) {
    if (!attivo) return `<span class="cell-servizio">❌</span>`;
    const comp = (compagnia || "").trim();
    if (!comp) return `<span class="cell-servizio">✅</span>`;
    return `<span class="cell-servizio">✅ ${escapeHtml(comp)}</span>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

});

/* =========================================================
   AUTOCOMPLETE CLIENTI (stesso stile di preventivi)
   - max 3 risultati
   - barcode: Enter -> match esatto su codice
   ========================================================= */

function setupAutocompleteClienti() {
  const inputCliente = document.getElementById("srvCliente");
  const lista = document.getElementById("autocompleteClienti");

  if (!inputCliente || !lista) return;

  const clienti = JSON.parse(localStorage.getItem("clienti")) || [];

  let risultati = [];
  let indiceAttivo = -1;

  function filtraClienti(valore) {
    const v = valore.trim().toLowerCase();
    if (v.length < 2) return [];

    return clienti
      .filter(c => {
        const nome = (c.nome || "").toLowerCase();
        const cognome = (c.cognome || "").toLowerCase();
        const telefono = (c.telefono || "");
        return (
          nome.includes(v) ||
          cognome.includes(v) ||
          telefono.includes(v) ||
          `${nome} ${cognome}`.includes(v)
        );
      })
      .slice(0, 3);
  }

  function renderLista() {
    lista.innerHTML = "";

    if (risultati.length === 0) {
      lista.style.display = "none";
      return;
    }

    risultati.forEach((c, i) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.innerHTML = `<strong>${c.nome || ""} ${c.cognome || ""}</strong> – ${c.telefono || ""}`;

      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selezionaCliente(i);
      });

      lista.appendChild(div);
    });

    lista.style.display = "block";
  }

  function selezionaCliente(i) {
    const c = risultati[i];
    if (!c) return;

    inputCliente.value = `${c.nome || ""} ${c.cognome || ""} (${c.telefono || ""})`.trim();
    inputCliente.dataset.codice = c.codice || "";
    chiudiLista();
  }

  function chiudiLista() {
    lista.style.display = "none";
    lista.innerHTML = "";
    risultati = [];
    indiceAttivo = -1;
  }

  function aggiornaEvidenziazione() {
    const items = lista.querySelectorAll(".autocomplete-item");
    items.forEach((el, i) => el.classList.toggle("active", i === indiceAttivo));
  }

  inputCliente.addEventListener("input", () => {
    risultati = filtraClienti(inputCliente.value);
    indiceAttivo = -1;
    renderLista();
  });

  inputCliente.addEventListener("keydown", (e) => {

    // barcode: Enter -> match esatto su codice cliente
    if (e.key === "Enter") {
      const codiceLetto = inputCliente.value.trim().toUpperCase();
      const cliente = clienti.find(c => (c.codice || "").toUpperCase() === codiceLetto);

      if (cliente) {
        e.preventDefault();
        inputCliente.value = `${cliente.nome} ${cliente.cognome} (${cliente.telefono})`;
        inputCliente.dataset.codice = cliente.codice;
        chiudiLista();
        return;
      }
    }

    // autocomplete standard
    if (lista.style.display !== "block") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      indiceAttivo = Math.min(indiceAttivo + 1, risultati.length - 1);
      aggiornaEvidenziazione();
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      indiceAttivo = Math.max(indiceAttivo - 1, 0);
      aggiornaEvidenziazione();
    }

    if (e.key === "Enter") {
      e.preventDefault();
      selezionaCliente(indiceAttivo >= 0 ? indiceAttivo : 0);
    }

    if (e.key === "Escape") {
      e.preventDefault();
      chiudiLista();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".autocomplete-container")) {
      chiudiLista();
    }
  });
}