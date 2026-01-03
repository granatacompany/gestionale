/* =========================================================
   CLIENTI
   ========================================================= */
/* =========================================================
   VARIABILI GLOBALI
   ========================================================= */

let rigaSelezionata = null;          /* riga cliente selezionata */
let clienti = [];                   /* array clienti */


function generaCodiceCliente(nome, cognome, telefono) {
    return (
        nome.substring(0, 3).toUpperCase() +
        cognome.substring(0, 3).toUpperCase() +
        telefono.slice(-3)
    );
}

function telefonoDuplicato(telefono) {
    return clienti.some(c => c.telefono === telefono);
}

function salvaClienti() {
    localStorage.setItem("clienti", JSON.stringify(clienti));
}
/* =========================================================
   AVVIO PAGINA CLIENTI
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    caricaClienti();
});

function caricaClienti() {

    let dati = localStorage.getItem("clienti");
    if (!dati) return;

    clienti = JSON.parse(dati);

    let tbody = document.querySelector("#tabClienti tbody");
    tbody.innerHTML = "";

    clienti.forEach(c => {
        let r = tbody.insertRow();
        r.onclick = () => selezionaRiga(r);

        r.insertCell(0).innerText = c.codice;
        r.insertCell(1).innerText = c.nome;
        r.insertCell(2).innerText = c.cognome;
        r.insertCell(3).innerText = c.nascita;
        r.insertCell(4).innerText = c.telefono;
        r.insertCell(5).innerText = c.indirizzo;
        r.insertCell(6).innerText = c.citta;
        r.insertCell(7).innerText = c.punti;
        r.insertCell(8).innerText = c.note || "";
    });
}

/* =========================================================
   SELEZIONE RIGA CLIENTE
   ========================================================= */

function selezionaRiga(riga) {
    /* gestisce il click su una riga cliente */
     
    document.getElementById("btnElimina").style.display = "inline-block"; /* mostra il pulsante Elimina */

document.getElementById("btnStampa").style.display = "inline-block"; /* mostra il pulsante Stampa tessera */

    document.getElementById("btnCliente").innerText = "Modifica cliente";
    document.getElementById("btnElimina").disabled = false;
    document.getElementById("btnStampa").disabled = false;
    /* abilita elimina e stampa */

    if (rigaSelezionata !== null) {
        rigaSelezionata.classList.remove("selected");
    }

    rigaSelezionata = riga;
    riga.classList.add("selected");

    /* carica i dati negli input (attenzione agli indici!) */
    document.getElementById("nome").value = riga.cells[1].innerText;
    document.getElementById("cognome").value = riga.cells[2].innerText;
    document.getElementById("nascita").value = riga.cells[3].innerText;
    document.getElementById("telefono").value = riga.cells[4].innerText;
    document.getElementById("indirizzo").value = riga.cells[5].innerText;
    document.getElementById("citta").value = riga.cells[6].innerText;
    document.getElementById("note").value = riga.cells[8].innerText;

}


/* =========================================================
   INVIO → CAMPO SUCCESSIVO
   ========================================================= */

function nextField(event, nextId) {
    if (event.key === "Enter") {
        document.getElementById(nextId).focus();
    }
}

function salvaCliente() {
    if (rigaSelezionata === null) registraCliente();
    else modificaCliente();
}

function registraCliente() {

    let campi = ["nome","cognome","nascita","telefono","indirizzo","citta"];

    for (let id of campi) {
        if (document.getElementById(id).value.trim() === "") {
            alert("Compila il campo: " + id);
            document.getElementById(id).focus();
            return;
        }
    }

    let telefono = document.getElementById("telefono").value;
    if (telefonoDuplicato(telefono)) {
        alert("Telefono già presente");
        return;
    }

    clienti.push({
        codice: generaCodiceCliente(
            document.getElementById("nome").value,
            document.getElementById("cognome").value,
            telefono
        ),
        nome: document.getElementById("nome").value,
        cognome: document.getElementById("cognome").value,
        nascita: document.getElementById("nascita").value,
        telefono: telefono,
        indirizzo: document.getElementById("indirizzo").value,
        citta: document.getElementById("citta").value,
        punti: 0,
        note: document.getElementById("note").value
    });

    salvaClienti();
    caricaClienti();
    resetFormCliente();
}

function modificaCliente() {

    let index = rigaSelezionata.rowIndex - 1;

    clienti[index].nome = document.getElementById("nome").value;
    clienti[index].cognome = document.getElementById("cognome").value;
    clienti[index].nascita = document.getElementById("nascita").value;
    clienti[index].telefono = document.getElementById("telefono").value;
    clienti[index].indirizzo = document.getElementById("indirizzo").value;
    clienti[index].citta = document.getElementById("citta").value;
    clienti[index].note = document.getElementById("note").value;

    salvaClienti();
    caricaClienti();
    resetFormCliente();
}
/* =========================================================
   ELIMINA CLIENTE
   ========================================================= */
function eliminaCliente() {
    if (!rigaSelezionata) return;
    if (!confirm("Vuoi eliminare questo cliente?")) return;

    clienti.splice(rigaSelezionata.rowIndex - 1, 1);
    salvaClienti();
    caricaClienti();
    resetFormCliente();
}

function resetFormCliente() {

    ["nome","cognome","nascita","telefono","indirizzo","citta","note"]
        .forEach(id => document.getElementById(id).value = "");

    if (rigaSelezionata) rigaSelezionata.classList.remove("selected");
    rigaSelezionata = null;

    document.getElementById("btnCliente").innerText = "Registra cliente";
    document.getElementById("btnElimina").style.display = "none";
    document.getElementById("btnStampa").style.display = "none";
    document.getElementById("nome").focus();
}

function filtraClienti() {
    let filtro = document.getElementById("searchClienti").value.toLowerCase();
    document.querySelectorAll("#tabClienti tbody tr").forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(filtro) ? "" : "none";
    });
}
/* =========================================================
   STAMPA TESSERA CLIENTE (SOLO BARCODE)
   ========================================================= */

function stampaTessera() {
    /* stampa SOLO il codice a barre quando l'immagine è pronta */

    if (rigaSelezionata === null) {
        alert("Seleziona un cliente");
        return;
    }

    let codiceCliente = rigaSelezionata.cells[0].innerText;
    /* recupera il codice cliente */

    let finestra = window.open("", "_blank");

    finestra.document.write(`
        <html>
        <head>
            <title>Stampa Tessera Cliente</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    text-align: center;
                }
                img {
                    width: 220px;   /* dimensione ideale DYMO */
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <img 
              id="barcode"
              src="https://barcode.tec-it.com/barcode.ashx?data=${codiceCliente}&code=Code128"
              alt="Codice a barre cliente"
            >

            <script>
                const img = document.getElementById('barcode');

                img.onload = function () {
                    window.print(); 
                    /* stampa SOLO quando il barcode è caricato */
                };
            </script>
        </body>
        </html>
    `);

    finestra.document.close();
}

