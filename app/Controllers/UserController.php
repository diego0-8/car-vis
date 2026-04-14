<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\UserModel;

final class UserController extends Controller
{
    public function redirectDashboard(): void
    {
        $this->requireAuth();
        $role = (string) ($_SESSION['role_name'] ?? '');
        $home = UserModel::homeRouteForRole($role !== '' ? $role : 'gestor');
        header('Location: ' . route_url($home), true, 302);
        exit;
    }

    public function showLogin(): void
    {
        if (!empty($_SESSION['user_id'])) {
            $role = (string) ($_SESSION['role_name'] ?? '');
            header('Location: ' . route_url(UserModel::homeRouteForRole($role !== '' ? $role : 'gestor')));
            return;
        }
        $this->view('login', [
            'pageTitle' => 'Acceso',
        ]);
    }

    public function apiLogin(): void
    {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->json(['ok' => false, 'error' => 'invalid_json'], 400);
            return;
        }
        $username = isset($data['username']) ? trim((string) $data['username']) : '';
        $password = isset($data['password']) ? (string) $data['password'] : '';

        if ($username === '' || $password === '') {
            $this->json(['ok' => false, 'error' => 'missing_credentials'], 422);
            return;
        }

        $model = new UserModel();
        $user = $model->findWithRoleByUsername($username);
        if ($user === null || (string) ($user['is_active'] ?? '') !== 'activo') {
            $this->json(['ok' => false, 'error' => 'invalid_credentials'], 401);
            return;
        }
        if (!password_verify($password, (string) $user['password_hash'])) {
            $this->json(['ok' => false, 'error' => 'invalid_credentials'], 401);
            return;
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['username'] = (string) $user['username'];
        $_SESSION['role_name'] = (string) $user['role_name'];

        $roleName = (string) $user['role_name'];
        $redirect = route_url(UserModel::homeRouteForRole($roleName));

        $this->json([
            'ok' => true,
            'redirect' => $redirect,
            'user' => [
                'id' => (int) $user['id'],
                'username' => (string) $user['username'],
                'role' => $roleName,
            ],
        ]);
    }

    public function apiLogout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], (bool) $p['secure'], (bool) $p['httponly']);
        }
        session_destroy();
        $this->json(['ok' => true]);
    }
}
