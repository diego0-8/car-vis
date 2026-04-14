<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\CampaignModel;
use App\Models\UserModel;
use DateTimeImmutable;
use InvalidArgumentException;
use Throwable;

final class GestorController extends Controller
{
    private const METRICS_ROLES = ['admin', 'gestor', 'visualizador'];

    /** Zona horaria de negocio para presets y fechas del panel gestor (Colombia). */
    private const REPORT_TIMEZONE = 'America/Bogota';

    public function index(): void
    {
        $this->requireRoles(self::METRICS_ROLES);
        $this->view('gestor', [
            'pageTitle' => 'Vista gestor',
            'username' => (string) ($_SESSION['username'] ?? ''),
            'role' => (string) ($_SESSION['role_name'] ?? ''),
        ]);
    }

    public function apiCampaigns(): void
    {
        $this->requireRoles(self::METRICS_ROLES);
        $userId = (int) $_SESSION['user_id'];
        $role = (string) ($_SESSION['role_name'] ?? '');

        $userModel = new UserModel();
        $keys = $userModel->listAllowedCampaignKeys($userId, $role);

        /** @var array<string, array<string, mixed>> $map */
        $map = require ROOT_PATH . '/config/campaigns.php';
        $list = [];
        foreach ($keys as $key) {
            if (!isset($map[$key])) {
                continue;
            }
            $list[] = [
                'key' => $key,
                'label' => (string) ($map[$key]['label'] ?? $key),
            ];
        }

        $this->json(['ok' => true, 'campaigns' => $list]);
    }

    public function apiStatsAcuerdos(): void
    {
        $this->requireRoles(self::METRICS_ROLES);
        $userId = (int) $_SESSION['user_id'];
        $role = (string) ($_SESSION['role_name'] ?? '');

        $campaign = isset($_GET['campaign']) ? (string) $_GET['campaign'] : '';
        $fromStr = isset($_GET['from']) ? (string) $_GET['from'] : '';
        $toStr = isset($_GET['to']) ? (string) $_GET['to'] : '';
        $group = isset($_GET['group']) ? (string) $_GET['group'] : 'day';

        if ($campaign === '' || $fromStr === '' || $toStr === '') {
            $this->json(['ok' => false, 'error' => 'missing_params'], 422);
            return;
        }

        $userModel = new UserModel();
        if (!$userModel->canAccessCampaign($userId, $role, $campaign)) {
            $this->json(['ok' => false, 'error' => 'forbidden_campaign'], 403);
            return;
        }

        $tz = new \DateTimeZone(self::REPORT_TIMEZONE);
        try {
            $from = new DateTimeImmutable($fromStr . ' 00:00:00', $tz);
            $to = new DateTimeImmutable($toStr . ' 23:59:59', $tz);
        } catch (\Exception) {
            $this->json(['ok' => false, 'error' => 'invalid_date'], 422);
            return;
        }

        if ($from > $to) {
            $this->json(['ok' => false, 'error' => 'invalid_range'], 422);
            return;
        }

        try {
            $model = new CampaignModel();
            $series = $model->countAcuerdosGrouped($campaign, $from, $to, $group);
        } catch (InvalidArgumentException $e) {
            $this->json(['ok' => false, 'error' => $e->getMessage()], 422);
            return;
        } catch (Throwable) {
            $this->json(['ok' => false, 'error' => 'query_failed'], 500);
            return;
        }

        $this->json([
            'ok' => true,
            'granularity' => $group,
            'campaign' => $campaign,
            'series' => $series,
        ]);
    }

    /**
     * Totales de acuerdos por todas las campañas accesibles en un rango (preset o fechas custom).
     */
    public function apiStatsAcuerdosTotals(): void
    {
        $this->requireRoles(self::METRICS_ROLES);
        $userId = (int) $_SESSION['user_id'];
        $role = (string) ($_SESSION['role_name'] ?? '');

        $preset = isset($_GET['preset']) ? (string) $_GET['preset'] : 'today';
        $allowedPresets = ['today', 'week', 'month', 'custom'];
        if (!in_array($preset, $allowedPresets, true)) {
            $this->json(['ok' => false, 'error' => 'invalid_preset'], 422);
            return;
        }

        $fromStr = isset($_GET['from']) ? (string) $_GET['from'] : '';
        $toStr = isset($_GET['to']) ? (string) $_GET['to'] : '';

        try {
            if ($preset === 'custom') {
                if ($fromStr === '' || $toStr === '') {
                    $this->json(['ok' => false, 'error' => 'missing_params'], 422);
                    return;
                }
                $tz = new \DateTimeZone(self::REPORT_TIMEZONE);
                $from = new DateTimeImmutable($fromStr . ' 00:00:00', $tz);
                $to = new DateTimeImmutable($toStr . ' 23:59:59', $tz);
            } else {
                [$from, $to] = $this->dateRangeForPreset($preset);
            }
        } catch (\Exception) {
            $this->json(['ok' => false, 'error' => 'invalid_date'], 422);
            return;
        }

        if ($from > $to) {
            $this->json(['ok' => false, 'error' => 'invalid_range'], 422);
            return;
        }

        $userModel = new UserModel();
        $keys = $userModel->listAllowedCampaignKeys($userId, $role);
        /** @var array<string, array<string, mixed>> $map */
        $map = require ROOT_PATH . '/config/campaigns.php';

        $model = new CampaignModel();
        $totals = [];
        foreach ($keys as $key) {
            if (!isset($map[$key])) {
                continue;
            }
            $label = (string) ($map[$key]['label'] ?? $key);
            try {
                $total = $model->countAcuerdosTotal($key, $from, $to);
                $totals[] = ['key' => $key, 'label' => $label, 'total' => $total, 'error' => null];
            } catch (Throwable) {
                $totals[] = ['key' => $key, 'label' => $label, 'total' => 0, 'error' => 'query_failed'];
            }
        }

        // #region agent log
        $agentLog = ROOT_PATH . '/debug-8909be.log';
        $nowDefault = new DateTimeImmutable('now');
        $nowBogota = new DateTimeImmutable('now', new \DateTimeZone('America/Bogota'));
        $agentPayload = [
            'sessionId' => '8909be',
            'hypothesisId' => 'H1',
            'location' => 'GestorController.php:apiStatsAcuerdosTotals',
            'message' => 'date range vs php tz and bogota',
            'timestamp' => (int) round(microtime(true) * 1000),
            'data' => [
                'php_timezone' => date_default_timezone_get(),
                'preset' => $preset,
                'range_from' => $from->format('Y-m-d'),
                'range_to' => $to->format('Y-m-d'),
                'now_default_tz_iso' => $nowDefault->format('c'),
                'bogota_calendar_date' => $nowBogota->format('Y-m-d'),
                'bogota_time' => $nowBogota->format('H:i:s T'),
                'runId' => 'post-fix',
            ],
        ];
        file_put_contents($agentLog, json_encode($agentPayload, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
        // #endregion agent log

        $this->json([
            'ok' => true,
            'preset' => $preset,
            'from' => $from->format('Y-m-d'),
            'to' => $to->format('Y-m-d'),
            'totals' => $totals,
        ]);
    }

    /**
     * @return array{0: DateTimeImmutable, 1: DateTimeImmutable}
     */
    private function dateRangeForPreset(string $preset): array
    {
        $tz = new \DateTimeZone(self::REPORT_TIMEZONE);
        $today = (new DateTimeImmutable('now', $tz))->setTime(0, 0, 0);

        return match ($preset) {
            'today' => [
                $today,
                $today->setTime(23, 59, 59),
            ],
            'week' => $this->isoWeekBounds($today),
            'month' => [
                $today->modify('first day of this month')->setTime(0, 0, 0),
                $today->modify('last day of this month')->setTime(23, 59, 59),
            ],
            default => throw new InvalidArgumentException('invalid_preset'),
        };
    }

    /**
     * @return array{0: DateTimeImmutable, 1: DateTimeImmutable}
     */
    private function isoWeekBounds(DateTimeImmutable $day): array
    {
        $n = (int) $day->format('N');
        $monday = $day->modify('-' . ($n - 1) . ' days')->setTime(0, 0, 0);
        $sunday = $monday->modify('+6 days')->setTime(23, 59, 59);

        return [$monday, $sunday];
    }
}
