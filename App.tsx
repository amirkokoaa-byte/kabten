
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Navigation, 
  MapPin, 
  Calculator, 
  History, 
  Play, 
  Square, 
  Settings, 
  TrendingUp,
  CreditCard,
  Car,
  Calendar,
  Layers,
  BarChart3,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Power,
  Activity
} from 'lucide-react';
import { TripState, DailyStats } from './types';
import { 
  calculateDistance, 
  formatNumber, 
  getCurrentDateString, 
  isTimeToReset 
} from './utils';

const App: React.FC = () => {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(true);

  // حالة "بداية العمل" (تتبع كل حركة)
  const [isWorking, setIsWorking] = useState(false);
  const [workDistance, setWorkDistance] = useState(0);
  const lastWorkPosition = useRef<GeolocationCoordinates | null>(null);

  // حالة الرحلة الفردية
  const [trip, setTrip] = useState<TripState>({
    isActive: false,
    distance: 0,
    startTime: null,
    lastPosition: null,
  });

  const [dailyStats, setDailyStats] = useState<DailyStats>(() => {
    try {
      const saved = localStorage.getItem('uber_helper_daily_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastResetDate === getCurrentDateString()) {
          return {
            ...parsed,
            totalWorkDistance: parsed.totalWorkDistance || 0
          };
        }
      }
    } catch (e) {
      console.error("Error reading from localStorage", e);
    }
    return { totalDistance: 0, totalTrips: 0, totalWorkDistance: 0, lastResetDate: getCurrentDateString() };
  });

  const [manualKm, setManualKm] = useState<string>('0');
  const [ratePerKm, setRatePerKm] = useState<number>(8);
  const [manualTotal, setManualTotal] = useState<number>(0);

  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setIsSecure(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('uber_helper_daily_stats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getCurrentDateString();
      if (dailyStats.lastResetDate !== today) {
        setDailyStats({ totalDistance: 0, totalTrips: 0, totalWorkDistance: 0, lastResetDate: today });
      }
    }, 10000); 
    return () => clearInterval(interval);
  }, [dailyStats.lastResetDate]);

  useEffect(() => {
    const km = parseFloat(manualKm) || 0;
    setManualTotal(km * ratePerKm);
  }, [manualKm, ratePerKm]);

  // تحديث الموقع لكل من العمل والرحلة
  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    setGeoError(null);
    const { latitude, longitude } = position.coords;

    // تتبع العمل الكلي (كل حركة)
    if (isWorking) {
      if (lastWorkPosition.current) {
        const dist = calculateDistance(
          lastWorkPosition.current.latitude,
          lastWorkPosition.current.longitude,
          latitude,
          longitude
        );
        if (dist > 0.005) {
          setWorkDistance(prev => prev + dist);
          setDailyStats(prev => ({
            ...prev,
            totalWorkDistance: prev.totalWorkDistance + dist
          }));
        }
      }
      lastWorkPosition.current = position.coords;
    }

    // تتبع الرحلة الفردية
    setTrip((prev) => {
      if (!prev.isActive) return prev;
      let newDistance = prev.distance;
      if (prev.lastPosition) {
        const addedDistance = calculateDistance(
          prev.lastPosition.latitude,
          prev.lastPosition.longitude,
          latitude,
          longitude
        );
        if (addedDistance > 0.005) {
          newDistance += addedDistance;
        }
      }
      return { ...prev, distance: newDistance, lastPosition: position.coords };
    });
  }, [isWorking]);

  const handleGeoError = (error: GeolocationPositionError) => {
    let msg = "خطأ في الـ GPS";
    if (error.code === error.PERMISSION_DENIED) msg = "يرجى تفعيل إذن الموقع";
    setGeoError(msg);
  };

  const toggleWorkMode = () => {
    if (!isWorking) {
      if (!navigator.geolocation) {
        setGeoError("الجهاز لا يدعم الموقع");
        return;
      }
      setIsWorking(true);
      lastWorkPosition.current = null;
      
      // إذا لم يكن التتبع يعمل بالفعل، نبدأه
      if (!watchId.current) {
        watchId.current = navigator.geolocation.watchPosition(
          handlePositionUpdate,
          handleGeoError,
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      }
    } else {
      setIsWorking(false);
      lastWorkPosition.current = null;
      // إذا كانت الرحلة متوقفة أيضاً، نوقف الـ GPS تماماً لتوفير البطارية
      if (!trip.isActive && watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }
  };

  const startTrip = () => {
    setTrip({ isActive: true, distance: 0, startTime: Date.now(), lastPosition: null });
    if (!watchId.current) {
      watchId.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handleGeoError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }
  };

  const stopTrip = () => {
    setDailyStats(prev => ({
      ...prev,
      totalDistance: prev.totalDistance + trip.distance,
      totalTrips: prev.totalTrips + (trip.distance > 0.01 ? 1 : 0)
    }));
    setTrip(prev => ({ ...prev, isActive: false }));
    
    // إذا كان وضع العمل متوقفاً، نوقف الـ GPS
    if (!isWorking && watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  const switchToHttps = () => {
    if (window.location.protocol !== 'https:') {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-black text-white p-4 sticky top-0 z-50 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Car className="w-8 h-8 text-yellow-500" />
          <h1 className="text-xl font-bold">مساعد سواق أوبر</h1>
        </div>
        <div className="text-sm bg-gray-800 px-3 py-1 rounded-full text-gray-300 font-mono">
          {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        
        {/* Secure Warning */}
        {!isSecure && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between">
            <p className="text-red-700 text-xs font-bold">الـ GPS يحتاج HTTPS ليعمل</p>
            <button onClick={switchToHttps} className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold">تفعيل</button>
          </div>
        )}

        {/* Work Mode Toggle (الطلب الجديد) */}
        <section className={`rounded-3xl p-5 shadow-lg border-2 transition-all duration-300 ${isWorking ? 'bg-indigo-900 border-indigo-400 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isWorking ? 'bg-indigo-700' : 'bg-gray-100'}`}>
                <Activity className={`w-5 h-5 ${isWorking ? 'text-indigo-200 animate-pulse' : 'text-gray-400'}`} />
              </div>
              <h3 className="font-black text-lg">وضع العمل الكلي</h3>
            </div>
            {isWorking && (
              <span className="bg-green-500 text-[10px] px-2 py-1 rounded-full text-white font-black animate-bounce">مفعّل</span>
            )}
          </div>
          
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isWorking ? 'text-indigo-300' : 'text-gray-400'}`}>المسافة المقطوعة منذ البداية</p>
              <h4 className="text-4xl font-black tabular-nums tracking-tighter">
                {formatNumber(workDistance)} <span className="text-sm font-normal">كم</span>
              </h4>
            </div>
            <button 
              onClick={toggleWorkMode}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all active:scale-95 ${isWorking ? 'bg-red-500 hover:bg-red-600' : 'bg-black text-white'}`}
            >
              <Power className="w-4 h-4" />
              {isWorking ? 'إيقاف العمل' : 'بداية العمل'}
            </button>
          </div>
          <p className={`text-[9px] ${isWorking ? 'text-indigo-300' : 'text-gray-400'}`}>* هذا العداد يحسب كل تحركاتك سواء كنت في رحلة أو لا.</p>
        </section>

        {/* Trip Dashboard */}
        <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className={`p-6 ${trip.isActive ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${trip.isActive ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>
                {trip.isActive ? 'رحلة راكب نشطة' : 'عداد الرحلة'}
              </span>
              <Navigation className={`w-6 h-6 ${trip.isActive ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
            
            <div className="text-center mb-6">
              <p className="text-gray-500 text-sm mb-1">مسافة الرحلة الحالية</p>
              <h2 className="text-6xl font-black text-gray-900 tabular-nums tracking-tighter">
                {formatNumber(trip.distance)}
                <span className="text-lg font-bold text-gray-400 mr-2">كم</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-gray-400 text-[10px] mb-1 font-bold uppercase">أجرة الرحلة</p>
                <p className="text-2xl font-black text-black">{formatNumber(trip.distance * ratePerKm)} <span className="text-xs">ج.م</span></p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-gray-400 text-[10px] mb-1 font-bold uppercase">سعر الكيلو</p>
                <p className="text-2xl font-black text-black">{ratePerKm}</p>
              </div>
            </div>

            {!trip.isActive ? (
              <button 
                onClick={startTrip}
                className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Play className="fill-white w-5 h-5" /> ابدأ الرحلة الحالية
              </button>
            ) : (
              <button 
                onClick={stopTrip}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Square className="fill-white w-5 h-5" /> إنهاء الرحلة
              </button>
            )}
          </div>
        </section>

        {/* Statistics Section */}
        <section className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
          <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-blue-600 w-5 h-5" />
              <h3 className="font-black text-gray-800 text-lg">إحصائيات اليوم</h3>
            </div>
            <div className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-gray-500">
              {dailyStats.lastResetDate}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] font-black uppercase">إجمالي الأرباح</span>
              <p className="text-xl font-black text-green-600">{formatNumber(dailyStats.totalDistance * ratePerKm)} ج.م</p>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] font-black uppercase">إجمالي حركة العمل</span>
              <p className="text-xl font-black text-indigo-600">{formatNumber(dailyStats.totalWorkDistance)} كم</p>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] font-black uppercase">مسافة الرحلات</span>
              <p className="text-xl font-black text-gray-900">{formatNumber(dailyStats.totalDistance)} كم</p>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 text-[10px] font-black uppercase">عدد الرحلات</span>
              <p className="text-xl font-black text-blue-600">{dailyStats.totalTrips} رحلة</p>
            </div>
          </div>

          <p className="mt-6 text-[10px] text-gray-400 font-bold text-center italic bg-gray-50 p-2 rounded-xl">
            * سيتم تصفير العداد تلقائياً في تمام الساعة 11:59 مساءً
          </p>
        </section>

        {/* Manual Calculator */}
        <section className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="text-yellow-500 w-5 h-5" />
            <h3 className="font-black text-gray-800">حاسبة يدوية</h3>
          </div>
          <div className="flex gap-2 mb-4">
            <input 
              type="number" value={manualKm} onChange={(e) => setManualKm(e.target.value)}
              className="flex-1 bg-gray-50 p-4 rounded-xl text-lg font-black outline-none border-2 border-transparent focus:border-black" placeholder="المسافة"
            />
            <input 
              type="number" value={ratePerKm} onChange={(e) => setRatePerKm(parseFloat(e.target.value) || 0)}
              className="w-24 bg-gray-50 p-4 rounded-xl text-lg font-black outline-none border-2 border-transparent focus:border-black"
            />
          </div>
          <div className="bg-yellow-50 p-4 rounded-2xl flex justify-between items-center">
            <span className="font-black text-yellow-800">الإجمالي:</span>
            <p className="text-2xl font-black text-yellow-900">{formatNumber(manualTotal)} ج.م</p>
          </div>
        </section>

      </main>

      {/* Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 flex justify-around items-center z-50 h-20 rounded-t-[32px] shadow-2xl">
        <button className="flex flex-col items-center p-2 text-black">
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] font-black">الخريطة</span>
        </button>
        <button className="flex flex-col items-center p-2 text-gray-400">
          <Calculator className="w-5 h-5" />
          <span className="text-[10px] font-black">الحساب</span>
        </button>
        <div 
          onClick={toggleWorkMode}
          className={`w-16 h-16 ${isWorking ? 'bg-red-600' : 'bg-black'} rounded-full flex items-center justify-center -mt-12 shadow-2xl border-4 border-white cursor-pointer transition-all duration-300`}
        >
          <Power className="text-white w-8 h-8" />
        </div>
        <button className="flex flex-col items-center p-2 text-gray-400">
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-black">الأرباح</span>
        </button>
        <button className="flex flex-col items-center p-2 text-gray-400">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-black">الإعدادات</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
