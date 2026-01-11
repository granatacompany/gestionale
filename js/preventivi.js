/* =========================================================
   PREVENTIVI VARIABILE GLOBALE
   ========================================================= */
let previewPreventivoId = null;








/* =========================================================
   PREVENTIVI - RESET FORM
   ========================================================= */

function resetFormPreventivo() {

    /* ---------------------------
       CLIENTE
       --------------------------- */
    prevCliente.value = "";
    delete prevCliente.dataset.codice;
    prevDescrizione.value = "";
    /* ---------------------------
       RICAMBI (ripristina 1 riga)
       --------------------------- */
    const ricambiWrapper = document.getElementById("ricambiWrapper");
    ricambiWrapper.innerHTML = `
        <div class="riga-ricambio">
            <input type="text" placeholder="Descrizione ricambio"  class="input-gestionale">
            <input type="url" placeholder="Link ricambio"  class="input-gestionale">
            <input type="number" placeholder="Prezzo €"  class="input-gestionale">
            <button type="button" id="btnAddRicambio" class="btn-add-ricambio">+</button>
            
        </div>
    `;

    /* ---------------------------
       COSTI
       --------------------------- */
    prevManodopera.value = "";
    prevSconto.value = "";
    prevTotale.value = "";

    /* ---------------------------
       FOCUS INIZIALE
       --------------------------- */
       
    prevCliente.focus();

    /* =========================
      MODIFICA → BOTTONE salva  
       ========================= */
    const btn = document.getElementById("btnSalvaPreventivo");
    btn.innerText = "Salva preventivo";
    
    /* ---------------------------
        NASCONDE ELIMINA
        --------------------------- */
    document.getElementById("btnEliminaPreventivo").style.display = "none";

}

    

/* =========================================================
   PREVENTIVI - TOGGLE RAPIDO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const btnRapido = document.getElementById("btnRapido");
    const sezioneAvanzata = document.getElementById("sezioneAvanzata");

    if (!btnRapido || !sezioneAvanzata) return;

    let rapidoAttivo = false;

    btnRapido.addEventListener("click", () => {
        rapidoAttivo = !rapidoAttivo;

        btnRapido.classList.toggle("attivo", rapidoAttivo);
        sezioneAvanzata.classList.toggle("nascosto", rapidoAttivo);
    });

});


/* =========================================================
   PREVENTIVI - RICAMBI DINAMICI (+ / -)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const wrapper = document.getElementById("ricambiWrapper");
    const btnAdd = document.getElementById("btnAddRicambio");

    if (!wrapper || !btnAdd) return;

    // AGGIUNTA RIGA
    btnAdd.addEventListener("click", () => {
        aggiungiRigaRicambio();
    });

    // funzione che crea una nuova riga
    function aggiungiRigaRicambio() {

        const riga = document.createElement("div");
        riga.className = "riga-ricambio";

        riga.innerHTML = `
            <input type="text" class="input-gestionale" placeholder="Descrizione ricambio">
            <input type="url" class="input-gestionale" placeholder="Link ricambio">
            <input type="number" class="input-gestionale" placeholder="Prezzo €">
            <button type="button" class="btn-remove-ricambio" title="Rimuovi ricambio">−</button>
        `;

        // evento rimozione
        const btnRemove = riga.querySelector(".btn-remove-ricambio");
        btnRemove.addEventListener("click", () => {
            riga.remove();
        });

        wrapper.appendChild(riga);
        // focus automatico sulla descrizione del nuovo ricambio
riga.querySelector("input[type='text']").focus();

    }

});
/* =========================================================
   PREVENTIVI - TOTALE AUTOMATICO CON BLOCCO CAMPO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const totaleInput = document.getElementById("prevTotale");
    const manodoperaInput = document.getElementById("prevManodopera");
    const scontoInput = document.getElementById("prevSconto");
    const btnRapido = document.getElementById("btnRapido");
    const ricambiWrapper = document.getElementById("ricambiWrapper");

    if (
        !totaleInput ||
        !manodoperaInput ||
        !scontoInput ||
        !btnRapido ||
        !ricambiWrapper
    ) return;

    // verifica modalità preventivo rapido
    function isPreventivoRapido() {
        return btnRapido.classList.contains("attivo");
    }

    // gestisce lock/unlock del totale
    function aggiornaStatoTotale() {
        if (isPreventivoRapido()) {
            totaleInput.readOnly = false;
            totaleInput.classList.remove("readonly");
        } else {
            totaleInput.readOnly = true;
            totaleInput.classList.add("readonly");
            calcolaTotale(); // forza ricalcolo
        }
    }

    // calcolo totale
    function calcolaTotale() {

        if (isPreventivoRapido()) return;

        let totale = 0;

        // somma prezzi ricambi
        ricambiWrapper
            .querySelectorAll("input[type='number']")
            .forEach(input => {
                totale += Number(input.value) || 0;
            });

        // aggiunge manodopera
        totale += Number(manodoperaInput.value) || 0;

        // sottrae sconto
        totale -= Number(scontoInput.value) || 0;

        // evita negativi
        if (totale < 0) totale = 0;

        totaleInput.value = totale.toFixed(2);
    }

    // EVENTI
    manodoperaInput.addEventListener("input", calcolaTotale);
    scontoInput.addEventListener("input", calcolaTotale);

    ricambiWrapper.addEventListener("input", (e) => {
        if (e.target.type === "number") {
            calcolaTotale();
        }
    });

    // quando clicchi il toggle rapido
    btnRapido.addEventListener("click", aggiornaStatoTotale);

    // stato iniziale
    aggiornaStatoTotale();

});


/* =========================================================
   PREVENTIVI - INVIO = PASSA AL CAMPO SUCCESSIVO
   ========================================================= */

document.addEventListener("keydown", (e) => {

    // intercetta solo Enter
    if (e.key !== "Enter") return;

    // solo nei campi del form preventivo
    const isCampoPreventivo =
        e.target.classList.contains("input-gestionale");

    if (!isCampoPreventivo) return;

    e.preventDefault(); // evita submit

    const campi = Array.from(
        document.querySelectorAll(
            ".form-container.preventivi .input-gestionale"
        )
    );

    const index = campi.indexOf(e.target);

    if (index === -1) return;

    const prossimo = campi[index + 1];

    if (prossimo) {
        prossimo.focus();
    }
});



/* =========================================================
   PREVENTIVI - AUTOCOMPLETE CLIENTI (TENDINA, MAX 3)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const inputCliente = document.getElementById("prevCliente");
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

            // mousedown evita che un eventuale blur chiuda prima del click
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

    // INPUT: mostra risultati
    inputCliente.addEventListener("input", () => {
        risultati = filtraClienti(inputCliente.value);
        indiceAttivo = -1;
        renderLista();
    });

    // TASTIERA: frecce + invio
   inputCliente.addEventListener("keydown", (e) => {

    // ============================
    // BARCODE CLIENTE (MATCH ESATTO)
    // ============================
    if (e.key === "Enter") {

        const codiceLetto = inputCliente.value.trim().toUpperCase();

        // cerca cliente con codice IDENTICO
        const cliente = clienti.find(c =>
            (c.codice || "").toUpperCase() === codiceLetto
        );

        if (cliente) {
            e.preventDefault();

            // stesso comportamento della selezione da lista
            inputCliente.value =
                `${cliente.nome} ${cliente.cognome} (${cliente.telefono})`;

            inputCliente.dataset.codice = cliente.codice;

            chiudiLista();
            return;
        }
    }

    // ============================
    // AUTOCOMPLETE STANDARD
    // ============================
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


    // click fuori: chiudi
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".autocomplete-container")) {
            chiudiLista();
        }
    });

});

/* =========================================================
   PREVENTIVI - SALVATAGGIO + TABELLE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const btnSalva = document.getElementById("btnSalvaPreventivo");
    if (!btnSalva) return;

    btnSalva.addEventListener("click", () => {

        // VALIDAZIONI MINIME
        if (!prevCliente.dataset.codice) {
            alert("Seleziona un cliente valido");
            prevCliente.focus();
            return;
        }

        if (Number(prevTotale.value) <= 0) {
            alert("Totale non valido");
            prevTotale.focus();
            return;
        }

        if (preventivoInModificaId) {
    aggiornaPreventivo(preventivoInModificaId);
} else {
    const nuovoId = salvaPreventivo();
    if (nuovoId) {
        apriPreviewPreventivo(nuovoId);
    }
}


    });

    // render iniziale
    renderPreventivi();
});

function salvaPreventivo() {

    // =========================
    // RECUPERO PREVENTIVI ESISTENTI
    // =========================
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];

    // =========================
    // ID + DATA
    // =========================
    const nuovoId = "P-" + String(preventivi.length + 1).padStart(4, "0");
    const data = new Date().toISOString().slice(0, 10);

    // =========================
    // CLIENTE (OBBLIGATORIO)
    // =========================
    const clienteCodice = prevCliente.dataset.codice;
    if (!clienteCodice) {
        alert("Seleziona un cliente");
        prevCliente.focus();
        return;
    }

    // =========================
    // DESCRIZIONE
    // =========================
    const descrizione = document.getElementById("prevDescrizione").value.trim();

    // =========================
    // RICAMBI (MULTIPLI)
    // =========================
    const ricambi = [];

    document.querySelectorAll("#ricambiWrapper .riga-ricambio").forEach(riga => {

        const descr = riga.querySelector('input[type="text"]').value.trim();
        const link = riga.querySelector('input[type="url"]').value.trim();
        const prezzo = Number(riga.querySelector('input[type="number"]').value) || 0;

        // salva solo se almeno un campo è compilato
        if (descr || link || prezzo > 0) {
            ricambi.push({
                descrizione: descr,
                link: link,
                prezzo: prezzo
            });
        }
    });

    // =========================
    // COSTI
    // =========================
    const manodopera = Number(document.getElementById("prevManodopera")?.value) || 0;
    const sconto = Number(document.getElementById("prevSconto")?.value) || 0;
    const totale = Number(prevTotale.value) || 0;

    // =========================
    // TEMPO STIMATO
    // =========================
    const tempoStimato = Number(document.getElementById("prevTempoStimato")?.value) || 0;

    // =========================
    // OGGETTO PREVENTIVO FINALE
    // =========================
    const nuovoPreventivo = {
        id: nuovoId,
        data: data,
        clienteCodice: clienteCodice,
        descrizione: descrizione,
        ricambi: ricambi,
        manodopera: manodopera,
        sconto: sconto,
        totale: totale,
        tempoStimato: tempoStimato,
        accettato: false
    };

    // =========================
    // SALVATAGGIO
    // =========================
    preventivi.push(nuovoPreventivo);
    localStorage.setItem("preventivi", JSON.stringify(preventivi));

    // =========================
    // AGGIORNAMENTO TABELLA
    // =========================

    renderPreventivi();

    // =========================
    // aprire la preview
    // =========================

    apriPreviewPreventivo();

    // =========================
    // FINE
    // =========================
    console.log("Preventivo salvato:", nuovoPreventivo);
    return nuovoId;

    
    
}

/* =========================================================
   PREVENTIVI - AGGIORNAMENTO PREVENTIVO ATTIVO
   ========================================================= */

function aggiornaPreventivo(idPreventivo) {

    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const p = preventivi.find(pr => pr.id === idPreventivo);
    if (!p) return;

    /* =========================
       CLIENTE
       ========================= */
    p.clienteCodice = prevCliente.dataset.codice;

    /* =========================
       DESCRIZIONE
       ========================= */
    p.descrizione = document.getElementById("prevDescrizione").value.trim();

    /* =========================
       RICAMBI
       ========================= */
    const ricambi = [];

    document.querySelectorAll("#ricambiWrapper .riga-ricambio").forEach(riga => {
        const descr = riga.querySelector('input[type="text"]').value.trim();
        const link = riga.querySelector('input[type="url"]').value.trim();
        const prezzo = Number(riga.querySelector('input[type="number"]').value) || 0;

        if (descr || link || prezzo > 0) {
            ricambi.push({ descrizione: descr, link, prezzo });
        }
    });

    p.ricambi = ricambi;

    /* =========================
       COSTI
       ========================= */
    p.manodopera = Number(prevManodopera.value) || 0;
    p.sconto = Number(prevSconto.value) || 0;
    p.totale = Number(prevTotale.value) || 0;
    p.tempoStimato = Number(prevTempoStimato.value) || 0;

    /* =========================
       SALVATAGGIO
       ========================= */
    localStorage.setItem("preventivi", JSON.stringify(preventivi));

    /* =========================
       RESET STATO
       ========================= */
    preventivoInModificaId = null;

    document.getElementById("btnSalvaPreventivo").innerText = "Salva preventivo";

    resetFormPreventivo();
    renderPreventivi();
}


function renderPreventivi() {

    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];

    const tbodyAttivi = document.querySelector("#tabPreventivi tbody");
    const tbodyStorico = document.querySelector("#tabStoricoPreventivi tbody");

    tbodyAttivi.innerHTML = "";
    tbodyStorico.innerHTML = "";

    const oggi = new Date();

    preventivi.forEach(p => {

        // =========================
        // PREVENTIVI ATTIVI
        // =========================
        if (!p.accettato) {

            const ricambiDescr = (p.ricambi || [])
            .map(r => r.descrizione)
            .filter(d => d)
            .join(", ");

            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";

            tr.innerHTML = `
            <td>${p.data}</td>

             <td title="${getClienteTooltip(p.clienteCodice)}">
                ${p.clienteCodice}
            </td>

            <td>${p.descrizione || ""}</td>

            <td>${ricambiDescr}</td>

            <td><strong>€ ${p.totale.toFixed(2)}</strong></td>

            <td>${p.tempoStimato}</td>

            <td style="text-align:center">
                <input type="checkbox" ${p.accettato ? "checked" : ""}>
            </td>
            `;

            // click riga → preview (esclusa checkbox)

            //tr.onclick = (e) => {
             //    if (e.target.type !== "checkbox") {
              //       apriPreviewPreventivo(p.id);
              //  }
           // };

            const checkbox = tr.querySelector("input[type='checkbox']");

             // checkbox accettato
                tr.querySelector("input[type='checkbox']").onchange = () => {
                p.accettato = true;
                localStorage.setItem("preventivi", JSON.stringify(preventivi));

                creaRiparazioneDaPreventivo(p);
                creaOrdiniDaPreventivo(p);

            renderPreventivi();
        };
            // click riga → preview
            
             /* click riga → MODIFICA preventivo attivo */
                    tr.onclick = (e) => {
                    if (e.target.type === "checkbox") return;
                    caricaPreventivoPerModifica(p.id);
                    };

            tbodyAttivi.appendChild(tr);

        }
        

        // =========================
        // STORICO PREVENTIVI
        // =========================
        else {

    const stato = getStatoPreventivo(p);

    // nello storico vogliamo SOLO accettati o rifiutati
    if (stato === "In attesa") return;

    const ricambiDescr = (p.ricambi || [])
        .map(r => r.descrizione)
        .filter(d => d)
        .join(", ");

    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";

    tr.innerHTML = `
        <td>${p.data}</td>

        <td title="${getClienteTooltip(p.clienteCodice)}">
            ${p.clienteCodice}
        </td>

        <td>${p.descrizione || ""}</td>

        <td>${ricambiDescr}</td>

        <td><strong>€ ${p.totale.toFixed(2)}</strong></td>

        <td>${p.tempoStimato}</td>

        <td class="${stato === "Accettato" ? "stato-ok" : "stato-ko"}">
            ${stato}
        </td>
    `;

        /* click riga → DUPLICAZIONE preventivo */
    tr.onclick = () => {
        caricaPreventivoPerDuplicazione(p.id);
    };

   


    tbodyStorico.appendChild(tr);
}
    });
}

function accettaPreventivo(index) {

    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const p = preventivi[index];

    if (!p || p.accettato) return;

    if (!confirm("Confermi l'accettazione del preventivo?")) {
        renderPreventivi();
        return;
    }

    p.accettato = true;
    localStorage.setItem("preventivi", JSON.stringify(preventivi));

    // IN FUTURO:
    // creaRiparazione(p);
    // creaOrdine(p);

    renderPreventivi();
    resetFormPreventivo();
}
/* =========================================================
   PREVENTIVI - STATO DERIVATO (ACCETTATO / RIFIUTATO)
   ========================================================= */

function getStatoPreventivo(p) {

    if (p.accettato) return "Accettato";

    const oggi = new Date();
    const dataPreventivo = new Date(p.data);

    const diffGiorni =
        (oggi - dataPreventivo) / (1000 * 60 * 60 * 24);

    return diffGiorni > 3 ? "Rifiutato" : "In attesa";
}

/* =========================================================
   PREVIEW PREVENTIVO (LEGGE DAL LOCALSTORAGE)
   ========================================================= */

function apriPreviewPreventivo(idPreventivo) {

    previewPreventivoId = idPreventivo;


    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const p = preventivi.find(pr => pr.id === idPreventivo);

    if (!p) {
        console.error("Preventivo non trovato:", idPreventivo);
        return;
    }

    previewPreventivoId = idPreventivo;

    // riempi preview SOLO con dati salvati
    document.getElementById("pv-id").innerText = p.id;
    document.getElementById("pv-cliente").innerText = p.clienteCodice;
    document.getElementById("pv-descrizione").innerText = p.descrizione || "-";
    document.getElementById("pv-totale").innerText = p.totale.toFixed(2);

    document.getElementById("previewPreventivo").style.display = "flex";

    // aggancia azioni (semplici, senza logica ora)
    document.getElementById("pv-chiudi").onclick = chiudiPreviewPreventivo;
}

function chiudiPreviewPreventivo() {
    document.getElementById("previewPreventivo").style.display = "none";
    window.location.reload();
}

function getPreventivoById(id) {
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    return preventivi.find(p => p.id === id);
}

function getClienteByCodice(codice) {
    const clienti = JSON.parse(localStorage.getItem("clienti")) || [];
    return clienti.find(c => c.codice === codice);
}
function stampaPreventivoDaPreview() {

    const p = getPreventivoById(previewPreventivoId);
    if (!p) return;

    const cliente = getClienteByCodice(p.clienteCodice);

    const w = window.open("", "_blank");
    w.document.write(`
        <html>
        <head>
            <title>Preventivo ${p.id}</title>
            <style>
                body { font-family: Arial; padding: 20px; }
            </style>
        </head>
        <body>
            <h2>Preventivo ${p.id}</h2>
            <p><strong>Data:</strong> ${p.data}</p>
            <p><strong>Cliente:</strong> ${cliente ? cliente.nome + " " + cliente.cognome : p.clienteCodice}</p>

            <p><strong>Descrizione intervento:</strong></p>
            <p>${(p.descrizione || "").replaceAll("\n","<br>")}</p>

            <h3>Totale: € ${p.totale.toFixed(2)}</h3>
        </body>
        </html>
    `);

    w.document.close();
    w.print();

    chiudiPreviewPreventivo();
}

/* =========================================================
   PREVIEW PREVENTIVO manda su wathsapp
   ========================================================= */

function inviaWhatsappPreventivoDaPreview() {

    const p = getPreventivoById(previewPreventivoId);
    if (!p) return;

    const cliente = getClienteByCodice(p.clienteCodice);
    if (!cliente || !cliente.telefono) return;

    let telefono = cliente.telefono.replace(/\D/g, "");

    // prefisso Italia se manca
    if (telefono.length === 10) {
        telefono = "39" + telefono;
    }

    const messaggio = encodeURIComponent(
        `Preventivo ${p.id}\n` +
        `${p.descrizione || ""}\n` +
        `Totale: € ${p.totale.toFixed(2)}`
    );

    const url = `https://wa.me/${telefono}?text=${messaggio}`;
    window.open(url, "_blank");

    chiudiPreviewPreventivo();
}

document.addEventListener("DOMContentLoaded", () => {
    const b1 = document.getElementById("pv-stampa");
    const b2 = document.getElementById("pv-whatsapp");
    const b3 = document.getElementById("pv-chiudi");

    if (b1) b1.onclick = stampaPreventivoDaPreview;
    if (b2) b2.onclick = inviaWhatsappPreventivoDaPreview;
    if (b3) b3.onclick = chiudiPreviewPreventivo;
});

function getClienteTooltip(codiceCliente) {
    const clienti = JSON.parse(localStorage.getItem("clienti")) || [];
    const c = clienti.find(cl => cl.codice === codiceCliente);

    if (!c) return "Cliente non trovato";

    return `
${c.nome} ${c.cognome}
Tel: ${c.telefono}
Città: ${c.citta || ""}
`.trim();
}
/* =========================================================
   Riparazione Da Preventivo
   ========================================================= */

function creaRiparazioneDaPreventivo(p) {

    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];

    const id = "R-" + String(riparazioni.length + 1).padStart(4, "0");

    riparazioni.push({
        id: id,
        preventivoId: p.id,
        clienteCodice: p.clienteCodice,
        descrizione: p.descrizione,
        stato: "in_attesa_ricambi",
        avviabile: false,
        dataCreazione: new Date().toISOString().slice(0,10)
    });

    localStorage.setItem("riparazioni", JSON.stringify(riparazioni));
}

/* =========================================================
   crea Ordini Da preventivo
   ========================================================= */

function creaOrdiniDaPreventivo(p) {

    if (!p.ricambi || p.ricambi.length === 0) return;

    const ordini = JSON.parse(localStorage.getItem("ordini")) || [];

    p.ricambi.forEach(r => {

        if (!r.descrizione) return;

        ordini.push({
            id: "O-" + String(ordini.length + 1).padStart(4, "0"),
            preventivoId: p.id,
            descrizione: r.descrizione,
            link: r.link || "",   // 👈 QUI
            arrivato: false
        });

    });

    localStorage.setItem("ordini", JSON.stringify(ordini));
}

/* =========================================================
   PREVENTIVI - DUPLICAZIONE DA STORICO
   ========================================================= */

function caricaPreventivoPerDuplicazione(idPreventivo) {

    /* recupera tutti i preventivi */
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];

    /* trova il preventivo selezionato */
    const p = preventivi.find(pr => pr.id === idPreventivo);
    if (!p) return;

    /* =========================
       RESET FORM
       ========================= */
    resetFormPreventivo();

    /* =========================
       CLIENTE (VOLUTAMENTE ESCLUSO)
       ========================= */
    prevCliente.value = "";
    delete prevCliente.dataset.codice;

    /* =========================
       DESCRIZIONE
       ========================= */
    document.getElementById("prevDescrizione").value = p.descrizione || "";

    /* =========================
       RICAMBI
       ========================= */
    const ricambiWrapper = document.getElementById("ricambiWrapper");
    ricambiWrapper.innerHTML = "";

    if (p.ricambi && p.ricambi.length > 0) {

        p.ricambi.forEach((r, index) => {

            const riga = document.createElement("div");
            riga.className = "riga-ricambio";

            riga.innerHTML = `
                <input type="text" class="input-gestionale" placeholder="Descrizione ricambio" value="${r.descrizione || ""}">
                <input type="url" class="input-gestionale" placeholder="Link ricambio" value="${r.link || ""}">
                <input type="number" class="input-gestionale" placeholder="Prezzo €" value="${r.prezzo || ""}">
                ${
                    index === 0
                        ? `<button type="button" id="btnAddRicambio" class="btn-add-ricambio">+</button>`
                        : `<button type="button" class="btn-remove-ricambio">−</button>`
                }
            `;

            ricambiWrapper.appendChild(riga);

            /* evento rimozione per righe extra */
            const btnRemove = riga.querySelector(".btn-remove-ricambio");
            if (btnRemove) {
                btnRemove.onclick = () => riga.remove();
            }
        });

    }

    /* =========================
       COSTI
       ========================= */
    document.getElementById("prevManodopera").value = p.manodopera || "";
    document.getElementById("prevSconto").value = p.sconto || "";
    document.getElementById("prevTotale").value = p.totale || "";

    /* =========================
       TEMPO STIMATO
       ========================= */
    document.getElementById("prevTempoStimato").value = p.tempoStimato || "";

    /* =========================
       FOCUS INIZIALE
       ========================= */
    prevCliente.focus();
}

/* =========================================================
   PREVENTIVI - MODIFICA ATTIVO
   ========================================================= */

let preventivoInModificaId = null;   /* id preventivo attualmente in modifica */

/* =========================================================
   PREVENTIVI - CARICAMENTO PER MODIFICA
   ========================================================= */

function caricaPreventivoPerModifica(idPreventivo) {

    /* recupera preventivi */
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];

    /* trova il preventivo */
    const p = preventivi.find(pr => pr.id === idPreventivo);
    if (!p) return;

    /* memorizza stato modifica */
    preventivoInModificaId = p.id;

    /* =========================
       RESET FORM
       ========================= */
    resetFormPreventivo();

    /* =========================
       CLIENTE
       ========================= */
    const cliente = getClienteByCodice(p.clienteCodice);
    if (cliente) {
        prevCliente.value =
            `${cliente.nome} ${cliente.cognome} (${cliente.telefono})`;
        prevCliente.dataset.codice = cliente.codice;
    }

    /* =========================
       DESCRIZIONE
       ========================= */
    document.getElementById("prevDescrizione").value = p.descrizione || "";

    /* =========================
       RICAMBI
       ========================= */
    const ricambiWrapper = document.getElementById("ricambiWrapper");
    ricambiWrapper.innerHTML = "";

    (p.ricambi || []).forEach((r, index) => {

        const riga = document.createElement("div");
        riga.className = "riga-ricambio";

        riga.innerHTML = `
            <input type="text" class="input-gestionale" value="${r.descrizione || ""}">
            <input type="url" class="input-gestionale" value="${r.link || ""}">
            <input type="number" class="input-gestionale" value="${r.prezzo || ""}">
            ${
                index === 0
                    ? `<button type="button" id="btnAddRicambio" class="btn-add-ricambio">+</button>`
                    : `<button type="button" class="btn-remove-ricambio">−</button>`
            }
        `;

        ricambiWrapper.appendChild(riga);

        const btnRemove = riga.querySelector(".btn-remove-ricambio");
        if (btnRemove) {
            btnRemove.onclick = () => riga.remove();
        }
    });

    /* =========================
       COSTI
       ========================= */
    document.getElementById("prevManodopera").value = p.manodopera || "";
    document.getElementById("prevSconto").value = p.sconto || "";
    document.getElementById("prevTotale").value = p.totale || "";

    /* =========================
       TEMPO STIMATO
       ========================= */
    document.getElementById("prevTempoStimato").value = p.tempoStimato || "";

    /* =========================
       BOTTONE → MODIFICA
       ========================= */
    const btn = document.getElementById("btnSalvaPreventivo");
    btn.innerText = "Modifica preventivo";

    /* =========================
         MOSTRA ELIMINA
        ========================= */
    document.getElementById("btnEliminaPreventivo").style.display = "block";


    /* =========================
       FOCUS
       ========================= */
    prevCliente.focus();
    
}

/* =========================================================
   PREVENTIVI - ELIMINAZIONE PREVENTIVO ATTIVO
   ========================================================= */
const btnElimina = document.getElementById("btnEliminaPreventivo");
if (btnElimina) {
    btnElimina.onclick = eliminaPreventivoAttivo;
}

function eliminaPreventivoAttivo() {

    if (!preventivoInModificaId) return;

    if (!confirm("Vuoi eliminare questo preventivo?")) return;

    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];

    const index = preventivi.findIndex(p => p.id === preventivoInModificaId);
    if (index === -1) return;

    /* elimina preventivo */
    preventivi.splice(index, 1);
    localStorage.setItem("preventivi", JSON.stringify(preventivi));

    /* reset stato */
    preventivoInModificaId = null;

    resetFormPreventivo();
    renderPreventivi();
}
