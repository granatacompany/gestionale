/* =========================================================
   MAGAZZINO
   ========================================================= */

let magazzino = [];
let movimentiMagazzino = [];
let rigaMagazzinoSelezionata = null;
let filtroMovimenti = "carico"; // carico | scarico

/* =========================================================
   AVVIO PAGINA
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    caricaMagazzino();
    caricaMovimenti();

    initTogglePagine();
    initToggleMovimenti();
    initEventiForm();
    initFiltri();

    renderMagazzino();
    renderMovimenti();
});

/* =========================================================
   STORAGE
   ========================================================= */

function salvaMagazzino() {
    localStorage.setItem("magazzino", JSON.stringify(magazzino));
}

function salvaMovimenti() {
    localStorage.setItem("movimentiMagazzino", JSON.stringify(movimentiMagazzino));
}

function caricaMagazzino() {
    magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
}

function caricaMovimenti() {
    movimentiMagazzino = JSON.parse(localStorage.getItem("movimentiMagazzino")) || [];
}

/* =========================================================
   TOGGLE PAGINE (MAGAZZINO / MOVIMENTI)
   ========================================================= */

function initTogglePagine() {

    const btnMag = document.getElementById("toggleMagazzinoTab");
    const btnMov = document.getElementById("toggleMovimentiTab");

    const viewMag = document.getElementById("viewMagazzino");
    const viewMov = document.getElementById("viewMovimenti");

    // stato iniziale
    btnMag.classList.add("attivo");

    btnMag.onclick = () => {
        btnMag.classList.add("attivo");
        btnMov.classList.remove("attivo");
        viewMag.style.display = "block";
        viewMov.style.display = "none";
    };

    btnMov.onclick = () => {
        btnMov.classList.add("attivo");
        btnMag.classList.remove("attivo");
        viewMov.style.display = "block";
        viewMag.style.display = "none";
        renderMovimenti();
    };
}

/* =========================================================
   TOGGLE MOVIMENTI (ENTRATA / USCITA)
   ========================================================= */

function initToggleMovimenti() {

    const toggle = document.getElementById("toggleMovimentiTipo");
    if (!toggle) return;

    toggle.classList.remove("attivo");
    toggle.textContent = "ENTRATA";
    filtroMovimenti = "carico";

    toggle.onclick = () => {
        if (filtroMovimenti === "carico") {
            filtroMovimenti = "scarico";
            toggle.classList.add("attivo");
            toggle.textContent = "USCITA";
        } else {
            filtroMovimenti = "carico";
            toggle.classList.remove("attivo");
            toggle.textContent = "ENTRATA";
        }
        renderMovimenti();
    };
}

/* =========================================================
   EVENTI FORM CARICO
   ========================================================= */

function initEventiForm() {

    const btn = document.getElementById("btnCaricaMagazzino");
    if (btn) btn.onclick = caricaArticolo;

    const search = document.getElementById("searchMagazzino");
    if (search) search.oninput = renderMagazzino;

    const btnStampa = document.getElementById("btnStampaEtichetta");
    if (btnStampa) btnStampa.onclick = stampaEtichetta;
}

/* =========================================================
   FILTRI
   ========================================================= */

function initFiltri() {

    const filtroCat = document.getElementById("filtroCategoria");
    const filtroComp = document.getElementById("filtroCompatibilita");

    if (filtroCat) filtroCat.onchange = renderMagazzino;
    if (filtroComp) filtroComp.oninput = renderMagazzino;
}

/* =========================================================
   CARICO ARTICOLO
   ========================================================= */

function caricaArticolo() {

    const codice = document.getElementById("magCodice").value.trim();
    const categoria = document.getElementById("magCategoria").value;
    const compatibilita = document.getElementById("magCompatibilita").value.trim() || "-";
    const descrizione = document.getElementById("magDescrizione").value.trim();
    const prezzoAcquisto = Number(document.getElementById("magPrezzoAcquisto").value);
    const valore = Number(document.getElementById("magValore").value);
    const quantita = Number(document.getElementById("magQuantita").value);

    if (!codice || !categoria || !descrizione || quantita <= 0) {
        alert("Compila correttamente tutti i campi obbligatori");
        return;
    }

    let articolo = magazzino.find(a => a.codice === codice);

    if (articolo) {
        // SOMMA QUANTITÀ
        articolo.quantita += quantita;
    } else {
        magazzino.push({
            codice,
            categoria,
            compatibilita,
            descrizione,
            prezzoAcquisto,
            valore,
            quantita
        });
    }

    // MOVIMENTO DI CARICO
    movimentiMagazzino.push({
        data: new Date().toISOString().slice(0, 10),
        tipo: "carico",
        codice,
        descrizione
    });

    salvaMagazzino();
    salvaMovimenti();

    resetFormMagazzino();
    renderMagazzino();
}

/* =========================================================
   RENDER MAGAZZINO
   ========================================================= */

function renderMagazzino() {

    const tbody = document.querySelector("#tabMagazzino tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    rigaMagazzinoSelezionata = null;
    document.getElementById("btnStampaEtichetta").style.display = "none";

    const search = document.getElementById("searchMagazzino").value.toLowerCase();
    const filtroCat = document.getElementById("filtroCategoria").value;
    const filtroComp = document.getElementById("filtroCompatibilita").value.toLowerCase();

    magazzino.forEach(a => {

        if (
            search &&
            !(
                a.codice.toLowerCase().includes(search) ||
                a.descrizione.toLowerCase().includes(search) ||
                a.compatibilita.toLowerCase().includes(search) ||
                a.categoria.toLowerCase().includes(search)
            )
        ) return;

        if (filtroCat && a.categoria !== filtroCat) return;
        if (filtroComp && !a.compatibilita.toLowerCase().includes(filtroComp)) return;

        const tr = document.createElement("tr");
        tr.onclick = () => selezionaRigaMagazzino(tr, a);

        tr.innerHTML = `
            <td>${a.codice}</td>
            <td>${a.categoria}</td>
            <td>${a.compatibilita}</td>
            <td>${a.descrizione}</td>
            <td>€ ${Number(a.prezzoAcquisto || 0).toFixed(2)}</td>
            <td>€ ${Number(a.valore || 0).toFixed(2)}</td>
            <td>${a.quantita}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* =========================================================
   SELEZIONE RIGA
   ========================================================= */

function selezionaRigaMagazzino(tr, articolo) {

    document.querySelectorAll("#tabMagazzino tr").forEach(r => r.classList.remove("selected"));
    tr.classList.add("selected");

    rigaMagazzinoSelezionata = articolo;
    document.getElementById("btnStampaEtichetta").style.display = "inline-block";
}

/* =========================================================
   STAMPA ETICHETTA (SOLO BARCODE)
   ========================================================= */

function stampaEtichetta() {

    if (!rigaMagazzinoSelezionata) return;

    const codice = rigaMagazzinoSelezionata.codice;
    const win = window.open("", "_blank");

    win.document.write(`
        <html>
        <head>
            <title>Etichetta</title>
            <style>
                body { text-align:center; margin-top:20px; }
                img { width:220px; }
            </style>
        </head>
        <body>
            <img id="barcode"
                 src="https://barcode.tec-it.com/barcode.ashx?data=${codice}&code=Code128">
            <script>
                document.getElementById("barcode").onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);

    win.document.close();
}

/* =========================================================
   RESET FORM
   ========================================================= */

function resetFormMagazzino() {

    document.getElementById("magCodice").value = "";
    document.getElementById("magCategoria").value = "";
    document.getElementById("magCompatibilita").value = "";
    document.getElementById("magDescrizione").value = "";
    document.getElementById("magPrezzoAcquisto").value = "";
    document.getElementById("magValore").value = "";
    document.getElementById("magQuantita").value = "";
}

/* =========================================================
   RENDER MOVIMENTI
   ========================================================= */

function renderMovimenti() {

    const tbody = document.querySelector("#tabMovimentiMagazzino tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    movimentiMagazzino
        .filter(m => m.tipo === filtroMovimenti)
        .forEach(m => {

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${m.data}</td>
                <td>${m.tipo === "carico" ? "Entrata" : "Uscita"}</td>
                <td>${m.codice}</td>
                <td>${m.descrizione}</td>
            `;

            tbody.appendChild(tr);
        });
}
