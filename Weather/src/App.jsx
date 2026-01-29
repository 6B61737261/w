import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- تنظیمات کلیدی WEB PUSH ---
const BACKEND_URL = "https://malihe-moosaee-weather-pwa.rf.gd/subscribe.php";
// کلید عمومی VAPID واقعی (تولید شده برای این پروژه)
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5NkxD2Q";

// --- Utility: Convert VAPID Key ---
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

// --- Icons (Inline SVGs) ---
const IconBase = ({ children, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>
);

const Cloud = (props) => <IconBase {...props}><path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3s1.3 3 3 3h11c1.7 0 3-1.3 3-3z"/><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5S20 10 17.5 10c-.3 0-.6.1-.9.2"/><path d="M16.4 10.2A6 6 0 1 0 5.4 13.9"/></IconBase>;
const Sun = (props) => <IconBase {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></IconBase>;
const Moon = (props) => <IconBase {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></IconBase>;
const Search = (props) => <IconBase {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></IconBase>;
const Wind = (props) => <IconBase {...props}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></IconBase>;
const Droplets = (props) => <IconBase {...props}><path d="M7 16.3c2.2 0 4-1.8 4-4 0-2-2-4-4-4-2 0-4 2-4 4 0 2.2 1.8 4 4 4z"/><path d="M17 16.3c2.2 0 4-1.8 4-4 0-2-2-4-4-4-2 0-4 2-4 4 0 2.2 1.8 4 4 4z"/><path d="M12 12c2.2 0 4-1.8 4-4 0-2-2-4-4-4-2 0-4 2-4 4 0 2.2 1.8 4 4 4z"/></IconBase>;
const Calendar = (props) => <IconBase {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></IconBase>;
const X = (props) => <IconBase {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></IconBase>;
const Menu = (props) => <IconBase {...props}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></IconBase>;
const Trash2 = (props) => <IconBase {...props}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></IconBase>;
const Plus = (props) => <IconBase {...props}><path d="M5 12h14"/><path d="M12 5v14"/></IconBase>;
const ChevronLeft = (props) => <IconBase {...props}><path d="m15 18-6-6 6-6"/></IconBase>;
const ChevronRight = (props) => <IconBase {...props}><path d="m9 18 6-6-6-6"/></IconBase>;
const Clock = (props) => <IconBase {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></IconBase>;
const WifiOff = (props) => <IconBase {...props}><line x1="1" x2="23" y1="1" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></IconBase>;
const Download = (props) => <IconBase {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></IconBase>;
const Bell = (props) => <IconBase {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></IconBase>;
const BellOff = (props) => <IconBase {...props}><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" x2="23" y1="1" y2="23"/></IconBase>;
const Settings = (props) => <IconBase {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></IconBase>;
const Zap = (props) => <IconBase {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></IconBase>;
const RefreshCcw = (props) => <IconBase {...props}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></IconBase>;
const Check = (props) => <IconBase {...props}><polyline points="20 6 9 17 4 12"/></IconBase>;

// --- IndexedDB Helper ---
const DB_NAME = 'WeatherAppDB';
const DB_VERSION = 1;
const STORE_CITIES = 'cities';
const STORE_SETTINGS = 'settings';

const dbPromise = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_CITIES)) db.createObjectStore(STORE_CITIES, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

const saveToDB = async (storeName, data) => {
    try {
        const db = await dbPromise();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        if (Array.isArray(data)) {
            await store.clear(); 
            data.forEach(item => store.put(item));
        } else {
            store.put(data);
        }
        return tx.complete;
    } catch (e) {
        console.error("DB Save Error:", e);
    }
};

const loadFromDB = async (storeName) => {
    try {
        const db = await dbPromise();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
        });
    } catch (e) {
        console.error("DB Load Error:", e);
        return [];
    }
};

// --- Global Styles & Tailwind Injector ---
const GlobalStyles = () => {
    useEffect(() => {
        if (!window.tailwind && !document.querySelector('script[src*="tailwindcss"]')) {
            console.log("Tailwind CSS not found, injecting CDN...");
            const script = document.createElement('script');
            script.src = "https://cdn.tailwindcss.com";
            script.onload = () => {
                window.tailwind.config = {
                    darkMode: 'class',
                    theme: {
                        extend: {
                            fontFamily: {
                                sans: ['Vazirmatn', 'sans-serif'],
                            },
                            colors: {
                                glass: {
                                    light: 'rgba(255, 255, 255, 0.2)',
                                    dark: 'rgba(15, 23, 42, 0.4)',
                                    border: 'rgba(255, 255, 255, 0.1)',
                                }
                            },
                            animation: {
                                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
                            },
                            keyframes: {
                                fadeInUp: {
                                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                                    '100%': { opacity: '1', transform: 'translateY(0)' },
                                }
                            }
                        }
                    }
                };
            };
            document.head.appendChild(script);
        }
    }, []);

    return (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;300;400;500;700;900&display=swap');
        
        body {
            font-family: 'Vazirmatn', sans-serif;
            overflow: hidden;
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.8); }
        /* --- Default Glass Panel (For Sidebar/Main) --- */
        .glass-panel {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }
        
        .dark .glass-panel {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* --- HIGH CONTRAST GLASS (For Modals) --- */
        .modal-glass {
            background: rgba(255, 255, 255, 0.95); /* Nearly opaque white for light mode */
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.8);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        }
        .dark .modal-glass {
            background: rgba(15, 23, 42, 0.95); /* Nearly opaque dark for dark mode */
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }
        @keyframes rotation {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .loader {
            width: 48px;
            height: 48px;
            border: 5px solid currentColor;
            border-bottom-color: transparent;
            border-radius: 50%;
            display: inline-block;
            box-sizing: border-box;
            animation: rotation 1s linear infinite;
        }
        
        .animate-fade-in-up {
            animation: fadeInUp 0.3s ease-out forwards;
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `}</style>
    );
};

// --- Date Utils (Jalaali/Gregorian) ---
const jalaali = {
  toJalaali: (gy, gm, gd) => {
    let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + parseInt((gy2 + 3) / 4) - parseInt((gy2 + 99) / 100) + parseInt((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * parseInt(days / 12053);
    days %= 12053;
    jy += 4 * parseInt(days / 1461);
    days %= 1461;
    jy += parseInt((days - 1) / 365);
    if (days > 365) days = (days - 1) % 365;
    let jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
    let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return { jy, jm, jd };
  },
  toGregorian: (jy, jm, jd) => {
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + ((parseInt(jy / 33)) * 8) + parseInt(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * parseInt(days / 146097);
    days %= 146097;
    if (days > 36524) { gy += 100 * parseInt(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * parseInt(days / 1461);
    days %= 1461;
    if (days > 365) { gy += parseInt((days - 1) / 365); days = (days - 1) % 365; }
    let gd = days + 1;
    let sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 13; gm++) {
      let v = sal_a[gm];
      if (gd <= v) break;
      gd -= v;
    }
    return { gy, gm, gd };
  },
  monthLength: (jy, jm) => {
      if (jm <= 6) return 31;
      if (jm <= 11) return 30;
      const isLeap = (((((jy % 33) + 1) * 683) % 2816) < 683); 
      return isLeap ? 30 : 29;
  }
};

const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// --- Utility Functions ---
const toPersianDigits = (n) => {
    if (n === undefined || n === null || Number.isNaN(n)) return '-';
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return n.toString().replace(/\d/g, x => farsiDigits[x]);
};

const getPersianDate = (dateStr) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
};

const getPersianDayMonth = (dateStr) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(d);
};

const getWeatherStatus = (code) => {
    if (code === 0) return { label: 'صاف', icon: 'Sun' };
    if (code >= 1 && code <= 3) return { label: 'کمی ابری', icon: 'Cloud' };
    if (code >= 45 && code <= 48) return { label: 'مه‌آلود', icon: 'Cloud' };
    if (code >= 51 && code <= 67) return { label: 'بارانی', icon: 'Rain' };
    if (code >= 71 && code <= 77) return { label: 'برفی', icon: 'Cloud' };
    if (code >= 80 && code <= 82) return { label: 'رگبار', icon: 'Rain' };
    if (code >= 95) return { label: 'طوفانی', icon: 'Rain' };
    return { label: 'نامشخص', icon: 'Sun' };
};

// --- MOVED FUNCTIONS (For usage in initApp) ---
const fetchRawWeatherData = async (lat, lon) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,uv_index&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,windspeed_10m_max,uv_index_max&timezone=auto&past_days=7&forecast_days=7`;
    const res = await axios.get(url);
    return res.data;
};

const processWeatherData = (data, name, id = Date.now(), customDays = []) => {
    const daily = data.daily;
    const hourlyTemps = data.hourly.temperature_2m;
    const hourlyHumid = data.hourly.relativehumidity_2m;
    
    const nowTime = new Date().getTime();
    const hourIndex = data.hourly.time.findIndex(t => {
        const time = new Date(t).getTime();
        return Math.abs(time - nowTime) < 3600000;
    });
    
    const currentHumidity = (hourIndex !== -1 && hourlyHumid) ? hourlyHumid[hourIndex] : null;
    const currentUV = (hourIndex !== -1 && data.hourly.uv_index) ? data.hourly.uv_index[hourIndex] : null;
    
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayIndex = data.daily.time.indexOf(todayStr);
    const todayUVIndex = dayIndex !== -1 ? dayIndex : 7; 
    const todayMaxUV = daily.uv_index_max ? daily.uv_index_max[todayUVIndex] : null;

    const getDailyHumidity = (dayIdx) => {
        if (!hourlyHumid) return 0;
        const start = dayIdx * 24;
        const end = start + 24;
        const slice = hourlyHumid.slice(start, end);
        if (slice.length === 0) return 0;
        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / slice.length;
    };

    const allDays = daily.time.map((t, i) => ({
        dateRaw: t,
        dayName: getPersianDate(t).split(' ')[0],
        fullDate: getPersianDayMonth(t),
        high: daily.temperature_2m_max[i],
        low: daily.temperature_2m_min[i],
        status: getWeatherStatus(daily.weathercode[i]),
        rainChance: daily.precipitation_probability_max[i] || 0,
        wind: daily.windspeed_10m_max[i],
        uv: daily.uv_index_max ? daily.uv_index_max[i] : null,
        humidity: getDailyHumidity(i), 
        hourly: hourlyTemps.slice(i * 24, (i + 1) * 24)
    }));
    const pastDays = allDays.slice(0, 7).reverse();
    const futureDays = allDays.slice(7);

    return {
        id: id,
        name: name,
        lat: data.latitude,
        lon: data.longitude,
        temp: data.current_weather.temperature,
        status: getWeatherStatus(data.current_weather.weathercode).label,
        statusIcon: getWeatherStatus(data.current_weather.weathercode).icon,
        high: daily.temperature_2m_max[todayUVIndex],
        low: daily.temperature_2m_min[todayUVIndex],
        wind: data.current_weather.windspeed,
        humidity: currentHumidity, 
        uv: currentUV !== null ? currentUV : todayMaxUV, 
        feelsLike: data.current_weather.temperature, 
        chart: futureDays[0] ? futureDays[0].hourly : [], 
        future: futureDays,
        past: pastDays,
        custom: customDays
    };
};

// --- Components ---
const WeatherChart = ({ data, color, isHourly }) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data) + (isHourly ? 1 : 2);
    const minVal = Math.min(...data) - (isHourly ? 1 : 2);
    const height = 100; // Increased height slightly
    const width = 300;
    const stepX = width / (data.length - 1);
    const rangeY = maxVal - minVal;
    const scaleY = rangeY === 0 ? 0 : height / rangeY;
    
    const points = data.map((val, i) => {
            const y = rangeY === 0 ? height / 2 : height - ((val - minVal) * scaleY);
            return `${i * stepX},${y}`;
    }).join(' ');
    
    const areaPath = `M0,${height} L${points} L${width},${height} Z`;
    return (
        <div className="w-full mt-4">
            <svg viewBox={`0 0 ${width} ${height + 30}`} className="w-full h-40 overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#chartGradient)" />
                <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
                {data.map((val, i) => {
                        const x = i * stepX;
                        const y = rangeY === 0 ? height / 2 : height - ((val - minVal) * scaleY);
                        
                        // Show label logic: if hourly (24 points), show every 3 hours (0, 3, 6, 9, 12, 15, 18, 21, 23?)
                        // If daily (7-14 points), show all
                        const showLabel = !isHourly || i % 3 === 0 || i === data.length - 1;
                        
                        return (
                            <g key={i} className="group cursor-pointer">
                                <circle cx={x} cy={y} r={isHourly ? 2 : 4} fill={color} className="transition-all duration-300 group-hover:r-6" />
                                <text x={x} y={y - 12} textAnchor="middle" fill={color} fontSize="12" className={`${isHourly ? 'opacity-0' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-300 font-bold`}>{toPersianDigits(Math.round(val))}°</text>
                                
                                {/* X-axis Labels */}
                                {showLabel && (
                                    <text x={x} y={height + 20} textAnchor="middle" fill={color} fontSize="10" className="opacity-60">
                                        {isHourly ? toPersianDigits(i + ':00') : ''}
                                    </text>
                                )}
                            </g>
                        )
                })}
            </svg>
        </div>
    );
};

const LoadingSpinner = () => (
        <div className="flex flex-col items-center justify-center p-8">
            <span className="loader mb-4 text-blue-600 dark:text-white"></span>
            <p className="font-bold animate-pulse text-blue-900 dark:text-white">در حال دریافت اطلاعات...</p>
        </div>
);

const SplashScreen = ({ darkMode, error, onRetry, onContinueOffline, hasData }) => (
    <div className={`fixed inset-0 z-[60] flex flex-col items-center justify-center transition-colors duration-500 ${darkMode ? 'bg-slate-900' : 'bg-blue-50'}`}>
        <div className="relative">
            <div className={`w-32 h-32 rounded-full blur-2xl opacity-40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse ${darkMode ? 'bg-indigo-500' : 'bg-yellow-400'}`}></div>
            {darkMode ? (
                <Moon className="w-24 h-24 text-indigo-300 relative z-10 animate-bounce" />
            ) : (
                <Sun className="w-24 h-24 text-yellow-500 relative z-10 animate-spin" style={{animationDuration: '8s'}} />
            )}
        </div>
        <h1 className={`text-4xl font-black mt-8 font-sans ${darkMode ? 'text-white' : 'text-blue-900'}`}>هواشناسی</h1>
        <div className="mt-8 flex flex-col items-center px-6 text-center">
             {!error ? (
                <p className={`text-lg font-bold animate-pulse font-sans ${darkMode ? 'text-indigo-200' : 'text-blue-400'}`}>در حال دریافت آخرین اطلاعات...</p>
             ) : (
                <div className="flex flex-col gap-4 items-center animate-fade-in-up">
                    <p className="text-red-500 font-bold max-w-xs">{error}</p>
                    <button onClick={onRetry} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg font-bold transition-all">تلاش مجدد</button>
                    {hasData && (
                        <button onClick={onContinueOffline} className="text-sm font-bold opacity-70 hover:opacity-100 dark:text-white text-slate-700 underline underline-offset-4">ادامه به صورت آفلاین (داده‌های قبلی)</button>
                    )}
                </div>
             )}
        </div>
    </div>
);

const OfflineAlertModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
             <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up text-center border border-red-500/20">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <WifiOff className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">خطا در اتصال</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6">برقراری ارتباط با سرور ممکن نیست. لطفا اتصال اینترنت خود را بررسی کنید.</p>
                <button onClick={onClose} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg">
                    متوجه شدم
                </button>
             </div>
        </div>
    );
};

const InstallPromptModal = ({ isOpen, onClose, onInstall }) => {
    const [dontShow, setDontShow] = useState(false);
    useEffect(() => {
        if(isOpen) setDontShow(false);
    }, [isOpen]);
    if (!isOpen) return null;
    const handleClose = () => {
        onClose(dontShow); // Pass the preference back
    };
    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={handleClose}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up pointer-events-auto border border-blue-500/20">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">نصب اپلیکیشن</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">برای دسترسی بهتر و آفلاین، اپلیکیشن را نصب کنید. همچنین می‌توانید بعداً از طریق منو آن را نصب کنید.</p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                        <Download className="w-6 h-6" />
                    </div>
                </div>
                
                <div className="flex items-center gap-3 mb-6 cursor-pointer group" onClick={() => setDontShow(!dontShow)}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${dontShow ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500 group-hover:border-blue-500'}`}>
                        {dontShow && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 select-none">دیگر نمایش نده</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleClose} className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        بعداً
                    </button>
                    <button onClick={onInstall} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all">
                        نصب کن
                    </button>
                </div>
            </div>
        </div>
    );
};

const NotificationSettingsModal = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    
    useEffect(() => {
        if(isOpen) setLocalSettings(settings);
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };
    
    // --- UPDATED TOGGLE LOGIC FOR NATIVE WEB PUSH ---
    const toggleEnabled = async () => {
        if (!localSettings.enabled) {
            // Turning ON
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Check if SW is ready
                    if ('serviceWorker' in navigator) {
                        const registration = await navigator.serviceWorker.ready;
                        if (!registration) {
                            alert("سرویس ورکر هنوز آماده نیست. لطفا صفحه را رفرش کنید.");
                            return;
                        }
                        setLocalSettings(prev => ({ ...prev, enabled: true }));
                    } else {
                        alert("مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند.");
                    }
                } else {
                    alert("اجازه ارسال نوتیفیکیشن داده نشد.");
                }
            } catch (error) {
                console.error("Push Permission Error", error);
                alert("خطا در دریافت مجوز نوتیفیکیشن.");
            }
        } else {
            // Turning OFF
            setLocalSettings(prev => ({ ...prev, enabled: false }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative modal-glass rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up text-slate-900 dark:text-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Bell className="w-6 h-6" /> تنظیمات برنامه</h3>
                    <button onClick={onClose}><X className="w-5 h-5 opacity-60 hover:opacity-100" /></button>
                </div>
                
                <div className="space-y-6">
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-white/5 p-4 rounded-xl cursor-pointer" onClick={toggleEnabled}>
                        <span className="font-bold text-sm">دریافت نوتیفیکیشن</span>
                        <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${localSettings.enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${localSettings.enabled ? 'left-[calc(100%-1.25rem)]' : 'left-1'}`}></div>
                        </div>
                    </div>

                    {localSettings.enabled ? (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl text-sm leading-relaxed border border-blue-100 dark:border-blue-900/30">
                            نوتیفیکیشن‌های هوشمند فعال هستند. در صورت تغییر ناگهانی دما یا بارش باران/برف به شما اطلاع داده خواهد شد.
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-xl text-sm font-bold border border-yellow-200 dark:border-yellow-900/30">
                            بخش نوتیفیکیشن در حال حاضر غیرفعال است.
                        </div>
                    )}

                    <button onClick={handleSave} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-[0.98]">
                        ذخیره تنظیمات
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddCityModal = ({ isOpen, onClose, onAddCity }) => {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (input.length > 2) {
                setLoading(true);
                try {
                    const response = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${input}&count=5&language=fa&format=json`);
                    if (response.data.results) {
                        setSuggestions(response.data.results);
                    } else {
                        setSuggestions([]);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            } else {
                setSuggestions([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [input]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative modal-glass rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up text-slate-900 dark:text-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">افزودن شهر جدید</h3>
                    <button onClick={onClose}><X className="w-5 h-5 opacity-60 hover:opacity-100" /></button>
                </div>
                
                <div className="relative">
                    <input type="text" placeholder="نام شهر را بنویسید (مثلا: مشهد)" className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 border-none focus:ring-2 focus:ring-blue-500 outline-none transition-colors text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400" value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
                    <Search className="absolute right-3 top-3.5 w-5 h-5 text-slate-500 dark:text-slate-400" />
                    
                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden z-20 border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                            {suggestions.map(s => (
                                <div key={s.id} onClick={() => { onAddCity({ name: s.name, lat: s.latitude, lon: s.longitude, country: s.country }); onClose(); }} className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                                        <span className="text-xs opacity-60 text-slate-700 dark:text-slate-300">{s.admin1 || ''} - {s.country}</span>
                                    </div>
                                    <Plus className="w-4 h-4 opacity-50 text-slate-500 dark:text-slate-400" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Updated Calendar Modal ---
const CalendarModal = ({ isOpen, onClose, onSelectRange }) => {
    const [viewDate, setViewDate] = useState({ year: 1402, month: 1 });
    const [startDay, setStartDay] = useState(null); // {year, month, day}
    const [endDay, setEndDay] = useState(null); // {year, month, day}
    
    // Initialize with today's date
    useEffect(() => {
        if(isOpen) {
            const now = new Date();
            const jDate = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
            setViewDate({ year: jDate.jy, month: jDate.jm });
        }
    }, [isOpen]);
    const handleMonthChange = (direction) => {
        let { year, month } = viewDate;
        if (direction === 'next') {
            month++;
            if (month > 12) { month = 1; year++; }
        } else {
            month--;
            if (month < 1) { month = 12; year--; }
        }
        setViewDate({ year, month });
    };
    const handleDayClick = (day) => {
        const clickedDate = { year: viewDate.year, month: viewDate.month, day };
        
        // Logic to determine if clicking constitutes a start or end
        const isClickedBeforeStart = startDay && (
            clickedDate.year < startDay.year || 
            (clickedDate.year === startDay.year && clickedDate.month < startDay.month) ||
            (clickedDate.year === startDay.year && clickedDate.month === startDay.month && clickedDate.day < startDay.day)
        );
        if (!startDay || (startDay && endDay) || isClickedBeforeStart) {
            setStartDay(clickedDate);
            setEndDay(null);
        } else {
            setEndDay(clickedDate);
        }
    };
    const confirmSelection = () => {
        if (startDay && endDay) {
            onSelectRange(startDay, endDay);
            onClose();
        }
    };
    if (!isOpen) return null;
    // Calculate calendar grid
    const daysInMonth = jalaali.monthLength(viewDate.year, viewDate.month);
    // Determine start day of week (0=Sat, 1=Sun... in our logic, but Gregorian gives 0=Sun. 
    // Jalaali converter gives Gregorian date of 1st of month.
    const firstDayGreg = jalaali.toGregorian(viewDate.year, viewDate.month, 1);
    const dateObj = new Date(firstDayGreg.gy, firstDayGreg.gm - 1, firstDayGreg.gd);
    let startDayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon... 6=Sat
    // Convert to Persian week (Sat=0, Sun=1, ... Fri=6)
    // Greg: Sun(0), Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6)
    // Pers: Sat(0), Sun(1), Mon(2), Tue(3), Wed(4), Thu(5), Fri(6)
    // Mapping: (Greg + 1) % 7
    startDayOfWeek = (startDayOfWeek + 1) % 7;
    const daysArray = Array.from({length: daysInMonth}, (_, i) => i + 1);
    const emptySlots = Array.from({length: startDayOfWeek}, () => null);
    // Helpers to check selection status
    const isSelected = (d) => {
        if (!startDay) return false;
        const current = {year: viewDate.year, month: viewDate.month, day: d};
        
        // Check exact match for start or end
        const isStart = current.year === startDay.year && current.month === startDay.month && current.day === startDay.day;
        const isEnd = endDay && current.year === endDay.year && current.month === endDay.month && current.day === endDay.day;
        
        if (isStart || isEnd) return 'edge';
        // Check in range
        if (startDay && endDay) {
            // Simplify comparison by converting to numeric value YYYYMMDD
            const vCurr = current.year * 10000 + current.month * 100 + current.day;
            const vStart = startDay.year * 10000 + startDay.month * 100 + startDay.day;
            const vEnd = endDay.year * 10000 + endDay.month * 100 + endDay.day;
            if (vCurr > vStart && vCurr < vEnd) return 'range';
        }
        return false;
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative modal-glass rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up text-slate-900 dark:text-white">
                    <h3 className="text-xl font-bold mb-4 text-center">انتخاب بازه تاریخی</h3>
                    
                    <div className="flex items-center justify-between mb-4 px-2">
                        <button onClick={() => handleMonthChange('prev')} className="p-1 hover:bg-black/10 rounded-full"><ChevronRight className="w-5 h-5" /></button>
                        <div className="font-bold text-lg">{persianMonths[viewDate.month - 1]} {toPersianDigits(viewDate.year)}</div>
                        <button onClick={() => handleMonthChange('next')} className="p-1 hover:bg-black/10 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                    </div>
                    <div className="mb-2 flex justify-center items-center px-2 font-bold opacity-80 min-h-[24px]">
                        <span className="text-xs font-normal opacity-70">
                            {startDay ? `${toPersianDigits(startDay.day)} ${persianMonths[startDay.month-1]}` : ''} 
                            {endDay ? ` تا ${toPersianDigits(endDay.day)} ${persianMonths[endDay.month-1]}` : ''}
                        </span>
                    </div>
                    <div className="calendar-grid mb-6">
                        {['ش','ی','د','س','چ','پ','ج'].map(d => <div key={d} className="text-center text-xs opacity-50 mb-2 font-bold">{d}</div>)}
                        
                        {emptySlots.map((_, i) => <div key={`empty-${i}`}></div>)}
                        
                        {daysArray.map(d => {
                            const status = isSelected(d);
                            let bgClass = "hover:bg-blue-500/10 dark:hover:bg-blue-500/20";
                            if (status === 'edge') bgClass = "bg-blue-600 text-white shadow-md z-10 scale-105";
                            if (status === 'range') bgClass = "bg-blue-100 text-blue-900 dark:bg-blue-500/30 dark:text-blue-100 font-bold rounded-none mx-[-2px]";
                            
                            return (
                                <div key={d} onClick={() => handleDayClick(d)} 
                                        className={`text-center py-2 rounded-lg cursor-pointer transition-all relative text-sm ${bgClass}`}>
                                    {toPersianDigits(d)}
                                </div>
                            )
                        })}
                    </div>
                    <button onClick={confirmSelection} disabled={!startDay || !endDay} 
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition-all font-bold">
                        تایید و دریافت اطلاعات
                    </button>
            </div>
        </div>
    );
};

const DayDetailModal = ({ isOpen, onClose, day, city }) => {
    if (!isOpen || !day) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative modal-glass rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in-up text-slate-900 dark:text-white border-t border-white/20 max-h-[85vh] overflow-y-auto overflow-x-hidden p-0">
                
                {/* Header */}
                <div className="sticky top-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 flex justify-between items-center z-10 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-black">{day.dayName}</h2>
                        <p className="text-xs opacity-60">{city} - {day.fullDate}</p>
                    </div>
                    <button onClick={onClose} className="p-1 bg-black/5 dark:bg-white/10 rounded-full"><X className="w-5 h-5 opacity-60 hover:opacity-100" /></button>
                </div>
                <div className="p-5 flex flex-col gap-5">
                    {/* Main Temp & Icon */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <div className="text-5xl font-black tracking-tighter leading-none">{toPersianDigits(Math.round(day.high))}°</div>
                            <div className="text-sm font-bold opacity-60 mt-1">حداقل: {toPersianDigits(Math.round(day.low))}°</div>
                        </div>
                        <div>
                            {day.status.icon === 'Sun' && <Sun className="w-16 h-16 text-yellow-500 animate-pulse-slow" />}
                            {day.status.icon === 'Cloud' && <Cloud className="w-16 h-16 text-blue-400" />}
                            {day.status.icon === 'Rain' && <Droplets className="w-16 h-16 text-blue-600" />}
                        </div>
                    </div>
                    {/* Compact Grid Details - Corrected Data */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl flex items-center gap-3">
                            <Wind className="w-5 h-5 text-teal-500" />
                            <div><div className="text-[10px] opacity-50 font-bold uppercase">باد</div><div className="font-bold text-sm">{toPersianDigits(Math.round(day.wind))} <span className="text-[10px]">km/h</span></div></div>
                        </div>
                        <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl flex items-center gap-3">
                            <Droplets className="w-5 h-5 text-blue-500" />
                            <div><div className="text-[10px] opacity-50 font-bold uppercase">بارش</div><div className="font-bold text-sm">{toPersianDigits(Math.round(day.rainChance))}%</div></div>
                        </div>
                        <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl flex items-center gap-3">
                            <Droplets className="w-5 h-5 text-cyan-500" />
                            <div><div className="text-[10px] opacity-50 font-bold uppercase">میانگین رطوبت</div><div className="font-bold text-sm">{toPersianDigits(Math.round(day.humidity))}%</div></div>
                        </div>
                        <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl flex items-center gap-3">
                            <Sun className="w-5 h-5 text-orange-500" />
                            <div><div className="text-[10px] opacity-50 font-bold uppercase">حداکثر UV</div><div className="font-bold text-sm">{day.uv !== null && day.uv !== undefined ? toPersianDigits(day.uv.toFixed(1)) : '-'}</div></div>
                        </div>
                    </div>
                    
                    {/* Hourly Chart */}
                    {day.hourly && day.hourly.length > 0 && (
                        <div className="bg-slate-100/50 dark:bg-black/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2 opacity-70 text-xs font-bold">
                                <Clock className="w-3 h-3" />
                                <span>دمای ساعتی</span>
                            </div>
                            <WeatherChart data={day.hourly} color="#6366f1" isHourly={true} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const WeatherApp = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [cities, setCities] = useState([]);
    const [selectedCityId, setSelectedCityId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNotifSettingsOpen, setIsNotifSettingsOpen] = useState(false); // New
    const [forecastTab, setForecastTab] = useState('future'); 
    const [selectedDay, setSelectedDay] = useState(null);
    const [customLoading, setCustomLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [apiSuccess, setApiSuccess] = useState(true); // NEW STATE: For API connection status
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isAppReady, setIsAppReady] = useState(false); 
    const [installPrompt, setInstallPrompt] = useState(null); 
    // New State for Splash Error
    const [splashError, setSplashError] = useState(null);
    const [splashHasData, setSplashHasData] = useState(false);
    const [offlineAlertOpen, setOfflineAlertOpen] = useState(false); // New State for Offline Alert
    const [isRefreshing, setIsRefreshing] = useState(false); // New State for Refresh Button
    const [showInstallModal, setShowInstallModal] = useState(false); // New State for Install Modal
    
    // Ref to hold the dismiss preference synchronously for the event listener
    const isInstallDismissedRef = useRef(false);
    // Updated Settings State Structure
    const [notificationSettings, setNotificationSettings] = useState({
        enabled: false,
        type: 'change', // 'change' (temp diff) or 'period' (time based)
        threshold: 2, // degrees for change
        period: 60, // minutes for period
        lastNotifTime: 0,
        lastNotifTemp: {} // Store last notified temp per city {cityId: temp}
    }); 
    
    const citiesRef = useRef(cities); 
    const notifSettingsRef = useRef(notificationSettings); // Need ref for polling
    const isSettingsLoaded = useRef(false);

    // --- Web Push: Sync Logic (Modified) ---
    useEffect(() => {
        const syncWebPush = async () => {
            // Check prerequisites: cities loaded, city selected, settings loaded
            if (cities.length === 0 || !selectedCityId || !isSettingsLoaded.current) return;
            
            const currentCity = cities.find(c => c.id === selectedCityId);
            if (!currentCity) return;

            // If notifications are enabled, ensure we have a subscription and sync with backend
            if (notificationSettings.enabled) {
                if ('serviceWorker' in navigator && 'PushManager' in window) {
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        
                        // 1. Get or Create Subscription
                        let subscription = await registration.pushManager.getSubscription();
                        if (!subscription) {
                            subscription = await registration.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                            });
                        }

                        // 2. Prepare Payload
                        const payload = {
                            subscription: subscription, // Contains endpoint, keys (p256dh, auth)
                            lat: currentCity.lat,
                            lon: currentCity.lon,
                            city: currentCity.name,
                            settings: notificationSettings
                        };

                        console.log("Syncing Push Subscription...", payload);
                        
                        // 3. Send to Backend
                        await axios.post(BACKEND_URL, payload);
                        console.log("Synced successfully.");

                    } catch (error) {
                        console.error("Web Push Sync Error:", error);
                        // Optional: Disable notifications visually if subscription fails hard
                    }
                }
            } else {
                // Logic for when disabled? 
                // We can optionally send a "delete" request, but usually just stop sending is enough.
                // For completeness, we could send { subscription: ..., enabled: false } if needed.
            }
        };

        syncWebPush();

    }, [selectedCityId, cities, notificationSettings]); // Run when city or settings change

    // --- Helper to Send Notification (Legacy Local) ---
    const sendNotification = (title, body) => {
        if (Notification.permission === 'granted' && notificationSettings.enabled) {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                // Use SW if active (Better for mobile)
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: '/icon-192.png', 
                        badge: '/icon-192.png',
                        vibrate: [200, 100, 200]
                    });
                });
            } else {
                // Fallback to Main Thread Notification
                new Notification(title, { body, icon: '/icon-192.png' });
            }
        }
    };

    // --- Init: Load Data from DB & Register SW ---
    const initApp = async () => {
        setSplashError(null);
        let hasLocalData = false;

        // --- 1. Register Service Worker ---
        if ('serviceWorker' in navigator) {
            try {
                // We assume sw.js will be in the root (created in next steps)
                const reg = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker Registered:', reg.scope);
            } catch (err) {
                console.error('Service Worker Registration Failed:', err);
            }
        }

        try {
            // Load Settings First
            const settings = await loadFromDB(STORE_SETTINGS);
            const dm = settings.find(s => s.key === 'darkMode');
            if (dm) setDarkMode(dm.value);
            const notif = settings.find(s => s.key === 'notificationSettings');
            if (notif) setNotificationSettings(notif.value);
            
            // Check install dismissed setting
            const dismissed = settings.find(s => s.key === 'installPromptDismissed');
            if (dismissed && dismissed.value === true) {
                isInstallDismissedRef.current = true;
            }
            // Load Cached Cities
            const citiesData = await loadFromDB(STORE_CITIES);
            if (citiesData && citiesData.length > 0) {
                setCities(citiesData);
                setSelectedCityId(citiesData[0].id);
                setSplashHasData(true);
                hasLocalData = true;
            }
            // Start API Update with Timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('TIMEOUT')), 5000)
            );
            // Only fetch if we have cities to fetch, otherwise app is "ready" but empty
            if (citiesData && citiesData.length > 0) {
                 const fetchPromise = Promise.all(citiesData.map(async (city) => {
                    const data = await fetchRawWeatherData(city.lat, city.lon);
                    return processWeatherData(data, city.name, city.id, city.custom);
                 }));
                 // Race: API vs Timeout
                 const updatedCities = await Promise.race([fetchPromise, timeoutPromise]);
                 
                 // If API wins:
                 setCities(updatedCities);
                 setLastUpdated(new Date());
                 setIsAppReady(true);
                 setApiSuccess(true); // Mark API as successful
                 isSettingsLoaded.current = true;
            } else {
                 // No cities to update, just open
                 setIsAppReady(true);
                 setIsModalOpen(true); // Open add city modal if empty
                 isSettingsLoaded.current = true;
            }
        } catch (error) {
            console.error("Init Error:", error);
            // Single unified message as requested
            setSplashError("ارتباط برقرار نشد");
            setApiSuccess(false); // Mark API as failed
            
            // Ensure button shows if we have local data (checking local variable to be sure)
            if (hasLocalData) {
                setSplashHasData(true);
            }
        }
    };

    useEffect(() => {
        initApp();
        // 3. Online/Offline Listeners
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // 4. PWA Install Listener
        const handleInstallPrompt = (e) => {
            console.log("Install Prompt Fired!"); // Debug Log
            e.preventDefault();
            setInstallPrompt(e);
            // Only show if not dismissed previously
            if (!isInstallDismissedRef.current) {
                setShowInstallModal(true);
            }
        };
        window.addEventListener('beforeinstallprompt', handleInstallPrompt);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        };
    }, []);

    // --- Sync State to Ref for Polling ---
    useEffect(() => {
        citiesRef.current = cities;
    }, [cities]);
    useEffect(() => {
        notifSettingsRef.current = notificationSettings;
    }, [notificationSettings]);

    // --- Save to DB on Change ---
    useEffect(() => {
        if(cities.length > 0) {
            saveToDB(STORE_CITIES, cities);
        }
    }, [cities]);
    useEffect(() => {
        // Only save to DB if initial load is complete
        if (isSettingsLoaded.current) {
            saveToDB(STORE_SETTINGS, { key: 'darkMode', value: darkMode });
            saveToDB(STORE_SETTINGS, { key: 'notificationSettings', value: notificationSettings });
        }
        
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode, notificationSettings]);

    // --- Refactored Refresh Function for Manual Use & Polling ---
    const refreshAllCities = async (manual = false) => {
        if (manual) setIsRefreshing(true);
        try {
            // 1. Check navigator.onLine immediately
            if (!navigator.onLine) {
                setIsOnline(false);
                setApiSuccess(false);
                if (manual) setOfflineAlertOpen(true);
                return;
            }
            const currentCities = citiesRef.current;
            const settings = notifSettingsRef.current;
            if (currentCities.length === 0) return;
            console.log("Refreshing updates...");
            
            // Track success of at least one request
            let anySuccess = false;
            const updatedCities = await Promise.all(currentCities.map(async (city) => {
                try {
                    const data = await fetchRawWeatherData(city.lat, city.lon);
                    anySuccess = true; // Mark as successful
                    return processWeatherData(data, city.name, city.id, city.custom);
                } catch (e) {
                    console.error("Update failed for", city.name);
                    return city; 
                }
            }));
            
            // Update status based on results
            if (anySuccess) {
                setApiSuccess(true);
                setIsOnline(true); // We successfully fetched data
                setCities(updatedCities);
                setLastUpdated(new Date());
                
                // --- Notification Logic ---
                if (settings.enabled && updatedCities.length > 0) {
                    const now = Date.now();
                    let shouldNotify = false;
                    let notifBody = "";
                    let newNotifState = { ...settings };
                    // Get selected city or first one
                    const targetCity = updatedCities[0]; 
                    const lastTemp = settings.lastNotifTemp?.[targetCity.id];
                    if (settings.type === 'change') {
                        // Check threshold
                        if (lastTemp !== undefined) {
                            if (Math.abs(targetCity.temp - lastTemp) >= settings.threshold) {
                                shouldNotify = true;
                                notifBody = `تغییر دما در ${targetCity.name}: از ${toPersianDigits(Math.round(lastTemp))} به ${toPersianDigits(Math.round(targetCity.temp))} درجه رسید.`;
                            }
                        } else {
                            // First time recording
                            newNotifState.lastNotifTemp = { ...newNotifState.lastNotifTemp, [targetCity.id]: targetCity.temp };
                            setNotificationSettings(newNotifState); 
                        }
                    } else if (settings.type === 'period') {
                        // Check time period (minutes * 60 * 1000)
                        const periodMs = settings.period * 60 * 1000;
                        if (now - settings.lastNotifTime > periodMs) {
                            shouldNotify = true;
                            notifBody = `دمای فعلی ${targetCity.name}: ${toPersianDigits(Math.round(targetCity.temp))} درجه`;
                        }
                    }
                    if (shouldNotify) {
                        sendNotification("وضعیت آب‌وهوا", notifBody);
                        // Update settings tracking
                        newNotifState.lastNotifTime = now;
                        newNotifState.lastNotifTemp = { ...newNotifState.lastNotifTemp, [targetCity.id]: targetCity.temp };
                        setNotificationSettings(newNotifState);
                    } else if (settings.type === 'change' && lastTemp === undefined) {
                            // Init tracking if needed
                            newNotifState.lastNotifTemp = { ...newNotifState.lastNotifTemp, [targetCity.id]: targetCity.temp };
                            setNotificationSettings(newNotifState);
                    }
                }
            } else {
                // All requests failed (likely network issue even if navigator.onLine is true)
                setApiSuccess(false);
                if (manual) setOfflineAlertOpen(true);
            }
        } finally {
            if (manual) setIsRefreshing(false);
        }
    };

    // --- 30s Polling Logic ---
    useEffect(() => {
        const interval = setInterval(() => {
            if(isAppReady) refreshAllCities(false);
        }, 30000); // 30 seconds check cycle
        return () => clearInterval(interval);
    }, [isAppReady]);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
            setShowInstallModal(false); // Close modal regardless
        });
    };
    
    const handleInstallModalClose = (dontShow) => {
        setShowInstallModal(false);
        if (dontShow) {
            isInstallDismissedRef.current = true;
            saveToDB(STORE_SETTINGS, { key: 'installPromptDismissed', value: true });
        }
    };

    // --- Helper Fetch Functions (Refactored for reuse) ---
    // REMOVED LOCAL DEFINITIONS (Moved to global scope)
    const handleAddCity = async (cityData) => {
        try {
            const data = await fetchRawWeatherData(cityData.lat, cityData.lon);
            const newCity = processWeatherData(data, cityData.name);
            setCities(prev => [...prev, newCity]);
            setSelectedCityId(newCity.id);
            setIsModalOpen(false);
            setLastUpdated(new Date());
            setApiSuccess(true);
        } catch (e) {
            console.error("Error fetching weather:", e);
            setApiSuccess(false);
            alert("خطا در دریافت اطلاعات آب و هوا. لطفا اتصال اینترنت را بررسی کنید.");
        }
    };

    const handleSelectRange = async (startJDate, endJDate) => {
        setCustomLoading(true);
        setForecastTab('custom');
        
        const city = cities.find(c => c.id === selectedCityId);
        if (!city) return;
        try {
            const sG = jalaali.toGregorian(startJDate.year, startJDate.month, startJDate.day);
            const eG = jalaali.toGregorian(endJDate.year, endJDate.month, endJDate.day);
            
            const fmt = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const startStr = fmt(sG.gy, sG.gm, sG.gd);
            const endStr = fmt(eG.gy, eG.gm, eG.gd);
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,windspeed_10m_max,uv_index_max&hourly=temperature_2m,relativehumidity_2m&timezone=auto&start_date=${startStr}&end_date=${endStr}`;
            
            const res = await axios.get(url);
            const daily = res.data.daily;
            const hourlyTemps = res.data.hourly.temperature_2m;
            const hourlyHumid = res.data.hourly.relativehumidity_2m;
            
            const customDays = daily.time.map((t, i) => {
                // Calc daily humidity
                const start = i * 24;
                const end = start + 24;
                const slice = hourlyHumid.slice(start, end);
                const avgHum = slice.length ? slice.reduce((a,b)=>a+b,0)/slice.length : 0;
                return {
                    dateRaw: t,
                    dayName: getPersianDate(t).split(' ')[0],
                    fullDate: getPersianDayMonth(t),
                    high: daily.temperature_2m_max[i],
                    low: daily.temperature_2m_min[i],
                    status: getWeatherStatus(daily.weathercode[i]),
                    rainChance: daily.precipitation_probability_max[i] || 0,
                    wind: daily.windspeed_10m_max[i],
                    uv: daily.uv_index_max ? daily.uv_index_max[i] : null,
                    humidity: avgHum,
                    hourly: hourlyTemps.slice(i * 24, (i + 1) * 24)
                };
            });
            setCities(prev => prev.map(c => c.id === selectedCityId ? { ...c, custom: customDays } : c));
            setApiSuccess(true);
        } catch(e) {
            console.error(e);
            setApiSuccess(false);
            alert("خطا در دریافت بازه زمانی. در حالت آفلاین این قابلیت در دسترس نیست.");
        } finally {
            setCustomLoading(false);
        }
    };

    const handleDeleteCity = (e, id) => {
        e.stopPropagation();
        const newCities = cities.filter(c => c.id !== id);
        setCities(newCities);
        if (newCities.length > 0 && selectedCityId === id) setSelectedCityId(newCities[0].id);
        if (newCities.length === 0) setIsModalOpen(true);
    };

    // Updated Background Gradients to match HTML version (Blue/Orange for light mode)
    const bgGradient = darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-black' 
        : 'bg-gradient-to-br from-blue-400 via-blue-100 to-orange-100';
    
    const accentColor = darkMode ? '#38bdf8' : '#ea580c'; // Matches HTML
    const selectedCity = cities.find(c => c.id === selectedCityId) || {};
    
    const isSystemOnline = isOnline && apiSuccess;

    // --- RENDER ---
    
    if (!isAppReady) {
        return <SplashScreen 
            darkMode={darkMode} 
            error={splashError} 
            onRetry={initApp} 
            hasData={splashHasData}
            onContinueOffline={() => setIsAppReady(true)}
        />;
    }
    if (cities.length === 0 && !isModalOpen) return null;
    return (
        <div className={`relative w-full h-[100dvh] flex flex-col lg:flex-row overflow-x-hidden transition-colors duration-700 ${bgGradient} text-slate-800 dark:text-slate-100`} dir="rtl">
            <GlobalStyles />
            
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}
            {/* Sidebar */}
            <aside className={`fixed lg:relative top-0 right-0 h-full w-80 z-50 lg:z-auto flex flex-col glass-panel border-l-0 border-y-0 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} bg-white/10 dark:bg-slate-900/90 lg:bg-transparent`}>
                <div className="p-6 flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-tight">هواشناسی</h2>
                    <div className="flex gap-2">
                        {/* --- CHANGE: Allow Install Button even if installPrompt is not ready yet on mobile, 
                           but disable it or just show logic. 
                           Better: Only show if installPrompt exists OR if standalone check fails (but that's complex without prompt).
                           For now, kept as is but added debug log above.
                           Ideally, manifest.json must be present for this to fire on Android.
                        */}
                        {installPrompt && (
                             <button onClick={handleInstallClick} className="w-8 h-8 rounded-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-500 flex items-center justify-center transition-all shadow-sm animate-pulse" title="نصب اپلیکیشن">
                                <Download className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={() => setIsModalOpen(true)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all shadow-sm"><Plus className="w-5 h-5" /></button>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-500 flex items-center justify-center transition-all"><X className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                    {cities.map((city) => (
                        <div key={city.id} onClick={() => { setSelectedCityId(city.id); setIsSidebarOpen(false); }} className={`group relative flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 ${selectedCityId === city.id ? 'bg-white/20 shadow-md dark:bg-white/10 dark:shadow-lg translate-x-[-4px]' : 'hover:bg-white/10 dark:hover:bg-white/5 hover:translate-x-[-2px]'}`}>
                            <div className="flex items-center gap-3">
                                {city.status.includes('باران') || city.status.includes('رگبار') ? <Droplets className="w-6 h-6 text-blue-300" /> : <Sun className={`w-6 h-6 ${selectedCityId === city.id ? 'text-yellow-300' : 'text-slate-400'}`} />}
                                <div className="flex flex-col"><span className={`font-bold text-lg ${selectedCityId === city.id ? 'opacity-100' : 'opacity-80'}`}>{city.name}</span><span className="text-xs opacity-60">{city.status}</span></div>
                            </div>
                            <div className="flex items-center gap-4"><span className="text-2xl font-bold">{toPersianDigits(Math.round(city.temp))}°</span>{cities.length > 0 && (<button onClick={(e) => handleDeleteCity(e, city.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"><Trash2 className="w-4 h-4" /></button>)}</div>
                            {selectedCityId === city.id && <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-yellow-400 rounded-l-full shadow-[0_0_10px_rgba(250,204,21,0.6)]"></div>}
                        </div>
                    ))}
                </div>
                <div className="p-4 mt-auto border-t border-white/10 flex gap-2">
                    <button onClick={() => setIsNotifSettingsOpen(true)} className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl transition-all font-medium ${notificationSettings.enabled ? 'bg-green-500/20 text-green-600 dark:text-green-300' : 'bg-black/5 dark:bg-white/5 opacity-60'}`}>
                        {notificationSettings.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setDarkMode(!darkMode)} className="flex-[3] flex items-center justify-center gap-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all font-medium">
                        {darkMode ? <><Sun className="w-5 h-5 text-yellow-400" /><span>حالت روز</span></> : <><Moon className="w-5 h-5 text-indigo-600" /><span>حالت شب</span></>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative flex flex-col p-4 lg:p-12 overflow-y-auto w-full overflow-x-hidden">
                {cities.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center opacity-50">
                        <div>لیست شهرها خالی است. لطفا یک شهر اضافه کنید.</div>
                    </div>
                ) : (
                <>
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-overlay"></div>
                <div className="absolute bottom-[-10%] right-[10%] w-80 h-80 bg-orange-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-overlay"></div>

                {/* Mobile Header (Updated) */}
                    <div className="lg:hidden flex flex-col gap-4 mb-6 z-30 relative">
                        <div className="flex items-center justify-between p-4 glass-panel rounded-2xl">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold">{selectedCity.name}</h1>
                                <span className="text-sm opacity-70 font-bold">{toPersianDigits(Math.round(selectedCity.temp))}°</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => !isRefreshing && refreshAllCities(true)} disabled={isRefreshing} className={`p-2 bg-white/10 rounded-lg transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}><RefreshCcw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
                                <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-lg"><Menu className="w-6 h-6" /></button>
                            </div>
                        </div>
                        {/* Mobile Status Bar */}
                        <div className="flex items-center justify-between px-2">
                             <div className="flex items-center gap-2 text-xs font-medium opacity-70">
                                <span className={`w-2 h-2 rounded-full ${isSystemOnline ? 'bg-green-400' : 'bg-red-500'}`}></span>
                                {isSystemOnline ? 'آنلاین' : 'آفلاین'}
                                {lastUpdated && <span>- {lastUpdated.toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</span>}
                             </div>
                             {notificationSettings.enabled && <Bell className="w-3 h-3 text-blue-400 animate-pulse" />}
                        </div>
                    </div>

                {/* Header Info (Desktop) */}
                <header className="hidden lg:flex justify-between items-center mb-8 gap-4 z-10 text-right">
                    <div>
                        <h1 className="text-6xl font-black mb-2 tracking-tighter drop-shadow-sm">{selectedCity.name}</h1>
                        <p className="text-lg opacity-70 font-light flex items-center justify-start gap-2"><span>{getPersianDate(new Date())}</span><span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span><span>{selectedCity.status}</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isSystemOnline && (
                             <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30">
                                <WifiOff className="w-4 h-4" />
                                <span>آفلاین</span>
                            </div>
                        )}
                        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium">
                            <span className={`w-2 h-2 rounded-full ${isSystemOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
                            {isSystemOnline ? 'بروزرسانی: آنلاین' : 'حالت آفلاین'}
                            {lastUpdated && <span className="text-xs opacity-50 mx-1">{lastUpdated.toLocaleTimeString('fa-IR')}</span>}
                            <button onClick={() => !isRefreshing && refreshAllCities(true)} disabled={isRefreshing} className={`mr-2 hover:bg-black/10 dark:hover:bg-white/20 p-1 rounded-full transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`} title="بروزرسانی"><RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
                        </div>
                    </div>
                </header>

                {/* Temp & Chart */}
                <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 z-10">
                    <div className="flex-1 flex flex-col items-center lg:items-start">
                        <div className="flex items-start">
                            <span className="text-[90px] lg:text-[120px] leading-none font-black tracking-tighter drop-shadow-xl">{toPersianDigits(Math.round(selectedCity.temp))}°</span>
                            <div className="mt-4 lg:mt-8 mr-4 space-y-1 opacity-80">
                                <div className="text-lg lg:text-xl font-bold">حداکثر: {toPersianDigits(Math.round(selectedCity.high))}°</div>
                                <div className="text-lg lg:text-xl font-bold">حداقل: {toPersianDigits(Math.round(selectedCity.low))}°</div>
                            </div>
                        </div>
                        <div className="mt-4 lg:mt-8 max-w-lg text-base lg:text-lg opacity-80 leading-relaxed text-center lg:text-right">امروز هوا {selectedCity.status} است. سرعت باد {toPersianDigits(Math.round(selectedCity.wind))} کیلومتر بر ساعت می‌باشد.</div>
                    </div>
                    <div className="flex-1 glass-panel rounded-3xl p-6 flex flex-col justify-between min-h-[250px] lg:min-h-[300px] w-full">
                        <h3 className="text-lg font-bold mb-4 opacity-90 flex items-center gap-2">
                             <Clock className="w-5 h-5"/>
                             <span>دمای ساعتی (امروز)</span>
                        </h3>
                        <WeatherChart data={selectedCity.chart} color={accentColor} isHourly={true} />
                    </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 z-10">
                    <div className="glass-panel p-4 lg:p-5 rounded-2xl flex flex-col gap-2 hover:bg-white/5 transition-colors"><div className="flex items-center gap-2 opacity-60 text-sm"><Droplets className="w-4 h-4" /><span>رطوبت</span></div><span className="text-2xl font-bold">{selectedCity.humidity !== null ? toPersianDigits(Math.round(selectedCity.humidity)) : '-'}٪</span><div className="w-full h-1 bg-gray-200/20 rounded-full mt-auto"><div className="h-full bg-blue-400 rounded-full" style={{width: `${selectedCity.humidity || 0}%`}}></div></div></div>
                    <div className="glass-panel p-4 lg:p-5 rounded-2xl flex flex-col gap-2 hover:bg-white/5 transition-colors"><div className="flex items-center gap-2 opacity-60 text-sm"><Wind className="w-4 h-4" /><span>سرعت باد</span></div><span className="text-2xl font-bold">{toPersianDigits(Math.round(selectedCity.wind))} <span className="text-sm font-normal">km/h</span></span><div className="text-xs opacity-50 mt-auto">جهت: متغیر</div></div>
                    <div className="glass-panel p-4 lg:p-5 rounded-2xl flex flex-col gap-2 hover:bg-white/5 transition-colors"><div className="flex items-center gap-2 opacity-60 text-sm"><Sun className="w-4 h-4" /><span>شاخص UV</span></div><span className="text-2xl font-bold">{selectedCity.uv !== null ? toPersianDigits(selectedCity.uv.toFixed(1)) : '-'}</span><div className="text-xs opacity-50 mt-auto">{selectedCity.uv > 5 ? 'زیاد - محافظت شود' : 'کم - ایمن'}</div></div>
                    <div className="glass-panel p-4 lg:p-5 rounded-2xl flex flex-col gap-2 hover:bg-white/5 transition-colors"><div className="flex items-center gap-2 opacity-60 text-sm"><Cloud className="w-4 h-4" /><span>وضعیت</span></div><span className="text-xl font-bold">{selectedCity.status}</span><div className="text-xs opacity-50 mt-auto">دید افقی: خوب</div></div>
                </div>

                {/* Forecast Tabs */}
                <div className="mt-8 z-10">
                    <div className="flex flex-wrap items-center gap-4 mb-4 border-b border-white/10 pb-2">
                        {['future', 'past', 'custom'].map(tab => {
                            if(tab === 'custom' && forecastTab !== 'custom') return null;
                            const labels = {future: '۷ روز آینده', past: '۷ روز گذشته', custom: 'بازه انتخابی'};
                            return (
                                <button key={tab} onClick={() => setForecastTab(tab)} className={`text-lg font-bold pb-2 transition-all border-b-2 ${forecastTab === tab ? 'border-yellow-400 text-current' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                                    {labels[tab]}
                                </button>
                            )
                        })}
                        <button onClick={() => setIsCalendarOpen(true)} className="mr-auto text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"><Calendar className="w-4 h-4" /><span>انتخاب بازه تاریخ</span></button>
                    </div>
                    
                    <div className="glass-panel rounded-3xl p-6 overflow-x-auto min-h-[200px]">
                        {customLoading ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="flex lg:grid lg:grid-cols-7 gap-4 min-w-[600px] lg:min-w-0">
                                {((forecastTab === 'custom' ? selectedCity.custom : (forecastTab === 'future' ? selectedCity.future : selectedCity.past)) || []).map((day, idx) => (
                                    <div key={idx} onClick={() => setSelectedDay(day)} className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group border border-transparent hover:border-white/10">
                                        <div className="flex flex-col items-center opacity-80"><span className="text-sm font-bold whitespace-nowrap">{day.dayName}</span><span className="text-xs opacity-70 whitespace-nowrap">{day.fullDate}</span></div>
                                        {day.status.icon === 'Sun' && <Sun className="w-8 h-8 text-yellow-400" />}
                                        {day.status.icon === 'Cloud' && <Cloud className="w-8 h-8 text-blue-300" />}
                                        {day.status.icon === 'Rain' && <Droplets className="w-8 h-8 text-blue-600" />}
                                        <div className="flex flex-col items-center gap-1 font-bold mt-2"><span className="text-xl">{toPersianDigits(Math.round(day.high))}°</span><span className="opacity-50 text-sm">{toPersianDigits(Math.round(day.low))}°</span></div>
                                    </div>
                                ))}
                                {forecastTab === 'custom' && !customLoading && selectedCity.custom.length === 0 && <div className="col-span-7 text-center py-8 opacity-60">لطفا از دکمه بالا یک بازه زمانی انتخاب کنید.</div>}
                            </div>
                        )}
                    </div>
                </div>
                </>
                )}
            </main>

            <AddCityModal isOpen={isModalOpen} onClose={() => { if(cities.length > 0) setIsModalOpen(false); }} onAddCity={handleAddCity} />
            <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} onSelectRange={handleSelectRange} />
            <DayDetailModal isOpen={!!selectedDay} onClose={() => setSelectedDay(null)} day={selectedDay} city={selectedCity.name} />
            <NotificationSettingsModal 
                isOpen={isNotifSettingsOpen} 
                onClose={() => setIsNotifSettingsOpen(false)} 
                settings={notificationSettings}
                onSave={setNotificationSettings}
            />
            <OfflineAlertModal isOpen={offlineAlertOpen} onClose={() => setOfflineAlertOpen(false)} />
            <InstallPromptModal isOpen={showInstallModal} onClose={handleInstallModalClose} onInstall={handleInstallClick} />
        </div>
    );
};

export default WeatherApp;