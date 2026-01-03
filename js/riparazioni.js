document.addEventListener("DOMContentLoaded", renderRiparazioni);

function renderRiparazioni() {

    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const ordini = JSON.parse(localStorage.getItem("ordini")) || [];

    const tbody = document.querySelector("#tabRiparazioni tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    riparazioni.forEach(r => {

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

        if (r.stato === "completata") {
            azioni = "✔️";
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.id}</td>
            <td>${r.clienteCodice}</td>
            <td>${r.descrizione}</td>
            <td>${r.stato}</td>
            <td>${azioni}</td>
        `;

        tbody.appendChild(tr);
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
