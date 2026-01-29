
export interface TripState {
  isActive: boolean;
  distance: number; // in km
  startTime: number | null;
  lastPosition: GeolocationCoordinates | null;
}

export interface DailyStats {
  totalDistance: number;
  lastResetDate: string; // YYYY-MM-DD
}
