<?php
session_start();

// --- تنظیمات امنیتی و کلیدها (دقیقاً مشابه Cron) ---
define('ADMIN_PASSWORD', 'admin123'); // رمز ورود به پنل
define('DB_FILE', 'users.json');

define('VAPID_PUBLIC_KEY', 'BOynOrGcnYCIJ1cdi-9p22dd8zV0n-eC_oN4bKqZ6y8mG7r-X6s1tC3eO9p4qL1zT8rV2n0mJ5kL8xP3qR6w');
define('VAPID_PRIVATE_KEY', 'q9p8o7n6m5l4k3j2i1h0g9f8e7d6c5b4a3Z2Y1X0W'); 
define('VAPID_SUBJECT', 'mailto:admin@weatherapp.com');

date_default_timezone_set('Asia/Tehran');

// --- مدیریت لاگین ---
if (isset($_POST['password'])) {
    if ($_POST['password'] === ADMIN_PASSWORD) {
        $_SESSION['logged_in'] = true;
    } else {
        $error = "رمز عبور اشتباه است.";
    }
}

if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: admin_notif.php");
    exit;
}

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    ?>
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ورود به پنل مدیریت</title>
        <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .login-box { background: white; padding: 2rem; rounded: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%; max-width: 400px; border-radius: 12px; }
            input { width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; box-sizing: border-box; }
            button { width: 100%; padding: 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: bold; }
            button:hover { background: #2563eb; }
            .error { color: #ef4444; margin-bottom: 1rem; font-size: 0.875rem; text-align: center; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2 style="text-align: center; margin-top: 0;">مدیریت هواشناسی</h2>
            <?php if (isset($error)) echo "<div class='error'>$error</div>"; ?>
            <form method="post">
                <input type="password" name="password" placeholder="رمز عبور را وارد کنید" required autofocus>
                <button type="submit">ورود</button>
            </form>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// --- بارگذاری دیتابیس ---
$users = file_exists(DB_FILE) ? json_decode(file_get_contents(DB_FILE), true) : [];
$message = "";

// --- پردازش عملیات (ارسال/حذف) ---
if (isset($_GET['action']) && isset($_GET['id'])) {
    $id = $_GET['id']; // Endpoint is the ID
    
    if ($_GET['action'] === 'delete') {
        if (isset($users[$id])) {
            unset($users[$id]);
            file_put_contents(DB_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $message = "کاربر با موفقیت حذف شد.";
        }
    } elseif ($_GET['action'] === 'ping') {
        if (isset($users[$id])) {
            $res = sendWebPushSignal($users[$id]['subscription']);
            if ($res['success']) {
                $message = "سیگنال تست با موفقیت ارسال شد (✓).";
                // آپدیت زمان آخرین نوتیفیکیشن
                $users[$id]['last_notif'] = time();
                file_put_contents(DB_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            } else {
                $message = "خطا در ارسال: " . $res['error'];
                if (strpos($res['error'], '410') !== false || strpos($res['error'], '404') !== false) {
                    $message .= " (به نظر می‌رسد کاربر لغو اشتراک کرده است)";
                }
            }
        }
    }
}

?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پنل مدیریت هواشناسی</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: white; padding: 1rem 1.5rem; border-radius: 12px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
        h1 { margin: 0; font-size: 1.25rem; }
        .logout { color: #ef4444; text-decoration: none; font-weight: bold; font-size: 0.9rem; }
        .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 1rem; text-align: right; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
        th { background: #f1f5f9; font-weight: 600; color: #475569; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: #f8fafc; }
        .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-gray { background: #f1f5f9; color: #475569; }
        .btn { display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: bold; margin-left: 0.5rem; transition: background 0.2s; border: none; cursor: pointer; }
        .btn-blue { background: #eff6ff; color: #2563eb; }
        .btn-blue:hover { background: #dbeafe; }
        .btn-red { background: #fef2f2; color: #dc2626; }
        .btn-red:hover { background: #fee2e2; }
        .alert { background: #dbeafe; color: #1e40af; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #bfdbfe; }
        .empty-state { padding: 3rem; text-align: center; color: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>پنل مدیریت مشترکین (<?php echo count($users); ?> کاربر)</h1>
            <a href="?logout=true" class="logout">خروج</a>
        </div>

        <?php if ($message): ?>
            <div class="alert"><?php echo $message; ?></div>
        <?php endif; ?>

        <div class="card">
            <?php if (empty($users)): ?>
                <div class="empty-state">هنوز هیچ کاربری ثبت‌نام نکرده است.</div>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>شهر</th>
                            <th>مختصات</th>
                            <th>آخرین دما</th>
                            <th>وضعیت نوتیفیکیشن</th>
                            <th>آخرین ارسال</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($users as $endpoint => $user): ?>
                            <tr>
                                <td><strong><?php echo htmlspecialchars($user['city'] ?? 'نامشخص'); ?></strong></td>
                                <td dir="ltr" style="font-family: monospace; color: #64748b;">
                                    <?php echo number_format($user['lat'] ?? 0, 2) . ', ' . number_format($user['lon'] ?? 0, 2); ?>
                                </td>
                                <td><?php echo isset($user['last_temp']) ? $user['last_temp'] . '°C' : '-'; ?></td>
                                <td>
                                    <?php 
                                        $enabled = $user['settings']['enabled'] ?? true;
                                        if ($enabled) echo '<span class="badge badge-green">فعال</span>';
                                        else echo '<span class="badge badge-gray">غیرفعال توسط کاربر</span>';
                                    ?>
                                </td>
                                <td>
                                    <?php 
                                        if (isset($user['last_notif']) && $user['last_notif'] > 0) {
                                            $diff = time() - $user['last_notif'];
                                            if ($diff < 60) echo 'لحظاتی پیش';
                                            elseif ($diff < 3600) echo floor($diff/60) . ' دقیقه پیش';
                                            elseif ($diff < 86400) echo floor($diff/3600) . ' ساعت پیش';
                                            else echo floor($diff/86400) . ' روز پیش';
                                        } else {
                                            echo '-';
                                        }
                                    ?>
                                </td>
                                <td>
                                    <a href="?action=ping&id=<?php echo urlencode($endpoint); ?>" class="btn btn-blue">تست (Ping)</a>
                                    <a href="?action=delete&id=<?php echo urlencode($endpoint); ?>" class="btn btn-red" onclick="return confirm('آیا مطمئن هستید؟');">حذف</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>

<?php
// --- توابع کمکی Web Push (دقیقاً کپی شده از weather_cron.php) ---

function sendWebPushSignal($subscription) {
    if (!isset($subscription['endpoint'])) return ['success' => false, 'error' => 'No endpoint'];

    $endpoint = $subscription['endpoint'];
    $authHeader = getVapidHeader($endpoint);
    
    if (!$authHeader) {
        return ['success' => false, 'error' => 'VAPID Signature Failed'];
    }

    $headers = [
        'Authorization: ' . $authHeader,
        'TTL: 60'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $endpoint);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // ارسال بادی خالی برای بیدار کردن سرویس ورکر
    curl_setopt($ch, CURLOPT_POSTFIELDS, null);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        return ['success' => true];
    } else {
        return ['success' => false, 'error' => "HTTP $httpCode: $result $error"];
    }
}

function getVapidHeader($endpoint) {
    $parsedUrl = parse_url($endpoint);
    $origin = $parsedUrl['scheme'] . '://' . $parsedUrl['host'];
    
    $header = ['typ' => 'JWT', 'alg' => 'ES256'];
    $claim = ['aud' => $origin, 'exp' => time() + 43200, 'sub' => VAPID_SUBJECT];
    
    $base64Header = base64UrlEncode(json_encode($header));
    $base64Claim = base64UrlEncode(json_encode($claim));
    $signatureInput = $base64Header . "." . $base64Claim;
    
    $signature = createVapidSignature($signatureInput);
    
    if (!$signature) return null;
    
    return 'vapid t=' . $signatureInput . '.' . $signature;
}

function createVapidSignature($data) {
    $pem = convertToPem(VAPID_PRIVATE_KEY);
    $signature = '';
    if (openssl_sign($data, $signature, $pem, OPENSSL_ALGO_SHA256)) {
        return base64UrlEncode(derToRaw($signature));
    }
    return null;
}

function convertToPem($privateKeyBase64) {
    $keyBin = base64UrlDecode($privateKeyBase64);
    $der = "\x30\x77\x02\x01\x01\x04\x20" . $keyBin . "\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\xa1\x44\x03\x42\x00";
    return "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----";
}

function derToRaw($der) {
    $hex = bin2hex($der);
    $lenR = hexdec(substr($hex, 6, 2));
    $r = substr($hex, 8, $lenR * 2);
    $startS = 8 + ($lenR * 2);
    $lenS = hexdec(substr($hex, $startS + 2, 2));
    $s = substr($hex, $startS + 4, $lenS * 2);
    $r = str_pad(ltrim($r, '00'), 64, '0', STR_PAD_LEFT);
    $s = str_pad(ltrim($s, '00'), 64, '0', STR_PAD_LEFT);
    return hex2bin($r . $s);
}

function base64UrlEncode($data) {
    return rtrim(str_replace(['+', '/'], ['-', '_'], base64_encode($data)), '=');
}

function base64UrlDecode($data) {
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}
?>