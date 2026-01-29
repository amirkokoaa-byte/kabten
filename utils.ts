
/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const getCurrentDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const isTimeToReset = (): boolean => {
  const now = new Date();
  // Check if we are at 23:59 (11:59 PM)
  return now.getHours() === 23 && now.getMinutes() === 59;
};
