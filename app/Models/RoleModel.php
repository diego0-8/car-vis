<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Los roles están definidos como ENUM en users.role; este listado alimenta el panel admin.
 */
final class RoleModel
{
    /**
     * @return list<array{id: int, name: string}>
     */
    public function listRoles(): array
    {
        return [
            ['id' => 1, 'name' => 'admin'],
            ['id' => 2, 'name' => 'gestor'],
            ['id' => 3, 'name' => 'visualizador'],
        ];
    }
}
