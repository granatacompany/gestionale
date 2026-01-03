/* =========================================================
   LOGIN
   ========================================================= */

function login() {
    let user = document.getElementById("user").value;
    let pass = document.getElementById("pass").value;

    if (user === "admin" && pass === "1234") {
        window.location.href = "dashboard.html";
    } else {
        document.getElementById("error").innerText = "Credenziali errate!";
    }
}