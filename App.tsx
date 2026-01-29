
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
  Car
} from 'lucide-react';
import { TripState, DailyStats } from './types';
import { 
  calculateDistance, 
  formatNumber, 
  getCurrentDateString, 
  isTimeToReset 
} from './utils';

const App: React.FC = () => {
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
      if (parsed.lastResetDate === getCurrentDateString()) {
        return parsed;
      }
    }
    return { totalDistance: 0, lastResetDate: getCurrentDateString() };
  });

  // State for Manual Input Calculation
  const [manualKm, setManualKm] = useState<string>('0');
  const [ratePerKm, setRatePerKm] = useState<number>(8);
  const [manualTotal, setManualTotal] = useState<number>(0);

  const watchId = useRef<number | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('uber_helper_daily_stats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  // Reset Logic at 11:59 PM
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getCurrentDateString();
      if (isTimeToReset() && dailyStats.lastResetDate !== today) {
        setDailyStats({ totalDistance: 0, lastResetDate: today });
      }
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [dailyStats.lastResetDate]);

  // Manual Calculation Update
  useEffect(() => {
    const km = parseFloat(manualKm) || 0;
    setManualTotal(km * ratePerKm);
  }, [manualKm, ratePerKm]);

  // Handle GPS Position Updates
  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
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
        // Minimum threshold to filter out GPS jitter
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

  const startTrip = () => {
    if (!navigator.geolocation) {
      alert('جهازك لا يدعم الـ GPS');
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
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  };

  const stopTrip = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setDailyStats(prev => ({
      ...prev,
      totalDistance: prev.totalDistance + trip.distance
    }));

    setTrip(prev => ({ ...prev, isActive: false }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
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

        {/* Daily Summary */}
        <section className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <History className="text-blue-500 w-5 h-5" />
            <h3 className="font-bold text-gray-800">إجمالي اليوم</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">المسافة الكلية</p>
              <p className="text-2xl font-black text-gray-900">{formatNumber(dailyStats.totalDistance)} كم</p>
            </div>
            <div className="text-left border-r pr-4">
              <p className="text-gray-400 text-sm">إجمالي الأرباح</p>
              <p className="text-2xl font-black text-green-600">{formatNumber(dailyStats.totalDistance * ratePerKm)} ج.م</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-4 text-center">يتم تصفير العداد تلقائياً في الساعة 11:59 مساءً</p>
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

        {/* Extra Info Card */}
        <section className="bg-indigo-600 rounded-3xl p-6 shadow-lg shadow-indigo-200 text-white flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="bg-indigo-500 p-3 rounded-2xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-indigo-200 text-xs">معدل الربح المقدر</p>
                <p className="text-lg font-bold">{formatNumber(ratePerKm)} ج.م / كم</p>
              </div>
           </div>
           <Settings className="w-5 h-5 text-indigo-300 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" />
        </section>

      </main>

      {/* Bottom Navbar for Mobile Feel */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 flex justify-around items-center z-50">
        <button className="flex flex-col items-center p-2 text-black">
          <MapPin className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-bold">الخريطة</span>
        </button>
        <button className="flex flex-col items-center p-2 text-gray-400">
          <Calculator className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-bold">الحساب</span>
        </button>
        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center -mt-8 shadow-xl border-4 border-gray-50">
          <Car className="text-yellow-500 w-6 h-6" />
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
