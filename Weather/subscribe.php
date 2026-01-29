<?php
// تنظیمات CORS و هدرها
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// مدیریت درخواست‌های پیش‌پرواز (Preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// دریافت داده‌های JSON
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// اعتبارسنجی داده‌های ورودی
// ما به آبجکت subscription (شامل endpoint و keys)، مختصات و نام شهر نیاز داریم
if (
    isset($data['subscription']) && 
    isset($data['subscription']['endpoint']) &&
    isset($data['lat']) && 
    isset($data['lon'])
) {
    $file = 'users.json'; // نام فایل دیتابیس طبق دستور شما
    $users = [];

    // خواندن فایل موجود اگر وجود داشته باشد
    if (file_exists($file)) {
        $jsonContent = file_get_contents($file);
        $users = json_decode($jsonContent, true);
        if (!is_array($users)) {
            $users = [];
        }
    }

    // استفاده از endpoint به عنوان کلید یکتا (چون playerId وان‌سیگنال حذف شده است)
    $endpoint = $data['subscription']['endpoint'];
    
    // حفظ اطلاعات قبلی (مثل آخرین دمای ثبت شده و زمان آخرین نوتیفیکیشن)
    $existingData = isset($users[$endpoint]) ? $users[$endpoint] : [];
    
    // آماده‌سازی داده‌های جدید
    $users[$endpoint] = [
        'subscription' => $data['subscription'], // ذخیره کل آبجکت اشتراک برای Web Push
        'lat' => floatval($data['lat']),
        'lon' => floatval($data['lon']),
        'city' => isset($data['city']) ? htmlspecialchars($data['city']) : 'ناشناس',
        'settings' => isset($data['settings']) ? $data['settings'] : [], // تنظیمات کاربر (مثل آستانه تغییر دما)
        'last_temp' => isset($existingData['last_temp']) ? $existingData['last_temp'] : null,
        'last_notif' => isset($existingData['last_notif']) ? $existingData['last_notif'] : 0,
        'updated_at' => time()
    ];

    // ذخیره در فایل
    if(file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        http_response_code(200);
        echo json_encode(["status" => "success", "message" => "Subscription updated successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to save data"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid input data"]);
}
?>