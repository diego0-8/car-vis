<?php

declare(strict_types=1);

namespace App\Core;

use App\Controllers\AdminController;
use App\Controllers\GestorController;
use App\Controllers\UserController;

final class Router
{
    public function dispatch(): void
    {
        $route = isset($_GET['r']) ? (string) $_GET['r'] : '';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        match (true) {
            $route === '' || $route === 'login' => (new UserController())->showLogin(),
            $route === 'dashboard' && $method === 'GET' => (new UserController())->redirectDashboard(),
            $route === 'gestor' && $method === 'GET' => (new GestorController())->index(),
            $route === 'admin' && $method === 'GET' => (new AdminController())->index(),
            $route === 'api/login' && $method === 'POST' => (new UserController())->apiLogin(),
            $route === 'api/logout' && $method === 'POST' => (new UserController())->apiLogout(),
            $route === 'api/campaigns' && $method === 'GET' => (new GestorController())->apiCampaigns(),
            $route === 'api/stats/acuerdos' && $method === 'GET' => (new GestorController())->apiStatsAcuerdos(),
            $route === 'api/stats/acuerdos-totals' && $method === 'GET' => (new GestorController())->apiStatsAcuerdosTotals(),
            $route === 'api/stats/acuerdos-month-daily' && $method === 'GET' => (new GestorController())->apiStatsAcuerdosMonthDaily(),
            $route === 'api/admin/users' && $method === 'GET' => (new AdminController())->apiListUsers(),
            $route === 'api/admin/users' && $method === 'POST' => (new AdminController())->apiCreateUser(),
            $route === 'api/admin/user' && $method === 'PATCH' => (new AdminController())->apiPatchUser(),
            $route === 'api/admin/user-campaigns' && $method === 'PUT' => (new AdminController())->apiPutUserCampaigns(),
            default => $this->notFound(),
        };
    }

    private function notFound(): void
    {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not Found';
    }
}
