<?php

declare(strict_types=1);

/**
 * Entrada desde la raíz del proyecto (ej. http://localhost/Visualizacion/).
 * Redirige al front controller en public/ con la ruta de login.
 */
$script = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
$baseDir = rtrim(str_replace('\\', '/', dirname($script)), '/');

if ($baseDir === '' || $baseDir === '.' || $baseDir === '/') {
    $path = '/public/index.php?r=login';
} else {
    $path = $baseDir . '/public/index.php?r=login';
}

header('Location: ' . $path, true, 302);
exit;
