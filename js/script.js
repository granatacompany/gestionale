// script.js
/* =========================================================
   AUTH GUARD + SIDEBAR ACTIVE
   ========================================================= */

const AUTH_KEY = "spazioexe_auth";

function paginaCorrente() {
  const p = window.location.pathname.split("/").pop();
  return p || "index.html";
}

function isLoggato() {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

document.addEventListener("DOMContentLoaded", () => {
  const pagina = paginaCorrente();

  // ✅ Guard: se non sei loggato, nessuna pagina interna è accessibile
  if (pagina !== "index.html" && !isLoggato()) {
    window.location.href = "index.html";
    return;
  }

  // ✅ Sidebar: voce attiva (solo se la sidebar esiste)
  const linkSidebar = document.querySelectorAll(".sidebar a");
  if (!linkSidebar.length) return;

  linkSidebar.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === pagina) link.classList.add("active");
  });
});





  