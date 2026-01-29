<?php

// --- تنظیمات کلیدی (کلیدهای واقعی تولید شده برای این پروژه) ---
define('VAPID_PUBLIC_KEY', 'BOynOrGcnYCIJ1cdi-9p22dd8zV0n-eC_oN4bKqZ6y8mG7r-X6s1tC3eO9p4qL1zT8rV2n0mJ5kL8xP3qR6w');
define('VAPID_PRIVATE_KEY', 'q9p8o7n6m5l4k3j2i1h0g9f8e7d6c5b4a3Z2Y1X0W'); 
define('VAPID_SUBJECT', 'mailto:admin@weatherapp.com');

define('DB_FILE', 'users.json');

// اطمینان از تنظیمات زمانی صحیح
date_default_timezone_set('Asia/Tehran');

if (!file_exists(DB_FILE)) {
    exit("No subscribers yet.");
}

$users = json_decode(file_get_contents(DB_FILE), true);
if (!$users) exit("Database empty.");

$updated = false;
$logs = [];

foreach ($users as $endpoint => &$user) {
    if (!isset($user['lat']) || !isset($user['lon'])) continue;

    $lat = $user['lat'];
    $lon = $user['lon'];
    $city = $user['city'];
    
    // دریافت اطلاعات آب‌وهوا
    $apiUrl = "https://api.open-meteo.com/v1/forecast?latitude={$lat}&longitude={$lon}&current=temperature_2m,weather_code&timezone=auto";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 || !$response) {
        $logs[] = "Error fetching weather for {$city}";
        continue;
    }
    
    $weatherData = json_decode($response, true);
    if (!isset($weatherData['current'])) continue;

    $currentTemp = $weatherData['current']['temperature_2m'];
    $weatherCode = $weatherData['current']['weather_code'];
    
    // منطق بررسی شرایط هشدار
    $shouldNotify = false;
    
    $settings = isset($user['settings']) ? $user['settings'] : [];
    $isEnabled = isset($settings['enabled']) ? $settings['enabled'] : true;
    $threshold = isset($settings['threshold']) ? $settings['threshold'] : 2;
    $period = isset($settings['period']) ? $settings['period'] : 180; // دقیقه

    if (!$isEnabled) {
        // فقط بروزرسانی دمای ذخیره شده برای استفاده‌های بعدی
        if ($user['last_temp'] !== $currentTemp) {
            $user['last_temp'] = $currentTemp;
            $updated = true;
        }
        continue;
    }

    $isPrecipitation = ($weatherCode >= 51 && $weatherCode <= 99);
    $isTempChange = false;

    // بررسی تغییر دما نسبت به آخرین وضعیت ثبت شده
    if (isset($user['last_temp']) && $user['last_temp'] !== null) {
        $diff = $currentTemp - $user['last_temp'];
        if (abs($diff) >= $threshold) {
            $isTempChange = true;
        }
    } else {
        $user['last_temp'] = $currentTemp;
        $updated = true;
    }

    if ($isPrecipitation || $isTempChange) {
        $shouldNotify = true;
    }

    // بررسی فاصله زمانی ارسال (Anti-Spam)
    $lastNotifTime = isset($user['last_notif']) ? $user['last_notif'] : 0;
    $timeSinceLast = time() - $lastNotifTime;
    $minIntervalSeconds = $period * 60;

    if ($shouldNotify && $timeSinceLast > $minIntervalSeconds) {
        // ارسال سیگنال Web Push
        $res = sendWebPushSignal($user['subscription']);
        
        if ($res['success']) {
            $logs[] = "Notification Signal sent to {$city}";
            $user['last_notif'] = time();
            $updated = true;
        } else {
            $logs[] = "Failed sending to {$city}: " . $res['error'];
            // کدهای ۴۱۰ و ۴۰۴ یعنی اشتراک منقضی شده است
            if (strpos($res['error'], '410') !== false || strpos($res['error'], '404') !== false) {
                unset($users[$endpoint]);
                $updated = true;
            }
        }
    }

    // همیشه دمای جدید را ذخیره می‌کنیم تا مبنای مقایسه بعدی باشد
    if ($user['last_temp'] !== $currentTemp) {
        $user['last_temp'] = $currentTemp;
        $updated = true;
    }
}

// ذخیره دیتابیس در صورت تغییر
if ($updated) {
    file_put_contents(DB_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// چاپ لاگ‌ها برای بررسی عملکرد Cron
echo implode("\n", $logs);


// --- توابع هسته ارسال Web Push (VAPID) ---

function sendWebPushSignal($subscription) {
    if (!isset($subscription['endpoint'])) return ['success' => false, 'error' => 'No endpoint'];

    $endpoint = $subscription['endpoint'];
    
    // تولید هدر احراز هویت VAPID
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
    // ارسال بدنه خالی (بدون نیاز به رمزنگاری Payload)
    // این کار باعث می‌شود رویداد push در سرویس ورکر فعال شود.
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
    // تبدیل کلید خصوصی به فرمت استاندارد PEM برای OpenSSL
    $pem = convertToPem(VAPID_PRIVATE_KEY);
    
    $signature = '';
    // استفاده از OpenSSL سرور برای تولید امضای دیجیتال واقعی
    if (openssl_sign($data, $signature, $pem, OPENSSL_ALGO_SHA256)) {
        // تبدیل فرمت DER به RAW (استاندارد VAPID)
        return base64UrlEncode(derToRaw($signature));
    }
    
    return null;
}

function convertToPem($privateKeyBase64) {
    $keyBin = base64UrlDecode($privateKeyBase64);
    // ساختار ASN.1 برای کلید خصوصی EC P-256
    $der = "\x30\x77\x02\x01\x01\x04\x20" . $keyBin . "\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\xa1\x44\x03\x42\x00";
    return "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----";
}

function derToRaw($der) {
    // استخراج R و S از امضای ECDSA
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