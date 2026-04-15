<?php
declare(strict_types=1);
/** @var string $pageTitle */
/** @var string $username */
/** @var string $role */
$jsPanel = ROOT_PATH . '/public/assets/js/gestor_panel.js';
$jsV = is_file($jsPanel) ? (string) filemtime($jsPanel) : (string) time();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <link rel="stylesheet" href="<?= htmlspecialchars(asset_url('assets/css/gestor.css'), ENT_QUOTES, 'UTF-8') ?>">
</head>
<body class="gestor-page">
    <header class="dash-header">
        <div class="dash-brand">
            <span class="dash-title">Visual</span>
            <span class="dash-sub">Vista gestor · Acuerdos por campaña</span>
        </div>
        <div class="dash-user">
            <?php if (($_SESSION['role_name'] ?? '') === 'admin') : ?>
                <a class="dash-nav-link" href="<?= htmlspecialchars(route_url('admin'), ENT_QUOTES, 'UTF-8') ?>">Administración</a>
            <?php endif; ?>
            <span class="dash-user-name"><?= htmlspecialchars($username, ENT_QUOTES, 'UTF-8') ?></span>
            <span class="dash-user-role"><?= htmlspecialchars($role, ENT_QUOTES, 'UTF-8') ?></span>
            <button type="button" id="btn-logout" class="btn-ghost">Salir</button>
        </div>
    </header>

    <section class="gestor-filters" aria-label="Rango de fechas">
        <div class="period-tabs" role="tablist">
            <button type="button" class="period-tab is-active" data-preset="today" role="tab" aria-selected="true">Hoy</button>
            <button type="button" class="period-tab" data-preset="week" role="tab" aria-selected="false">Semana</button>
            <button type="button" class="period-tab" data-preset="month" role="tab" aria-selected="false">Mes</button>
            <button type="button" class="period-tab" data-preset="custom" role="tab" aria-selected="false">Personalizado</button>
        </div>
        <div id="custom-range" class="custom-range" hidden>
            <label for="filter-from">Desde</label>
            <input type="date" id="filter-from" autocomplete="off">
            <label for="filter-to">Hasta</label>
            <input type="date" id="filter-to" autocomplete="off">
            <button type="button" id="btn-apply-custom" class="btn-primary btn-inline">Aplicar</button>
        </div>
        <p id="range-summary" class="range-summary" aria-live="polite"></p>
    </section>

    <p id="dash-message" class="dash-message" hidden></p>

    <main class="gestor-main">
        <div id="campaign-grid" class="campaign-grid" aria-live="polite"></div>
    </main>

    <section class="charts-section charts-section--full" aria-label="Gráficas">
        <div class="charts-shell">
            <div class="charts-grid">
                <article class="chart-card">
                    <h2 class="chart-title">Acuerdos por día (mes)</h2>
                    <p class="chart-sub" id="chart-month-range"></p>
                    <div id="chart-month-scroll" class="chart-scroll" aria-label="Scroll gráfico mensual">
                        <canvas id="chart-month-daily" width="900" height="320"></canvas>
                    </div>
                </article>

                <article class="chart-card">
                    <h2 class="chart-title">Distribución por campaña</h2>
                    <p class="chart-sub" id="chart-pie-range"></p>
                    <div class="pie-wrap">
                        <canvas id="chart-pie" width="520" height="320"></canvas>
                        <div id="chart-pie-legend" class="pie-legend" aria-label="Leyenda"></div>
                    </div>
                </article>
            </div>
        </div>
    </section>

    <script>
        window.__VISUAL_INDEX__ = <?= json_encode(index_script_url(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
        window.__VISUAL_NOTIFICATION_MP3__ = <?= json_encode(asset_url('assets/sounds/notificacion.mp3'), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>
    <!-- Auto-actualización de totales cada 30 s: ver gestor_panel.js (actualizarDashboard + setInterval) -->
    <script src="<?= htmlspecialchars(asset_url('assets/js/gestor_panel.js?v=' . rawurlencode($jsV)), ENT_QUOTES, 'UTF-8') ?>"></script>
</body>
</html>
