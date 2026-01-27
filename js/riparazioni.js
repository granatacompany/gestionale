document.addEventListener("DOMContentLoaded", renderRiparazioni);

function renderRiparazioni() {

    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];

    const tbodyAttive = document.querySelector("#tabRiparazioni tbody");
    const tbodyStorico = document.querySelector("#tabRiparazioniStorico tbody");

    if (!tbodyAttive || !tbodyStorico) return;

    tbodyAttive.innerHTML = "";
    tbodyStorico.innerHTML = "";

    riparazioni.forEach(r => {

        // =========================
        // STORICO (COMPLETATE)
        // =========================
        if (r.stato === "completata") {

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${r.id}</td>
                <td>${r.clienteCodice}</td>
                <td>${r.descrizione}</td>
                <td>${r.dataFine || "-"}</td>
            `;
            tbodyStorico.appendChild(tr);
            return;
        }

        // =========================
        // RIPARAZIONI ATTIVE
        // =========================
        let azioni = "";

        if (r.stato === "in_attesa_ricambi") {
            azioni = `<button disabled>Avvia</button>`;
        }

        if (r.stato === "pronta") {
            azioni = `<button onclick="avviaRiparazione('${r.id}')">Avvia</button>`;
        }

        if (r.stato === "in_lavorazione") {
            azioni = `
                <button onclick="pausaRiparazione('${r.id}')">Pausa</button>
                <button onclick="terminaRiparazione('${r.id}')">Fine</button>
            `;
        }

        if (r.stato === "in_pausa") {
            azioni = `
                <button onclick="avviaRiparazione('${r.id}')">Riprendi</button>
                <button onclick="terminaRiparazione('${r.id}')">Fine</button>
            `;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.id}</td>
            <td>${r.clienteCodice}</td>
            <td>${r.descrizione}</td>
            <td>${r.stato}</td>
            <td>${azioni}</td>
        `;

        tbodyAttive.appendChild(tr);
    });
}




function avviaRiparazione(id) {

    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const r = riparazioni.find(r => r.id === id);
    if (!r) return;

    if (!r.startTime) {
        r.startTime = Date.now();
    }

    r.stato = "in_lavorazione";

    localStorage.setItem("riparazioni", JSON.stringify(riparazioni));
    renderRiparazioni();
}

function pausaRiparazione(id) {

    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const r = riparazioni.find(r => r.id === id);
    if (!r || !r.startTime) return;

    r.elapsedMs += Date.now() - r.startTime;
    r.startTime = null;
    r.stato = "in_pausa";

    localStorage.setItem("riparazioni", JSON.stringify(riparazioni));
    renderRiparazioni();
}

function terminaRiparazione(id) {

    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const r = riparazioni.find(r => r.id === id);
    if (!r) return;

    if (r.startTime) {
        r.elapsedMs += Date.now() - r.startTime;
        r.startTime = null;
    }

    r.stato = "completata";
    r.dataFine = new Date().toISOString().slice(0,10);

    localStorage.setItem("riparazioni", JSON.stringify(riparazioni));
    renderRiparazioni();
}
/* =========================================================
   TOGGLE RIPARAZIONI / STORICO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const btnAttive = document.getElementById("toggleRiparazioniTab");
    const btnStorico = document.getElementById("toggleStoricoRiparazioniTab");

    const viewAttive = document.getElementById("viewRiparazioniAttive");
    const viewStorico = document.getElementById("viewRiparazioniStorico");

    if (!btnAttive || !btnStorico || !viewAttive || !viewStorico) return;

    // stato iniziale
    btnAttive.classList.add("attivo");
    btnStorico.classList.remove("attivo");
    viewAttive.style.display = "block";
    viewStorico.style.display = "none";

    btnAttive.onclick = () => {
        btnAttive.classList.add("attivo");
        btnStorico.classList.remove("attivo");
        viewAttive.style.display = "block";
        viewStorico.style.display = "none";
    };

    btnStorico.onclick = () => {
        btnStorico.classList.add("attivo");
        btnAttive.classList.remove("attivo");
        viewAttive.style.display = "none";
        viewStorico.style.display = "block";
    };
});
