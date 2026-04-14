<?php

declare(strict_types=1);

namespace App\Core;

use PDO;

final class Database
{
    private static ?PDO $master = null;

    /** @var array<string, PDO> */
    private static array $campaign = [];

    public static function getMasterPdo(): PDO
    {
        if (self::$master === null) {
            $cfg = require ROOT_PATH . '/config/database.php';
            $host = env('DB_HOST', '127.0.0.1');
            $port = env('DB_PORT', '3306');
            $user = env('DB_USER', 'root');
            $pass = env('DB_PASS', '') ?? '';
            $db = env('MASTER_DB_NAME', 'visual_admin_db');
            $charset = $cfg['charset'];
            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $db, $charset);
            self::$master = new PDO($dsn, $user, $pass, $cfg['pdo_options']);
        }
        return self::$master;
    }

    public static function getCampaignPdo(string $campaignKey): PDO
    {
        /** @var array<string, array<string, mixed>> $map */
        $map = require ROOT_PATH . '/config/campaigns.php';
        if (!isset($map[$campaignKey]['database'])) {
            throw new \InvalidArgumentException('invalid_campaign');
        }
        if (!isset(self::$campaign[$campaignKey])) {
            $cfg = require ROOT_PATH . '/config/database.php';
            $host = env('DB_HOST', '127.0.0.1');
            $port = env('DB_PORT', '3306');
            $user = env('DB_USER', 'root');
            $pass = env('DB_PASS', '') ?? '';
            $dbname = (string) $map[$campaignKey]['database'];
            $charset = $cfg['charset'];
            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $dbname, $charset);
            self::$campaign[$campaignKey] = new PDO($dsn, $user, $pass, $cfg['pdo_options']);
        }
        return self::$campaign[$campaignKey];
    }
}
