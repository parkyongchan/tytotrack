import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axiosConfig';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import GeomCircle from 'ol/geom/Circle';
import { getPointResolution } from 'ol/proj';
import { fromLonLat } from 'ol/proj';
import { formatDateWithGmt } from '../utils/dateUtils';
import * as satellite from 'satellite.js';
import { Style, Circle, Fill, Stroke } from 'ol/style';


export default function TrackViewPopup({ device, imei, alias, onClose, defaultPeriod = '3일', devices = [] }) {
    const uiLang = localStorage.getItem('lang') || 'ko';
    const TL = {
      ko: {
        close: '✕ 닫기', period: '기간', direct: '직접 설정', apply: '적용',
        rewind: '⏮ REWIND', prev: '◀◀ 이전', play: '▶ 재생', pause: '⏸ 끄기', next: '다음 ▶▶',
        speed: '속도', total: '건', trackList: 'TRACK LIST',
        loading: '로딩 중...', nodata: '데이터 없음',
        autoTrack: '🟢 자동추적 (최근접 위성)', manualSelect: '🟡 수동선택',
        periods: { '24시': '24시', '48시': '48시', '3일': '3일', '7일': '7일', '30일': '30일' },
      },
      en: {
        close: '✕ Close', period: 'Period', direct: 'Custom', apply: 'Apply',
        rewind: '⏮ REWIND', prev: '◀◀ Prev', play: '▶ Play', pause: '⏸ Pause', next: 'Next ▶▶',
        speed: 'Speed', total: 'rows', trackList: 'TRACK LIST',
        loading: 'Loading...', nodata: 'No data',
        autoTrack: '🟢 Auto Track (Nearest)', manualSelect: '🟡 Manual',
        periods: { '24시': '24h', '48시': '48h', '3일': '3d', '7일': '7d', '30일': '30d' },
      },
      ja: {
        close: '✕ 閉じる', period: '期間', direct: '直接設定', apply: '適用',
        rewind: '⏮ 巻戻し', prev: '◀◀ 前へ', play: '▶ 再生', pause: '⏸ 停止', next: '次へ ▶▶',
        speed: '速度', total: '件', trackList: 'トラックリスト',
        loading: '読込中...', nodata: 'データなし',
        autoTrack: '🟢 自動追跡 (最近衛星)', manualSelect: '🟡 手動選択',
        periods: { '24시': '24時', '48시': '48時', '3일': '3日', '7일': '7日', '30일': '30日' },
      },
    };
    const t = TL[uiLang] || TL.ko;
    const mapRef = useRef(null);
    const mapObj = useRef(null);
    const vectorSource = useRef(new VectorSource());
    const satSource = useRef(new VectorSource());
    const [popupPos, setPopupPos] = useState(null);
    const playTimer = useRef(null);

    const [filteredData, setFilteredData] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [playIdx, setPlayIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(1);
    const [period, setPeriod] = useState(defaultPeriod);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const PER_PAGE = 30;
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // 오버레이 레이어 상태
    const [overlays, setOverlays] = useState({
      rain: false, wind: false, temp: false, satellite: false,
      seamap: false, topo: false, earthquake: false, wildfire: false,
      weather: false, geofence: false, otherDevices: false, heatmap: false,
      typhoon: false, airspace: false,
    });
    const [weatherPopup, setWeatherPopup] = useState(null);
    const [satPopup, setSatPopup] = useState(null);
    const autoTrackRef = useRef(true); // true=자동(가장 가까운 위성), false=수동
    // 위성 추적 상태: 0=꺼짐, 1=재생, 2=일시정지
    const [iridiumState, setIridiumState] = useState(0);
    const [starlinkState, setStarlinkState] = useState(0);
    const iridiumTimer = useRef(null);
    const starlinkTimer = useRef(null);
    const iridiumTLEs = useRef([]);
    const starlinkTLEs = useRef([]);
    const selectedSatRef = useRef(null); // 선택된 위성
    const overlayLayers = useRef({});

    const OVERLAY_TILES = {
      rain: 'https://wmsc.lcms.kr/wmts/rdr/wgs84/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      seamap: 'https://t1.openseamap.org/seamark/{z}/{x}/{y}.png',
      topo: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    };

    const applyCustomDate = async () => {
        if (!customStart || !customEnd) return;
        setLoading(true);
        try {
            const start = customStart.replace('T', '').replace(/-|:/g, '').slice(0, 12);
            const end = customEnd.replace('T', '').replace(/-|:/g, '').slice(0, 12);
            const res = await api.get(`/location/range?start=${start}&end=${end}`);
            const data = (Array.isArray(res.data) ? res.data : [])
                .filter(d => d.imei === imei && (d.eventcode === '1' || d.eventcode === '4'))
                .sort((a, b) => (b.regDate || '').localeCompare(a.regDate || ''));
            setFilteredData(data);
            setPlayIdx(data.length - 1);
            setPlaying(false);
            setPage(1);
        } catch (_e) { /* 무시 */ }
        finally { setLoading(false); }
    };

    // 기간 계산
    const getPeriodDates = (p) => {
        const now = new Date();
        const start = new Date(now);
        if (p === '24시') start.setHours(start.getHours() - 24);
        else if (p === '48시') start.setHours(start.getHours() - 48);
        else if (p === '3일') start.setDate(start.getDate() - 3);
        else if (p === '7일') start.setDate(start.getDate() - 7);
        else if (p === '30일') start.setDate(start.getDate() - 30);
        const fmt = d => d.toISOString().replace('T', '').replace(/-|:/g, '').slice(0, 12);
        return { start: fmt(start), end: fmt(now) };
    };

    // 데이터 조회
    const fetchData = useCallback(async (p) => {
        setLoading(true);
        try {
            const { start, end } = getPeriodDates(p);
            const res = await api.get(`/location/range?start=${start}&end=${end}`);
            const data = (Array.isArray(res.data) ? res.data : [])
                .filter(d => d.imei === imei && (d.eventcode === '1' || d.eventcode === '4'))
                .sort((a, b) => (b.regDate || '').localeCompare(a.regDate || ''));
            setFilteredData(data);
            setPlayIdx(data.length - 1);
            setPlaying(false);
        } catch { setAllData([]); setFilteredData([]); }
        finally { setLoading(false); }
    }, [imei]);

    useEffect(() => { fetchData(period); }, []);

    // 오버레이 토글
    const toggleOverlay = (key) => {
      setOverlays(prev => {
        const next = { ...prev, [key]: !prev[key] };
        const map = mapObj.current;
        if (!map) return next;

        if (overlayLayers.current[key]) {
          map.removeLayer(overlayLayers.current[key]);
          delete overlayLayers.current[key];
        }

        if (next[key]) {
          if (key === 'weather') {
            fetchWeather7days();
          } else if (key === 'geofence') {
            fetchGeoFence();
          } else if (key === 'otherDevices') {
            fetchOtherDevices();
          } else if (key === 'heatmap') {
            drawHeatmap();
          } else if (key === 'typhoon') {
            fetchTyphoon();
          } else if (key === 'airspace') {
            drawAirspace();
          } else if (key === 'earthquake') {
            fetchEarthquakes();
          } else if (key === 'wildfire') {
            fetchWildfires();
          } else if (key === 'wind') {
            fetchWind();
          } else if (key === 'temp') {
            fetchTemp();
          } else if (key === 'rain') {
            fetchRain();
          } else if (OVERLAY_TILES[key]) {
            const layer = new TileLayer({
              source: new XYZ({ url: OVERLAY_TILES[key], crossOrigin: 'anonymous' }),
              opacity: key === 'seamap' ? 1 : 0.7,
              zIndex: 5,
            });
            map.addLayer(layer);
            overlayLayers.current[key] = layer;
          }
        } else {
          if (key === 'weather') {
            setWeatherPopup(null);
          }
          if (['earthquake','wildfire','wind','temp','rain','geofence','otherDevices','heatmap','typhoon','airspace'].includes(key)) {
            vectorSource.current.getFeatures()
              .filter(f => f.get('overlayType') === key)
              .forEach(f => vectorSource.current.removeFeature(f));
          }
        }
        return next;
      });
    };

    // 지진 데이터 (USGS)
    const fetchEarthquakes = async () => {
      try {
        const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
        const json = await res.json();
        json.features.forEach(eq => {
          const [lon, lat, depth] = eq.geometry.coordinates;
          const mag = eq.properties.mag;
          const f = new Feature({ geometry: new Point(fromLonLat([lon, lat])) });
          f.set('overlayType', 'earthquake');
          f.set('info', `M${mag} ${eq.properties.place}`);
          f.setStyle(new Style({
            image: new Circle({
              radius: Math.max(5, mag * 3),
              fill: new Fill({ color: `rgba(239,68,68,${Math.min(0.9, mag / 9)})` }),
              stroke: new Stroke({ color: '#ef4444', width: 1.5 }),
            }),
          }));
          vectorSource.current.addFeature(f);
        });
      } catch (_) { /* 무시 */ }
    };

    // 산불 데이터 (NASA FIRMS)
    const fetchWildfires = async () => {
      try {
        const res = await fetch('https://firms.modaps.eosdis.nasa.gov/api/country/csv/YOUR_KEY/VIIRS_SNPP_NRT/KOR/1');
        // API 키 필요 - 임시로 샘플 데이터
        alert('NASA FIRMS API 키가 필요합니다. https://firms.modaps.eosdis.nasa.gov 에서 무료 발급 가능합니다.');
      } catch (_) { /* 무시 */ }
    };

    // TLE 파싱
    const parseTLE = (text) => {
      const lines = text.trim().split('\n').map(l => l.trim());
      const tles = [];
      for (let i = 0; i < lines.length - 2; i += 3) {
        if (lines[i + 1]?.startsWith('1 ') && lines[i + 2]?.startsWith('2 ')) {
          tles.push({ name: lines[i], tle1: lines[i + 1], tle2: lines[i + 2] });
        }
      }
      return tles;
    };

    // 위성 현재 위치 계산
    const getSatPositions = (tles) => {
      const now = new Date();
      return tles.map(tle => {
        try {
          const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);
          const posVel = satellite.propagate(satrec, now);
          if (!posVel.position) return null;
          const gmst = satellite.gstime(now);
          const geo = satellite.eciToGeodetic(posVel.position, gmst);
          return {
            name: tle.name,
            lat: satellite.degreesLat(geo.latitude),
            lon: satellite.degreesLong(geo.longitude),
            alt: geo.height,
          };
        } catch (_) { return null; }
      }).filter(Boolean);
    };

    // 두 좌표간 거리 계산 (km)
    const calcDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    // 커버리지 반경 계산
    const calcCoverageM = (alt) => {
      const earthRadius = 6371;
      const elevRad = 8.2 * Math.PI / 180;
      const rho = earthRadius / (earthRadius + alt);
      const coverageKm = earthRadius * (Math.acos(rho * Math.cos(elevRad)) - elevRad);
      return Math.min(coverageKm, 2500) * 1000;
    };

    // 위성 마커 그리기
    const drawSatellites = (positions, type) => {
      satSource.current.getFeatures()
        .filter(f => f.get('overlayType') === type || f.get('isCoverage'))
        .forEach(f => satSource.current.removeFeature(f));

      const color = type === 'iridium' ? '#00d4f0' : '#a78bfa';
      const icon = type === 'iridium' ? '🛰️' : '⭐';

      // 최신 장비 위치
      const { lat: devLat, lon: devLon } = getLatestCoord();

      // 자동 추적: 가장 가까운 위성 선택
      if (autoTrackRef.current) {
        let minDist = Infinity;
        let nearestName = null;
        positions.forEach(pos => {
          let lon = pos.lon;
          while (lon > 180) lon -= 360;
          while (lon < -180) lon += 360;
          const dist = calcDistance(devLat, devLon, pos.lat, lon);
          if (dist < minDist) { minDist = dist; nearestName = pos.name; }
        });
        if (nearestName) selectedSatRef.current = nearestName;
      }

      positions.forEach(pos => {
        if (isNaN(pos.lat) || isNaN(pos.lon)) return;
        let lon = pos.lon;
        while (lon > 180) lon -= 360;
        while (lon < -180) lon += 360;

        const isSelected = selectedSatRef.current === pos.name;
        const distKm = Math.round(calcDistance(devLat, devLon, pos.lat, lon));

        const f = new Feature({ geometry: new Point(fromLonLat([lon, pos.lat])) });
        f.set('overlayType', type);
        f.set('satPos', { ...pos, lon, distKm });
        f.setStyle(new Style({
          image: new Circle({
            radius: isSelected ? 9 : 5,
            fill: new Fill({ color: isSelected ? '#fff' : color + 'cc' }),
            stroke: new Stroke({ color: isSelected ? color : '#fff', width: isSelected ? 2.5 : 1.5 }),
          }),
        }));
        satSource.current.addFeature(f);

        // 선택된 위성 커버리지 원
        if (isSelected) {
          const coverageM = calcCoverageM(pos.alt);
          const center = fromLonLat([lon, pos.lat]);
          const res = getPointResolution('EPSG:3857', 1, center);
          const radiusInMapUnits = coverageM / res;
          const circle = new Feature({ geometry: new GeomCircle(center, radiusInMapUnits) });
          circle.set('isCoverage', true);
          circle.set('overlayType', type);
          circle.setStyle(new Style({
            stroke: new Stroke({ color, width: 1.5, lineDash: [6, 4] }),
            fill: new Fill({ color: type === 'iridium' ? 'rgba(0,212,240,0.06)' : 'rgba(167,139,250,0.06)' }),
          }));
          satSource.current.addFeature(circle);

          // 팝업 자동 업데이트
          setSatPopup(prev => prev ? { ...prev, pos: { ...pos, lon, distKm }, type } : null);
        }
      });
    };

    // Iridium 위성 토글 (0=꺼짐 → 1=재생 → 2=일시정지 → 0)
    const toggleIridium = async () => {
      const next = (iridiumState + 1) % 3;
      setIridiumState(next);

      if (next === 0) {
        clearInterval(iridiumTimer.current);
        satSource.current.getFeatures()
          .filter(f => f.get('overlayType') === 'iridium' || f.get('isCoverage'))
          .forEach(f => satSource.current.removeFeature(f));
        selectedSatRef.current = null;
        setSatPopup(null);
        autoTrackRef.current = true;
        return;
      }

      if (next === 1) {
        if (iridiumTLEs.current.length === 0) {
          try {
            const res2 = await api.get('/location/tle/iridium');
            const text = res2.data;
            iridiumTLEs.current = parseTLE(text).slice(0, 66);
          } catch (_) {
            iridiumTLEs.current = [];
            alert('⚠️ Celestrak 접속 실패');
          }
        }
        autoTrackRef.current = true;
        selectedSatRef.current = null;
        const update = () => {
          const positions = getSatPositions(iridiumTLEs.current);
          drawSatellites(positions, 'iridium');
          if (selectedSatRef.current) {
            const sel = positions.find(p => p.name === selectedSatRef.current);
            if (sel) {
              let lon = sel.lon;
              while (lon > 180) lon -= 360;
              while (lon < -180) lon += 360;
              const { lat: devLat, lon: devLon } = getLatestCoord();
              const distKm = Math.round(calcDistance(devLat, devLon, sel.lat, lon));
              setSatPopup(prev => ({
                pos: { ...sel, lon, distKm },
                type: 'iridium',
                paired: prev?.type === 'starlink' ? prev : null,
              }));
            }
          }
        };
        update();
        iridiumTimer.current = setInterval(update, 3000);
        return;
      }

      if (next === 2) {
        clearInterval(iridiumTimer.current);
        return;
      }
    };

    // Starlink 위성 토글
    const toggleStarlink = async () => {
      const next = (starlinkState + 1) % 3;
      setStarlinkState(next);

      if (next === 0) {
        clearInterval(starlinkTimer.current);
        satSource.current.getFeatures()
          .filter(f => f.get('overlayType') === 'starlink' || f.get('isCoverage'))
          .forEach(f => satSource.current.removeFeature(f));
        selectedSatRef.current = null;
        setSatPopup(null);
        autoTrackRef.current = true;
        return;
      }

      if (next === 1) {
        if (starlinkTLEs.current.length === 0) {
          try {
            const res2 = await api.get('/location/tle/starlink');
            const text = res2.data;
            starlinkTLEs.current = parseTLE(text).slice(0, 100);
          } catch (_) {
            starlinkTLEs.current = [];
            alert('⚠️ Celestrak 접속 실패');
          }
        }
        autoTrackRef.current = true;
        selectedSatRef.current = null;
        const update = () => {
          const positions = getSatPositions(starlinkTLEs.current);
          drawSatellites(positions, 'starlink');
          if (selectedSatRef.current) {
            const sel = positions.find(p => p.name === selectedSatRef.current);
            if (sel) {
              let lon = sel.lon;
              while (lon > 180) lon -= 360;
              while (lon < -180) lon += 360;
              const { lat: devLat, lon: devLon } = getLatestCoord();
              const distKm = Math.round(calcDistance(devLat, devLon, sel.lat, lon));
              setSatPopup(prev => ({
                pos: { ...sel, lon, distKm },
                type: 'starlink',
                paired: prev?.type === 'iridium' ? prev : null,
              }));
            }
          }
        };
        update();
        starlinkTimer.current = setInterval(update, 3000);
        return;
      }

      if (next === 2) {
        clearInterval(starlinkTimer.current);
        return;
      }
    };

    // cleanup
    useEffect(() => {
      return () => {
        clearInterval(iridiumTimer.current);
        clearInterval(starlinkTimer.current);
      };
    }, []);

    // GEO Fence 오버레이 — localStorage에서 조회
    const fetchGeoFence = async () => {
      try {
        // DB에서 조회
        const res = await api.get(`/location/command/geo/${imei}`);
        const dbSlots = Array.isArray(res.data) ? res.data : [];

        // localStorage 병합 (DB 우선)
        const deviceKey = `geo_${imei}`;
        const lastSentSlot = localStorage.getItem(`${deviceKey}_lastSent`);
        const slotsRaw = localStorage.getItem(`${deviceKey}_slots`);
        const localSlots = slotsRaw ? JSON.parse(slotsRaw) : {};

        // DB 슬롯을 targetSlots 형태로 변환
        const dbSlotMap = {};
        dbSlots.forEach(s => {
          if (s.title && s.text) {
            // command 파싱: G1,DEF1,S010,N,N-1,lat,lon,N-2,lat,lon,...
            const parts = s.text.split(',');
            const mode = parts[1] || 'DEF1';
            const n = parseInt(parts[3]);
            const points = [];
            for (let i = 0; i < n; i++) {
              // 각 포인트: N-순번(1개), lat(1개), lon(1개) = 3개씩
              const offset = 4 + i * 3;
              const lat = parseFloat(parts[offset + 1]); // N-순번 건너뜀
              const lon = parseFloat(parts[offset + 2]);
              if (!isNaN(lat) && !isNaN(lon)) points.push({ lat, lon });
            }
            if (points.length >= 3) {
              dbSlotMap[s.title] = { points, mode, command: s.text, status: s.status };
            }
          }
        });

        // DB + localStorage 병합
        const mergedSlots = { ...localSlots };
        Object.entries(dbSlotMap).forEach(([slot, data]) => {
          mergedSlots[slot] = data;
        });

        if (Object.keys(mergedSlots).length === 0 || Object.values(mergedSlots).every(v => !v)) {
          alert('저장된 GEO Fence가 없습니다.\nGEO Fence 설정에서 먼저 저장해주세요.');
          return;
        }

        const targetSlots = lastSentSlot && mergedSlots[lastSentSlot]
          ? { [lastSentSlot]: mergedSlots[lastSentSlot] }
          : mergedSlots;

        const modeColors = {
          'DEF1': { stroke: '#10b981', fill: 'rgba(16,185,129,.12)' },
          'DEF2': { stroke: '#ef4444', fill: 'rgba(239,68,68,.12)' },
          'DEF3': { stroke: '#3b82f6', fill: 'rgba(59,130,246,.12)' },
        };

        // Polygon은 상단에서 이미 import됨
        let addedCount = 0;

        Object.entries(targetSlots).forEach(([slotName, slotData]) => {
          if (!slotData || !slotData.points || slotData.points.length < 3) return;

          const { points: pts, mode } = slotData;
          const isLastSent = slotName === lastSentSlot;
          const color = modeColors[mode] || modeColors['DEF1'];
          const coords = pts.map(p => fromLonLat([p.lon, p.lat]));

          // 폴리곤
          const polygon = new Feature({
            geometry: new Polygon([[...coords, coords[0]]]),
          });
          polygon.set('overlayType', 'geofence');
          polygon.set('info',
            `📍 ${slotName}\n모드: ${mode === 'DEF1' ? 'DEF1 (진입감지)' : mode === 'DEF2' ? 'DEF2 (이탈감지)' : 'DEF3 (진입+이탈)'}\n꼭짓점: ${pts.length}개${isLastSent ? '\n🟡 마지막 전송된 구역' : ''}`
          );
          polygon.setStyle(new Style({
            stroke: new Stroke({
              color: isLastSent ? '#fbbf24' : color.stroke,
              width: isLastSent ? 3 : 2,
              lineDash: [6, 4],
            }),
            fill: new Fill({ color: isLastSent ? 'rgba(245,158,11,.1)' : color.fill }),
          }));
          vectorSource.current.addFeature(polygon);

          // 꼭짓점 마커
          coords.forEach((coord) => {
            const pt = new Feature({ geometry: new Point(coord) });
            pt.set('overlayType', 'geofence');
            pt.setStyle(new Style({
              image: new Circle({
                radius: 5,
                fill: new Fill({ color: isLastSent ? '#fbbf24' : color.stroke }),
                stroke: new Stroke({ color: '#fff', width: 1.5 }),
              }),
            }));
            vectorSource.current.addFeature(pt);
          });

          addedCount++;
        });

        if (addedCount > 0) {
          const ext = vectorSource.current.getExtent();
          if (ext[0] !== Infinity) {
            mapObj.current?.getView().fit(ext, {
              padding: [60, 60, 60, 60],
              maxZoom: 14,
              duration: 600,
            });
          }
          alert(`📍 GEO Fence ${addedCount}개 표시\n${lastSentSlot ? `🟡 마지막 전송: ${lastSentSlot}` : '⚠️ 전송된 슬롯 없음 — 저장된 전체 표시'}`);
        } else {
          alert('표시할 GEO Fence 데이터가 없습니다.');
        }

      } catch (_) {
        alert('GEO Fence 정보를 불러올 수 없습니다.');
      }
    };

         

    // 타장비 최신 위치
    const fetchOtherDevices = async () => {
      try {
        const res = await api.get('/location/latest');
        const list = Array.isArray(res.data) ? res.data : [];
        // 현재 계정이 가진 장비 IMEI만 필터링
        const myImeis = devices.map(d => d.imei);
        let count = 0;
        list.forEach(d => {
          if (d.imei === imei) return; // 현재 장비 제외
          if (myImeis.length > 0 && !myImeis.includes(d.imei)) return; // 권한 없는 장비 제외
          const parts = d.position?.split(',') || [];
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          if (isNaN(lat) || isNaN(lon)) return;
          const f = new Feature({ geometry: new Point(fromLonLat([lon, lat])) });
          f.set('overlayType', 'otherDevices');
          f.set('info', `📡 ${d.imei}\n위도: ${lat.toFixed(4)}\n경도: ${lon.toFixed(4)}\n시간: ${d.regDate?.slice(0,4)}-${d.regDate?.slice(4,6)}-${d.regDate?.slice(6,8)} ${d.regDate?.slice(8,10)}:${d.regDate?.slice(10,12)}`);
          f.setStyle(new Style({
            image: new Circle({
              radius: 8,
              fill: new Fill({ color: 'rgba(0,212,240,.3)' }),
              stroke: new Stroke({ color: '#00d4f0', width: 2 }),
            }),
          }));
          vectorSource.current.addFeature(f);
          count++;
        });
        if (count === 0) alert('다른 장비의 위치 데이터가 없습니다.');
      } catch (_) { alert('타장비 정보를 불러올 수 없습니다.'); }
    };

    // 이력밀도 히트맵
    const drawHeatmap = () => {
      if (filteredData.length === 0) { alert('트랙 데이터가 없습니다.'); return; }
      // 격자별 밀도 계산
      const grid = {};
      filteredData.forEach(d => {
        const parts = d.position?.split(',') || [];
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lon)) return;
        // 소수점 2자리로 격자화
        const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
        grid[key] = (grid[key] || 0) + 1;
      });
      const maxCount = Math.max(...Object.values(grid));
      Object.entries(grid).forEach(([key, count]) => {
        const [lat, lon] = key.split(',').map(Number);
        const ratio = count / maxCount;
        const r = Math.round(255 * ratio);
        const g = Math.round(100 * (1 - ratio));
        const b = 50;
        const f = new Feature({ geometry: new Point(fromLonLat([lon, lat])) });
        f.set('overlayType', 'heatmap');
        f.set('info', `🔴 이 구역 통과 횟수: ${count}회`);
        f.setStyle(new Style({
          image: new Circle({
            radius: Math.max(8, ratio * 25),
            fill: new Fill({ color: `rgba(${r},${g},${b},${0.3 + ratio * 0.4})` }),
            stroke: new Stroke({ color: `rgba(${r},${g},${b},0.8)`, width: 1 }),
          }),
        }));
        vectorSource.current.addFeature(f);
      });
    };

    // 태풍 경로 (기상청 RSS)
    const fetchTyphoon = async () => {
      try {
        // 기상청 태풍 정보 RSS (CORS 이슈로 proxy 필요 시 백엔드 경유)
        const res = await fetch('https://www.weather.go.kr/w/resources/typhoon/typhoon-list.do');
        // CORS 이슈 가능 → 백엔드 proxy 경유 권장
        alert('태풍 정보: 현재 활성 태풍이 없거나 CORS 제한으로 백엔드 proxy가 필요합니다.\n기상청: www.weather.go.kr');
      } catch (_) {
        // 샘플 태풍 경로 표시
        const samplePath = [
          { lat: 20.0, lon: 135.0 }, { lat: 22.0, lon: 132.0 },
          { lat: 25.0, lon: 129.0 }, { lat: 28.0, lon: 126.0 },
          { lat: 32.0, lon: 127.0 }, { lat: 36.0, lon: 130.0 },
        ];
        const coords = samplePath.map(p => fromLonLat([p.lon, p.lat]));
        const line = new Feature({ geometry: new LineString(coords) });
        line.set('overlayType', 'typhoon');
        line.setStyle(new Style({
          stroke: new Stroke({ color: '#a78bfa', width: 3, lineDash: [8, 4] }),
        }));
        vectorSource.current.addFeature(line);
        samplePath.forEach((p, i) => {
          const f = new Feature({ geometry: new Point(fromLonLat([p.lon, p.lat])) });
          f.set('overlayType', 'typhoon');
          f.set('info', `🌀 태풍 예상경로 ${i + 1}번째 포인트`);
          f.setStyle(new Style({
            image: new Circle({
              radius: 8 + i * 2,
              fill: new Fill({ color: `rgba(167,139,250,${0.2 + i * 0.1})` }),
              stroke: new Stroke({ color: '#a78bfa', width: 2 }),
            }),
          }));
          vectorSource.current.addFeature(f);
        });
        alert('⚠️ 실제 태풍 데이터가 없어 샘플 경로를 표시합니다.\n실제 적용 시 기상청 API 연동 필요합니다.');
      }
    };

    // 항공제한구역 (한국 주요 비행금지구역)
    const drawAirspace = async () => {
      // 한국 주요 비행금지구역 (P-73: 청와대, P-65: 수도권 등 대략적 위치)
      const zones = [
        {
          name: 'P-73A (청와대)',
          coords: [[126.97,37.59],[126.99,37.59],[126.99,37.58],[126.97,37.58]],
          color: '#ef4444',
        },
        {
          name: 'P-73B (서울 중심부)',
          coords: [[126.95,37.62],[127.05,37.62],[127.05,37.54],[126.95,37.54]],
          color: '#f43f5e',
        },
        {
          name: 'P-65 (수도권 남부)',
          coords: [[126.80,37.40],[127.20,37.40],[127.20,37.10],[126.80,37.10]],
          color: '#fb923c',
        },
        {
          name: 'R-75 (군사훈련공역)',
          coords: [[128.00,38.00],[129.00,38.00],[129.00,37.00],[128.00,37.00]],
          color: '#f59e0b',
        },
      ];
      zones.forEach(zone => {
        const coords = zone.coords.map(([lon, lat]) => fromLonLat([lon, lat]));
        const f = new Feature({ geometry: new Polygon([[...coords, coords[0]]]) });
        f.set('overlayType', 'airspace');
        f.set('info', `✈️ ${zone.name}\n비행금지구역 — 드론 운용 금지\n자세한 내용: 국토교통부 항공정보포털`);
        f.setStyle(new Style({
          stroke: new Stroke({ color: zone.color, width: 2, lineDash: [4, 4] }),
          fill: new Fill({ color: zone.color.replace(')', ',0.1)').replace('rgb', 'rgba') + '15' }),
        }));
        vectorSource.current.addFeature(f);
      });
      alert('✈️ 주요 비행금지구역 표시\n⚠️ 실제 비행 전 국토교통부 항공정보포털(AIM) 확인 필수\nhttps://aim.molit.go.kr');
    };

    // 7일 날씨 예보
    const fetchWeather7days = async () => {
      try {
        const { lat, lon } = getLatestCoord();
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset&timezone=Asia%2FSeoul&forecast_days=7`
        );
        const json = await res.json();
        const daily = json.daily;
        if (!daily) { alert('날씨 정보를 가져올 수 없습니다.'); return; }

        const getWeatherIcon = (code) => {
          if (code === 0) return '☀️';
          if (code <= 3) return '⛅';
          if (code <= 49) return '🌫️';
          if (code <= 59) return '🌦️';
          if (code <= 69) return '🌧️';
          if (code <= 79) return '🌨️';
          if (code <= 82) return '⛈️';
          if (code <= 99) return '⛈️';
          return '🌡️';
        };

        const getWeatherDesc = (code) => {
          if (code === 0) return '맑음';
          if (code <= 3) return '구름';
          if (code <= 49) return '안개';
          if (code <= 59) return '이슬비';
          if (code <= 69) return '비';
          if (code <= 79) return '눈';
          if (code <= 82) return '소나기';
          if (code <= 99) return '뇌우';
          return '알 수 없음';
        };

        const days = daily.time.map((date, i) => ({
          date,
          icon: getWeatherIcon(daily.weathercode[i]),
          desc: getWeatherDesc(daily.weathercode[i]),
          maxTemp: daily.temperature_2m_max[i],
          minTemp: daily.temperature_2m_min[i],
          precip: daily.precipitation_sum[i],
          precipProb: daily.precipitation_probability_max[i],
          windSpeed: daily.windspeed_10m_max[i],
          windDir: daily.winddirection_10m_dominant[i],
          sunrise: daily.sunrise[i]?.slice(11),
          sunset: daily.sunset[i]?.slice(11),
        }));

        setWeatherPopup({ lat, lon, days });
      } catch (_) {
        alert('날씨 정보를 가져올 수 없습니다.');
      }
    };

    // 강수 정보 (Open-Meteo)
    const fetchRain = async () => {
      try {
        const { lat, lon } = getLatestCoord();
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation,precipitation_probability,weathercode&timezone=Asia%2FSeoul&forecast_days=1`
        );
        const json = await res.json();
        const temp = json.current_weather?.temperature;
        const wmo = json.current_weather?.weathercode;
        const windspeed = json.current_weather?.windspeed;

        // 현재 시간 인덱스 찾기
        const now = new Date();
        const hourStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:00`;
        const idx = json.hourly?.time?.findIndex(t => t === hourStr) ?? 0;
        const precip = json.hourly?.precipitation?.[idx] ?? 0;
        const precipProb = json.hourly?.precipitation_probability?.[idx] ?? 0;

        // 날씨코드 해석
        const getWeatherDesc = (code) => {
          if (code === 0) return '☀️ 맑음';
          if (code <= 3) return '⛅ 구름';
          if (code <= 49) return '🌫️ 안개';
          if (code <= 59) return '🌦️ 이슬비';
          if (code <= 69) return '🌧️ 비';
          if (code <= 79) return '🌨️ 눈';
          if (code <= 82) return '⛈️ 소나기';
          if (code <= 99) return '⛈️ 뇌우';
          return '알 수 없음';
        };

        // 지도에 마커 추가
        const f = new Feature({ geometry: new Point(fromLonLat([lon, lat])) });
        f.set('overlayType', 'rain');
        const infoText = precip > 0
          ? `🌧️ 현재 강수량: ${precip}mm\n강수확률: ${precipProb}%\n날씨: ${getWeatherDesc(wmo)}\n기온: ${temp}°C\n바람: ${windspeed}km/h`
          : `☀️ 현재 강수 없음\n강수확률: ${precipProb}%\n날씨: ${getWeatherDesc(wmo)}\n기온: ${temp}°C`;
        f.set('info', infoText);
        f.setStyle(new Style({
          image: new Circle({
            radius: 22,
            fill: new Fill({ color: precip > 0 ? 'rgba(59,130,246,.3)' : 'rgba(16,185,129,.2)' }),
            stroke: new Stroke({ color: precip > 0 ? '#3b82f6' : '#10b981', width: 2 }),
          }),
        }));
        vectorSource.current.addFeature(f);

        // 타일 레이어도 추가
        if (OVERLAY_TILES['rain']) {
          const layer = new TileLayer({
            source: new XYZ({ url: OVERLAY_TILES['rain'], crossOrigin: 'anonymous' }),
            opacity: 0.6,
            zIndex: 5,
          });
          mapObj.current?.addLayer(layer);
          overlayLayers.current['rain'] = layer;
        }

        // 팝업 표시
        alert(`📍 최신 위치 기준 강수 정보\n${infoText}`);

      } catch (_) {
        alert('강수 정보를 가져올 수 없습니다.');
      }
    };

    // 최신 위치 좌표 가져오기
    const getLatestCoord = () => {
      if (filteredData.length === 0) return { lat: 37.5, lon: 127.0 };
      const latest = filteredData[0];
      const parts = latest.position?.split(',') || [];
      return {
        lat: parseFloat(parts[0]) || 37.5,
        lon: parseFloat(parts[1]) || 127.0,
      };
    };

    const fetchWind = async () => {
      try {
        const { lat, lon } = getLatestCoord();
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const json = await res.json();
        const speed = json.current_weather?.windspeed;
        const dir = json.current_weather?.winddirection;
        const wmo = json.current_weather?.weathercode;
        // 지도에 마커 추가
        const f = new Feature({ geometry: new Point(fromLonLat([lon, lat])) });
        f.set('overlayType', 'wind');
        f.set('info', `💨 ${speed}km/h / ${dir}°`);
        f.setStyle(new Style({
          image: new Circle({
            radius: 18,
            fill: new Fill({ color: 'rgba(0,212,240,.2)' }),
            stroke: new Stroke({ color: '#00d4f0', width: 2 }),
          }),
        }));
        vectorSource.current.addFeature(f);
        alert(`📍 최신 위치 기준 바람\n속도: ${speed} km/h\n방향: ${dir}°`);
      } catch (_) { /* 무시 */ }
    };

    const fetchTemp = async () => {
      try {
        const { lat, lon } = getLatestCoord();
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const json = await res.json();
        const temp = json.current_weather?.temperature;
        const f = new Feature({ geometry: new Point(fromLonLat([lon, lat])) });
        f.set('overlayType', 'temp');
        f.set('info', `🌡️ ${temp}°C`);
        f.setStyle(new Style({
          image: new Circle({
            radius: 18,
            fill: new Fill({ color: 'rgba(245,158,11,.2)' }),
            stroke: new Stroke({ color: '#f59e0b', width: 2 }),
          }),
        }));
        vectorSource.current.addFeature(f);
        alert(`📍 최신 위치 기준 기온\n현재: ${temp}°C`);
      } catch (_) { /* 무시 */ }
    };

    // 지도 초기화
    useEffect(() => {
        if (!mapRef.current || mapObj.current) return;
        mapObj.current = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                new VectorLayer({ source: vectorSource.current }),
                new VectorLayer({ source: satSource.current, zIndex: 10 }),
            ],
            view: new View({ center: fromLonLat([127.5, 36.5]), zoom: 7 }),
            controls: [],
        });

        mapObj.current.on('click', (e) => {
            const features = mapObj.current.getFeaturesAtPixel(e.pixel, {
              layerFilter: () => true
            });
            if (features.length > 0) {
              const f = features[0];
              if (f.get('pointData')) {
                setSelectedPoint(f.get('pointData'));
                setPopupPos({ x: e.pixel[0], y: e.pixel[1] });
              } else if (f.get('satPos')) {
                const pos = f.get('satPos');
                const type = f.get('overlayType');
                autoTrackRef.current = false; // 수동 클릭 → 자동추적 해제
                if (selectedSatRef.current === pos.name) {
                  selectedSatRef.current = null;
                  setSatPopup(null);
                } else {
                  selectedSatRef.current = pos.name;
                  setSatPopup({ pos, type, pixel: { x: e.pixel[0], y: e.pixel[1] } });
                }
                const tles = type === 'iridium' ? iridiumTLEs.current : starlinkTLEs.current;
                if (tles.length > 0) {
                  drawSatellites(getSatPositions(tles), type);
                }
              } else if (f.get('info')) {
                alert(f.get('info'));
              }
            } else {
                setSelectedPoint(null);
                setPopupPos(null);
            }
        }); 

        return () => { mapObj.current?.setTarget(undefined); mapObj.current = null; };
    }, []);

    // 랜덤 고유 색상 (컴포넌트 마운트 시 1회 생성)
    const trackColor = useRef((() => {
        const hue = Math.floor(Math.random() * 360);
        const h = hue / 360;
        const s = 0.75, l = 0.6;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p2 = 2 * l - q;
        const hue2rgb = (t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p2 + (q - p2) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p2 + (q - p2) * (2 / 3 - t) * 6;
            return p2;
        };
        const r = Math.round(hue2rgb(h + 1 / 3) * 255);
        const g = Math.round(hue2rgb(h) * 255);
        const b = Math.round(hue2rgb(h - 1 / 3) * 255);
        return { r, g, b };
    })());

    // 지도에 트랙 그리기
    useEffect(() => {
        if (!mapObj.current) return;
        vectorSource.current.clear();
        if (filteredData.length === 0) return;

        const points = filteredData.map(d => {
            const parts = d.position?.split(',') || [];
            return {
                lat: parseFloat(parts[0]),
                lon: parseFloat(parts[1]),
                heading: parseFloat(parts[2]) || 0,
                speed: parseFloat(parts[3]) || 0,
                altitude: parseFloat(parts[4]) || 0,
                regDate: d.regDate || d.reg_date,
                eventcode: d.eventcode,
            };
        }).filter(p => p.lat && p.lon);

        if (points.length === 0) return;

        const { r, g, b } = trackColor.current;
        const total = points.length;

        // 점선 폴리라인 (오래된→최신 순서)
        const coords = [...points].reverse().map(p => fromLonLat([p.lon, p.lat]));
        const line = new Feature({ geometry: new LineString(coords) });
        line.setStyle(new Style({
            stroke: new Stroke({
                color: `rgba(${r},${g},${b},0.5)`,
                width: 2,
                lineDash: [6, 4],
            })
        }));
        vectorSource.current.addFeature(line);

        // 마커 — 최신(i=0)이 크고 뚜렷, 오래될수록 희미하고 작게
        points.forEach((p, i) => {
            const isSOS = p.eventcode === '4';
            const isLatest = i === 0; // filteredData[0]이 최신
            const isCurrent = i === playIdx;

            // 최신=1.0, 가장 오래된=0.08
            const ratio = total > 1 ? i / (total - 1) : 0;
            const opacity = Math.max(0.08, 1 - ratio * 0.92);
            const radius = Math.max(3, 13 - ratio * 10);

            const fillColor = isSOS
                ? `rgba(239,68,68,${opacity})`
                : `rgba(${r},${g},${b},${opacity})`;
            const strokeColor = isSOS
                ? `rgba(255,80,80,${Math.min(1, opacity + 0.3)})`
                : `rgba(${r},${g},${b},${Math.min(1, opacity + 0.3)})`;

            const feat = new Feature({ geometry: new Point(fromLonLat([p.lon, p.lat])) });
            feat.set('pointData', p);
            feat.setStyle(new Style({
                image: new Circle({
                    radius: isCurrent ? Math.max(radius, 13) : radius,
                    fill: new Fill({ color: isCurrent ? `rgba(16,185,129,0.4)` : fillColor }),
                    stroke: new Stroke({
                        color: isCurrent ? '#10b981' : isLatest ? '#fff' : strokeColor,
                        width: isLatest || isCurrent ? 2.5 : 1,
                    })
                })
            }));
            vectorSource.current.addFeature(feat);
        });

        // 지도 범위 — 포인트 전체가 보이게 + 거리에 따라 자동 정밀도
        const extent = vectorSource.current.getExtent();
        if (extent[0] !== Infinity) {
            mapObj.current.getView().fit(extent, {
                padding: [60, 60, 60, 60],
                // 포인트 1개면 정밀하게, 여러개면 거리에 따라 자동
                maxZoom: points.length === 1 ? 17 : 16,
                duration: 600,
            });
        }
    }, [filteredData, playIdx]);

    // 재생
    useEffect(() => {
        if (playing) {
            playTimer.current = setInterval(() => {
                setPlayIdx(p => {
                    const next = p - 1;
                    if (next < 0) {
                        setPlaying(false);
                        return 0;
                    }
                    // 지도 중심 이동
                    const d = filteredData[next];
                    if (d && mapObj.current) {
                        const parts = d.position?.split(',') || [];
                        const lat = parseFloat(parts[0]);
                        const lon = parseFloat(parts[1]);
                        if (lat && lon) {
                            mapObj.current.getView().animate({
                                center: fromLonLat([lon, lat]),
                                duration: Math.max(200, 800 / playSpeed),
                            });
                        }
                    }
                    return next;
                });
            }, 1000 / playSpeed);
        } else {
            clearInterval(playTimer.current);
        }
        return () => clearInterval(playTimer.current);
    }, [playing, playSpeed, filteredData]);

    const formatDate = (reg) => formatDateWithGmt(reg);

    const totalPages = Math.ceil(filteredData.length / PER_PAGE);
    const paged = filteredData.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#0a1628', display: 'flex', flexDirection: 'column', fontFamily: "'Syne', sans-serif" }}>

            {/* ── 상단 헤더 ── */}
            <div className="tvp-header" style={{ height: '48px', background: 'rgba(13,22,40,.98)', borderBottom: '1px solid rgba(0,212,240,.2)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', flexShrink: 0, zIndex: 10 }}>
                <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg,#00d4f0,#3b82f6)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🛰️</div>
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#fff' }}>TYTO<span style={{ color: '#00d4f0' }}>TRACK</span></span>
                <div style={{ width: '1px', height: '18px', background: 'rgba(0,212,240,.2)' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>
                    {device?.eventcode === '4' ? 'SOS' : 'TRACK'} — {alias}
                </span>
                <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{imei}</span>
                <button onClick={onClose} style={{ marginLeft: 'auto', padding: '5px 14px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '7px', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                    {t.close}
                </button>
            </div>

            {/* ── 기간 + 재생 컨트롤 ── */}
            <div className="tvp-ctrl" style={{ height: '44px', background: 'rgba(10,20,38,.95)', borderBottom: '1px solid rgba(0,212,240,.15)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px', flexShrink: 0 }}>
                {/* 기간 버튼 */}
                <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{t.period}</span>
                {['24시', '48시', '3일', '7일', '30일'].map(p => (
                    <button key={p} onClick={() => { setPeriod(p); fetchData(p); setPage(1); }}
                        style={{ padding: '4px 10px', background: period === p ? '#00d4f0' : 'rgba(0,212,240,.08)', border: `1px solid ${period === p ? '#00d4f0' : 'rgba(0,212,240,.2)'}`, borderRadius: '6px', color: period === p ? '#0a1628' : '#6b8fae', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                        {t.periods[p] || p}
                    </button>
                ))}

                <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,240,.2)' }} />

                {/* 직접 날짜 설정 */}
                <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{t.direct}</span>
                <input type="datetime-local" value={customStart} onChange={e => setCustomStart(e.target.value)}
                    style={{ padding: '3px 6px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
                <span style={{ fontSize: '10px', color: '#6b8fae' }}>~</span>
                <input type="datetime-local" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                    style={{ padding: '3px 6px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
                <button onClick={applyCustomDate}
                    style={{ padding: '4px 10px', background: 'rgba(0,212,240,.12)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                    {t.apply}
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,240,.2)' }} />

                {/* 재생 컨트롤 */}
                <button onClick={() => { setPlayIdx(filteredData.length - 1); setPlaying(false); }}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#6b8fae', fontSize: '10px', cursor: 'pointer' }}>
                    {t.rewind}
                </button>
                <button onClick={() => setPlayIdx(p => Math.max(0, p - 1))}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#6b8fae', fontSize: '10px', cursor: 'pointer' }}>{t.prev}</button>
                <button onClick={() => {
                    if (!playing) {
                        // 재생 시작 시 항상 처음(가장 오래된)부터
                        setPlayIdx(filteredData.length - 1);
                    }
                    setPlaying(p => !p);
                }}
                    style={{ padding: '4px 12px', background: playing ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)', border: `1px solid ${playing ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}`, borderRadius: '6px', color: playing ? '#ef4444' : '#10b981', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    {playing ? t.pause : t.play}
                </button>
                <button onClick={() => setPlayIdx(p => Math.min(filteredData.length - 1, p + 1))}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#6b8fae', fontSize: '10px', cursor: 'pointer' }}>{t.next}</button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,240,.2)' }} />

                {/* 속도 */}
                <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{t.speed}</span>
                <select value={playSpeed} onChange={e => setPlaySpeed(Number(e.target.value))}
                    style={{ padding: '3px 8px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                    {[0.5, 1, 2, 5, 10].map(s => <option key={s} value={s}>x{s}</option>)}
                </select>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
                        {playIdx + 1} / {filteredData.length}{t.total}
                    </span>
                    {filteredData[playIdx] && (
                        <span style={{ fontSize: '10px', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatDate(filteredData[playIdx]?.regDate)}
                        </span>
                    )}
                </div>
            </div>

            {/* ── 본문 ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} className="tvp-body">

                {/* 리스트 */}
                <div style={{ width: '260px', flexShrink: 0, background: 'rgba(10,20,38,.97)', borderRight: '1px solid rgba(0,212,240,.15)', display: 'flex', flexDirection: 'column' }} className="tvp-list">
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,212,240,.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>{t.trackList}</span>
                        <span style={{ fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{filteredData.length}건</span>
                    </div>

                    {/* 컬럼 헤더 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '30px 50px 60px 50px 50px', padding: '4px 12px', background: 'rgba(0,0,0,.3)', flexShrink: 0, gap: '2px' }}>
                        {['#', 'Type', 'LAT', 'LON', '시간'].map(h => (
                            <span key={h} style={{ fontSize: '8px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }}>{h}</span>
                        ))}
                    </div>

                    {/* 목록 */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#6b8fae', fontSize: '12px' }}>{t.loading}</div>
                        ) : paged.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#6b8fae', fontSize: '12px' }}>{t.nodata}</div>
                        ) : paged.map((d, i) => {
                            const globalIdx = (page - 1) * PER_PAGE + i;
                            const parts = d.position?.split(',') || [];
                            const lat = parseFloat(parts[0]);
                            const lon = parseFloat(parts[1]);
                            const spd = parseFloat(parts[3]) || 0;
                            const isSOS = d.eventcode === '4';
                            const isCurrent = globalIdx === playIdx;

                            return (
                                <div key={i} onClick={() => {
                            setPlayIdx(globalIdx);
                            setSelectedPoint({ lat, lon, heading: parseFloat(parts[2]) || 0, speed: spd, altitude: parseFloat(parts[4]) || 0, regDate: d.regDate, eventcode: d.eventcode });
                            // 지도 해당 지점으로 이동
                            if (mapObj.current && lat && lon) {
                              mapObj.current.getView().animate({
                                center: fromLonLat([lon, lat]),
                                zoom: Math.max(mapObj.current.getView().getZoom(), 15),
                                duration: 500,
                              });
                            }
                          }}
                                    style={{ display: 'grid', gridTemplateColumns: '30px 50px 60px 60px 50px', padding: '5px 12px', borderBottom: '1px solid rgba(0,212,240,.06)', cursor: 'pointer', gap: '2px', background: isCurrent ? 'rgba(0,212,240,.08)' : isSOS ? 'rgba(239,68,68,.05)' : 'transparent', borderLeft: isCurrent ? '2px solid #00d4f0' : '2px solid transparent', animation: isSOS ? 'sosBlink 1.5s infinite' : 'none' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = isCurrent ? 'rgba(0,212,240,.08)' : isSOS ? 'rgba(239,68,68,.05)' : 'transparent'}>
                                    <span style={{ fontSize: '8px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>{globalIdx + 1}</span>
                                    <span style={{ fontSize: '8px', fontWeight: '700', color: isSOS ? '#ef4444' : '#3b82f6', fontFamily: "'JetBrains Mono', monospace" }}>{isSOS ? 'SOS' : 'TRACK'}</span>
                                    <span style={{ fontSize: '8px', color: '#e8f4ff', fontFamily: "'JetBrains Mono', monospace" }}>{lat?.toFixed(4)}</span>
                                    <span style={{ fontSize: '8px', color: '#e8f4ff', fontFamily: "'JetBrains Mono', monospace" }}>{lon?.toFixed(4)}</span>
                                    <span style={{ fontSize: '8px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>{d.regDate?.slice(8, 10)}:{d.regDate?.slice(10, 12)}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                            <span style={{ fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{page}/{totalPages}p</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    style={{ padding: '2px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '4px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>‹</button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    style={{ padding: '2px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '4px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>›</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 지도 */}
                <div style={{ flex: 1, position: 'relative' }} className="tvp-map">
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                    {/* 오버레이 버튼 패널 — 상단 우측 */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px', zIndex: 10, maxWidth: '420px' }}>
                      {(() => {
                        const uiLang = localStorage.getItem('lang') || 'ko';
                        const OVERLAY_LABELS = {
                          ko: {
                            weather: '🌤️ 날씨예보', rain: '🌧️ 강수', satellite: '🛰️ 위성사진',
                            seamap: '⚓ 해도', topo: '🏔️ 등고선', earthquake: '🌍 지진',
                            wildfire: '🔥 산불', wind: '💨 바람', temp: '🌡️ 기온',
                            typhoon: '🌀 태풍', airspace: '✈️ 항공제한', geofence: '📍 GEO Fence',
                            otherDevices: '📡 타장비', heatmap: '🔴 이력밀도',
                          },
                          en: {
                            weather: '🌤️ Weather', rain: '🌧️ Rain', satellite: '🛰️ Satellite',
                            seamap: '⚓ Sea Map', topo: '🏔️ Topo', earthquake: '🌍 Quake',
                            wildfire: '🔥 Wildfire', wind: '💨 Wind', temp: '🌡️ Temp',
                            typhoon: '🌀 Typhoon', airspace: '✈️ Airspace', geofence: '📍 GEO Fence',
                            otherDevices: '📡 Devices', heatmap: '🔴 Heatmap',
                          },
                          ja: {
                            weather: '🌤️ 天気予報', rain: '🌧️ 降水', satellite: '🛰️ 衛星写真',
                            seamap: '⚓ 海図', topo: '🏔️ 等高線', earthquake: '🌍 地震',
                            wildfire: '🔥 山火事', wind: '💨 風', temp: '🌡️ 気温',
                            typhoon: '🌀 台風', airspace: '✈️ 飛行制限', geofence: '📍 GEO Fence',
                            otherDevices: '📡 他機器', heatmap: '🔴 履歴密度',
                          },
                        };
                        const lb = OVERLAY_LABELS[uiLang] || OVERLAY_LABELS.ko;
                        return [
                          { key: 'weather', color: '#f59e0b' },
                          { key: 'rain', color: '#3b82f6' },
                          { key: 'satellite', color: '#8b5cf6' },
                          { key: 'seamap', color: '#06b6d4' },
                          { key: 'topo', color: '#10b981' },
                          { key: 'earthquake', color: '#ef4444' },
                          { key: 'wildfire', color: '#f59e0b' },
                          { key: 'wind', color: '#00d4f0' },
                          { key: 'temp', color: '#f97316' },
                          { key: 'typhoon', color: '#a78bfa' },
                          { key: 'airspace', color: '#f43f5e' },
                          { key: 'geofence', color: '#10b981' },
                          { key: 'otherDevices', color: '#00d4f0' },
                          { key: 'heatmap', color: '#ef4444' },
                        ].map(btn => ({ ...btn, label: lb[btn.key] }));
                      })().map(btn => (
                        <button key={btn.key} onClick={() => toggleOverlay(btn.key)}
                          title={btn.desc}
                          style={{
                            padding: '4px 10px', borderRadius: '7px', fontSize: '10px', fontWeight: '700', cursor: 'pointer',
                            background: overlays[btn.key] ? `${btn.color}30` : 'rgba(10,20,38,.85)',
                            border: `1px solid ${overlays[btn.key] ? btn.color : 'rgba(255,255,255,.15)'}`,
                            color: overlays[btn.key] ? btn.color : '#6b8fae',
                            backdropFilter: 'blur(8px)',
                            boxShadow: overlays[btn.key] ? `0 0 8px ${btn.color}50` : 'none',
                          }}>
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* 위성 추적 버튼 */}
                    <div className="tvp-sat-btn" style={{ position: 'absolute', top: '10px', right: '50px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
                      {[
                        {
                          label: '🛰️', title: 'Iridium', state: iridiumState, onClick: toggleIridium,
                          colors: ['rgba(14,26,46,.9)', 'rgba(0,212,240,.3)', 'rgba(245,158,11,.3)'],
                          borders: ['rgba(0,212,240,.3)', '#00d4f0', '#f59e0b'],
                          texts: ['rgba(0,212,240,.7)', '#00d4f0', '#f59e0b'],
                          labels: ['OFF', '▶', '⏸'],
                        },
                        {
                          label: '⭐', title: 'Starlink', state: starlinkState, onClick: toggleStarlink,
                          colors: ['rgba(14,26,46,.9)', 'rgba(167,139,250,.3)', 'rgba(245,158,11,.3)'],
                          borders: ['rgba(167,139,250,.3)', '#a78bfa', '#f59e0b'],
                          texts: ['rgba(167,139,250,.7)', '#a78bfa', '#f59e0b'],
                          labels: ['OFF', '▶', '⏸'],
                        },
                      ].map((btn, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <button onClick={btn.onClick} title={`${btn.title} (${btn.labels[btn.state]})`}
                            style={{ width: '36px', height: '36px', background: btn.colors[btn.state], border: `1px solid ${btn.borders[btn.state]}`, borderRadius: '7px', color: btn.texts[btn.state], fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', position: 'relative' }}>
                            {btn.label}
                            {btn.state === 1 && (
                              <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: '1px solid #fff', animation: 'sosBlink 1s infinite' }} />
                            )}
                          </button>
                          <span style={{ fontSize: '7px', color: btn.texts[btn.state], fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }}>
                            {btn.title}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 지도 컨트롤 버튼 */}
                    <div className="tvp-ctrl-btn" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
                        {[
                            { label: '+', onClick: () => mapObj.current?.getView().animate({ zoom: (mapObj.current.getView().getZoom() || 7) + 1, duration: 300 }), title: '확대' },
                            { label: '−', onClick: () => mapObj.current?.getView().animate({ zoom: (mapObj.current.getView().getZoom() || 7) - 1, duration: 300 }), title: '축소' },
                            {
                                label: '⊡', onClick: () => {
                                    const ext = vectorSource.current.getExtent();
                                    if (ext[0] !== Infinity) mapObj.current?.getView().fit(ext, { padding: [40, 40, 40, 40], maxZoom: 14, duration: 600 });
                                }, title: 'Fit All'
                            },
                            { label: '◎', onClick: () => navigator.geolocation?.getCurrentPosition(pos => mapObj.current?.getView().animate({ center: fromLonLat([pos.coords.longitude, pos.coords.latitude]), zoom: 13, duration: 600 })), title: 'My Location' },
                        ].map((btn, i) => (
                            <button key={i} onClick={btn.onClick} title={btn.title}
                                style={{ width: '32px', height: '32px', background: 'rgba(14,26,46,.9)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '7px', color: '#00d4f0', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(14,26,46,.9)'}>
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* 현재 재생 중 정보 — 노란색 영역 */}
                    {filteredData[playIdx] && (() => {
                        const d = filteredData[playIdx];
                        const parts = d.position?.split(',') || [];
                        const spd = parseFloat(parts[3]) || 0;
                        const hdg = parseFloat(parts[2]) || 0;
                        return (
                            <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,20,38,.9)', border: '1px solid rgba(245,158,11,.4)', borderRadius: '10px', padding: '8px 16px', display: 'flex', gap: '16px', alignItems: 'center', zIndex: 10 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '8px', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace", marginBottom: '2px' }}>SPEED</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{spd}<span style={{ fontSize: '9px', color: '#6b8fae' }}>kn</span></div>
                                </div>
                                <div style={{ width: '1px', height: '30px', background: 'rgba(245,158,11,.3)' }} />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '8px', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace", marginBottom: '2px' }}>HEADING</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{hdg}<span style={{ fontSize: '9px', color: '#6b8fae' }}>°</span></div>
                                </div>
                                <div style={{ width: '1px', height: '30px', background: 'rgba(245,158,11,.3)' }} />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '8px', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace", marginBottom: '2px' }}>TYPE</div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: d.eventcode === '4' ? '#ef4444' : '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>{d.eventcode === '4' ? 'SOS' : 'TRACK'}</div>
                                </div>
                                <div style={{ width: '1px', height: '30px', background: 'rgba(245,158,11,.3)' }} />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '8px', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace", marginBottom: '2px' }}>TIME</div>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#e8f4ff', fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(d.regDate)}</div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* 7일 날씨 예보 팝업 */}
                    {weatherPopup && (
                      <div style={{ position: 'absolute', top: '50px', left: '10px', background: 'rgba(10,20,38,.97)', border: '1px solid rgba(245,158,11,.3)', borderRadius: '14px', padding: '16px', zIndex: 20, minWidth: '680px', backdropFilter: 'blur(10px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: '700', color: '#f59e0b' }}>
                            🌤️ 7일 날씨 예보 — 최신위치 ({weatherPopup.lat.toFixed(3)}, {weatherPopup.lon.toFixed(3)})
                          </span>
                          <button onClick={() => { setWeatherPopup(null); setOverlays(p => ({ ...p, weather: false })); }}
                            style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {weatherPopup.days.map((day, i) => (
                            <div key={i} style={{
                              flex: 1, background: i === 0 ? 'rgba(245,158,11,.1)' : 'rgba(255,255,255,.04)',
                              border: `1px solid ${i === 0 ? 'rgba(245,158,11,.4)' : 'rgba(255,255,255,.08)'}`,
                              borderRadius: '10px', padding: '10px 8px', textAlign: 'center', minWidth: '88px',
                            }}>
                              <div style={{ fontSize: '9px', color: i === 0 ? '#f59e0b' : '#6b8fae', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px', fontWeight: i === 0 ? '700' : '400' }}>
                                {i === 0 ? '오늘' : i === 1 ? '내일' : new Date(day.date).toLocaleDateString('ko-KR', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{day.icon}</div>
                              <div style={{ fontSize: '9px', color: '#a0b4c8', marginBottom: '6px' }}>{day.desc}</div>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444' }}>{day.maxTemp}°</span>
                                <span style={{ fontSize: '10px', color: '#6b8fae' }}>/</span>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6' }}>{day.minTemp}°</span>
                              </div>
                              <div style={{ height: '1px', background: 'rgba(255,255,255,.08)', marginBottom: '6px' }} />
                              <div style={{ fontSize: '9px', color: '#3b82f6', marginBottom: '3px' }}>
                                🌧️ {day.precip}mm
                              </div>
                              <div style={{ fontSize: '9px', color: '#6b8fae', marginBottom: '3px' }}>
                                💧 {day.precipProb}%
                              </div>
                              <div style={{ fontSize: '9px', color: '#00d4f0', marginBottom: '3px' }}>
                                💨 {day.windSpeed}km/h
                              </div>
                              <div style={{ height: '1px', background: 'rgba(255,255,255,.08)', margin: '4px 0' }} />
                              <div style={{ fontSize: '8px', color: '#f59e0b' }}>🌅 {day.sunrise}</div>
                              <div style={{ fontSize: '8px', color: '#6b8fae' }}>🌇 {day.sunset}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 위성 정보 팝업 — 지도 우하단 고정 */}
                    {satPopup && (
                      <div style={{ position: 'absolute', bottom: '80px', right: '60px', display: 'flex', gap: '8px', zIndex: 30 }}>
                        {/* paired 팝업 */}
                        {satPopup.paired && (() => {
                          const p = satPopup.paired;
                          const c = p.type === 'iridium' ? '#00d4f0' : '#a78bfa';
                          return (
                            <div style={{ background: 'rgba(10,20,38,.97)', border: `1px solid ${c}`, borderRadius: '10px', padding: '12px 14px', minWidth: '180px', backdropFilter: 'blur(8px)' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: c, fontFamily: "'JetBrains Mono', monospace", marginBottom: '10px' }}>
                                {p.type === 'iridium' ? '🛰️' : '⭐'} {p.pos.name}
                              </div>
                              {[
                                ['고도', `${Math.round(p.pos.alt)}km`],
                                ['위도', `${p.pos.lat.toFixed(3)}°`],
                                ['경도', `${p.pos.lon.toFixed(3)}°`],
                                ['커버리지', `~${Math.round(calcCoverageM(p.pos.alt)/1000)}km`],
                                ['장비와 거리', `${p.pos.distKm?.toLocaleString() ?? '-'}km`],
                              ].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '5px' }}>
                                  <span style={{ fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                                  <span style={{ fontSize: '9px', fontWeight: '700', color: k === '장비와 거리' ? '#f59e0b' : '#e8f4ff', fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {/* 메인 팝업 */}
                        <div style={{ background: 'rgba(10,20,38,.97)', border: `1px solid ${satPopup.type === 'iridium' ? '#00d4f0' : '#a78bfa'}`, borderRadius: '10px', padding: '12px 14px', minWidth: '180px', backdropFilter: 'blur(8px)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: satPopup.type === 'iridium' ? '#00d4f0' : '#a78bfa', fontFamily: "'JetBrains Mono', monospace" }}>
                              {satPopup.type === 'iridium' ? '🛰️' : '⭐'} {satPopup.pos.name}
                            </span>
                            <button onClick={() => { setSatPopup(null); selectedSatRef.current = null; autoTrackRef.current = true; }}
                              style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                          </div>
                          {[
                            ['고도', `${Math.round(satPopup.pos.alt)}km`],
                            ['위도', `${satPopup.pos.lat.toFixed(3)}°`],
                            ['경도', `${satPopup.pos.lon.toFixed(3)}°`],
                            ['커버리지', `~${Math.round(calcCoverageM(satPopup.pos.alt)/1000)}km 반경`],
                            ['장비와 거리', `${satPopup.pos.distKm?.toLocaleString() ?? '-'}km`],
                          ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '5px' }}>
                              <span style={{ fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                              <span style={{ fontSize: '9px', fontWeight: '700', color: k === '장비와 거리' ? '#f59e0b' : '#e8f4ff', fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                            </div>
                          ))}
                          <div style={{ marginTop: '8px', padding: '4px 8px', background: autoTrackRef.current ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)', borderRadius: '5px', textAlign: 'center' }}>
                            <span style={{ fontSize: '8px', color: autoTrackRef.current ? '#10b981' : '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>
                              {autoTrackRef.current ? t.autoTrack : t.manualSelect}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 클릭 팝업 */}
                    {selectedPoint && popupPos && (
                        <div style={{ position: 'absolute', left: popupPos.x, top: popupPos.y - 10, transform: 'translate(-50%, -100%)', background: 'rgba(10,20,38,.97)', border: `1px solid ${selectedPoint.eventcode === '4' ? 'rgba(239,68,68,.5)' : 'rgba(0,212,240,.4)'}`, borderRadius: '12px', padding: '14px 20px', minWidth: '260px', zIndex: 20, backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: selectedPoint.eventcode === '4' ? '#ef4444' : '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>
                                    {selectedPoint.eventcode === '4' ? '🆘 SOS' : '📍 TRACK'} — {alias}
                                </span>
                                <button onClick={() => { setSelectedPoint(null); setPopupPos(null); }}
                                    style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                            </div>
                            {[
                                ['LAT', selectedPoint.lat?.toFixed(6)],
                                ['LON', selectedPoint.lon?.toFixed(6)],
                                ['SPD', `${selectedPoint.speed}kn`],
                                ['HDG', `${selectedPoint.heading}°`],
                                ['ALT', selectedPoint.altitude ? `${selectedPoint.altitude}m` : '-'],
                                ['TIME', formatDate(selectedPoint.regDate)],
                            ].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '12px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                                    <span style={{ fontSize: '12px', color: k === 'TIME' ? '#f59e0b' : '#e8f4ff', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }

        @media (max-width: 412px) {
          /* 헤더 축소 */
          .tvp-header {
            height: auto !important;
            flex-wrap: wrap !important;
            padding: 4px 8px !important;
            gap: 4px !important;
          }
          .tvp-header span { font-size: 8px !important; }
          .tvp-header button { font-size: 9px !important; padding: 3px 8px !important; }

          /* 컨트롤바 — 50% 작게 */
          .tvp-ctrl {
            height: auto !important;
            flex-wrap: wrap !important;
            padding: 2px 6px !important;
            gap: 2px !important;
            overflow-x: hidden !important;
          }
          .tvp-ctrl button {
            font-size: 8px !important;
            padding: 2px 4px !important;
          }
          .tvp-ctrl select {
            font-size: 8px !important;
            padding: 2px 3px !important;
          }
          .tvp-ctrl input[type="datetime-local"] {
            font-size: 7px !important;
            padding: 2px 3px !important;
            width: 100px !important;
          }
          .tvp-ctrl span { font-size: 8px !important; }

          /* 본문 — 세로 배치 */
          .tvp-body {
            flex-direction: column !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }

          /* 리스트 — 상단, 넘치면 스크롤 */
          .tvp-list {
            order: 1 !important;
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(0,212,240,.15) !important;
            height: 240px !important;
            min-height: 240px !important;
            max-height: 240px !important;
            flex-shrink: 0 !important;
            overflow-y: auto !important;
          }
          /* 리스트 내부 목록 스크롤 */
          .tvp-list > div:last-of-type {
            overflow-y: auto !important;
            flex: 1 !important;
          }

          /* 지도 — 하단 */
          .tvp-map {
            order: 2 !important;
            width: 100% !important;
            height: 440px !important;
            min-height: 440px !important;
            flex-shrink: 0 !important;
          }

          /* 오버레이 버튼 패널 — 전체폭 */
          .tvp-map > div > div:first-child {
            max-width: 100% !important;
            flex-wrap: wrap !important;
            top: 6px !important;
            left: 6px !important;
            right: 6px !important;
            gap: 3px !important;
          }
          .tvp-map > div > div:first-child button {
            font-size: 9px !important;
            padding: 3px 7px !important;
          }

          /* 위성 버튼 (이리듐/스타링크) — 컨트롤버튼 위로 이동 */
          .tvp-sat-btn {
            top: auto !important;
            bottom: 250px !important;
            right: 6px !important;
          }

          /* 지도 컨트롤 버튼 (+,-,⊡,◎) — 우하단으로 이동 */
          .tvp-map > div > div[style*="right: 10px"][style*="top: 10px"],
          .tvp-ctrl-btn {
            top: auto !important;
            bottom: 70px !important;
            right: 6px !important;
          }

          /* 하단 정보바 */
          .tvp-map > div > div[style*="bottom: 16px"] {
            font-size: 9px !important;
            padding: 5px 10px !important;
            gap: 10px !important;
          }
        }
      `}</style>
        </div>
    );
}