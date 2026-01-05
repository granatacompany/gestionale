/* =========================================================
   LOGIN
   ========================================================= */

function login() {
    
    let pass = document.getElementById("pass").value;

    if (pass === "Ismael") {
        window.location.href = "dashboard.html";
    } else {
        document.getElementById("error").innerText = "Credenziali errate!";
    }
}