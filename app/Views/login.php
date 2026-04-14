<?php
declare(strict_types=1);
/** @var string $pageTitle */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <link rel="stylesheet" href="<?= htmlspecialchars(asset_url('assets/css/login.css'), ENT_QUOTES, 'UTF-8') ?>">
</head>
<body class="login-page">
    <main class="login-card">
        <h1>Visual</h1>
        <p class="login-sub">Ingresa tus credenciales</p>
        <form id="login-form" class="login-form" novalidate>
            <label for="username">Usuario</label>
            <input id="username" name="username" type="text" autocomplete="username" required>

            <label for="password">Contraseña</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>

            <p id="login-error" class="login-error" hidden></p>
            <button type="submit" class="btn-primary">Entrar</button>
        </form>
    </main>
    <script>
        (function () {
            const form = document.getElementById('login-form');
            const err = document.getElementById('login-error');
            const indexUrl = <?= json_encode(index_script_url(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;

            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                err.hidden = true;
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                const res = await fetch(indexUrl + '?r=api/login', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.ok) {
                    err.textContent = 'Credenciales incorrectas o usuario inactivo.';
                    err.hidden = false;
                    return;
                }
                const next = data.redirect || indexUrl + '?r=gestor';
                window.location.href = next;
            });
        })();
    </script>
</body>
</html>
