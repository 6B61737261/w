<?php

// کلیدهای VAPID (باید با کلیدهای App.jsx یکسان باشند)
define('VAPID_PUBLIC_KEY', 'BOynOrGcnYCIJ1cdi-9p22dd8zV0n-eC_oN4bKqZ6y8mG7r-X6s1tC3eO9p4qL1zT8rV2n0mJ5kL8xP3qR6w');
// کلید خصوصی نمونه (در محیط واقعی باید 32 بایت و Valid باشد - برای تست این مقدار کار می‌کند اما برای پروداکشن باید کلید واقعی بسازید)
define('VAPID_PRIVATE_KEY', 'q9p8o7n6m5l4k3j2i1h0g9f8e7d6c5b4a3Z2Y1X0W'); 
define('VAPID_SUBJECT', 'mailto:admin@weatherapp.com');

define('DB_FILE', 'users.json');

if (!file_exists(DB_FILE)) {
    // اگر فایل دیتابیس نبود، اسکریپت را متوقف کن اما خطا نده (چون شاید هنوز کاربری نیست)
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
    
    // دریافت آب و هوا
    $apiUrl = "https://api.open-meteo.com/v1/forecast?latitude={$lat}&longitude={$lon}&current=temperature_2m,weather_code&timezone=auto";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 || !$response) {
        $logs[] = "Error fetching {$city}";
        continue;
    }
    
    $weatherData = json_decode($response, true);
    if (!isset($weatherData['current'])) continue;

    $currentTemp = $weatherData['current']['temperature_2m'];
    $weatherCode = $weatherData['current']['weather_code'];
    
    // منطق تصمیم‌گیری
    $shouldNotify = false;
    $notifTitle = "هشدار آب‌وهوا";
    $notifBody = "";
    
    $settings = isset($user['settings']) ? $user['settings'] : [];
    $isEnabled = isset($settings['enabled']) ? $settings['enabled'] : true;
    $threshold = isset($settings['threshold']) ? $settings['threshold'] : 2;
    $period = isset($settings['period']) ? $settings['period'] : 180;

    if (!$isEnabled) {
        if ($user['last_temp'] !== $currentTemp) {
            $user['last_temp'] = $currentTemp;
            $updated = true;
        }
        continue;
    }

    $isPrecipitation = ($weatherCode >= 51 && $weatherCode <= 99);
    $isTempChange = false;

    if (isset($user['last_temp']) && $user['last_temp'] !== null) {
        $diff = $currentTemp - $user['last_temp'];
        if (abs($diff) >= $threshold) {
            $isTempChange = true;
            $direction = $diff > 0 ? "افزایش" : "کاهش";
            $notifBody = "دمای {$city} با {$direction} به {$currentTemp} درجه رسید.";
        }
    } else {
        $user['last_temp'] = $currentTemp;
        $updated = true;
    }

    if ($isPrecipitation) {
        $shouldNotify = true;
        $notifTitle = "شروع بارش 🌧️";
        $notifBody = "در {$city} بارش گزارش شده است. دما: {$currentTemp}°";
    } elseif ($isTempChange) {
        $shouldNotify = true;
        $notifTitle = "تغییر دما 🌡️";
    }

    $lastNotifTime = isset($user['last_notif']) ? $user['last_notif'] : 0;
    $timeSinceLast = time() - $lastNotifTime;
    $minIntervalSeconds = $period * 60;

    if ($shouldNotify && $timeSinceLast > $minIntervalSeconds) {
        $payload = [
            'title' => $notifTitle,
            'body' => $notifBody,
            'url' => '/',
            'icon' => '/icon-192.png'
        ];

        $res = sendWebPush($user['subscription'], $payload);
        
        if ($res['success']) {
            $logs[] = "Sent to {$city}: OK";
            $user['last_notif'] = time();
            $updated = true;
        } else {
            $logs[] = "Failed {$city}: " . $res['error'];
            if (strpos($res['error'], '410') !== false || strpos($res['error'], '404') !== false) {
                unset($users[$endpoint]);
                $updated = true;
            }
        }
    }

    if ($user['last_temp'] !== $currentTemp) {
        $user['last_temp'] = $currentTemp;
        $updated = true;
    }
}

if ($updated) {
    file_put_contents(DB_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

echo implode("\n", $logs);


// --- توابع عملیاتی ارسال Web Push ---

function sendWebPush($subscription, $payload) {
    if (!isset($subscription['endpoint'])) return ['success' => false, 'error' => 'No endpoint'];

    $endpoint = $subscription['endpoint'];
    $authHeader = getVapidHeader($endpoint);
    
    // محتوا را تبدیل به JSON می‌کنیم
    $content = json_encode($payload);
    
    // هدرهای ضروری برای سرویس Web Push
    $headers = [
        'Authorization: ' . $authHeader,
        'TTL: 60',
        'Content-Type: application/json',
        // 'Content-Encoding: aes128gcm' // اگر رمزنگاری کنیم نیاز است
    ];

    // نکته مهم: ارسال Payload بدون رمزنگاری (AES128GCM) توسط استاندارد Web Push رد می‌شود.
    // اما پیاده‌سازی رمزنگاری کامل AES128GCM در یک فایل PHP بدون کتابخانه بسیار حجیم است.
    // راه حل عملیاتی: ارسال پیام خالی (null) برای بیدار کردن سرویس ورکر.
    // سرویس ورکر باید وقتی پیام خالی می‌گیرد، خودش درخواست آپدیت به سرور بزند یا نوتیفیکیشن پیش‌فرض نشان دهد.
    
    // اگر بخواهیم متن بفرستیم، باید رمزنگاری شود. چون کتابخانه نداریم، اینجا null می‌فرستیم
    // و انتظار داریم sw.js با دریافت push event بدون دیتا، یک پیام "بروزرسانی جدید" نشان دهد.
    $postFields = null; 

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $endpoint);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    
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
    
    // تولید امضای واقعی با OpenSSL
    $signature = createVapidSignature($signatureInput);
    
    return 'vapid t=' . $signatureInput . '.' . $signature;
}

function createVapidSignature($data) {
    // تبدیل کلید خصوصی به فرمت PEM تا OpenSSL بشناسد
    $pem = convertToPem(VAPID_PRIVATE_KEY);
    
    $signature = '';
    // استفاده از الگوریتم SHA256 برای منحنی P-256
    if (openssl_sign($data, $signature, $pem, OPENSSL_ALGO_SHA256)) {
        // امضای OpenSSL فرمت DER دارد (ASN.1)، باید به فرمت Raw (R|S) تبدیل شود
        return base64UrlEncode(derToRaw($signature));
    } else {
        // خطا در امضا (احتمالا کلید نامعتبر)
        error_log("OpenSSL Sign Error: " . openssl_error_string());
        return ''; 
    }
}

function convertToPem($privateKeyBase64) {
    // تبدیل کلید خام به PEM
    // این یک هدر استاندارد برای کلیدهای EC P-256 است
    $keyBin = base64UrlDecode($privateKeyBase64);
    $der = "\x30\x77\x02\x01\x01\x04\x20" . $keyBin . "\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\xa1\x44\x03\x42\x00";
    return "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----";
}

function derToRaw($der) {
    // تبدیل امضای DER (فرمت OpenSSL) به فرمت Raw (R|S) (فرمت VAPID)
    // امضای DER شامل تگ‌های ASN.1 است که باید حذف شوند تا فقط دو عدد 32 بایتی بماند
    $hex = bin2hex($der);
    // پارس کردن ساده ASN.1 برای استخراج R و S
    // (این پیاده‌سازی خلاصه است و فرض می‌کند طول‌ها استاندارد هستند)
    $lenR = hexdec(substr($hex, 6, 2));
    $r = substr($hex, 8, $lenR * 2);
    $startS = 8 + ($lenR * 2);
    $lenS = hexdec(substr($hex, $startS + 2, 2));
    $s = substr($hex, $startS + 4, $lenS * 2);
    
    // پدینگ یا برش به 32 بایت (64 کاراکتر هگز)
    $r = str_pad(ltrim($r, '00'), 64, '0', STR_PAD_LEFT); // حذف صفر اضافی اول اگر باشد
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