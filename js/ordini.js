document.addEventListener("DOMContentLoaded", renderOrdini);

function renderOrdini() {

    const ordini = JSON.parse(localStorage.getItem("ordini")) || [];
    const tbody = document.querySelector("#tabOrdini tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    ordini.forEach((o, index) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${o.id}</td>
            <td>${o.preventivoId}</td>
            <td>${o.descrizione}</td>
            <td>
                ${o.link 
                    ? `<a href="${o.link}" target="_blank">Apri</a>` 
                    : "-"
                }
            </td>
            <td style="text-align:center">
                <input type="checkbox" ${o.arrivato ? "checked" : ""}>
            </td>
        `;

        const checkbox = tr.querySelector("input");

        checkbox.onchange = () => {
            o.arrivato = checkbox.checked;
            localStorage.setItem("ordini", JSON.stringify(ordini));
            aggiornaRiparazioniDaOrdini();
        };

        tbody.appendChild(tr);
    });
}

function aggiornaRiparazioniDaOrdini() {

    const ordini = JSON.parse(localStorage.getItem("ordini")) || [];
    const riparazioni = JSON.parse(localStorage.getItem("riparazioni")) || [];

    riparazioni.forEach(r => {

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
