export interface GeoPoint {
  lat: number;
  lng: number;
}

export function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistance(pointA: GeoPoint | null | undefined, pointB: GeoPoint | null | undefined): number | null {
  if (!pointA?.lat || !pointA?.lng || !pointB?.lat || !pointB?.lng) return null;

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLng = toRadians(pointB.lng - pointA.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(pointA.lat)) *
    Math.cos(toRadians(pointB.lat)) *
    Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatDistance(distanceKm: number | null): string {
  if (distanceKm == null) return "Distance unavailable";
  return `${distanceKm.toFixed(1)} km`;
}

export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  });
}

export function getDirectionsUrl(target: GeoPoint | null): string {
  if (!target) return "#";
  return `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`;
}
