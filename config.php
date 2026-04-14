<?php

declare(strict_types=1);

/**
 * Configuración local de MySQL para la base maestra (login, usuarios, roles en tabla users).
 * Los valores aquí se aplican después de .env y tienen prioridad si defines las mismas claves.
 *
 * Ajusta usuario/contraseña según tu XAMPP o servidor.
 */
return [
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '3306',
    'DB_USER' => 'root',
    'DB_PASS' => '',
    'MASTER_DB_NAME' => 'visual1',
];
