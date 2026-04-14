<?php

declare(strict_types=1);

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', dirname(__DIR__));
}

/**
 * Carga variables desde .env (KEY=VAL por línea).
 */
$envFile = ROOT_PATH . DIRECTORY_SEPARATOR . '.env';
if (is_readable($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v, " \t\"'");
        if ($k !== '') {
            $_ENV[$k] = $v;
            putenv($k . '=' . $v);
        }
    }
}

/**
 * config.php en la raíz del proyecto: parámetros de BD (p. ej. MASTER_DB_NAME=visual1 para login).
 * Se aplica después de .env y sobrescribe claves repetidas.
 */
$localConfigFile = ROOT_PATH . DIRECTORY_SEPARATOR . 'config.php';
if (is_file($localConfigFile)) {
    $local = require $localConfigFile;
    if (is_array($local)) {
        foreach ($local as $k => $v) {
            if (!is_string($k) || $k === '') {
                continue;
            }
            if (is_string($v) || is_int($v) || is_float($v)) {
                $s = (string) $v;
                $_ENV[$k] = $s;
                putenv($k . '=' . $s);
            }
        }
    }
}

function env(string $key, ?string $default = null): ?string
{
    $v = $_ENV[$key] ?? getenv($key);
    if ($v === false || $v === null || $v === '') {
        return $default;
    }
    return (string) $v;
}

$scriptDir = '';
if (isset($_SERVER['SCRIPT_NAME']) && is_string($_SERVER['SCRIPT_NAME']) && $_SERVER['SCRIPT_NAME'] !== '') {
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
}
$envBase = rtrim((string) env('APP_BASE_PATH', ''), '/');
define('APP_BASE_PATH', $envBase !== '' ? $envBase : $scriptDir);

/**
 * Ruta al front controller (index.php) con barra inicial.
 */
function index_script_url(): string
{
    $base = APP_BASE_PATH;
    if ($base === '') {
        return '/index.php';
    }
    return $base . '/index.php';
}

/**
 * URL con parámetro de ruta (?r=...) hacia index.php.
 *
 * @param array<string, scalar> $extra
 */
function route_url(string $r, array $extra = []): string
{
    $q = array_merge(['r' => $r], $extra);
    return index_script_url() . '?' . http_build_query($q);
}

/**
 * URL para assets bajo public/ (ej. assets/css/app.css).
 */
function asset_url(string $path): string
{
    $path = ltrim($path, '/');
    $base = APP_BASE_PATH;
    if ($base === '') {
        return '/' . $path;
    }
    return $base . '/' . $path;
}

$secure = env('SESSION_COOKIE_SECURE', '0') === '1';
ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.cookie_secure', $secure ? '1' : '0');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    $baseDir = ROOT_PATH . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR;
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relative = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, $len));
    $file = $baseDir . $relative . '.php';
    if (is_file($file)) {
        require $file;
    }
});
