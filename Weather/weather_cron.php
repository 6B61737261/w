<?php
// تنظیمات کلیدی
// شناسه اپلیکیشن وان‌سیگنال شما
define('APP_ID', '76dec13e-31fd-441a-9613-1317588ea184');
// کلید رست ای‌پی‌آی که ارسال کردید
define('REST_API_KEY', '7dcw5pfi7ezenwcikb24hmahu'); 
define('DB_FILE', 'users.json');

// بررسی وجود فایل کاربران
if (!file_exists(DB_FILE)) {
    die("No users database found yet.");
}

$users = json_decode(file_get_contents(DB_FILE), true);
if (!$users) die("Database is empty or invalid.");

$updated = false;
$logs = [];

foreach ($users as $playerId => &$user) {
    $lat = $user['lat'];
    $lon = $user['lon'];
    
    // 1. دریافت آب‌وهوای فعلی از Open-Meteo
    $apiUrl = "https://api.open-meteo.com/v1/forecast?latitude={$lat}&longitude={$lon}&current=temperature_2m,weather_code&timezone=auto";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $weatherData = json_decode($response, true);
    
    if (!isset($weatherData['current'])) {
        $logs[] = "Failed to fetch weather for {$user['city']}";
        continue;
    }

    $currentTemp = $weatherData['current']['temperature_2m'];
    $weatherCode = $weatherData['current']['weather_code'];
    
    $shouldNotify = false;
    $message = "";
    $title = "هشدار آب‌وهوا ⚠️";

    // 2. منطق بررسی شرایط (باران/برف یا تغییر دما)
    
    // کدهای WMO برای باران، برف و طوفان (51 به بالا معمولا بارش است)
    // 51-67: Drizzle/Rain, 71-77: Snow, 80-82: Showers, 95-99: Thunderstorm
    $isPrecipitation = ($weatherCode >= 51 && $weatherCode <= 99);
    
    // بررسی تغییر دما (اگر دمای قبلی داریم)
    $isTempChange = false;
    if ($user['last_temp'] !== null) {
        $tempDiff = $currentTemp - $user['last_temp'];
        if (abs($tempDiff) >= 5) { // اگر اختلاف 5 درجه یا بیشتر باشد
            $isTempChange = true;
            $direction = $tempDiff > 0 ? "افزایش" : "کاهش";
            $message = "دمای هوای {$user['city']} با {$direction} ناگهانی به {$currentTemp}°C رسید.";
        }
    }

    // اولویت با بارش است، اگر نبود چک کردن دما
    if ($isPrecipitation) {
        $shouldNotify = true;
        $message = "بارش باران یا برف در {$user['city']} آغاز شده است. دما: {$currentTemp}°C";
        $title = "شروع بارش 🌧️";
    } elseif ($isTempChange) {
        $shouldNotify = true;
        // پیام قبلاً ست شده است
    }

    // 3. جلوگیری از ارسال تکراری (Anti-Spam)
    // اگر از آخرین نوتیفیکیشن کمتر از 3 ساعت (10800 ثانیه) گذشته باشد، ارسال نکن
    $timeSinceLast = time() - $user['last_notif'];
    
    if ($shouldNotify && $timeSinceLast > 10800) {
        $result = sendOneSignalNotification($playerId, $message, $title);
        $logs[] = "Notification sent to {$user['city']}: " . $result;
        
        // آپدیت زمان آخرین ارسال
        $user['last_notif'] = time();
        $updated = true;
    }

    // همیشه دمای فعلی را ذخیره کن تا در اجرای بعدی مقایسه شود
    if ($user['last_temp'] !== $currentTemp) {
        $user['last_temp'] = $currentTemp;
        $updated = true;
    }
}

// ذخیره تغییرات در فایل
if ($updated) {
    file_put_contents(DB_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo "Database updated.\n";
} else {
    echo "No significant changes.\n";
}

echo implode("\n", $logs);

// تابع ارسال پیام به OneSignal
function sendOneSignalNotification($playerId, $message, $heading) {
    $content = array(
        "en" => $message
    );
    
    $headings = array(
        "en" => $heading
    );
    
    $fields = array(
        'app_id' => APP_ID,
        'include_player_ids' => array($playerId),
        'contents' => $content,
        'headings' => $headings,
        // آیکون و تنظیمات اضافی را می‌توان اینجا افزود
    );
    
    $fields = json_encode($fields);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://onesignal.com/api/v1/notifications");
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json; charset=utf-8',
        'Authorization: Basic ' . REST_API_KEY
    ));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);
    curl_setopt($ch, CURLOPT_POST, TRUE);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE); // در محیط‌های خاص ممکن است لازم باشد

    $response = curl_exec($ch);
    curl_close($ch);
    
    return $response;
}
?>