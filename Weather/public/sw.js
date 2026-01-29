const CACHE_NAME = 'weather-pwa-v2';
const DATA_CACHE_NAME = 'weather-data-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // فونت‌ها و فایل‌های استاتیک دیگر در صورت وجود
];

// نصب سرویس ورکر و کش کردن فایل‌های اولیه
self.addEventListener('install', (event) => {
  self.skipWaiting(); // فعال‌سازی فوری نسخه جدید
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// پاک کردن کش‌های قدیمی هنگام آپدیت
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // کنترل فوری تمام کلاینت‌ها
  );
});

// مدیریت درخواست‌ها (استراتژی‌های ترکیبی)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // استراتژی ۱: Network First (اول اینترنت، بعد کش) برای API آب‌وهوا
  if (url.href.includes('api.open-meteo.com') || url.href.includes('geocoding-api.open-meteo.com')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // اگر پاسخ موفق بود، یک کپی در کش دیتا ذخیره کن
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // اگر اینترنت قطع بود، از کش دیتا بخوان
          return caches.match(event.request);
        })
    );
    return;
  }

  // استراتژی ۲: Cache First (اول کش، بعد اینترنت) برای فایل‌های استاتیک
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // اگر در کش بود همان را بده، وگرنه از اینترنت بگیر
        return response || fetch(event.request);
      })
  );
});

// رویداد دریافت Push Notification (اضافه شده طبق استراتژی A2)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  // تلاش برای پارس کردن JSON، اگر نشد متن ساده
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'هواشناسی', body: event.data.text() };
  }

  const title = data.title || 'هواشناسی';
  const options = {
    body: data.body || 'به‌روزرسانی جدید موجود است',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/', // لینک مقصد هنگام کلیک
      timestamp: Date.now()
    },
    // actions: [] // می‌توان دکمه‌های عملیاتی اضافه کرد
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// مدیریت کلیک روی نوتیفیکیشن
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // بستن نوتیفیکیشن

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  // باز کردن یا فوکوس کردن روی تب باز شده برنامه
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // اگر تبی باز است، روی آن فوکوس کن
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // اگر تبی باز نیست، صفحه اصلی را باز کن
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});