import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- Icons (Inline SVGs) ---
const IconBase = ({ children, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>
);

const Cloud = (props) => <IconBase {...props}><path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3s1.3 3 3 3h11c1.7 0 3-1.3 3-3z"/><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5S20 10 17.5 10c-.3 0-.6.1-.9.2"/><path d="M16.4 10.2A6 6 0 1 0 5.4 13.9"/></IconBase>;
const Sun = (props) => <IconBase {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></IconBase>;
const Moon = (props) => <IconBase {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></IconBase>;
const MapPin = (props) => <IconBase {...props}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></IconBase>;
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
            // Clear store only for array replacement (like cities list)
            await store.clear(); 
            data.forEach(item => store.put(item));
        } else {
             // For single object/settings
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
// Simplified helper to convert Greg <-> Jalaali without heavy libraries
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
      // Simple leap year check for calendar display logic (approximate)
      // For API accuracy we rely on the toGregorian conversion mostly.
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
    if (n === undefined || n === null) return '-';
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

const SplashScreen = ({ darkMode }) => (
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
        <div className="mt-4 flex flex-col items-center">
             <p className={`text-lg font-bold animate-pulse font-sans ${darkMode ? 'text-indigo-200' : 'text-blue-400'}`}>در حال آماده‌سازی...</p>
        </div>
    </div>
);

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

    const handleLocationClick = () => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                        const res = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fa`);
                        const cityName = res.data.locality || res.data.city || 'موقعیت شما';
                        onAddCity({ name: cityName, lat: latitude, lon: longitude });
                } catch(e) {
                        onAddCity({ name: 'موقعیت من', lat: latitude, lon: longitude });
                }
                onClose();
                setLoading(false);
            }, () => {
                alert("دسترسی به موقعیت مکانی داده نشد.");
                setLoading(false);
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative modal-glass rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up text-slate-900 dark:text-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">افزودن شهر جدید</h3>
                    <button onClick={onClose}><X className="w-5 h-5 opacity-60 hover:opacity-100" /></button>
                </div>
                
                <button type="button" onClick={handleLocationClick} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 transition-colors border border-blue-500/20 mb-4">
                    {loading ? <span className="animate-spin text-xl">⏳</span> : <MapPin className="w-5 h-5" />}
                    <span>یافتن موقعیت مکانی من</span>
                </button>
                
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
            <div className="relative modal-glass rounded-3xl p-8 w-full max-w-xl shadow-2xl animate-fade-in-up text-slate-900 dark:text-white border-t border-white/20 max-h-[90vh] overflow-y-auto">
                    <div className="absolute top-4 left-4">
                    <button onClick={onClose}><X className="w-6 h-6 opacity-60 hover:opacity-100" /></button>
                </div>
                <div className="flex flex-col items-center mb-6">
                    <h2 className="text-2xl font-black mb-1">{day.dayName}</h2>
                    <p className="opacity-60">{city} - {day.fullDate}</p>
                    <div className="my-4">
                        {day.status.icon === 'Sun' && <Sun className="w-20 h-20 text-yellow-500 animate-pulse-slow" />}
                        {day.status.icon === 'Cloud' && <Cloud className="w-20 h-20 text-blue-400" />}
                        {day.status.icon === 'Rain' && <Droplets className="w-20 h-20 text-blue-600" />}
                    </div>
                    <div className="text-5xl font-black tracking-tighter mb-2">{toPersianDigits(Math.round(day.high))}°</div>
                    <div className="text-xl opacity-70">حداقل: {toPersianDigits(Math.round(day.low))}°</div>
                </div>
                
                {/* Hourly Chart in Modal */}
                {day.hourly && day.hourly.length > 0 && (
                    <div className="mb-6 bg-slate-100/50 dark:bg-black/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2 opacity-70 text-sm font-bold">
                            <Clock className="w-4 h-4" />
                            <span>دمای ساعتی (۲۴ ساعته)</span>
                        </div>
                        <WeatherChart data={day.hourly} color="#6366f1" isHourly={true} />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl flex items-center gap-3">
                        <Wind className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                        <div><div className="text-xs opacity-50">باد</div><div className="font-bold text-lg">{toPersianDigits(Math.round(day.wind))} <span className="text-xs font-normal">km/h</span></div></div>
                    </div>
                    <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl flex items-center gap-3">
                        <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <div><div className="text-xs opacity-50">بارش</div><div className="font-bold text-lg">{toPersianDigits(Math.round(day.rainChance))}%</div></div>
                    </div>
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
    const [forecastTab, setForecastTab] = useState('future'); 
    const [selectedDay, setSelectedDay] = useState(null);
    const [customLoading, setCustomLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isAppReady, setIsAppReady] = useState(false); // New: For splash screen
    const [installPrompt, setInstallPrompt] = useState(null); // New: For PWA
    const citiesRef = useRef(cities); 
    const isSettingsLoaded = useRef(false); // New: To prevent DB overwrite on init

    // --- Init: Load Data from DB & Request Notification ---
    useEffect(() => {
        const initApp = async () => {
            // Start the minimum timer for splash screen (e.g. 2.5 seconds)
            const splashTimer = new Promise(resolve => setTimeout(resolve, 1500));

            // Load Data Promise
            const loadDataPromise = async () => {
                const settings = await loadFromDB(STORE_SETTINGS);
                const citiesData = await loadFromDB(STORE_CITIES);
                return { settings, citiesData };
            };

            // Wait for both
            const [_, data] = await Promise.all([splashTimer, loadDataPromise()]);
            const { settings, citiesData } = data;

            // Apply Settings
            const dm = settings.find(s => s.key === 'darkMode');
            if (dm) {
                setDarkMode(dm.value);
            }

            // Apply Cities
            if (citiesData && citiesData.length > 0) {
                setCities(citiesData);
                setSelectedCityId(citiesData[0].id);
                
                // Notification (Logic kept same)
                if (navigator.onLine && "Notification" in window) {
                     Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                             const c = citiesData[0];
                             new Notification("وضعیت آب‌وهوا", {
                                 body: `دمای فعلی ${c.name}: ${toPersianDigits(Math.round(c.temp))} درجه`,
                                 icon: "https://cdn-icons-png.flaticon.com/512/4052/4052984.png"
                             });
                        }
                     });
                }
            } else {
                setIsModalOpen(true);
            }

            // Force a small delay to ensure React commits the state changes before removing splash
            // effectively making sure the 'cities' are in the DOM when splash unmounts.
            setTimeout(() => {
                setIsAppReady(true);
                isSettingsLoaded.current = true;
            }, 100);
        };

        initApp();

        // 3. Online/Offline Listeners
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // 4. PWA Install Listener
        const handleInstallPrompt = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
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
        }
        
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // --- 30s Polling Logic ---
    useEffect(() => {
        const fetchAllCities = async () => {
            if (!navigator.onLine) return; // Don't fetch if offline
            
            const currentCities = citiesRef.current;
            if (currentCities.length === 0) return;

            console.log("Polling updates...");
            const updatedCities = await Promise.all(currentCities.map(async (city) => {
                try {
                    const data = await fetchRawWeatherData(city.lat, city.lon);
                    return processWeatherData(data, city.name, city.id, city.custom);
                } catch (e) {
                    console.error("Update failed for", city.name);
                    return city; // Keep old data on error
                }
            }));
            
            setCities(updatedCities);
            setLastUpdated(new Date());
        };

        const interval = setInterval(fetchAllCities, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
    };

    // --- Helper Fetch Functions (Refactored for reuse) ---
    const fetchRawWeatherData = async (lat, lon) => {
         const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,windspeed_10m_max&hourly=temperature_2m&timezone=auto&past_days=7&forecast_days=7`;
         const res = await axios.get(url);
         return res.data;
    };

    const processWeatherData = (data, name, id = Date.now(), customDays = []) => {
        const daily = data.daily;
        const hourlyTemps = data.hourly.temperature_2m;
        
        const allDays = daily.time.map((t, i) => ({
            dateRaw: t,
            dayName: getPersianDate(t).split(' ')[0],
            fullDate: getPersianDayMonth(t),
            high: daily.temperature_2m_max[i],
            low: daily.temperature_2m_min[i],
            status: getWeatherStatus(daily.weathercode[i]),
            rainChance: daily.precipitation_probability_max[i] || 0,
            wind: daily.windspeed_10m_max[i],
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
            high: daily.temperature_2m_max[7],
            low: daily.temperature_2m_min[7],
            wind: data.current_weather.windspeed,
            humidity: 45, // API doesn't provide current humidity in simple call, keeping mock/calc
            uv: 5,
            feelsLike: data.current_weather.temperature,
            chart: futureDays[0].hourly, 
            future: futureDays,
            past: pastDays,
            custom: customDays
        };
    };

    const handleAddCity = async (cityData) => {
        try {
            const data = await fetchRawWeatherData(cityData.lat, cityData.lon);
            const newCity = processWeatherData(data, cityData.name);

            setCities(prev => [...prev, newCity]);
            setSelectedCityId(newCity.id);
            setIsModalOpen(false);
            setLastUpdated(new Date());
        } catch (e) {
            console.error("Error fetching weather:", e);
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

            const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,windspeed_10m_max&hourly=temperature_2m&timezone=auto&start_date=${startStr}&end_date=${endStr}`;
            
            const res = await axios.get(url);
            const daily = res.data.daily;
            const hourlyTemps = res.data.hourly.temperature_2m;
            
            const customDays = daily.time.map((t, i) => ({
                dateRaw: t,
                dayName: getPersianDate(t).split(' ')[0],
                fullDate: getPersianDayMonth(t),
                high: daily.temperature_2m_max[i],
                low: daily.temperature_2m_min[i],
                status: getWeatherStatus(daily.weathercode[i]),
                rainChance: daily.precipitation_probability_max[i] || 0,
                wind: daily.windspeed_10m_max[i],
                hourly: hourlyTemps.slice(i * 24, (i + 1) * 24)
            }));

            setCities(prev => prev.map(c => c.id === selectedCityId ? { ...c, custom: customDays } : c));
        } catch(e) {
            console.error(e);
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

    // --- RENDER ---
    
    if (!isAppReady) return <SplashScreen darkMode={darkMode} />;

    if (cities.length === 0 && !isModalOpen) return null;

    return (
        <div className={`relative w-full h-screen flex flex-col lg:flex-row overflow-hidden transition-colors duration-700 ${bgGradient} text-slate-800 dark:text-slate-100`} dir="rtl">
            <GlobalStyles />
            
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Sidebar */}
            <aside className={`fixed lg:relative top-0 right-0 h-full w-80 z-50 lg:z-auto flex flex-col glass-panel border-l-0 border-y-0 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} bg-white/10 dark:bg-slate-900/90 lg:bg-transparent`}>
                <div className="p-6 flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-tight">هواشناسی</h2>
                    <div className="flex gap-2">
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
                <div className="p-4 mt-auto border-t border-white/10">
                    <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all font-medium">
                        {darkMode ? <><Sun className="w-5 h-5 text-yellow-400" /><span>حالت روز</span></> : <><Moon className="w-5 h-5 text-indigo-600" /><span>حالت شب</span></>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative flex flex-col p-4 lg:p-12 overflow-y-auto w-full">
                {cities.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center opacity-50">
                        <div>لیست شهرها خالی است. لطفا یک شهر اضافه کنید.</div>
                    </div>
                ) : (
                <>
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-overlay"></div>
                <div className="absolute bottom-[-10%] right-[10%] w-80 h-80 bg-orange-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-overlay"></div>

                {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between p-4 glass-panel z-30 relative mb-6 rounded-2xl">
                    <div className="flex items-center gap-2"><h1 className="text-xl font-bold">{selectedCity.name}</h1><span className="text-sm opacity-70 font-bold">{toPersianDigits(Math.round(selectedCity.temp))}°</span></div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-lg"><Menu className="w-6 h-6" /></button>
                    </div>
                </div>

                {/* Header Info (Desktop) */}
                <header className="hidden lg:flex justify-between items-center mb-8 gap-4 z-10 text-right">
                    <div>
                        <h1 className="text-6xl font-black mb-2 tracking-tighter drop-shadow-sm">{selectedCity.name}</h1>
                        <p className="text-lg opacity-70 font-light flex items-center justify-start gap-2"><span>{getPersianDate(new Date())}</span><span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span><span>{selectedCity.status}</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isOnline && (
                             <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30">
                                <WifiOff className="w-4 h-4" />
                                <span>آفلاین</span>
                            </div>
                        )}
                        <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
                            {isOnline ? 'بروزرسانی: آنلاین' : 'حالت آفلاین'}
                            {lastUpdated && <span className="text-xs opacity-50 mx-1">{lastUpdated.toLocaleTimeString('fa-IR')}</span>}
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
                    <div className="glass-panel p-4 lg:p-5 rounded-2xl flex flex-col gap-2 hover:bg-white/5 transition-colors"><div className="flex items-center gap-2 opacity-60 text-sm"><Droplets className="w-4 h-4" /><span>رطوبت (تخمینی)</span></div><span className="text-2xl font-bold">{toPersianDigits(selectedCity.humidity)}٪</span><div className="w-full h-1 bg-gray-200/20 rounded-full mt-auto"><div className="h-full bg-blue-400 rounded-full" style={{width: `${selectedCity.humidity}%`}}></div></div></div>
                    <div className="glass-panel p-4 lg:p-5 rounded-2xl flex flex-col gap-2 hover:bg-white/5 transition-colors"><div className="flex items-center gap-2 opacity-60 text-sm"><Wind className="w-4 h-4" /><span>سرعت باد</span></div><span className="text-2xl font-bold">{toPersianDigits(Math.round(selectedCity.wind))} <span className="text-sm font-normal">km/h</span></span><div className="text-xs opacity-50 mt-auto">جهت: متغیر</div></div>
                    <div className="glass-panel p-4 lg:p-5 rounded-2xl flex flex-col gap-2 hover:bg-white/5 transition-colors"><div className="flex items-center gap-2 opacity-60 text-sm"><Sun className="w-4 h-4" /><span>شاخص UV</span></div><span className="text-2xl font-bold">{toPersianDigits(selectedCity.uv)}</span><div className="text-xs opacity-50 mt-auto">{selectedCity.uv > 5 ? 'زیاد - محافظت شود' : 'کم - ایمن'}</div></div>
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
        </div>
    );
};

export default WeatherApp;