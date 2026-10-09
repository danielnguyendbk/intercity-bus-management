import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Crosshair,
  Check,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  Bus,
  ZoomIn,
  Compass,
} from "lucide-react";
import toast from "react-hot-toast";
import { PickupPoint, CityData } from "../../utils/locations";
import {
  getCurrentUserLocation,
  calculateDistance,
  formatDistance,
  UserCoordinates,
} from "../../utils/geo";

interface PickupMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  cityName: string;
  cityData?: CityData;
  points: PickupPoint[];
  selectedPoint: PickupPoint | null;
  onSelectPoint: (point: PickupPoint) => void;
  initialUserCoords?: UserCoordinates | null;
}

export default function PickupMapModal({
  isOpen,
  onClose,
  title = "Bản đồ chọn điểm đón",
  cityName,
  cityData,
  points,
  selectedPoint,
  onSelectPoint,
  initialUserCoords = null,
}: PickupMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const stationMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Component state
  const [userCoords, setUserCoords] = useState<UserCoordinates | null>(initialUserCoords);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [currentSelected, setCurrentSelected] = useState<PickupPoint | null>(selectedPoint);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync selected point when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSelected(selectedPoint);
      setGeoError(null);
    }
  }, [isOpen, selectedPoint]);

  // Points with distance attached and sorted if userCoords is present
  const pointsWithDistance = useMemo(() => {
    const list = points.map((p) => {
      let distanceKm: number | null = null;
      if (userCoords && p.lat && p.lng) {
        distanceKm = calculateDistance(userCoords.lat, userCoords.lng, p.lat, p.lng);
      }
      return { ...p, distanceKm };
    });

    if (userCoords) {
      list.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return list;
  }, [points, userCoords]);

  // Nearest point reference
  const nearestPoint = useMemo(() => {
    if (!userCoords || pointsWithDistance.length === 0) return null;
    return pointsWithDistance[0].distanceKm !== null ? pointsWithDistance[0] : null;
  }, [userCoords, pointsWithDistance]);

  // Filtered points by search query
  const filteredPoints = useMemo(() => {
    if (!searchQuery.trim()) return pointsWithDistance;
    const q = searchQuery.toLowerCase();
    return pointsWithDistance.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [pointsWithDistance, searchQuery]);

  // --------------------------------------------------------------------------
  // LEAFLET MAP INITIALIZATION & LIFECYCLE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Center coordinates fallback
    const defaultCenter: [number, number] = cityData?.center
      ? [cityData.center.lat, cityData.center.lng]
      : points.length > 0 && points[0].lat !== undefined && points[0].lng !== undefined
      ? [points[0].lat, points[0].lng]
      : [10.7769, 106.7009];

    // Create map instance if not existing
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: false,
      });

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add custom zoom control at bottom-right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Invalidate size after modal animation
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, cityData, points]);

  // Clean up map when modal unmounts completely
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // RENDER MARKERS (STATIONS & USER LOCATION)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!isOpen || !map) return;

    // Clear previous station markers
    stationMarkersRef.current.forEach((marker) => marker.remove());
    stationMarkersRef.current.clear();

    const bounds: [number, number][] = [];

    // Render pickup station markers
    points.forEach((point, index) => {
      if (!point.lat || !point.lng) return;

      bounds.push([point.lat, point.lng]);
      const isSelected = currentSelected?.id === point.id || currentSelected?.name === point.name;
      const isNearest = nearestPoint?.id === point.id;

      // Custom HTML Marker Icon
      const markerHtml = `
        <div class="relative group cursor-pointer">
          <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg transition-transform transform group-hover:scale-110 ${
            isSelected
              ? "bg-[#f59e0b] ring-4 ring-[#f59e0b]/30 scale-110"
              : isNearest
              ? "bg-emerald-600 ring-2 ring-emerald-300"
              : "bg-[#0f2849]"
          } text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
          </div>
          ${
            isSelected
              ? '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>'
              : ""
          }
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-station-pin",
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon }).addTo(map);

      // Distance string if available
      let distanceText = "";
      if (userCoords) {
        const d = calculateDistance(userCoords.lat, userCoords.lng, point.lat, point.lng);
        distanceText = `<div class="mt-1 text-xs font-semibold ${
          isNearest ? "text-emerald-700" : "text-blue-700"
        }">📍 Cách bạn: ${formatDistance(d)} ${isNearest ? "⭐ (Gần nhất)" : ""}</div>`;
      }

      // Popup content
      const popupHtml = `
        <div class="p-1 font-sans text-slate-900" style="min-width: 200px;">
          <div class="font-bold text-sm text-[#0f2849]">${point.name}</div>
          <div class="text-xs text-slate-600 mt-0.5 leading-relaxed">${point.address}</div>
          ${point.description ? `<div class="text-[11px] text-slate-500 italic mt-1">"${point.description}"</div>` : ""}
          ${distanceText}
          <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <button id="btn-select-${point.id}" class="w-full text-xs font-bold py-1.5 px-3 rounded-md bg-[#0f2849] hover:bg-[#1a3a6b] text-white transition shadow-xs">
              ${isSelected ? "✓ Đang chọn trạm này" : "Chọn điểm đón này"}
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-select-${point.id}`);
        if (btn) {
          btn.onclick = () => {
            handleSelect(point);
            marker.closePopup();
          };
        }
      });

      marker.on("click", () => {
        setCurrentSelected(point);
      });

      stationMarkersRef.current.set(point.id, marker);
    });

    // Render User Location marker
    if (userCoords) {
      bounds.push([userCoords.lat, userCoords.lng]);

      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
      }

      const userIconHtml = `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-sky-400 opacity-60"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-sky-600 border-2 border-white shadow-lg"></span>
        </div>
      `;

      const userIcon = L.divIcon({
        className: "custom-user-pin",
        html: userIconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map);
      userMarker.bindPopup(`
        <div class="p-1 font-sans text-center">
          <span class="inline-block px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-800 mb-1">
            Vị trí của bạn
          </span>
          <p class="text-xs text-slate-600">Được định vị qua GPS thiết bị</p>
        </div>
      `);
      userMarkerRef.current = userMarker;

      if (userCoords.accuracy && userCoords.accuracy < 3000) {
        userAccuracyCircleRef.current = L.circle([userCoords.lat, userCoords.lng], {
          radius: userCoords.accuracy,
          color: "#38bdf8",
          fillColor: "#38bdf8",
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      }
    }

    // Fit bounds smoothly if user has not yet interacted
    if (bounds.length > 0 && !currentSelected) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch {
        // Safe catch for zero-dimension bounds
      }
    }
  }, [isOpen, points, currentSelected, userCoords, nearestPoint]);

  // --------------------------------------------------------------------------
  // USER GEOLOCATION TRIGGER
  // --------------------------------------------------------------------------
  const handleLocateMe = async () => {
    setIsLocating(true);
    setGeoError(null);

    try {
      const coords = await getCurrentUserLocation();
      setUserCoords(coords);
      toast.success("Đã xác định vị trí của bạn thành công!");

      const map = mapInstanceRef.current;
      if (map) {
        map.flyTo([coords.lat, coords.lng], 14, {
          duration: 1.2,
        });
      }

      // Automatically suggest the nearest station
      if (points.length > 0) {
        let bestPoint: PickupPoint | null = null;
        let minD = Infinity;
        points.forEach((p) => {
          if (p.lat && p.lng) {
            const d = calculateDistance(coords.lat, coords.lng, p.lat, p.lng);
            if (d < minD) {
              minD = d;
              bestPoint = p;
            }
          }
        });

        if (bestPoint) {
          toast(
            (t) => (
              <div className="flex items-center gap-2">
                <span>
                  Trạm gần bạn nhất: <b>{bestPoint?.name}</b> ({formatDistance(minD)})
                </span>
                <button
                  onClick={() => {
                    handleSelect(bestPoint!);
                    toast.dismiss(t.id);
                  }}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded font-bold text-xs"
                >
                  Chọn ngay
                </button>
              </div>
            ),
            { duration: 6000 }
          );
        }
      }
    } catch (err: any) {
      const msg = err.message || "Không thể lấy vị trí hiện tại.";
      setGeoError(msg);
      toast.error(msg);
    } finally {
      setIsLocating(false);
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: SELECT STATION & PAN
  // --------------------------------------------------------------------------
  const handleSelect = (point: PickupPoint) => {
    setCurrentSelected(point);
    onSelectPoint(point);
    toast.success(`Đã chọn điểm đón: ${point.name}`);
  };

  const handlePanToPoint = (point: PickupPoint) => {
    setCurrentSelected(point);
    const map = mapInstanceRef.current;
    if (map && point.lat && point.lng) {
      map.flyTo([point.lat, point.lng], 15, { duration: 1 });
      const marker = stationMarkersRef.current.get(point.id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const handleConfirmAndClose = () => {
    if (currentSelected) {
      onSelectPoint(currentSelected);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* ==================================================================
            HEADER
        ================================================================== */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0f2849] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-amber-400 border border-white/15">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold leading-tight">{title}</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {cityName}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Bản đồ tương tác với định vị GPS & tự động tính khoảng cách tới các trạm
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ==================================================================
            MAIN CONTENT (SPLIT: MAP & STATIONS LIST)
        ================================================================== */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* MAP CONTAINER (7 COLS ON DESKTOP) */}
          <div className="relative lg:col-span-7 h-72 sm:h-96 lg:h-full bg-slate-100 overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* FLOATING ACTION: LOCATE ME BUTTON */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-lg border border-slate-200/80 backdrop-blur-md transition transform active:scale-95 disabled:opacity-75"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                    <span>Đang lấy GPS...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-4 h-4 text-sky-600" />
                    <span>📍 Định vị vị trí của tôi</span>
                  </>
                )}
              </button>

              {userCoords && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/80 text-sky-200 text-[11px] font-medium backdrop-blur-md shadow-md">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span>Đã định vị thành công</span>
                </div>
              )}
            </div>

            {/* ERROR BANNER IF GEO FAILS */}
            {geoError && (
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-md">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="flex-1">{geoError}</span>
                <button
                  onClick={() => setGeoError(null)}
                  className="text-amber-700 hover:text-amber-900 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* MAP LEGEND OVERLAY */}
            <div className="absolute bottom-4 left-4 hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200 text-[11px] text-slate-700 shadow-md pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 border border-white" />
                <span>Bạn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0f2849] border border-white" />
                <span>Trạm đón</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#f59e0b] border border-white" />
                <span>Đang chọn</span>
              </div>
            </div>
          </div>

          {/* STATIONS LIST & SELECTION (5 COLS ON DESKTOP) */}
          <div className="lg:col-span-5 flex flex-col h-full bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-hidden">
            
            {/* SEARCH & QUICK STATS */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Danh sách điểm đón ({points.length} điểm)
                </span>
                {nearestPoint && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Sparkles className="w-3 h-3" />
                    Đã xếp theo khoảng cách
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm tên trạm, đường, khu vực..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2849]/20 focus:border-[#0f2849]"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* SCROLLABLE STATIONS LIST */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredPoints.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Không tìm thấy trạm đón nào khớp với từ khóa.
                </div>
              ) : (
                filteredPoints.map((point, index) => {
                  const isSelected =
                    currentSelected?.id === point.id || currentSelected?.name === point.name;
                  const isNearest = nearestPoint?.id === point.id;

                  return (
                    <div
                      key={point.id}
                      onClick={() => handlePanToPoint(point)}
                      className={`group p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#f59e0b] bg-amber-50/40 ring-2 ring-[#f59e0b]/30 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold ${
                              isSelected
                                ? "bg-[#f59e0b] text-slate-950"
                                : isNearest
                                ? "bg-emerald-600 text-white"
                                : "bg-[#0f2849] text-white"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-[#0f2849] transition">
                              {point.name}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Đang chọn
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1.5 pl-8 leading-relaxed">
                        {point.address}
                      </p>

                      {point.description && (
                        <p className="text-[11px] text-slate-400 italic mt-0.5 pl-8">
                          "{point.description}"
                        </p>
                      )}

                      {/* DISTANCE & ACTION ROW */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 pl-8 flex items-center justify-between">
                        {point.distanceKm !== null ? (
                          <div className="flex items-center gap-1.5">
                            <Navigation className="w-3 h-3 text-sky-600" />
                            <span
                              className={`text-[11px] font-semibold ${
                                isNearest ? "text-emerald-700" : "text-slate-600"
                              }`}
                            >
                              Cách bạn: {formatDistance(point.distanceKm)}
                            </span>
                            {isNearest && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Gần nhất
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Chưa định vị khoảng cách
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(point);
                          }}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                            isSelected
                              ? "bg-[#0f2849] text-white shadow-xs"
                              : "text-[#0f2849] hover:bg-[#0f2849]/10"
                          }`}
                        >
                          {isSelected ? "Đã chọn" : "Chọn trạm này"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* SELECTION SUMMARY & CONFIRM FOOTER */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Điểm đón được chọn:</span>
                <span className="font-bold text-slate-900 truncate max-w-[220px]">
                  {currentSelected ? currentSelected.name : "Chưa chọn điểm"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndClose}
                  disabled={!currentSelected}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-[#0f2849] hover:bg-[#1a3a6b] text-xs font-bold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác nhận điểm đón này</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
