/* =========================================================
   PREVENTIVI VARIABILE GLOBALE
   ========================================================= */

        let previewPreventivoId = null;
        
        let preventivoAccontoId = null;


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
            <input type="text" placeholder="Descrizione ricambio" class="input-gestionale">
            <input type="text" placeholder="Link ricambio o codice articolo" class="input-gestionale ricambio-link-codice" title="Inserisci un link fornitore oppure spara il codice articolo dal magazzino">
            <input type="number" placeholder="Prezzo €" class="input-gestionale" min="0" step="0.01">
            <input type="number" placeholder="gg consegna" class="input-gestionale" min="0" step="1">
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
   PREVENTIVI - RICAMBI DINAMICI (+ / -) (EVENT DELEGATION)
   ========================================================= */

function creaRigaRicambio({ descrizione = "", link = "", prezzo = "", leadTime = "" } = {}, isPrimaRiga = false) {
    /* crea una riga ricambio standard (prezzo + gg consegna) */
    const riga = document.createElement("div");
    riga.className = "riga-ricambio";

    riga.innerHTML = `
        <input type="text" class="input-gestionale" placeholder="Descrizione ricambio" value="${descrizione}">
       <input type="text" class="input-gestionale ricambio-link-codice" placeholder="Link ricambio o codice articolo" title="Inserisci un link fornitore oppure spara il codice articolo dal magazzino" value="${link}">
        <input type="number" class="input-gestionale" placeholder="Prezzo €" min="0" step="0.01" value="${prezzo}">
        <input type="number" class="input-gestionale" placeholder="gg consegna" min="0" step="1" value="${leadTime}">
        ${
            isPrimaRiga
                ? `<button type="button" id="btnAddRicambio" class="btn-add-ricambio" title="Aggiungi ricambio">+</button>`
                : `<button type="button" class="btn-remove-ricambio" title="Rimuovi ricambio">−</button>`
        }
    `;
    return riga;

    inizializzaRicambiDaMagazzino();

}

document.addEventListener("DOMContentLoaded", () => {

    const wrapper = document.getElementById("ricambiWrapper");
    if (!wrapper) return;

    

    /* click gestito sul wrapper: funziona anche dopo reset/innerHTML */
    wrapper.addEventListener("click", (e) => {

        // + aggiunge riga
        if (e.target && e.target.id === "btnAddRicambio") {
            wrapper.appendChild(creaRigaRicambio({}, false));
            wrapper.querySelector(".riga-ricambio:last-child input[type='text']")?.focus();
            return;
        }

        // − rimuove riga
        if (e.target && e.target.classList.contains("btn-remove-ricambio")) {
            e.target.closest(".riga-ricambio")?.remove();
            return;
        }
    });
    
// quando l’operatore esce dal campo link/codice: se è un codice di magazzino → autofill prezzo
    wrapper.addEventListener("change", (e) => {

        const riga = e.target.closest(".riga-ricambio");
        if (!riga) return;

        const inputs = riga.querySelectorAll("input");
        if (inputs.length < 3) return;

        // Il campo "link/codice" è SEMPRE il secondo input della riga
        const inputLinkCodice = inputs[1];

        // Se l’evento non arriva da quel campo, esci
        if (e.target !== inputLinkCodice) return;

        const valore = inputLinkCodice.value.trim();
        if (!valore) {
            delete inputLinkCodice.dataset.codiceMagazzino;
            return;
        }

        const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
        const articolo = magazzino.find(a => a.codice === valore);

        // Se non è un codice magazzino, può essere un link: NON tocchiamo nulla
        if (!articolo) {
            delete inputLinkCodice.dataset.codiceMagazzino;
            return;
        }

        const inputDescr = inputs[0];
        const inputPrezzo = inputs[2];

        // descrizione solo se vuota
        if (inputDescr && !inputDescr.value.trim()) {
            inputDescr.value = articolo.descrizione;
        }

        // prezzo sempre dal magazzino
        if (inputPrezzo) {
            inputPrezzo.value = Number(articolo.valore || 0).toFixed(2);

            // 🔁 forza evento input per aggiornare il totale automatico
            inputPrezzo.dispatchEvent(new Event("input", { bubbles: true }));

        }

        // marca come magazzino (serve poi per scarico e per NON aprire link in accettazione)
        inputLinkCodice.dataset.codiceMagazzino = articolo.codice;

        // 🔁 forza ricalcolo totale
        if (!document.getElementById("btnRapido")?.classList.contains("attivo")) {
            calcolaTotale();
        }
    });
/* =========================================================
   AUTOCOMPLETE RICAMBI DA MAGAZZINO + HIGHLIGHT
   ========================================================= */

    if (!wrapper) return;

    wrapper.addEventListener("input", (e) => {

        if (!e.target.classList.contains("ricambio-link-codice")) return;

        const input = e.target;
        const riga = input.closest(".riga-ricambio");
        if (!riga) return;

        // rimuovi menu esistente
        riga.querySelector(".autocomplete-ricambi")?.remove();

        const valore = input.value.trim().toLowerCase();
        if (valore.length < 2) return;

        const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];

        const risultati = magazzino.filter(a =>
            a.codice.toLowerCase().includes(valore) ||
            a.descrizione.toLowerCase().includes(valore)
        ).slice(0, 5);

        if (risultati.length === 0) return;

        const box = document.createElement("div");
        box.className = "autocomplete-ricambi";

        risultati.forEach(a => {

            const div = document.createElement("div");
            div.className = "item";
            div.innerHTML = `<strong>${a.codice}</strong> – ${a.descrizione} (q.tà ${a.quantita})`;

            div.onmousedown = () => {
                input.value = a.codice;
                input.dataset.codiceMagazzino = a.codice;

                const inputs = riga.querySelectorAll("input");
                const inputDescr = inputs[0];
                const inputPrezzo = inputs[2];

                if (inputDescr && !inputDescr.value.trim()) {
                    inputDescr.value = a.descrizione;
                }

                if (inputPrezzo) {
                    inputPrezzo.value = Number(a.valore || 0).toFixed(2);
                    inputPrezzo.dispatchEvent(new Event("input", { bubbles: true }));
                }

                // highlight visivo
                riga.classList.add("magazzino-ok");
                setTimeout(() => riga.classList.remove("magazzino-ok"), 1500);

                box.remove();
            };

            box.appendChild(div);
        });

            // posizionamento corretto
            
            riga.appendChild(box);

    });

    // click fuori → chiudi autocomplete
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".autocomplete-ricambi")) {
            document.querySelectorAll(".autocomplete-ricambi").forEach(b => b.remove());
        }
    });



    


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

    // se è preventivo rapido, il totale lo decide l’operatore
    if (isPreventivoRapido()) return;

    let imponibile = 0;

    /* somma prezzi ricambi */
    ricambiWrapper.querySelectorAll(".riga-ricambio").forEach(riga => {
        const prezzo = Number(riga.querySelectorAll("input")[2].value) || 0;
        imponibile += prezzo;
    });

    /* aggiunge manodopera */
    imponibile += Number(manodoperaInput.value) || 0;

    if (imponibile < 0) imponibile = 0;

    /* IVA 22% */
    const totaleIvato = imponibile * 1.22;

    /* SCONTO applicato DOPO l’IVA */
    const sconto = Number(scontoInput.value) || 0;

    let totaleFinale = totaleIvato - sconto;

    if (totaleFinale < 0) totaleFinale = 0;

    totaleInput.value = totaleFinale.toFixed(2);
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

    const descr = riga.querySelectorAll("input")[0].value.trim();
    const link = riga.querySelectorAll("input")[1].value.trim();
    const prezzo = Number(riga.querySelectorAll("input")[2].value) || 0;
    const leadTime = Number(riga.querySelectorAll("input")[3].value) || 0; // gg consegna

    // salva solo se almeno un campo è compilato
    if (descr || link || prezzo > 0 || leadTime > 0) {
        const inputLink = riga.querySelectorAll("input")[1];

        const codiceMagazzino =
            inputLink && inputLink.dataset && inputLink.dataset.codiceMagazzino
                ? inputLink.dataset.codiceMagazzino
                : null;


        ricambi.push({
            descrizione: descr,
            link: link,
            prezzo: prezzo,
            leadTime: leadTime,   // 👈 nuovo campo chiave
            codiceMagazzino: codiceMagazzino
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

            const descr = riga.querySelectorAll("input")[0].value.trim();
            const link = riga.querySelectorAll("input")[1].value.trim();
            const prezzo = Number(riga.querySelectorAll("input")[2].value) || 0;
            const leadTime = Number(riga.querySelectorAll("input")[3].value) || 0; // gg consegna

            if (descr || link || prezzo > 0 || leadTime > 0) {
                const codiceMagazzino = riga.querySelectorAll("input")[1].dataset.codiceMagazzino || null;

                ricambi.push({
                    descrizione: descr,
                    link: link,
                    prezzo: prezzo,
                    leadTime: leadTime,
                    codiceMagazzino: codiceMagazzino
                });

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
        if (!p.accettato && !p.rifiutato) {

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

            <td>${p.dataPromessa || "-"}</td>

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
                    // 📅 data accettazione
                         p.dataAccettazione = new Date().toISOString().slice(0, 10);

                    // 📅 data promessa = +2 giorni
                    const data = new Date();
                    data.setDate(data.getDate() + 2);
                        p.dataPromessa = data.toISOString().slice(0, 10);

                        localStorage.setItem("preventivi", JSON.stringify(preventivi));

                        // apri modal acconto PRIMA di creare ordini e riparazioni
                        apriModalAcconto(p);


               // creaRiparazioneDaPreventivo(p);
               // creaOrdiniDaPreventivo(p);

                renderPreventivi();
                accettaPreventivo(p);

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

        <td>${p.dataPromessa || "-"}</td>

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
function scaricaMagazzinoDaPreventivo(p) {

    if (!p || !p.ricambi) return;

    const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
    const movimenti = JSON.parse(localStorage.getItem("movimentiMagazzino")) || [];

    (p.ricambi || []).forEach(r => {

        const codice = r.codiceMagazzino || null;
        if (!codice) return;

        const articolo = magazzino.find(a => a.codice === codice);
        if (!articolo) return;

        if (articolo.quantita <= 0) {
            alert(`Attenzione: ${articolo.descrizione} non disponibile in magazzino`);
            return;
        }

        articolo.quantita -= 1;

        movimenti.push({
            data: new Date().toISOString().slice(0, 10),
            tipo: "scarico",
            codice: articolo.codice,
            descrizione: articolo.descrizione
        });
    });

    localStorage.setItem("magazzino", JSON.stringify(magazzino));
    localStorage.setItem("movimentiMagazzino", JSON.stringify(movimenti));
}

/* =========================================================
   PREVENTIVI - ACCETTAZIONE PREVENTIVO
   ========================================================= */ 

function accettaPreventivo(p) {
    // data accettazione (ISO YYYY-MM-DD)
    const oggi = new Date();
    const dataAcc = oggi.toISOString().slice(0, 10);
    p.dataAccettazione = dataAcc;

    // scarico magazzino (solo ricambi marcati con codiceMagazzino)
    scaricaMagazzinoDaPreventivo(p);

    // 1) apri i link dei ricambi (una finestra per link e no link se su magazzino)
        (p.ricambi || []).forEach(r => {
            // se è ricambio da magazzino, NON aprire nulla
            if (r.codiceMagazzino) return;

            // apri solo link veri (http/https)
            if (r.link && (r.link.startsWith("http://") || r.link.startsWith("https://"))) {
                window.open(r.link, "_blank");
            }
        });


    // 2) crea ordini con leadTime e date
    const ordini = JSON.parse(localStorage.getItem("ordini")) || [];
    let dataMax = null;

    (p.ricambi || []).forEach(r => {

        if (r.codiceMagazzino) return; // ricambio già in magazzino: nessun ordine
        const lt = Number(r.leadTime) || 0;
        const d = new Date(dataAcc);
        d.setDate(d.getDate() + lt);
        const dataPrevista = d.toISOString().slice(0, 10);

        // aggiorna data che comanda (vince il più lento)
        if (!dataMax || dataPrevista > dataMax) {
            dataMax = dataPrevista;
        }

        ordini.push({
            id: "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            preventivoId: p.id,
            descrizione: r.descrizione,
            link: r.link || "",
            leadTime: lt,
            dataAccettazione: dataAcc,
            dataConsegnaPrevista: dataPrevista,
            arrivato: false
        });
    });

    p.dataConsegnaMax = dataMax;

    localStorage.setItem("ordini", JSON.stringify(ordini));
}

/* =========================================================
   PREVENTIVI - STATO DERIVATO (ACCETTATO / RIFIUTATO)
   ========================================================= */

function getStatoPreventivo(p) {

    if (p.accettato) return "Accettato";

    // 🔴 rifiuto manuale
    if (p.rifiutato) return "Rifiutato";

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

        // se esiste almeno un ricambio NON da magazzino → riparazione bloccata
        const deveAttendereRicambi = (p.ricambi || []).some(r =>
            !r.codiceMagazzino && (r.descrizione || "").trim() !== ""
        );

        riparazioni.push({
            id: id,
            preventivoId: p.id,
            clienteCodice: p.clienteCodice,
            descrizione: p.descrizione,
            stato: deveAttendereRicambi ? "in_attesa_ricambi" : "pronta",
            avviabile: !deveAttendereRicambi,
            elapsedMs: 0,
            startTime: null,
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

        // ✅ se viene dal magazzino, NON creare ordine
        if (r.codiceMagazzino) return;

        if (!r.descrizione) return;

            // 🔒 DEDUPE: evita duplicati stesso preventivo + descrizione
            const esisteGia = ordini.some(o =>
                o.preventivoId === p.id &&
                (o.descrizione || "").trim().toLowerCase() === r.descrizione.trim().toLowerCase()
            );

            if (esisteGia) return;

            ordini.push({
                id: "O-" + String(ordini.length + 1).padStart(4, "0"),
                preventivoId: p.id,
                descrizione: r.descrizione,
                link: r.link || "",
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
                <input type="text" class="input-gestionale" value="${r.descrizione || ""}">
                <input type="text" class="input-gestionale ricambio-link-codice" value="${r.link || ""}">
                <input type="number" class="input-gestionale" value="${r.prezzo || ""}" min="0" step="0.01">
                <input type="number" class="input-gestionale" value="${r.leadTime || ""}" min="0" step="1">
                ${
                    index === 0
                        ? `<button type="button" id="btnAddRicambio" class="btn-add-ricambio">+</button>`
                        : `<button type="button" class="btn-remove-ricambio">−</button>`
                }
            `;
            
            // 🔑 RIPRISTINO CODICE MAGAZZINO (fondamentale per scarico futuro)
                const inputLink = riga.querySelector(".ricambio-link-codice");
                if (r.codiceMagazzino && inputLink) {
                    inputLink.dataset.codiceMagazzino = r.codiceMagazzino;
                }




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
                <input type="text" class="input-gestionale ricambio-link-codice" value="${r.link || ""}">
                <input type="number" class="input-gestionale" value="${r.prezzo || ""}" min="0" step="0.01">
                <input type="number" class="input-gestionale" value="${r.leadTime ?? ""}" min="0" step="1">
                ${
                    index === 0
                        ? `<button type="button" id="btnAddRicambio" class="btn-add-ricambio">+</button>`
                        : `<button type="button" class="btn-remove-ricambio">−</button>`
                }
            `;

            ricambiWrapper.appendChild(riga);

            // rimuove riga extra
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

    if (!confirm("Vuoi segnare questo preventivo come RIFIUTATO?")) return;

    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];

    const p = preventivi.find(p => p.id === preventivoInModificaId);
    if (!p) return;

    // 🔴 soft delete → rifiutato
    p.rifiutato = true;
    p.dataRifiuto = new Date().toISOString().slice(0, 10);

    localStorage.setItem("preventivi", JSON.stringify(preventivi));

    preventivoInModificaId = null;

    resetFormPreventivo();
    renderPreventivi();
}

function apriModalAcconto(p) {

    preventivoAccontoId = p.id;

    // mostra totale
    document.getElementById("acconto-totale").innerText = p.totale.toFixed(2);

    // suggerimento 15%
    const suggerito = (p.totale * 0.15).toFixed(2);
    const input = document.getElementById("inputAcconto");

    input.value = "";
    input.placeholder = ` (${suggerito} € suggerito)`;

    document.getElementById("modalAcconto").style.display = "flex";
    input.focus();
}
document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("btnConfermaAcconto");
    if (!btn) return;

    btn.onclick = confermaAccontoPreventivo;
});

function confermaAccontoPreventivo() {

    const input = document.getElementById("inputAcconto");
    if (!input) return;

    const valore = Number(input.value);

    // valido solo > 0
    //if (!valore || valore <= 0) {
    //    alert("Inserisci un acconto valido");
    //     input.focus();
    //     return;
    // }

    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const p = preventivi.find(pr => pr.id === preventivoAccontoId);
    if (!p) return;

    // 1) salva acconto nel preventivo
    p.acconto = valore;
    p.accontoPercentuale = Math.round((valore / p.totale) * 100);

    localStorage.setItem("preventivi", JSON.stringify(preventivi));

    // 2) registra movimento in Vendite (ENTRATA) collegato al preventivo
    const vendite = JSON.parse(localStorage.getItem("vendite")) || [];

    vendite.push({
        id: "V-" + Date.now(),
        data: new Date().toISOString().slice(0, 10),
        tipo: "entrata",
        clienteCodice: p.clienteCodice || "",
        descrizione: "Acconto preventivo",
        importo: Number(valore.toFixed(2)),
        preventivoId: p.id
    });

    localStorage.setItem("vendite", JSON.stringify(vendite));

    // 3) crea ordini e riparazione (come già previsto dal tuo flusso)
    creaRiparazioneDaPreventivo(p);
    creaOrdiniDaPreventivo(p);

    // 4) chiudi modal
    document.getElementById("modalAcconto").style.display = "none";
    preventivoAccontoId = null;

    renderPreventivi();
}

/* =========================================================
   UTILITY MAGAZZINO
   ========================================================= */
   
function trovaArticoloMagazzino(codice) {
    if (!codice) return null;

    const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
    return magazzino.find(a => a.codice === codice.trim()) || null;
}
/* =========================================================
   PREVENTIVI – RICAMBI DA MAGAZZINO (SAFE MODE)
   ========================================================= */

/**
 * Se nel campo link viene inserito un CODICE presente in magazzino,
 * compila automaticamente il prezzo del ricambio.
 * NON tocca descrizione.
 * NON interferisce con salvaPreventivo().
 */
function inizializzaRicambiDaMagazzino() {

    document.querySelectorAll(".riga-ricambio input[type='url']").forEach(input => {

        // evitiamo doppio binding
        if (input.dataset.magazzinoInit) return;
        input.dataset.magazzinoInit = "1";

        input.addEventListener("blur", () => {

            const valore = input.value.trim();
            if (!valore) return;

            const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
            const articolo = magazzino.find(a => a.codice === valore);
            if (!articolo) return;

            const riga = input.closest(".riga-ricambio");
            if (!riga) return;

            // prezzo = PRIMO input number della riga (come da struttura attuale)
            const inputPrezzo = riga.querySelector("input[type='number']");
            if (!inputPrezzo) return;

            inputPrezzo.value = articolo.valore;
            input.dataset.codiceMagazzino = articolo.codice;
        });
    });
}
function scaricaMagazzinoDaPreventivo(preventivo) {

    if (!preventivo || !preventivo.ricambi) return;

    const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
    const movimenti = JSON.parse(localStorage.getItem("movimentiMagazzino")) || [];

    preventivo.ricambi.forEach(r => {

        if (!r.codiceMagazzino) return;

        const articolo = magazzino.find(a => a.codice === r.codiceMagazzino);
        if (!articolo) return;

        if (articolo.quantita <= 0) {
            alert(`Attenzione: ${articolo.descrizione} non disponibile in magazzino`);
            return;
        }

        articolo.quantita -= 1;

        movimenti.push({
            data: new Date().toISOString().slice(0, 10),
            tipo: "scarico",
            codice: articolo.codice,
            descrizione: articolo.descrizione
        });
    });

    localStorage.setItem("magazzino", JSON.stringify(magazzino));
    localStorage.setItem("movimentiMagazzino", JSON.stringify(movimenti));
}
/* =========================================================
   TOGGLE PREVENTIVI / STORICO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const btnAttivi = document.getElementById("togglePreventiviAttiviTab");
    const btnStorico = document.getElementById("togglePreventiviStoricoTab");

    const viewAttivi = document.getElementById("viewPreventiviAttivi");
    const viewStorico = document.getElementById("viewPreventiviStorico");

    if (!btnAttivi || !btnStorico || !viewAttivi || !viewStorico) return;

    // stato iniziale
    btnAttivi.classList.add("attivo");
    btnStorico.classList.remove("attivo");
    viewAttivi.style.display = "block";
    viewStorico.style.display = "none";

    btnAttivi.onclick = () => {
        btnAttivi.classList.add("attivo");
        btnStorico.classList.remove("attivo");
        viewAttivi.style.display = "block";
        viewStorico.style.display = "none";
    };

    btnStorico.onclick = () => {
        btnStorico.classList.add("attivo");
        btnAttivi.classList.remove("attivo");
        viewAttivi.style.display = "none";
        viewStorico.style.display = "block";
    };
});
