<?php
// enviar.php — Campo de Girasoles
// Procesa el formulario de contacto y envia el correo a campodegirasoles70@gmail.com
// Medidas anti-spam: honeypot, rate-limit por IP, token CSRF con expiracion.

session_start();

$destino = "campodegirasoles70@gmail.com";

// ---------------------------------------------------------------
// 1. RATE-LIMIT por IP (max 3 envios cada 10 minutos)
// ---------------------------------------------------------------
$ip = $_SERVER["HTTP_CLIENT_IP"] ?? $_SERVER["HTTP_X_FORWARDED_FOR"] ?? $_SERVER["REMOTE_ADDR"] ?? "0.0.0.0";
$ip = explode(",", $ip)[0];
$limitKey = "rl_" . md5($ip);
$limitWindow = 600;   // 10 minutos
$limitMax = 3;

if (!isset($_SESSION[$limitKey])) {
    $_SESSION[$limitKey] = ["time" => time(), "count" => 0];
}
$rl = &$_SESSION[$limitKey];
if (time() - $rl["time"] > $limitWindow) {
    $rl = ["time" => time(), "count" => 0];
}
$rl["count"]++;
if ($rl["count"] > $limitMax) {
    http_response_code(429);
    header("Location: /contacto.html?error=rate");
    exit;
}

// ---------------------------------------------------------------
// 2. TOKEN CSRF con expiracion (15 minutos)
//    Se genera en contacto.html via PHP-session o JS; aqui se verifica.
// ---------------------------------------------------------------
$csrf = $_POST["csrf_token"] ?? "";
$csrfSess = $_SESSION["csrf_token"] ?? "";
$csrfExp = $_SESSION["csrf_exp"] ?? 0;

// Si no hay token en sesion, o no coincide, o expiro -> rechazar
if (empty($csrf) || empty($csrfSess) || !hash_equals($csrfSess, $csrf) || time() > $csrfExp) {
    header("Location: /contacto.html?error=csrf");
    exit;
}
// Token de un solo uso: invalidar tras consumir
unset($_SESSION["csrf_token"], $_SESSION["csrf_exp"]);

// ---------------------------------------------------------------
// 3. Honeypot: si se lleno el campo oculto, es un bot
// ---------------------------------------------------------------
if (!empty($_POST["bot-field"])) {
    header("Location: /contacto.html");
    exit;
}

// ---------------------------------------------------------------
// 4. Sanear entradas
// ---------------------------------------------------------------
$nombre    = trim(htmlspecialchars($_POST["nombre"] ?? "", ENT_QUOTES, "UTF-8"));
$email     = trim(filter_var($_POST["email"] ?? "", FILTER_SANITIZE_EMAIL));
$org       = trim(htmlspecialchars($_POST["organizacion"] ?? "", ENT_QUOTES, "UTF-8"));
$tipoApoyo = trim(htmlspecialchars($_POST["tipo-apoyo"] ?? "", ENT_QUOTES, "UTF-8"));
$mensaje   = trim(htmlspecialchars($_POST["mensaje"] ?? "", ENT_QUOTES, "UTF-8"));

// ---------------------------------------------------------------
// 5. Validacion basica
// ---------------------------------------------------------------
if ($nombre === "" || $email === "" || $mensaje === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header("Location: /contacto.html?error=1");
    exit;
}

// ---------------------------------------------------------------
// 6. Construir el cuerpo del correo
// ---------------------------------------------------------------
$cuerpo = "Nuevo mensaje desde la web de Campo de Girasoles\r\n";
$cuerpo .= "=============================================\r\n\r\n";
$cuerpo .= "Nombre:     $nombre\r\n";
$cuerpo .= "Email:      $email\r\n";
$cuerpo .= "Org:        $org\r\n";
$cuerpo .= "Tipo apoyo: $tipoApoyo\r\n";
$cuerpo .= "IP origen:  $ip\r\n\r\n";
$cuerpo .= "Mensaje:\r\n$mensaje\r\n";

// ---------------------------------------------------------------
// 7. Cabeceras: From usa el destinatario del propio dominio
//    (evita que mail() rechace por SPF/DMARC); Reply-To llega al
//    remitente real. Si web@campogirasoles.org no existe en el
//    hosting, cambialo por el buzon que si exista.
// ---------------------------------------------------------------
$asunto = "Nuevo mensaje — Campo de Girasoles";
$fromAddr = "web@campogirasoles.org";
// Si el dominio no resuelve, fallback al destino como From
if (!checkdnsrr(explode("@", $destino)[1] ?? "", "MX")) {
    $fromAddr = $destino;
}
$cabeceras = "From: Campo de Girasoles <" . $fromAddr . ">\r\n";
$cabeceras .= "Reply-To: " . $email . "\r\n";
$achanza = "-f" . $fromAddr; // 5to parametro de mail() para envelope sender
$cabeceras .= "Content-Type: text/plain; charset=UTF-8\r\n";

// ---------------------------------------------------------------
// 8. Enviar
// ---------------------------------------------------------------
$ok = mail($destino, $asunto, $cuerpo, $cabeceras, $achanza);

if ($ok) {
    header("Location: /gracias.html");
} else {
    header("Location: /contacto.html?error=1");
}
exit;
