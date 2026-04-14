<?php
declare(strict_types=1);
/** @var string $pageTitle */
/** @var string $username */
/** @var string $role */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <link rel="stylesheet" href="<?= htmlspecialchars(asset_url('assets/css/admin_dashboard.css'), ENT_QUOTES, 'UTF-8') ?>">
</head>
<body class="admin-page">
    <header class="admin-header">
        <div class="admin-brand">
            <span class="admin-title">Visual</span>
            <span class="admin-sub">Panel de administración</span>
        </div>
        <div class="admin-user">
            <a class="admin-nav-link" href="<?= htmlspecialchars(route_url('gestor'), ENT_QUOTES, 'UTF-8') ?>">Ir a métricas</a>
            <span class="admin-user-name"><?= htmlspecialchars($username, ENT_QUOTES, 'UTF-8') ?></span>
            <span class="admin-user-role"><?= htmlspecialchars($role, ENT_QUOTES, 'UTF-8') ?></span>
            <button type="button" id="btn-logout" class="btn-ghost">Salir</button>
        </div>
    </header>

    <main class="admin-main">
        <section class="admin-card">
            <h2>Nuevo usuario</h2>
            <form id="form-create-user" class="admin-form">
                <div class="form-row">
                    <label for="new-username">Usuario</label>
                    <input id="new-username" name="username" type="text" required autocomplete="off">
                </div>
                <div class="form-row">
                    <label for="new-password">Contraseña</label>
                    <input id="new-password" name="password" type="password" required autocomplete="new-password">
                </div>
                <div class="form-row">
                    <label for="new-role">Rol</label>
                    <select id="new-role" name="role"></select>
                </div>
                <fieldset id="new-campaigns-field" class="campaign-fieldset" hidden>
                    <legend>Campañas (visualizador)</legend>
                    <div id="new-campaign-checkboxes" class="checkbox-grid"></div>
                </fieldset>
                <button type="submit" class="btn-primary">Crear</button>
                <p id="form-create-msg" class="form-msg" hidden></p>
            </form>
        </section>

        <section class="admin-card admin-card-wide">
            <h2>Usuarios</h2>
            <p id="users-loading" class="muted">Cargando…</p>
            <div id="users-table-wrap" class="table-wrap" hidden>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th>Activo</th>
                            <th>Campañas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="users-tbody"></tbody>
                </table>
            </div>
            <p id="users-error" class="form-msg error" hidden></p>
        </section>
    </main>

    <div id="modal-campaigns" class="modal" hidden>
        <div class="modal-backdrop" data-close="1"></div>
        <div class="modal-dialog">
            <h3 id="modal-campaigns-title">Campañas del usuario</h3>
            <div id="modal-campaign-checkboxes" class="checkbox-grid"></div>
            <div class="modal-actions">
                <button type="button" class="btn-ghost" data-close="1">Cancelar</button>
                <button type="button" id="modal-save-campaigns" class="btn-primary">Guardar</button>
            </div>
            <p id="modal-msg" class="form-msg" hidden></p>
        </div>
    </div>

    <script>
        window.__VISUAL_INDEX__ = <?= json_encode(index_script_url(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>
    <script src="<?= htmlspecialchars(asset_url('assets/js/admin_dashboard.js'), ENT_QUOTES, 'UTF-8') ?>"></script>
</body>
</html>
