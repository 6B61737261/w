<?php
// --- تنظیمات ---
// رمز عبور برای دسترسی به پنل (لطفا این را تغییر دهید)
$admin_password = "admin"; 

// کلیدهای وان‌سیگنال (همان‌هایی که قبلاً داشتیم)
define('APP_ID', '76dec13e-31fd-441a-9613-1317588ea184');
define('REST_API_KEY', '7dcw5pfi7ezenwcikb24hmahu'); 
define('DB_FILE', 'users.json');

session_start();
$message = "";
$messageType = "";

// --- خروج از سیستم ---
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// --- بررسی لاگین ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    if ($_POST['password'] === $admin_password) {
        $_SESSION['logged_in'] = true;
    } else {
        $message = "رمز عبور اشتباه است.";
        $messageType = "error";
    }
}

// --- ارسال نوتیفیکیشن ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['send_notif']) && isset($_SESSION['logged_in'])) {
    $title = $_POST['title'];
    $msg = $_POST['message'];
    $target = $_POST['target']; // 'all' or specific ID

    if (!empty($title) && !empty($msg)) {
        // خواندن کاربران برای گرفتن لیست IDها
        $playerIds = [];
        if (file_exists(DB_FILE)) {
            $users = json_decode(file_get_contents(DB_FILE), true);
            if ($users) {
                if ($target === 'all') {
                    $playerIds = array_keys($users);
                } else {
                    // ارسال تکی (اگر نیاز بود)
                    // فعلاً در فرم فقط گزینه "همه" را گذاشتیم اما زیرساختش اینجاست
                    $playerIds = [$target];
                }
            }
        }

        if (!empty($playerIds)) {
            $response = sendNotification($playerIds, $title, $msg);
            $respJson = json_decode($response, true);
            
            if (isset($respJson['id'])) {
                $message = "پیام با موفقیت به " . count($playerIds) . " کاربر ارسال شد. (ID: " . $respJson['id'] . ")";
                $messageType = "success";
            } else {
                $message = "خطا در ارسال: " . $response;
                $messageType = "error";
            }
        } else {
            $message = "هیچ کاربری در دیتابیس یافت نشد.";
            $messageType = "error";
        }
    } else {
        $message = "لطفا عنوان و متن پیام را وارد کنید.";
        $messageType = "error";
    }
}

// --- تابع خواندن کاربران ---
$usersList = [];
$totalUsers = 0;
if (file_exists(DB_FILE)) {
    $data = json_decode(file_get_contents(DB_FILE), true);
    if ($data) {
        $usersList = $data;
        $totalUsers = count($data);
    }
}

// --- تابع ارسال به OneSignal ---
function sendNotification($playerIds, $heading, $content) {
    $fields = array(
        'app_id' => APP_ID,
        'include_player_ids' => $playerIds,
        'headings' => array("en" => $heading),
        'contents' => array("en" => $content),
        'priority' => 10
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
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);

    $response = curl_exec($ch);
    curl_close($ch);
    
    return $response;
}
?>

<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پنل مدیریت نوتیفیکیشن</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Vazirmatn', sans-serif; }
    </style>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">

    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        
        <!-- Header -->
        <div class="bg-blue-600 p-6 text-white flex justify-between items-center">
            <h1 class="text-xl font-bold">📢 ارسال پیام همگانی</h1>
            <?php if (isset($_SESSION['logged_in'])): ?>
                <a href="?logout=1" class="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded transition">خروج</a>
            <?php endif; ?>
        </div>

        <!-- Content -->
        <div class="p-6">
            
            <!-- Alert Message -->
            <?php if ($message): ?>
                <div class="mb-6 p-4 rounded-lg text-sm font-bold <?php echo $messageType === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'; ?>">
                    <?php echo $message; ?>
                </div>
            <?php endif; ?>

            <?php if (!isset($_SESSION['logged_in'])): ?>
                <!-- Login Form -->
                <form method="POST" class="space-y-4">
                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">رمز عبور مدیر</label>
                        <input type="password" name="password" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 bg-gray-50" placeholder="رمز را وارد کنید..." required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg">ورود به پنل</button>
                </form>
            <?php else: ?>
                <!-- Dashboard -->
                <div class="mb-6 flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 font-bold">تعداد کاربران فعال</p>
                            <p class="text-xl font-black text-gray-800"><?php echo $totalUsers; ?> نفر</p>
                        </div>
                    </div>
                    <div class="text-xs text-gray-400">Database: <?php echo DB_FILE; ?></div>
                </div>

                <!-- Send Form -->
                <form method="POST" class="space-y-4">
                    <input type="hidden" name="send_notif" value="1">
                    
                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">گیرندگان</label>
                        <select name="target" class="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50">
                            <option value="all">همه کاربران (<?php echo $totalUsers; ?>)</option>
                            <!-- در آینده می‌توان ارسال به شهر خاص را اضافه کرد -->
                        </select>
                    </div>

                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">عنوان پیام</label>
                        <input type="text" name="title" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="مثلا: هشدار فوری..." required>
                    </div>

                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">متن پیام</label>
                        <textarea name="message" rows="4" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="متن هشدار یا خبر را اینجا بنویسید..." required></textarea>
                    </div>

                    <button type="submit" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition shadow-lg flex justify-center items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        ارسال نوتیفیکیشن
                    </button>
                </form>

                <!-- Users List (Collapsible) -->
                <div class="mt-8 border-t pt-4">
                    <h3 class="text-sm font-bold text-gray-500 mb-3">آخرین کاربران ثبت شده:</h3>
                    <div class="bg-gray-50 rounded-lg p-2 max-h-40 overflow-y-auto text-xs space-y-1">
                        <?php if($totalUsers > 0): ?>
                            <?php foreach($usersList as $uid => $uData): ?>
                                <div class="flex justify-between border-b border-gray-200 pb-1 last:border-0">
                                    <span class="text-gray-600 truncate w-1/2" title="<?php echo $uid; ?>"><?php echo substr($uid, 0, 8) . '...'; ?></span>
                                    <span class="font-bold text-blue-600"><?php echo isset($uData['city']) ? $uData['city'] : 'نامشخص'; ?></span>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <p class="text-center text-gray-400 py-2">هنوز کاربری ثبت نشده است.</p>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endif; ?>

        </div>
    </div>

</body>
</html>