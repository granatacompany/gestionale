/* =========================================================
   VENDITE (CASSA) - STATO
   ========================================================= */

let tipoVendita = "entrata"; // "entrata" (default) | "uscita"
let riparazioneIncassoSelezionata = null;
let saldoDaIncassare = 0;

/* =========================================================
   AVVIO PAGINA
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initToggleVendite();
    initVenditeForm();
    initAutocompleteClientiVendite();
    initInvioCampiVendite();
    renderVendite();
    renderVenditeDaConcludere();

    initAutofillImportoDaMagazzinoVendite();

    
const btnChiusura = document.getElementById("btnChiusuraGiornaliera");
if (btnChiusura) {
    btnChiusura.addEventListener("click", apriChiusuraGiornaliera);
}


});

/* =========================================================
   TOGGLE ENTRATA/USCITA (stile identico a preventivi: .toggle-rapido)
   - OFF  = ENTRATA
   - ON   = USCITA (usa .attivo come "modalità alternativa", come in preventivi)
   ========================================================= */

function initToggleVendite() {
    const toggle = document.getElementById("toggleVenditaTipo");
    if (!toggle) return;

    // Stato iniziale coerente: ENTRATA = OFF (senza .attivo)
    tipoVendita = "entrata";
    toggle.classList.remove("attivo");
    toggle.textContent = "ENTRATA";

    toggle.addEventListener("click", () => {
        if (tipoVendita === "entrata") {
            tipoVendita = "uscita";
            toggle.classList.add("attivo");
            toggle.textContent = "USCITA";

            // Aiuto UX: se descrizione vuota, suggerisci "Rimborso"
            const desc = document.getElementById("venditaDescrizione");
            if (desc && !desc.value.trim()) desc.value = "Rimborso";
        } else {
            tipoVendita = "entrata";
            toggle.classList.remove("attivo");
            toggle.textContent = "ENTRATA";

            // Se avevamo messo "Rimborso" automaticamente, puliamolo
            const desc = document.getElementById("venditaDescrizione");
            if (desc && desc.value.trim() === "Rimborso") desc.value = "";
        }
    });
}

/* =========================================================
   FORM: REGISTRA MOVIMENTO
   ========================================================= */

function initVenditeForm() {
    const btn = document.getElementById("btnSalvaVendita");
    if (!btn) return;

    btn.addEventListener("click", salvaVendita);
}

function salvaVendita() {
    const btn = document.getElementById("btnSalvaVendita");
    if (!btn) return;

    // blocco doppio click
    btn.disabled = true;

    try {
        const clienteInput = document.getElementById("venditaCliente");
        const descrizioneInput = document.getElementById("venditaDescrizione");
        const importoInput = document.getElementById("venditaImporto");

        const descrizione = (descrizioneInput?.value || "").trim();
        const importo = Number(importoInput?.value);

        // Cliente opzionale: se scritto, deve essere valido (selezionato o barcode)
        if (clienteInput?.value && !clienteInput.dataset.codice) {
            alert("Seleziona un cliente valido dall’elenco o usa il barcode");
            return;
        }

        if (!descrizione) {
            alert("Inserisci cosa stai registrando (articolo o servizio)");
            return;
        }

        if (!importo || importo <= 0) {
            alert("Inserisci un importo valido");
            return;
        }

        const vendite = JSON.parse(localStorage.getItem("vendite")) || [];

        vendite.push({
            id: "V-" + Date.now(),
            data: new Date().toISOString().slice(0, 10),
            tipo: tipoVendita, // ✅ prende il toggle (non una select inesistente)
            clienteCodice: clienteInput?.dataset.codice || "",
            descrizione: descrizione,
            importo: Number(importo.toFixed(2))
        });

        // Tentativo scarico magazzino:
        // se nel campo Articolo/Servizio è stato sparato un barcode
        // e il codice esiste in magazzino → scarico automatico
        if (tipoVendita === "entrata") {
            scaricaMagazzinoDaVendita(descrizione);
        }


        localStorage.setItem("vendite", JSON.stringify(vendite));

        resetVenditaForm();
        renderVendite();

    } finally {
        // riabilita sempre (anche se c’è un alert/return)
        btn.disabled = false;
    }
}
function initAutofillImportoDaMagazzinoVendite() {

    const inputDescr = document.getElementById("venditaDescrizione");
    const inputImporto = document.getElementById("venditaImporto");
    if (!inputDescr || !inputImporto) return;

    inputDescr.addEventListener("change", () => {

        const codice = inputDescr.value.trim();
        if (!codice) return;

        const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
        const articolo = magazzino.find(a => a.codice === codice);
        if (!articolo) return;

        const valoreBase = Number(articolo.valore || 0);
        if (!valoreBase) return;

        // IVA 22%
        const valoreIvato = valoreBase * 1.22;

        inputImporto.value = valoreIvato.toFixed(2);
    });
}


function resetVenditaForm() {
    // reset toggle → ENTRATA (OFF)
    tipoVendita = "entrata";
    const toggle = document.getElementById("toggleVenditaTipo");
    if (toggle) {
        toggle.classList.remove("attivo");
        toggle.textContent = "ENTRATA";
    }

    const cliente = document.getElementById("venditaCliente");
    if (cliente) {
        cliente.value = "";
        delete cliente.dataset.codice;
    }

    const desc = document.getElementById("venditaDescrizione");
    if (desc) desc.value = "";

    const imp = document.getElementById("venditaImporto");
    if (imp) imp.value = "";

    // focus pronto per inserimento successivo
    if (desc) desc.focus();
}

/* =========================================================
   RENDER TABELLA
   ========================================================= */

function renderVendite() {
    const vendite = JSON.parse(localStorage.getItem("vendite")) || [];

    const tbody = document.querySelector("#tabVendite tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    vendite.forEach(v => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${v.data || "-"}</td>
            <td>${v.tipo === "uscita" ? "Uscita" : "Entrata"}</td>
            <td>${v.clienteCodice || "-"}</td>
            <td>${v.descrizione || "-"}</td>
            <td style="text-align:right">€ ${Number(v.importo || 0).toFixed(2)}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* =========================================================
   AUTOCOMPLETE CLIENTI (VENDITE) - stesso comportamento dei preventivi
   ========================================================= */

function initAutocompleteClientiVendite() {
    const input = document.getElementById("venditaCliente");
    const list = document.getElementById("autocompleteClientiVendite");
    if (!input || !list) return;

    const clienti = JSON.parse(localStorage.getItem("clienti")) || [];

    // se l’utente modifica manualmente, invalida il cliente selezionato prima
    input.addEventListener("input", () => {
        delete input.dataset.codice;

        const value = input.value.toLowerCase();
        list.innerHTML = "";

        if (!value) {
            list.style.display = "none";
            return;
        }

        const risultati = clienti.filter(c =>
            (c.nome || "").toLowerCase().includes(value) ||
            (c.cognome || "").toLowerCase().includes(value) ||
            (c.codice || "").toLowerCase().includes(value) ||
            String(c.telefono || "").includes(value)
        );

        risultati.forEach(c => {
            const div = document.createElement("div");
            div.className = "autocomplete-item";
            div.innerText = `${c.nome} ${c.cognome} (${c.codice})`;

            div.onclick = () => {
                input.value = `${c.nome} ${c.cognome}`;
                input.dataset.codice = c.codice;
                list.style.display = "none";
            };

            list.appendChild(div);
        });

        list.style.display = risultati.length ? "block" : "none";
    });

        input.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;

            e.preventDefault();

            const value = input.value.trim().toLowerCase();

            // 1️⃣ barcode o telefono esatto
            let cliente = clienti.find(c =>
                c.codice === value || String(c.telefono || "") === value
            );

            // 2️⃣ iniziali + INVIO → primo match (come Preventivi)
            if (!cliente) {
                cliente = clienti.find(c =>
                    (c.nome || "").toLowerCase().includes(value) ||
                    (c.cognome || "").toLowerCase().includes(value)
                );
            }

            if (cliente) {
                input.value = `${cliente.nome} ${cliente.cognome}`;
                input.dataset.codice = cliente.codice;
                list.style.display = "none";
            }
        });

}
/* =========================================================
   NAVIGAZIONE CON INVIO (come Preventivi)
   ========================================================= */

function initInvioCampiVendite() {

    const cliente = document.getElementById("venditaCliente");
    const descrizione = document.getElementById("venditaDescrizione");
    const importo = document.getElementById("venditaImporto");
    const btn = document.getElementById("btnSalvaVendita");

    if (!cliente || !descrizione || !importo || !btn) return;

    cliente.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            descrizione.focus();
        }
    });

    descrizione.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            importo.focus();
        }
    });

    importo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            btn.click();
        }
    });
}

/* =========================================================
   VENDITE DA CONCLUDERE
   ========================================================= */

function renderVenditeDaConcludere() {

    const tbody = document.querySelector("#tabDaConcludere tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const vendite = JSON.parse(localStorage.getItem("vendite")) || [];

    // solo riparazioni completate e non ancora incassate
    const daConcludere = riparazioni.filter(r =>
        r.stato === "completata" && !r.incassata && r.preventivoId
    );

    daConcludere.forEach(r => {

        const preventivo = preventivi.find(p => p.id === r.preventivoId);
        if (!preventivo) return;

        const totalePreventivo = Number(preventivo.totale) || 0;

        // somma acconti già incassati (movimenti entrata legati al preventivo)
        const acconti = vendite
            .filter(v =>
                v.tipo === "entrata" &&
                v.preventivoId === r.preventivoId
            )
            .reduce((sum, v) => sum + Number(v.importo || 0), 0);

        const saldo = Number((totalePreventivo - acconti).toFixed(2));

        // se già pagato tutto, non mostriamo nulla
        if (saldo <= 0) return;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${r.clienteCodice || "-"}</td>
            <td>Riparazione</td>
            <td>${r.descrizione || "-"}</td>
            <td style="text-align:right">€ ${saldo.toFixed(2)}</td>
            <td>
                <button class="btn-concludi" onclick="apriConfermaIncasso('${r.id}')">
                    Concludi
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

}



function apriConfermaIncasso(riparazioneId) {

    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const vendite = JSON.parse(localStorage.getItem("vendite")) || [];

    const r = riparazioni.find(x => x.id === riparazioneId);
    if (!r || !r.preventivoId) return;

    const preventivo = preventivi.find(p => p.id === r.preventivoId);
    if (!preventivo) return;

    const totalePreventivo = Number(preventivo.totale) || 0;

    const acconti = vendite
        .filter(v =>
            v.tipo === "entrata" &&
            v.preventivoId === r.preventivoId
        )
        .reduce((sum, v) => sum + Number(v.importo || 0), 0);

    const saldo = Number((totalePreventivo - acconti).toFixed(2));
    if (saldo <= 0) return;

    // salva stato per conferma
    riparazioneIncassoSelezionata = r;
    saldoDaIncassare = saldo;

    // popola modal
    document.getElementById("saldoCliente").innerText = r.clienteCodice || "-";
    document.getElementById("saldoDescrizione").innerText = r.descrizione || "-";
    document.getElementById("saldoImporto").value = `€ ${saldo.toFixed(2)}`;

    document.getElementById("modalIncassoSaldo").style.display = "flex";
}


function chiudiModalIncassoSaldo() {
    document.getElementById("modalIncassoSaldo").style.display = "none";
    riparazioneIncassoSelezionata = null;
    saldoDaIncassare = 0;
}

function confermaIncassoSaldo() {

    if (!riparazioneIncassoSelezionata || saldoDaIncassare <= 0) return;

    // riuso funzione già corretta
    registraIncassoDaRiparazione(riparazioneIncassoSelezionata);

    chiudiModalIncassoSaldo();
}


function registraIncassoDaRiparazione(r) {

    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const vendite = JSON.parse(localStorage.getItem("vendite")) || [];

    const preventivo = preventivi.find(p => p.id === r.preventivoId);
    if (!preventivo) return;

    const totalePreventivo = Number(preventivo.totale) || 0;

    // calcolo acconti già incassati
    const acconti = vendite
        .filter(v =>
            v.tipo === "entrata" &&
            v.preventivoId === r.preventivoId
        )
        .reduce((sum, v) => sum + Number(v.importo || 0), 0);

    const saldo = Number((totalePreventivo - acconti).toFixed(2));
    if (saldo <= 0) return;

    // 1️⃣ crea movimento di incasso finale
    vendite.push({
        id: "V-" + Date.now(),
        data: new Date().toISOString().slice(0, 10),
        tipo: "entrata",
        clienteCodice: r.clienteCodice || "",
        descrizione: `Saldo riparazione: ${r.descrizione}`,
        importo: saldo,
        preventivoId: r.preventivoId
    });

    localStorage.setItem("vendite", JSON.stringify(vendite));

    // 2️⃣ aggiorna riparazione
    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const idx = riparazioni.findIndex(x => x.id === r.id);

    if (idx !== -1) {
        riparazioni[idx].incassata = true;
        riparazioni[idx].dataIncasso = new Date().toISOString().slice(0, 10);
    }

    localStorage.setItem("riparazioni", JSON.stringify(riparazioni));

    // 3️⃣ refresh UI
    renderVendite();
    renderVenditeDaConcludere();
}

/* =========================================================
   Chiusura giornaliera
   ========================================================= */

function apriChiusuraGiornaliera() {

    const oggi = new Date().toISOString().slice(0, 10);
    const vendite = JSON.parse(localStorage.getItem("vendite")) || [];

    let totaleEntrate = 0;
    let totaleAcconti = 0;
    let totaleRiparazioni = 0;
    let totaleVendite = 0;

    vendite.forEach(v => {

        if (v.tipo !== "entrata") return;
        if (v.data !== oggi) return;

        const importo = Number(v.importo) || 0;
        totaleEntrate += importo;

        // RIPARAZIONE (saldo finale)
        if ((v.descrizione || "").includes("Saldo riparazione")) {
            totaleRiparazioni += importo;
            return;
        }

        // ACCONTO
        if (v.preventivoId) {
            totaleAcconti += importo;
            return;
        }

        // VENDITA
        totaleVendite += importo;
    });

    // Popola UI
    document.getElementById("chiusuraData").innerText =
        `Chiusura giornaliera – ${oggi.split("-").reverse().join("/")}`;

    document.getElementById("totaleEntrate").innerText = totaleEntrate.toFixed(2);
    document.getElementById("totaleAcconti").innerText = totaleAcconti.toFixed(2);
    document.getElementById("totaleRiparazioni").innerText = totaleRiparazioni.toFixed(2);
    document.getElementById("totaleVendite").innerText = totaleVendite.toFixed(2);

    document.getElementById("modalChiusuraGiornaliera").style.display = "flex";
}
function chiudiChiusuraGiornaliera() {
    document.getElementById("modalChiusuraGiornaliera").style.display = "none";
}
function inviaChiusuraWhatsApp() {

    const data = document.getElementById("chiusuraData").innerText;
    const totale = document.getElementById("totaleEntrate").innerText;
    const acconti = document.getElementById("totaleAcconti").innerText;
    const riparazioni = document.getElementById("totaleRiparazioni").innerText;
    const vendite = document.getElementById("totaleVendite").innerText;

    const messaggio = `
${data}

Totale entrate: € ${totale}

- Acconti: € ${acconti}
- Riparazioni: € ${riparazioni}
- Vendite: € ${vendite}
`.trim();

    const numero = "3899511899";
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(messaggio)}`;

    window.open(url, "_blank");
}

/* =========================================================
   MAGAZZINO → SCARICO DA VENDITE
   ========================================================= */

function scaricaMagazzinoDaVendita(codicePossibile) {

    if (!codicePossibile) return;

    const codice = codicePossibile.trim();
    if (!codice) return;

    const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
    const movimenti = JSON.parse(localStorage.getItem("movimentiMagazzino")) || [];

    const articolo = magazzino.find(a => a.codice === codice);
    if (!articolo) return; // non è un articolo di magazzino

    if (articolo.quantita <= 0) {
        alert(`Attenzione: "${articolo.descrizione}" presente in magazzino ma quantità = 0`);
        return;
    }

    // scarico 1 pezzo
    articolo.quantita -= 1;

    // registra movimento
    movimenti.push({
        data: new Date().toISOString().slice(0, 10),
        tipo: "scarico",
        codice: articolo.codice,
        descrizione: articolo.descrizione
    });

    localStorage.setItem("magazzino", JSON.stringify(magazzino));
    localStorage.setItem("movimentiMagazzino", JSON.stringify(movimenti));
}
