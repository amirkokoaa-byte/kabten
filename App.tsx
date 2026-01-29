
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Navigation, 
  MapPin, 
  Calculator, 
  Play, 
  Square, 
  Settings, 
  CreditCard,
  Car,
  BarChart3,
  Power,
  Activity,
  Sun,
  Moon,
  TrendingUp,
  History
} from 'lucide-react';
import { TripState, DailyStats } from './types';
import { 
  calculateDistance, 
  formatNumber, 
  getCurrentDateString 
} from './utils';

type TabType = 'calculator' | 'map' | 'profits' | 'settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isSecure, setIsSecure] = useState(true);

  // حالة "بداية العمل"
  const [isWorking, setIsWorking] = useState(false);
  const [workDistance, setWorkDistance] = useState(0);
  const lastWorkPosition = useRef<GeolocationCoordinates | null>(null);

  // حالة الرحلة
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
          return { ...parsed, totalWorkDistance: parsed.totalWorkDistance || 0 };
        }
      }
    } catch (e) {}
    return { totalDistance: 0, totalTrips: 0, totalWorkDistance: 0, lastResetDate: getCurrentDateString() };
  });

  const [manualKm, setManualKm] = useState<string>('0');
  const [ratePerKm, setRatePerKm] = useState<number>(8);
  const [manualTotal, setManualTotal] = useState<number>(0);

  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
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
        setWorkDistance(0);
      }
    }, 10000); 
    return () => clearInterval(interval);
  }, [dailyStats.lastResetDate]);

  useEffect(() => {
    const km = parseFloat(manualKm) || 0;
    setManualTotal(km * ratePerKm);
  }, [manualKm, ratePerKm]);

  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    setGeoError(null);
    const { latitude, longitude } = position.coords;

    if (isWorking) {
      if (lastWorkPosition.current) {
        const dist = calculateDistance(lastWorkPosition.current.latitude, lastWorkPosition.current.longitude, latitude, longitude);
        if (dist > 0.005) {
          setWorkDistance(prev => prev + dist);
          setDailyStats(prev => ({ ...prev, totalWorkDistance: prev.totalWorkDistance + dist }));
        }
      }
      lastWorkPosition.current = position.coords;
    }

    setTrip((prev) => {
      if (!prev.isActive) return prev;
      let newDistance = prev.distance;
      if (prev.lastPosition) {
        const addedDistance = calculateDistance(prev.lastPosition.latitude, prev.lastPosition.longitude, latitude, longitude);
        if (addedDistance > 0.005) newDistance += addedDistance;
      }
      return { ...prev, distance: newDistance, lastPosition: position.coords };
    });
  }, [isWorking]);

  const toggleWorkMode = () => {
    if (!isWorking) {
      if (!navigator.geolocation) return setGeoError("الجهاز لا يدعم الموقع");
      setIsWorking(true);
      if (!watchId.current) {
        watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, (err) => setGeoError(err.message), { enableHighAccuracy: true });
      }
    } else {
      setIsWorking(false);
      if (!trip.isActive && watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }
  };

  const startTrip = () => {
    setTrip({ isActive: true, distance: 0, startTime: Date.now(), lastPosition: null });
    if (!watchId.current) {
      watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, (err) => setGeoError(err.message), { enableHighAccuracy: true });
    }
  };

  const stopTrip = () => {
    setDailyStats(prev => ({
      ...prev,
      totalDistance: prev.totalDistance + trip.distance,
      totalTrips: prev.totalTrips + (trip.distance > 0.01 ? 1 : 0)
    }));
    setTrip(prev => ({ ...prev, isActive: false }));
    if (!isWorking && watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  const themeClass = isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-gray-100 text-gray-900';
  const cardClass = isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200 shadow-sm';
  const subTextClass = isDarkMode ? 'text-zinc-500' : 'text-gray-400';
  const inputClass = isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-gray-50 border-gray-200 text-black';

  return (
    <div className={`min-h-screen ${themeClass} pb-32 transition-colors duration-300`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-gray-200'} backdrop-blur-md border-b p-5 sticky top-0 z-50 flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500 p-2 rounded-lg">
            <Car className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-xl font-black tracking-tight">UBER <span className="text-yellow-500">PRO</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full border transition-all ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800 text-yellow-500' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}
            title="تبديل المظهر"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] font-bold uppercase ${subTextClass}`}>الوقت الحالي</span>
            <span className={`text-sm font-mono ${isDarkMode ? 'text-zinc-300' : 'text-gray-600'}`}>
              {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Home/Calculator Tab Content */}
        {activeTab === 'calculator' && (
          <>
            {/* Total Day Work - العداد الكلي */}
            <section className={`relative overflow-hidden rounded-[2.5rem] p-6 transition-all duration-500 border ${cardClass} ${isWorking && isDarkMode ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : ''}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${isWorking ? 'bg-yellow-500' : (isDarkMode ? 'bg-zinc-800' : 'bg-gray-200')}`}>
                    <Activity className={`w-5 h-5 ${isWorking ? 'text-black' : subTextClass}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">وضع العمل اليومي</h3>
                    <p className={`text-[10px] ${subTextClass}`}>إجمالي حركتك اليوم</p>
                  </div>
                </div>
                {isWorking && <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> <span className="text-[10px] font-bold text-green-500">نشط الآن</span></div>}
              </div>
              
              <div className="space-y-1">
                <h4 className="text-5xl font-black tabular-nums tracking-tighter flex items-baseline gap-2">
                  {formatNumber(dailyStats.totalWorkDistance)}
                  <span className={`text-lg font-bold ${subTextClass}`}>كم</span>
                </h4>
              </div>

              <button 
                onClick={toggleWorkMode}
                className={`mt-6 w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black transition-all active:scale-95 ${isWorking ? 'bg-zinc-800 text-red-400 border border-red-500/20' : 'bg-yellow-500 text-black hover:bg-yellow-600'}`}
              >
                <Power className="w-5 h-5" />
                {isWorking ? 'إنهاء يوم العمل' : 'بدء يوم العمل'}
              </button>
            </section>

            {/* Current Trip - الرحلة الحالية */}
            <section className={`${cardClass} border rounded-[2.5rem] overflow-hidden shadow-2xl`}>
              <div className={`p-8 ${trip.isActive ? 'bg-gradient-to-b from-green-500/5 to-transparent' : ''}`}>
                <div className="flex justify-between items-center mb-8">
                  <div className={`${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} px-4 py-1.5 rounded-full`}>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${trip.isActive ? 'text-green-400' : subTextClass}`}>
                      {trip.isActive ? 'الرحلة قيد التنفيذ' : 'عداد الرحلة الحالية'}
                    </span>
                  </div>
                  <Navigation className={`w-5 h-5 ${trip.isActive ? 'text-green-400 animate-bounce' : subTextClass}`} />
                </div>
                
                <div className="text-center mb-8">
                  <h2 className="text-7xl font-black tabular-nums tracking-tighter">
                    {formatNumber(trip.distance)}
                  </h2>
                  <p className={`${subTextClass} font-bold mt-2 uppercase tracking-[0.2em] text-xs`}>كيلو متر</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className={`${isDarkMode ? 'bg-zinc-950/50' : 'bg-gray-50'} p-4 rounded-3xl border ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'} text-center`}>
                    <p className={`${subTextClass} text-[10px] font-black uppercase mb-1`}>الأجرة المتوقعة</p>
                    <p className="text-2xl font-black text-yellow-500">{formatNumber(trip.distance * ratePerKm)} <span className="text-xs">ج.م</span></p>
                  </div>
                  <div className={`${isDarkMode ? 'bg-zinc-950/50' : 'bg-gray-50'} p-4 rounded-3xl border ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'} text-center`}>
                    <p className={`${subTextClass} text-[10px] font-black uppercase mb-1`}>التسعيرة</p>
                    <p className="text-2xl font-black">{ratePerKm}</p>
                  </div>
                </div>

                {!trip.isActive ? (
                  <button onClick={startTrip} className="w-full bg-yellow-500 text-black py-5 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(234,179,8,0.2)] active:scale-95 transition-all">
                    <Play className="fill-black w-5 h-5" /> ابدأ رحلة راكب
                  </button>
                ) : (
                  <button onClick={stopTrip} className="w-full bg-red-600 text-white py-5 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(220,38,38,0.2)] active:scale-95 transition-all">
                    <Square className="fill-white w-5 h-5" /> إنهاء الرحلة
                  </button>
                )}
              </div>
            </section>
            
            {/* Quick Calculator Part of Home */}
            <section className={`${cardClass} border rounded-[2.5rem] p-8`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-500/10 p-2 rounded-xl">
                  <Calculator className="text-purple-500 w-5 h-5" />
                </div>
                <h3 className="font-black">الحاسبة السريعة</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase mr-2 ${subTextClass}`}>المسافة (كم)</label>
                  <input 
                    type="number" value={manualKm} onChange={(e) => setManualKm(e.target.value)}
                    className={`w-full border p-4 rounded-2xl text-xl font-black focus:border-yellow-500 outline-none transition-all ${inputClass}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase mr-2 ${subTextClass}`}>السعر (ج.م)</label>
                  <input 
                    type="number" value={ratePerKm} onChange={(e) => setRatePerKm(parseFloat(e.target.value) || 0)}
                    className={`w-full border p-4 rounded-2xl text-xl font-black focus:border-yellow-500 outline-none transition-all ${inputClass}`}
                  />
                </div>
              </div>
              <div className={`${isDarkMode ? 'bg-zinc-950' : 'bg-gray-50'} border ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'} p-5 rounded-[1.5rem] flex justify-between items-center group`}>
                <span className={`font-black uppercase text-xs ${subTextClass}`}>الإجمالي المستحق</span>
                <p className="text-3xl font-black text-yellow-500 group-hover:scale-110 transition-transform">{formatNumber(manualTotal)} <span className="text-sm">ج.م</span></p>
              </div>
            </section>
          </>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <section className={`${cardClass} border rounded-[2.5rem] p-8 min-h-[400px] flex flex-col items-center justify-center text-center`}>
            <div className="bg-yellow-500/10 p-6 rounded-full mb-6">
              <MapPin className="w-12 h-12 text-yellow-500 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black mb-2">تتبع الموقع المباشر</h3>
            <p className={`${subTextClass} text-sm max-w-[250px]`}>
              يتم تسجيل إحداثياتك الحالية بدقة لضمان حساب المسافة بشكل صحيح.
            </p>
            <div className={`mt-8 p-4 rounded-2xl w-full border ${inputClass} text-xs font-mono`}>
              {geoError ? (
                <span className="text-red-500">{geoError}</span>
              ) : (
                <span>خط العرض: {trip.lastPosition?.latitude || 'جاري التحديد...'} <br/> خط الطول: {trip.lastPosition?.longitude || 'جاري التحديد...'}</span>
              )}
            </div>
          </section>
        )}

        {/* Profits Tab */}
        {activeTab === 'profits' && (
          <section className={`${cardClass} border rounded-[2.5rem] p-8 space-y-8`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-2 rounded-xl">
                  <CreditCard className="text-green-500 w-5 h-5" />
                </div>
                <h3 className="font-black text-xl">سجل الأرباح اليومية</h3>
              </div>
              <TrendingUp className="text-green-500 w-5 h-5" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className={`${isDarkMode ? 'bg-zinc-950' : 'bg-gray-50'} p-6 rounded-3xl border ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
                <p className={`${subTextClass} text-[10px] font-black uppercase mb-1`}>إجمالي أرباح اليوم</p>
                <div className="flex justify-between items-end">
                   <h4 className="text-4xl font-black text-green-500">{formatNumber(dailyStats.totalDistance * ratePerKm)} <span className="text-sm">ج.م</span></h4>
                   <p className="text-[10px] font-bold text-zinc-500">{dailyStats.totalTrips} رحلات</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`${isDarkMode ? 'bg-zinc-950' : 'bg-gray-50'} p-4 rounded-3xl border ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
                  <p className={`${subTextClass} text-[10px] font-black uppercase mb-1`}>مسافة الركاب</p>
                  <p className="text-xl font-black">{formatNumber(dailyStats.totalDistance)} <span className="text-xs">كم</span></p>
                </div>
                <div className={`${isDarkMode ? 'bg-zinc-950' : 'bg-gray-50'} p-4 rounded-3xl border ${isDarkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
                  <p className={`${subTextClass} text-[10px] font-black uppercase mb-1`}>مسافة العمل</p>
                  <p className="text-xl font-black">{formatNumber(dailyStats.totalWorkDistance)} <span className="text-xs">كم</span></p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800/50">
              <h4 className="font-black text-sm mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-500" /> آخر النشاطات
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm p-3 rounded-xl bg-zinc-900/50">
                  <span className={subTextClass}>تصفير العداد التلقائي</span>
                  <span className="font-bold text-yellow-500">11:59 م</span>
                </div>
                <div className="flex justify-between items-center text-sm p-3 rounded-xl bg-zinc-900/50">
                  <span className={subTextClass}>تحديث البيانات</span>
                  <span className="font-bold">كل 10 ثواني</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <section className={`${cardClass} border rounded-[2.5rem] p-8 space-y-6`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-500/10 p-2 rounded-xl">
                <Settings className="text-blue-500 w-5 h-5" />
              </div>
              <h3 className="font-black text-xl">الإعدادات والتسعير</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className={`text-xs font-black uppercase mr-1 ${subTextClass}`}>سعر الكيلو الافتراضي (ج.م)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" value={ratePerKm} onChange={(e) => setRatePerKm(parseFloat(e.target.value) || 0)}
                    className={`flex-1 border p-4 rounded-2xl text-xl font-black outline-none transition-all ${inputClass}`}
                  />
                  <div className="bg-yellow-500 text-black px-4 rounded-2xl flex items-center font-bold">حفظ</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
                <p className="text-[11px] font-bold text-yellow-600 leading-relaxed text-right">
                  * يتم استخدام هذا السعر لحساب "الأجرة المتوقعة" في عداد الرحلة والحاسبة السريعة.
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-800/50 space-y-3">
                <button 
                  onClick={() => {
                    if(confirm("هل أنت متأكد من مسح كافة بيانات اليوم؟")) {
                      setDailyStats({ totalDistance: 0, totalTrips: 0, totalWorkDistance: 0, lastResetDate: getCurrentDateString() });
                      setWorkDistance(0);
                    }
                  }}
                  className="w-full py-4 border border-red-500/20 text-red-500 rounded-2xl font-black text-sm hover:bg-red-500/10 transition-all"
                >
                  مسح سجل اليوم الحالي
                </button>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6">
        <div className={`max-w-md mx-auto ${isDarkMode ? 'bg-zinc-900/90 backdrop-blur-xl border-zinc-800 shadow-2xl' : 'bg-white/95 border-gray-200 shadow-xl'} border h-20 rounded-[2rem] flex justify-around items-center`}>
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-yellow-500' : subTextClass}`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">الخريطة</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('calculator')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'calculator' ? 'text-yellow-500' : subTextClass}`}
          >
            <Calculator className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">الحاسبة</span>
          </button>
          
          <div 
            onClick={toggleWorkMode}
            className={`w-14 h-14 -mt-10 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer ${isWorking ? 'bg-red-500 shadow-red-500/20 scale-110' : 'bg-yellow-500 shadow-yellow-500/20'}`}
          >
            <Power className={`w-7 h-7 ${isWorking ? 'text-white' : 'text-black'}`} />
          </div>

          <button 
            onClick={() => setActiveTab('profits')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profits' ? 'text-yellow-500' : subTextClass}`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">الأرباح</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-yellow-500' : subTextClass}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">الإعدادات</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
