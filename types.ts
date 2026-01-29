
export interface TripState {
  isActive: boolean;
  distance: number; // in km
  startTime: number | null;
  lastPosition: GeolocationCoordinates | null;
}

export interface DailyStats {
  totalDistance: number;
  totalTrips: number;
  totalWorkDistance: number; // إجمالي المسافة المقطوعة أثناء العمل
  lastResetDate: string; // YYYY-MM-DD
}
