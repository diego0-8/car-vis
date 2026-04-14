<?php

declare(strict_types=1);

/**
 * Uso: php scripts/create_admin.php <usuario> <password> [admin|gestor|visualizador]
 * Crea o actualiza usuario en visual_admin_db (roles como ENUM en users.role).
 */
if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Solo CLI.\n");
    exit(1);
}

if ($argc < 3) {
    fwrite(STDERR, "Uso: php scripts/create_admin.php <usuario> <password> [admin|gestor|visualizador]\n");
    exit(1);
}

define('ROOT_PATH', dirname(__DIR__));
require ROOT_PATH . '/config/bootstrap.php';

$username = (string) $argv[1];
$password = (string) $argv[2];
$roleName = $argc >= 4 ? (string) $argv[3] : 'admin';
if (!in_array($roleName, ['admin', 'gestor', 'visualizador'], true)) {
    fwrite(STDERR, "Rol inválido. Use admin, gestor o visualizador.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
if ($hash === false) {
    fwrite(STDERR, "No se pudo generar el hash.\n");
    exit(1);
}

$pdo = App\Core\Database::getMasterPdo();
$sql = 'INSERT INTO users (username, password_hash, role, is_active)
        VALUES (:u, :p, :r, :active)
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), is_active = VALUES(is_active)';
$stmt = $pdo->prepare($sql);
$stmt->execute([
    'u' => $username,
    'p' => $hash,
    'r' => $roleName,
    'active' => 'activo',
]);
echo "Usuario listo: {$username} (rol: {$roleName})\n";
