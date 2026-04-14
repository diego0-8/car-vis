<?php

declare(strict_types=1);

namespace App\Core;

abstract class Controller
{
    protected function view(string $name, array $data = []): void
    {
        extract($data, EXTR_SKIP);
        $path = ROOT_PATH . '/app/Views/' . $name . '.php';
        if (!is_file($path)) {
            http_response_code(500);
            echo 'Vista no encontrada';
            return;
        }
        require $path;
    }

    /**
     * @param array<string, mixed> $payload
     */
    protected function json(array $payload, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    }

    protected function requireAuth(): void
    {
        if (empty($_SESSION['user_id'])) {
            if ($this->isApiRequest()) {
                $this->json(['ok' => false, 'error' => 'unauthorized'], 401);
                exit;
            }
            header('Location: ' . route_url('login'));
            exit;
        }
    }

    /**
     * @param list<string> $roles nombres de rol permitidos (ej. admin, gestor)
     */
    protected function requireRoles(array $roles): void
    {
        $this->requireAuth();
        $current = (string) ($_SESSION['role_name'] ?? '');
        if (!in_array($current, $roles, true)) {
            if ($this->isApiRequest()) {
                $this->json(['ok' => false, 'error' => 'forbidden'], 403);
                exit;
            }
            $home = \App\Models\UserModel::homeRouteForRole($current !== '' ? $current : 'gestor');
            header('Location: ' . route_url($home));
            exit;
        }
    }

    protected function isApiRequest(): bool
    {
        $r = $_GET['r'] ?? '';
        return str_starts_with((string) $r, 'api/');
    }
}
