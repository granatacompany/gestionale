document.addEventListener("DOMContentLoaded", () => {
    calcolaKPI();
    caricaAttivitaUrgenti();
    caricaAndamentoEconomico();
    caricaStatoOperativo();
    caricaSuggerimenti();
});

/* ================= KPI ================= */

function calcolaKPI() {
    const vendite = JSON.parse(localStorage.getItem("vendite")) || [];
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];

    const oggi = new Date();

    const incassoMese = vendite
        .filter(v => v.tipo === "entrata")
        .filter(v => {
            const d = new Date(v.data);
            return d.getMonth() === oggi.getMonth() &&
                   d.getFullYear() === oggi.getFullYear();
        })
        .reduce((s, v) => s + Number(v.importo || 0), 0);

    document.getElementById("kpiIncassoMese").innerText =
        "€ " + incassoMese.toFixed(2);

    document.getElementById("kpiPreventiviAperti").innerText =
        preventivi.filter(p => !p.accettato && !p.rifiutato).length;

    document.getElementById("kpiRiparazioniAttive").innerText =
        riparazioni.filter(r => r.stato !== "completata").length;
}

/* ================= ATTIVITÀ URGENTI ================= */

function caricaAttivitaUrgenti() {
    const box = document.getElementById("attivitaUrgenti");
    box.innerHTML = "";

    const ordini = JSON.parse(localStorage.getItem("ordini")) || [];
    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];

    const oggi = new Date().toISOString().slice(0,10);

    ordini
        .filter(o => !o.arrivato && o.dataConsegnaPrevista < oggi)
        .forEach(o => box.appendChild(rigaUrgente(
            "Ordine in ritardo", o.descrizione, "ordini.html", "b-red"
        )));

    riparazioni
        .filter(r => r.stato === "in_attesa_ricambi")
        .forEach(r => box.appendChild(rigaUrgente(
            "Riparazione bloccata", r.descrizione, "riparazioni.html", "b-amber"
        )));

    preventivi
        .filter(p => !p.accettato && !p.rifiutato)
        .filter(p => (new Date() - new Date(p.data)) / 86400000 > 1)
        .forEach(p => box.appendChild(rigaUrgente(
            "Preventivo in scadenza", p.id, "preventivi.html", "b-amber"
        )));

    riparazioni
        .filter(r => r.stato === "completata" && !r.incassata)
        .forEach(r => box.appendChild(rigaUrgente(
            "Vendita da concludere", r.descrizione, "vendite.html", "b-green"
        )));

    if (!box.children.length) {
        box.innerHTML = "<div class='muted'>Nessuna urgenza 🎉</div>";
    }
}

function rigaUrgente(testo, desc, link, badge) {
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `
        <span class="badge ${badge}">${testo}</span>
        <span>${desc || ""}</span>
        <a href="${link}">Apri</a>
    `;
    return div;
}

/* ================= ANDAMENTO ECONOMICO ================= */

function caricaAndamentoEconomico() {
    const vendite = JSON.parse(localStorage.getItem("vendite")) || [];
    const ctx = document.getElementById("chartIncassi");

    const giorni = [...Array(30).keys()].map(i => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().slice(0,10);
    });

    const dati = giorni.map(g =>
        vendite
            .filter(v => v.tipo === "entrata" && v.data === g)
            .reduce((s, v) => s + Number(v.importo || 0), 0)
    );

    new Chart(ctx, {
        type: "line",
        data: {
            labels: giorni,
            datasets: [{
                data: dati,
                borderColor: "#5cff9d",
                tension: 0.3
            }]
        },
        options: {
            plugins: { legend: { display:false } },
            scales: { y: { beginAtZero:true } }
        }
    });
}

/* ================= STATO OPERATIVO ================= */

function caricaStatoOperativo() {
    const magazzino = JSON.parse(localStorage.getItem("magazzino")) || [];
    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];
    const preventivi = JSON.parse(localStorage.getItem("preventivi")) || [];
    const clienti = JSON.parse(localStorage.getItem("clienti")) || [];

    document.getElementById("opMagazzino").innerText =
        magazzino.filter(a => a.quantita <= 1).length;

    const tempi = riparazioni
        .filter(r => r.elapsedMs)
        .map(r => r.elapsedMs / 3600000);

    document.getElementById("opTempo").innerText =
        tempi.length
            ? (tempi.reduce((a,b)=>a+b,0) / tempi.length).toFixed(1) + " h"
            : "0 h";

    const acc = preventivi.filter(p => p.accettato).length;
    document.getElementById("opAccettazione").innerText =
        preventivi.length ? Math.round(acc / preventivi.length * 100) + "%" : "0%";

    document.getElementById("opClienti").innerText =
        clienti.length;
}

/* ================= SUGGERIMENTI ================= */

function caricaSuggerimenti() {
    const box = document.getElementById("suggerimenti");
    box.innerHTML = `
        <div>📌 Controlla riparazioni completate non incassate</div>
        <div>📦 Verifica articoli sotto scorta</div>
        <div>💡 Clienti ricorrenti: valuta fidelizzazione</div>
    `;
}
