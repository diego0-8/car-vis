<?php

declare(strict_types=1);

define('ROOT_PATH', dirname(__DIR__));

require ROOT_PATH . '/config/bootstrap.php';

use App\Core\Router;

$router = new Router();
$router->dispatch();
