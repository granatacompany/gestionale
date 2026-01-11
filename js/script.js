// script.js svuotato
// la logica è stata divisa in file dedicati:
// - preventivi.js
// - ordini.js
// - riparazioni.js
/* =========================================================
   SIDEBAR - VOCE ATTIVA AUTOMATICA
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* recupera il nome della pagina corrente */
    const paginaCorrente = window.location.pathname.split("/").pop();

    /* recupera tutti i link della sidebar */
    const linkSidebar = document.querySelectorAll(".sidebar a");

    linkSidebar.forEach(link => {

        /* recupera il file collegato al link */
        const href = link.getAttribute("href");

        /* confronto diretto tra pagina aperta e link */
        if (href === paginaCorrente) {
            link.classList.add("active");
        }

    });

});






  