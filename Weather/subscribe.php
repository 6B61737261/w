<?php
// اجازه دسترسی از دامین‌های دیگر (CORS) - برای ارتباط با فرانت‌اند
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// دریافت داده‌های JSON ارسال شده از سمت React
$input = file_get_contents("php://input");
$data = json_decode($input);

// بررسی اعتبار داده‌ها
if (
    !empty($data->playerId) && 
    !empty($data->lat) && 
    !empty($data->lon)
) {
    $file = 'users.json';
    $users = [];

    // اگر فایل دیتابیس وجود دارد، آن را بخوان
    if (file_exists($file)) {
        $jsonContent = file_get_contents($file);
        $users = json_decode($jsonContent, true);
        if (!is_array($users)) {
            $users = [];
        }
    }

    // افزودن یا آپدیت کاربر بر اساس playerId (شناسه یکتا)
    $users[$data->playerId] = [
        'lat' => floatval($data->lat),
        'lon' => floatval($data->lon),
        'city' => isset($data->city) ? $data->city : 'ناشناس',
        'last_temp' => null,      // آخرین دمای ثبت شده برای مقایسه
        'last_notif' => 0         // زمان آخرین نوتیفیکیشن ارسالی
    ];

    // ذخیره مجدد در فایل
    if(file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        http_response_code(200);
        echo json_encode(["message" => "User subscribed successfully.", "status" => "success"]);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Failed to save data. Check file permissions.", "status" => "error"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data. Need playerId, lat, and lon.", "status" => "error"]);
}
?>