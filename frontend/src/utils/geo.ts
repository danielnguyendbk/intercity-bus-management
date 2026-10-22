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

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  isApproximate?: boolean;
}

/**
 * Lấy tọa độ vị trí của người dùng với cơ chế fallback 3 lớp:
 * 1. HTML5 Geolocation (nhanh qua Wi-Fi / Cell tower)
 * 2. HTML5 Geolocation (chính xác cao qua GPS)
 * 3. Ước tính vị trí qua IP Geolocation công cộng nếu trình duyệt bị chặn hoặc hết hạn
 */
export async function getCurrentUserLocation(): Promise<UserCoordinates> {
  // Lớp 1: Thử HTML5 Geolocation (low accuracy - nhanh, không bị treo)
  const tryHtml5 = (highAccuracy: boolean, timeoutMs: number): Promise<UserCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Trình duyệt không hỗ trợ Geolocation API"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            isApproximate: false,
          });
        },
        (err) => reject(err),
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: 60000,
        }
      );
    });
  };

  try {
    // Thử lấy vị trí nhanh (low accuracy 5s)
    return await tryHtml5(false, 5000);
  } catch {
    // Thử lại với high accuracy 5s
    try {
      return await tryHtml5(true, 5000);
    } catch {
      // Lớp 3: Fallback qua IP Geolocation công cộng
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch("https://ipwho.is/", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.latitude && data.longitude) {
            return {
              lat: Number(data.latitude),
              lng: Number(data.longitude),
              accuracy: 5000,
              isApproximate: true,
            };
          }
        }
      } catch {
        // Fallback secondary IP API nếu ipwho.is gặp sự cố
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
          const res2 = await fetch("https://ipapi.co/json/", {
            signal: controller2.signal,
          });
          clearTimeout(timeoutId2);
          if (res2.ok) {
            const data2 = await res2.json();
            if (data2 && data2.latitude && data2.longitude) {
              return {
                lat: Number(data2.latitude),
                lng: Number(data2.longitude),
                accuracy: 5000,
                isApproximate: true,
              };
            }
          }
        } catch {
          // Bỏ qua lỗi IP geo
        }
      }

      throw new Error(
        "Không thể lấy được vị trí GPS. Bạn có thể chọn điểm đón trực tiếp trên bản đồ hoặc trong danh sách."
      );
    }
  }
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
