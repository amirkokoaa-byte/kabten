
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
  AlertCircle
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
  const [isHttps, setIsHttps] = useState(true);

  // State for Automatic GPS Tracking
  const [trip, setTrip] = useState<TripState>({
    isActive: false,
    distance: 0,
    startTime: null,
    lastPosition: null,
  });

  const [dailyStats, setDailyStats] = useState<DailyStats>(() => {
    const saved = localStorage.getItem('uber_helper_daily_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only keep data if it's the same day
      if (parsed.lastResetDate === getCurrentDateString()) {
        return parsed;
      }
    }
    return { totalDistance: 0, totalTrips: 0, lastResetDate: getCurrentDateString() };
  });

  // State for Manual Input Calculation
  const [manualKm, setManualKm] = useState<string>('0');
  const [ratePerKm, setRatePerKm] = useState<number>(8);
  const [manualTotal, setManualTotal] = useState<number>(0);

  const watchId = useRef<number | null>(null);

  // Check for HTTPS (Required for Geolocation on GitHub Pages)
  useEffect(() => {
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setIsHttps(false);
    }
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('uber_helper_daily_stats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  // Reset Logic
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getCurrentDateString();
      if (dailyStats.lastResetDate !== today) {
        setDailyStats({ totalDistance: 0, totalTrips: 0, lastResetDate: today });
      }
    }, 10000); 
    return () => clearInterval(interval);
  }, [dailyStats.lastResetDate]);

  // Manual Calculation Update
  useEffect(() => {
    const km = parseFloat(manualKm) || 0;
    setManualTotal(km * ratePerKm);
  }, [manualKm, ratePerKm]);

  // Handle GPS Position Updates
  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    setGeoError(null);
    setTrip((prev) => {
      if (!prev.isActive) return prev;
      
      let newDistance = prev.distance;
      if (prev.lastPosition) {
        const addedDistance = calculateDistance(
          prev.lastPosition.latitude,
          prev.lastPosition.longitude,
          position.coords.latitude,
          position.coords.longitude
        );
        
        // Filter out GPS noise (only add if moved more than 5 meters)
        if (addedDistance > 0.005) {
          newDistance += addedDistance;
        }
      }

      return {
        ...prev,
        distance: newDistance,
        lastPosition: position.coords,
      };
    });
  }, []);

  const handleGeoError = (error: GeolocationPositionError) => {
    let msg = "حدث خطأ في تحديد الموقع";
    switch(error.code) {
      case error.PERMISSION_DENIED:
        msg = "يرجى السماح بالوصول للموقع (GPS) ليعمل البرنامج بشكل صحيح";
        break;
      case error.POSITION_UNAVAILABLE:
        msg = "معلومات الموقع غير متاحة حالياً";
        break;
      case error.TIMEOUT:
        msg = "انتهت مهلة طلب الموقع";
        break;
    }
    setGeoError(msg);
    if (trip.isActive) stopTrip();
  };

  const startTrip = () => {
    if (!navigator.geolocation) {
      setGeoError("متصفحك لا يدعم خاصية تحديد الموقع");
      return;
    }

    setTrip({
      isActive: true,
      distance: 0,
      startTime: Date.now(),
      lastPosition: null,
    });

    watchId.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handleGeoError,
      { 
        enableHighAccuracy: true, 
        maximumAge: 0,
        timeout: 10000 
      }
    );
  };

  const stopTrip = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setDailyStats(prev => ({
      ...prev,
      totalDistance: prev.totalDistance + trip.distance,
      totalTrips: prev.totalTrips + (trip.distance > 0.01 ? 1 : 0) // Only count if moved
    }));

    setTrip(prev => ({ ...prev, isActive: false }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-black text-white p-4 sticky top-0 z-50 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Car className="w-8 h-8 text-yellow-500" />
          <h1 className="text-xl font-bold">مساعد سواق أوبر</h1>
        </div>
        <div className="text-sm bg-gray-800 px-3 py-1 rounded-full text-gray-300">
          {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Connection Warnings */}
        {!isHttps && (
          <div className="bg-red-100 border-r-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-red-600 w-5 h-5 mt-0.5" />
            <p className="text-red-700 text-sm">
              البرنامج يحتاج رابط <strong>HTTPS</strong> ليعمل الـ GPS. يرجى التأكد من الرابط.
            </p>
          </div>
        )}

        {geoError && (
          <div className="bg-amber-100 border-r-4 border-amber-500 p-4 rounded-xl flex items-start gap-3 animate-bounce">
            <AlertCircle className="text-amber-600 w-5 h-5 mt-0.5" />
            <p className="text-amber-700 text-sm font-bold">{geoError}</p>
          </div>
        )}
        
        {/* Real-time Tracking Dashboard */}
        <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className={`p-6 ${trip.isActive ? 'bg-green-50' : 'bg-gray-50'} transition-colors duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${trip.isActive ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-400 text-white'}`}>
                {trip.isActive ? 'رحلة نشطة' : 'متوقف'}
              </span>
              <Navigation className={`w-6 h-6 ${trip.isActive ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
            
            <div className="text-center mb-6">
              <p className="text-gray-500 text-sm mb-1">المسافة المقطوعة حالياً</p>
              <h2 className="text-6xl font-black text-gray-900 tabular-nums">
                {formatNumber(trip.distance)}
                <span className="text-xl font-normal text-gray-400 mr-2">كم</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-gray-400 text-xs mb-1">الأجرة الحالية</p>
                <p className="text-xl font-bold text-black">{formatNumber(trip.distance * ratePerKm)} ج.م</p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-gray-400 text-xs mb-1">سعر الكيلو</p>
                <p className="text-xl font-bold text-black">{ratePerKm} ج.م</p>
              </div>
            </div>

            {!trip.isActive ? (
              <button 
                onClick={startTrip}
                className="w-full bg-black hover:bg-gray-800 text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-black/20"
              >
                <Play className="fill-white" /> ابدأ الرحلة
              </button>
            ) : (
              <button 
                onClick={stopTrip}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-red-200"
              >
                <Square className="fill-white" /> إنهاء الرحلة
              </button>
            )}
          </div>
        </section>

        {/* Statistics Section (Requested Format) */}
        <section className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-blue-600 w-6 h-6" />
              <h3 className="font-bold text-gray-800 text-lg">إحصائيات اليوم</h3>
            </div>
            <div className="bg-gray-50 px-3 py-1 rounded-lg text-sm font-bold text-gray-600 border border-gray-100">
              {dailyStats.lastResetDate}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-2"><CreditCard className="w-4 h-4" /> إجمالي الأرباح</span>
              <span className="text-2xl font-black text-green-600">{formatNumber(dailyStats.totalDistance * ratePerKm)} ج.م</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-2"><Navigation className="w-4 h-4" /> إجمالي المسافة</span>
              <span className="text-2xl font-black text-gray-900">{formatNumber(dailyStats.totalDistance)} كم</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-2"><Layers className="w-4 h-4" /> عدد الرحلات</span>
              <span className="text-2xl font-black text-blue-600">{dailyStats.totalTrips} رحلة</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> متوسط الدخل/كم</span>
              <span className="text-2xl font-black text-purple-600">{ratePerKm} ج.م</span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-50 text-center">
            <p className="text-[11px] text-gray-400 font-bold leading-relaxed">
              * سيتم تصفير العداد تلقائياً في تمام الساعة 11:59 مساءً
            </p>
          </div>
        </section>

        {/* Manual Calculator */}
        <section className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="text-yellow-500 w-5 h-5" />
            <h3 className="font-bold text-gray-800">حاسبة يدوية سريعة</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1 mr-2">المسافة (كم)</label>
                <input 
                  type="number" 
                  value={manualKm}
                  onChange={(e) => setManualKm(e.target.value)}
                  className="w-full bg-gray-50 border-0 p-4 rounded-xl text-lg font-bold focus:ring-2 focus:ring-black outline-none text-center"
                  placeholder="0.00"
                />
              </div>
              <div className="w-1/3">
                <label className="block text-xs text-gray-400 mb-1 mr-2">سعر الكيلو</label>
                <input 
                  type="number" 
                  value={ratePerKm}
                  onChange={(e) => setRatePerKm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border-0 p-4 rounded-xl text-lg font-bold focus:ring-2 focus:ring-black outline-none text-center"
                />
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-2xl flex justify-between items-center border border-yellow-100">
              <div>
                <p className="text-yellow-700 text-sm font-bold">السعر الإجمالي</p>
                <p className="text-xs text-yellow-600">بناءً على الكيلو متر</p>
              </div>
              <p className="text-3xl font-black text-yellow-900">{formatNumber(manualTotal)} <span className="text-sm font-normal">ج.م</span></p>
            </div>
          </div>
        </section>

      </main>

      {/* Bottom Navbar for Mobile Feel */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 flex justify-around items-center z-50 h-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button className="flex flex-col items-center p-2 text-black">
          <MapPin className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-bold">الخريطة</span>
        </button>
        <button className="flex flex-col items-center p-2 text-gray-400">
          <Calculator className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-bold">الحساب</span>
        </button>
        <div 
          onClick={() => !trip.isActive ? startTrip() : stopTrip()}
          className={`w-14 h-14 ${trip.isActive ? 'bg-red-600' : 'bg-black'} rounded-full flex items-center justify-center -mt-10 shadow-2xl border-4 border-white cursor-pointer active:scale-90 transition-all duration-300`}
        >
          {trip.isActive ? <Square className="text-white w-6 h-6 fill-white" /> : <Car className="text-yellow-500 w-7 h-7" />}
        </div>
        <button className="flex flex-col items-center p-2 text-gray-400">
          <CreditCard className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-bold">الأرباح</span>
        </button>
        <button className="flex flex-col items-center p-2 text-gray-400">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-bold">الإعدادات</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
