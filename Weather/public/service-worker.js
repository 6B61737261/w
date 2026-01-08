const CACHE_NAME = 'weather-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // اگر فایل‌های استاتیک دیگری دارید اینجا اضافه کنید
];

// نصب سرویس ورکر و کش کردن فایل‌های اولیه
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// استراتژی Cache First (اول کش، اگر نبود اینترنت) برای فایل‌های استاتیک
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // اگر در کش بود همان را بده، وگرنه از اینترنت بگیر
        return response || fetch(event.request);
      })
  );
});

// پاک کردن کش‌های قدیمی هنگام آپدیت
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // بستن نوتیفیکیشن

  // باز کردن یا فوکوس کردن روی تب باز شده برنامه
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // اگر تبی باز است، روی آن فوکوس کن
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // اگر تبی باز نیست، صفحه اصلی را باز کن
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});