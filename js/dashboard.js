document.addEventListener("DOMContentLoaded", () => {
    calcolaKPI();
    caricaAttivitaUrgenti();
    caricaAndamentoEconomico();
    caricaStatoOperativo();
    caricaSuggerimenti();
    initObiettiviServizi();
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
            "Vendita da consegnare", r.descrizione, "vendite.html", "b-green"
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

/* ================= OBIETTIVI SERVIZI (Dashboard) ================= */

const KEY_OBIETTIVI = "obiettiviGiornalieriServizi";
let chartObiettivi = null;

function oggiYMD() {
    return new Date().toISOString().slice(0, 10);
}

function caricaObiettivi() {
    const salvati = JSON.parse(localStorage.getItem(KEY_OBIETTIVI)) || null;

    // default “safe”
    if (!salvati || !Array.isArray(salvati) || salvati.length === 0) {
        const base = [
            { label: "Luce", key: "luce", target: 0 },
            { label: "Gas", key: "gas", target: 0 },
            { label: "Fibra", key: "fibra", target: 0 },
            { label: "Mobile", key: "mobile", target: 0 },
        ];
        localStorage.setItem(KEY_OBIETTIVI, JSON.stringify(base));
        return base;
    }

    // normalizzo
    return salvati.map(o => ({
        label: String(o.label || "").trim() || "Obiettivo",
        key: String(o.key || "").trim() || "",
        target: Number(o.target || 0)
    }));
}

function salvaObiettivi(obiettivi) {
    localStorage.setItem(KEY_OBIETTIVI, JSON.stringify(obiettivi));
}

function caricaServizi() {
    // la pagina servizi usa KEY_SERVIZI = "servizi"
    return JSON.parse(localStorage.getItem("servizi")) || [];
}

function calcolaFattiOggi(obiettivi) {
    const servizi = caricaServizi();
    const oggi = oggiYMD();

    // Conteggio “per tipo”: un cliente vale 1 se oggi ha quel flag true.
    const fatti = {};
    obiettivi.forEach(o => fatti[o.label] = 0);

    servizi.forEach(rec => {
        const data = (rec.dataAggiornamento || "").slice(0, 10);
        if (data !== oggi) return;

        obiettivi.forEach(o => {
            // key (luce/gas/fibra/mobile) se esiste
            if (o.key && rec[o.key] === true) {
                fatti[o.label] = (fatti[o.label] || 0) + 1;
            }
        });
    });

    return fatti;
}

function initObiettiviServizi() {
    const canvas = document.getElementById("chartObiettiviServizi");
    const boxRiepilogo = document.getElementById("riepilogoObiettivi");
    const btnModifica = document.getElementById("btnModificaObiettivi");

    const modal = document.getElementById("modalObiettivi");
    const rowsBox = document.getElementById("obiettiviRows");
    const btnAdd = document.getElementById("btnAddObiettivo");
    const btnAnnulla = document.getElementById("btnAnnullaObiettivi");
    const btnSalva = document.getElementById("btnSalvaObiettivi");

    if (!canvas || !boxRiepilogo || !btnModifica || !modal || !rowsBox || !btnAdd || !btnAnnulla || !btnSalva) return;

    function renderDashboardObiettivi() {
        const obiettivi = caricaObiettivi();
        const fatti = calcolaFattiOggi(obiettivi);

        const labels = obiettivi.map(o => o.label);
        const targets = obiettivi.map(o => Number(o.target || 0));
        const done = obiettivi.map(o => Number(fatti[o.label] || 0));

        // riepilogo testuale
        boxRiepilogo.innerHTML = "";
        labels.forEach((lab, i) => {
            const t = targets[i];
            const d = done[i];
            const ok = t > 0 && d >= t;

            const div = document.createElement("div");
            div.className = "row";
            div.innerHTML = `
                <span class="badge ${ok ? "b-green" : "b-amber"}">${lab}</span>
                <span>Fatti oggi: <strong>${d}</strong> / Target: <strong>${t}</strong></span>
            `;
            boxRiepilogo.appendChild(div);
        });

        // chart
        if (chartObiettivi) chartObiettivi.destroy();

        chartObiettivi = new Chart(canvas, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    { label: "Target", data: targets },
                    { label: "Fatti oggi", data: done }
                ]
            },
            options: {
                plugins: { legend: { display: true } },
                responsive: true,
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    function openModal() {
        const obiettivi = caricaObiettivi();
        rowsBox.innerHTML = "";
        obiettivi.forEach((o, idx) => rowsBox.appendChild(creaRigaObiettivo(o, idx)));
        modal.style.display = "flex";
    }

    function closeModal() {
        modal.style.display = "none";
    }

    function creaRigaObiettivo(o, idx) {
        const wrap = document.createElement("div");
        wrap.style.display = "grid";
        wrap.style.gridTemplateColumns = "1.3fr 1fr 1fr";
        wrap.style.gap = "10px";
        wrap.style.alignItems = "center";

        wrap.innerHTML = `
            <input class="input-gestionale" placeholder="Nome (es. Fibra Fastweb)" value="${escapeHtml(o.label)}">
            <select class="input-gestionale">
                <option value="">Tipo (opz.)</option>
                <option value="luce">Luce</option>
                <option value="gas">Gas</option>
                <option value="fibra">Fibra</option>
                <option value="mobile">Mobile</option>
            </select>
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="number"
                    class="input-gestionale"
                    placeholder="Target"
                    min="0"
                    step="1"
                    value="${Number(o.target || 0)}"
                    style="width:100%; min-width:90px;">
                <button type="button" class="toggle-rapido" title="Rimuovi">−</button>
            </div>
        `;

        const select = wrap.querySelector("select");
        if (select) select.value = o.key || "";

        const btnRemove = wrap.querySelector("button");
        btnRemove.onclick = () => wrap.remove();

        return wrap;
    }

    function leggiObiettiviDalModal() {
        const righe = Array.from(rowsBox.children);

        const puliti = righe.map(r => {
            const inputs = r.querySelectorAll("input");
            const select = r.querySelector("select");

            const label = (inputs[0]?.value || "").trim();
            const target = Number(inputs[1]?.value || 0);
            const key = (select?.value || "").trim();

            return {
                label: label || "Obiettivo",
                key: key, // può essere vuota (obiettivo “custom”)
                target: Number.isFinite(target) && target >= 0 ? Math.floor(target) : 0
            };
        });

        // evita lista vuota
        return puliti.length ? puliti : [
            { label: "Luce", key: "luce", target: 0 },
            { label: "Gas", key: "gas", target: 0 },
            { label: "Fibra", key: "fibra", target: 0 },
            { label: "Mobile", key: "mobile", target: 0 },
        ];
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // eventi
    btnModifica.onclick = openModal;
    btnAnnulla.onclick = () => { closeModal(); };
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    btnAdd.onclick = () => {
        rowsBox.appendChild(creaRigaObiettivo({ label: "", key: "", target: 0 }, Date.now()));
    };

    btnSalva.onclick = () => {
        const nuovi = leggiObiettiviDalModal();
        salvaObiettivi(nuovi);
        closeModal();
        renderDashboardObiettivi();
    };

    // render iniziale
    renderDashboardObiettivi();
}
