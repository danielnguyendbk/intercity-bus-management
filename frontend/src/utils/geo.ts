// ============================================================================
// GEO & DISTANCE UTILITIES (Haversine & HTML5 Geolocation)
// ============================================================================

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

/**
 * Tính khoảng cách địa lý giữa 2 tọa độ (kinh độ, vĩ độ) bằng công thức Haversine
 * @returns khoảng cách tính bằng Kilometers (km)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Định dạng hiển thị khoảng cách thân thiện:
 * - Dưới 1km: "850 m"
 * - Trên 1km: "2.4 km"
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Lấy tọa độ GPS hiện tại của thiết bị người dùng qua HTML5 Geolocation API
 */
export function getCurrentUserLocation(): Promise<UserCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Trình duyệt của bạn không hỗ trợ chức năng định vị GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = "Không thể lấy vị trí hiện tại.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Bạn đã từ chối chia sẻ vị trí. Vui lòng cho phép quyền vị trí trên trình duyệt.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Thông tin vị trí hiện tại không khả dụng trên thiết bị.";
            break;
          case error.TIMEOUT:
            message = "Thời gian lấy vị trí GPS quá lâu (hết hạn). Vui lòng thử lại.";
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Tìm điểm gần nhất trong danh sách điểm đối với vị trí của người dùng
 */
export function findNearestPoint<T extends { lat?: number; lng?: number }>(
  userCoords: { lat: number; lng: number },
  points: T[]
): { point: T; distanceKm: number } | null {
  if (!points || points.length === 0) return null;

  let nearestPoint: T | null = null;
  let minDistance = Infinity;

  for (const point of points) {
    if (point.lat !== undefined && point.lng !== undefined) {
      const dist = calculateDistance(userCoords.lat, userCoords.lng, point.lat, point.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestPoint = point;
      }
    }
  }

  return nearestPoint ? { point: nearestPoint, distanceKm: minDistance } : null;
}

/**
 * Sắp xếp danh sách điểm theo khoảng cách từ gần đến xa so với người dùng
 */
export function sortPointsByDistance<T extends { lat?: number; lng?: number }>(
  userCoords: { lat: number; lng: number },
  points: T[]
): Array<T & { distanceKm: number | null }> {
  return points
    .map((point) => {
      const distanceKm =
        point.lat !== undefined && point.lng !== undefined
          ? calculateDistance(userCoords.lat, userCoords.lng, point.lat, point.lng)
          : null;
      return {
        ...point,
        distanceKm,
      };
    })
    .sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
}
