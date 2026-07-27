<?php
// csrf.php — Campo de Girasoles
// Genera (o reutiliza) un token CSRF en la sesion y lo devuelve como JSON.
// Consumido por JS en contacto.html via fetch() antes del submit.

session_start();

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: null"); // mismo origen
header("Cache-Control: no-store");

if (empty($_SESSION["csrf_token"]) || time() > ($_SESSION["csrf_exp"] ?? 0)) {
    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
    $_SESSION["csrf_exp"] = time() + 900; // 15 minutos
}

echo json_encode([
    "token" => $_SESSION["csrf_token"],
    "exp"   => $_SESSION["csrf_exp"]
]);
