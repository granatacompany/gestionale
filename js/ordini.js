document.addEventListener("DOMContentLoaded", renderOrdini);



function oggiISO() {
    return new Date().toISOString().slice(0, 10);
}

function renderOrdini() {

    const ordini = JSON.parse(localStorage.getItem("ordini")) || [];

    const tbodyAperti = document.querySelector("#tabOrdini tbody");
    const tbodyStorico = document.querySelector("#tabOrdiniStorico tbody");

    if (!tbodyAperti || !tbodyStorico) return;

    tbodyAperti.innerHTML = "";
    tbodyStorico.innerHTML = "";

        function getStatoOrdine(o) {
            if (!o.dataConsegnaPrevista) return "";

            const oggi = new Date().toISOString().slice(0, 10);

            if (oggi > o.dataConsegnaPrevista) return "rosso";
            if (oggi === o.dataConsegnaPrevista) return "verde";

            const domani = new Date();
            domani.setDate(domani.getDate() + 1);
            const domaniISO = domani.toISOString().slice(0, 10);

            if (domaniISO === o.dataConsegnaPrevista) return "giallo";

            return "";
        }


    ordini.forEach((o) => {

        const tr = document.createElement("tr");

        // ---------------------------
        // ORDINI APERTI
        // ---------------------------
        if (!o.arrivato) {

            const stato = getStatoOrdine(o);

            tr.innerHTML = `
                <td>${o.id}</td>
                <td>${o.preventivoId}</td>
                <td>${o.descrizione}</td>
                <td style="text-align:center">${o.leadTime !== undefined ? o.leadTime : "-"}</td>
                <td>${o.dataConsegnaPrevista || "-"}</td>
                <td>
                    ${o.link
                        ? `<a href="${o.link}" target="_blank">Apri</a>`
                        : "-"
                    }
                </td>
                <td style="text-align:center">
                    <span class="semaforo ${stato}"></span>
                </td>

                <td style="text-align:center">
                     <input type="checkbox" ${o.arrivato ? "checked" : ""}>
                </td>
            `;

            const checkbox = tr.querySelector("input");
            checkbox.checked = false;

            checkbox.onchange = () => {
                o.arrivato = true;
                o.dataArrivo = o.dataArrivo || oggiISO();

                localStorage.setItem("ordini", JSON.stringify(ordini));
                aggiornaRiparazioniDaOrdini();
                renderOrdini(); // refresh viste
            };

            tbodyAperti.appendChild(tr);
            return;
        }

        // ---------------------------
        // STORICO ORDINI
        // ---------------------------
        tr.innerHTML = `
            <td>${o.dataArrivo || "-"}</td>
            <td>${o.id}</td>
            <td>${o.preventivoId}</td>
            <td>${o.descrizione}</td>
            <td>
                ${o.link ? `<a href="${o.link}" target="_blank">Apri</a>` : "-"}
            </td>
        `;


        tbodyStorico.appendChild(tr);
    });
}


function aggiornaRiparazioniDaOrdini() {

    const ordini = JSON.parse(localStorage.getItem("ordini")) || [];
    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];

    riparazioni.forEach(r => {

        // 🔒 NON toccare riparazioni già completate
        if (r.stato === "completata") return;

        const ordiniCollegati = ordini.filter(
            o => o.preventivoId === r.preventivoId
        );

        if (ordiniCollegati.length === 0) return;

        const tuttiArrivati = ordiniCollegati.every(o => o.arrivato);

        if (tuttiArrivati) {
            r.stato = "pronta";
            r.avviabile = true;
        } else {
            r.stato = "in_attesa_ricambi";
            r.avviabile = false;
        }
    });

    localStorage.setItem("riparazioni", JSON.stringify(riparazioni));
}
/* =========================================================
   TOGGLE ORDINI / STORICO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const btnAperti = document.getElementById("toggleOrdiniApertiTab");
    const btnStorico = document.getElementById("toggleOrdiniStoricoTab");

    const viewAperti = document.getElementById("viewOrdiniAperti");
    const viewStorico = document.getElementById("viewOrdiniStorico");

    if (!btnAperti || !btnStorico || !viewAperti || !viewStorico) return;

    // stato iniziale
    btnAperti.classList.add("attivo");
    btnStorico.classList.remove("attivo");
    viewAperti.style.display = "block";
    viewStorico.style.display = "none";

    btnAperti.onclick = () => {
        btnAperti.classList.add("attivo");
        btnStorico.classList.remove("attivo");
        viewAperti.style.display = "block";
        viewStorico.style.display = "none";
    };

    btnStorico.onclick = () => {
        btnStorico.classList.add("attivo");
        btnAperti.classList.remove("attivo");
        viewAperti.style.display = "none";
        viewStorico.style.display = "block";
    };
});
