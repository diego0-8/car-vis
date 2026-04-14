<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\AdminModel;
use App\Models\RoleModel;
use Throwable;

final class AdminController extends Controller
{
    private const ADMIN = ['admin'];

    public function index(): void
    {
        $this->requireRoles(self::ADMIN);
        $this->view('admin_dashboard', [
            'pageTitle' => 'Administración',
            'username' => (string) ($_SESSION['username'] ?? ''),
            'role' => (string) ($_SESSION['role_name'] ?? ''),
        ]);
    }

    public function apiListUsers(): void
    {
        $this->requireRoles(self::ADMIN);
        $admin = new AdminModel();
        $roles = new RoleModel();
        $this->json([
            'ok' => true,
            'users' => $admin->listUsersWithCampaigns(),
            'roles' => $roles->listRoles(),
            'campaigns' => $this->campaignOptions(),
        ]);
    }

    public function apiCreateUser(): void
    {
        $this->requireRoles(self::ADMIN);
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->json(['ok' => false, 'error' => 'invalid_json'], 400);
            return;
        }
        $username = isset($data['username']) ? trim((string) $data['username']) : '';
        $password = isset($data['password']) ? (string) $data['password'] : '';
        $roleName = isset($data['role']) ? trim((string) $data['role']) : '';

        if ($username === '' || $password === '' || $roleName === '') {
            $this->json(['ok' => false, 'error' => 'missing_fields'], 422);
            return;
        }

        $admin = new AdminModel();
        if ($admin->usernameExists($username)) {
            $this->json(['ok' => false, 'error' => 'username_taken'], 409);
            return;
        }
        if (!$admin->isValidRole($roleName)) {
            $this->json(['ok' => false, 'error' => 'invalid_role'], 422);
            return;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            $this->json(['ok' => false, 'error' => 'hash_failed'], 500);
            return;
        }

        try {
            $newId = $admin->createUser($username, $hash, $roleName, 'activo');
            if ($roleName === 'visualizador' && isset($data['campaign_keys']) && is_array($data['campaign_keys'])) {
                $keys = $this->filterCampaignKeys($data['campaign_keys']);
                $admin->replaceUserCampaignAccess($newId, $keys);
            }
        } catch (Throwable) {
            $this->json(['ok' => false, 'error' => 'create_failed'], 500);
            return;
        }

        $this->json(['ok' => true, 'id' => $newId]);
    }

    public function apiPatchUser(): void
    {
        $this->requireRoles(self::ADMIN);
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if ($id <= 0) {
            $this->json(['ok' => false, 'error' => 'missing_id'], 422);
            return;
        }

        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->json(['ok' => false, 'error' => 'invalid_json'], 400);
            return;
        }

        $admin = new AdminModel();
        $isActiveEnum = null;
        if (array_key_exists('is_active', $data)) {
            $isActiveEnum = (int) $data['is_active'] ? 'activo' : 'inactivo';
        }
        $roleStr = null;
        if (isset($data['role'])) {
            $roleStr = trim((string) $data['role']);
            if (!$admin->isValidRole($roleStr)) {
                $this->json(['ok' => false, 'error' => 'invalid_role'], 422);
                return;
            }
        }

        if ($isActiveEnum === null && $roleStr === null) {
            $this->json(['ok' => false, 'error' => 'no_changes'], 422);
            return;
        }

        try {
            $admin->updateUser($id, $isActiveEnum, $roleStr);
            if ($roleStr !== null) {
                $newRole = $admin->getUserRoleName($id);
                if ($newRole !== null && $newRole !== 'visualizador') {
                    $admin->replaceUserCampaignAccess($id, []);
                }
            }
        } catch (Throwable) {
            $this->json(['ok' => false, 'error' => 'update_failed'], 500);
            return;
        }

        $this->json(['ok' => true]);
    }

    public function apiPutUserCampaigns(): void
    {
        $this->requireRoles(self::ADMIN);
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->json(['ok' => false, 'error' => 'invalid_json'], 400);
            return;
        }
        $userId = isset($data['user_id']) ? (int) $data['user_id'] : 0;
        if ($userId <= 0) {
            $this->json(['ok' => false, 'error' => 'missing_user_id'], 422);
            return;
        }
        $keysIn = isset($data['campaign_keys']) && is_array($data['campaign_keys']) ? $data['campaign_keys'] : [];

        $admin = new AdminModel();
        $roleName = $admin->getUserRoleName($userId);
        if ($roleName !== 'visualizador') {
            $this->json(['ok' => false, 'error' => 'not_visualizador'], 422);
            return;
        }

        $keys = $this->filterCampaignKeys($keysIn);
        try {
            $admin->replaceUserCampaignAccess($userId, $keys);
        } catch (Throwable) {
            $this->json(['ok' => false, 'error' => 'save_failed'], 500);
            return;
        }

        $this->json(['ok' => true]);
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    private function campaignOptions(): array
    {
        /** @var array<string, array<string, mixed>> $map */
        $map = require ROOT_PATH . '/config/campaigns.php';
        $opts = [];
        foreach ($map as $k => $v) {
            $opts[] = [
                'key' => $k,
                'label' => (string) ($v['label'] ?? $k),
            ];
        }
        return $opts;
    }

    /**
     * @param list<mixed> $keysIn
     * @return list<string>
     */
    private function filterCampaignKeys(array $keysIn): array
    {
        /** @var array<string, array<string, mixed>> $map */
        $map = require ROOT_PATH . '/config/campaigns.php';
        $allowed = array_keys($map);
        $out = [];
        foreach ($keysIn as $k) {
            $s = is_string($k) ? trim($k) : '';
            if ($s !== '' && in_array($s, $allowed, true)) {
                $out[] = $s;
            }
        }
        return array_values(array_unique($out));
    }
}
