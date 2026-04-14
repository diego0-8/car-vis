<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

final class UserModel
{
    public function findWithRoleByUsername(string $username): ?array
    {
        $sql = 'SELECT u.id, u.username, u.password_hash, u.role AS role_name, u.is_active
                FROM users u
                WHERE u.username = :username
                LIMIT 1';
        $stmt = Database::getMasterPdo()->prepare($sql);
        $stmt->execute(['username' => $username]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    public function isAdminRole(string $roleName): bool
    {
        return $roleName === 'admin';
    }

    public function hasFullCampaignAccess(string $roleName): bool
    {
        return $roleName === 'admin' || $roleName === 'gestor';
    }

    public static function homeRouteForRole(string $roleName): string
    {
        return $roleName === 'admin' ? 'admin' : 'gestor';
    }

    /**
     * @return list<string> claves de campaña permitidas (slugs)
     */
    public function listAllowedCampaignKeys(int $userId, string $roleName): array
    {
        /** @var array<string, array<string, mixed>> $map */
        $map = require ROOT_PATH . '/config/campaigns.php';
        $all = array_keys($map);

        if ($this->hasFullCampaignAccess($roleName)) {
            return $all;
        }

        $sql = 'SELECT campaign_key FROM user_campaign_access WHERE user_id = :uid';
        $stmt = Database::getMasterPdo()->prepare($sql);
        $stmt->execute(['uid' => $userId]);
        $allowed = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $key = (string) ($row['campaign_key'] ?? '');
            if ($key !== '' && in_array($key, $all, true)) {
                $allowed[] = $key;
            }
        }
        return $allowed;
    }

    public function canAccessCampaign(int $userId, string $roleName, string $campaignKey): bool
    {
        return in_array($campaignKey, $this->listAllowedCampaignKeys($userId, $roleName), true);
    }
}
