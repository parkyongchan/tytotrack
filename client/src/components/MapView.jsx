import { useEffect, useRef, useState, useCallback } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Circle, Fill, Stroke } from 'ol/style';

export default function MapView({ devices, allDevices = [], mapPoints = [], onOpenTrack }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const pointLayer = useRef(null);
  const [autoplay, setAutoplay] = useState(false);
  const [clickedDevice, setClickedDevice] = useState(null);
  const [clickPos, setClickPos] = useState(null);
  const [countdown, setCountdown] = useState(50 * 60);
  const timerRef = useRef(null);

  // 지도 초기화
  useEffect(() => {
    if (mapInstance.current) return;

    const osmLayer = new TileLayer({ source: new OSM() });
    const seaLayer = new TileLayer({
      source: new XYZ({ url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png' }),
      opacity: 0.7,
    });

    markerLayer.current = new VectorLayer({ source: new VectorSource() });
    pointLayer.current = new VectorLayer({ source: new VectorSource() });

    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [osmLayer, seaLayer, pointLayer.current, markerLayer.current],
      view: new View({ center: fromLonLat([127, 37]), zoom: 6 }),
      controls: [],
    });

    mapInstance.current.on('click', (e) => {
      const features = mapInstance.current.getFeaturesAtPixel(e.pixel);
      if (features.length > 0) {
        const f = features[0];
        const d = f.get('device');
        if (d) {
          setClickedDevice(d);
          setClickPos({ x: e.pixel[0], y: e.pixel[1] });
        }
      } else {
        setClickedDevice(null);
        setClickPos(null);
      }
    });

    return () => {
      mapInstance.current?.setTarget(null);
      mapInstance.current = null;
    };
  }, []);

  // mapPoints 변경 시 → 장비별 색상 + 시간별 투명도 원 표시
  useEffect(() => {
    if (!pointLayer.current) return;
    const source = pointLayer.current.getSource();
    source.clear();

    if (mapPoints.length === 0) return;

    const imeiList = [...new Set(mapPoints.map(d => d.imei))];
    const colorMap = {};
    imeiList.forEach((imei, i) => {
      const hue = (i * 137.508) % 360;
      const saturation = 70 + (i % 3) * 10;
      const lightness = 55 + (i % 2) * 10;
      const h = hue / 360;
      const s = saturation / 100;
      const l = lightness / 100;
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      colorMap[imei] = [
        Math.round(hue2rgb(h + 1 / 3) * 255),
        Math.round(hue2rgb(h) * 255),
        Math.round(hue2rgb(h - 1 / 3) * 255),
      ];
    });

    imeiList.forEach(imei => {
      const devicePoints = mapPoints
        .filter(d => d.imei === imei && d.position)
        .sort((a, b) => (b.regDate || '').localeCompare(a.regDate || ''));

      const total = devicePoints.length;
      const [r, g, b] = colorMap[imei];
      const isSOS = devicePoints[0]?.eventcode === '4';

      devicePoints.forEach((d, idx) => {
        const parts = d.position?.split(',') || [];
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (!lat || !lon) return;

        const ratio = total > 1 ? idx / (total - 1) : 0;
        const opacity = Math.max(0.08, 1 - ratio * 0.92);
        const radius = Math.max(3, 12 - ratio * 9);

        const fillColor = isSOS
          ? `rgba(239,68,68,${opacity})`
          : `rgba(${r},${g},${b},${opacity})`;
        const strokeColor = isSOS
          ? `rgba(255,100,100,${Math.min(1, opacity + 0.2)})`
          : `rgba(${r},${g},${b},${Math.min(1, opacity + 0.3)})`;

        const coord = fromLonLat([lon, lat]);
        const feature = new Feature({ geometry: new Point(coord), device: { ...d, lat, lon } });
        feature.setStyle(new Style({
          image: new Circle({
            radius,
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({ color: strokeColor, width: idx === 0 ? 2.5 : 1 }),
          }),
        }));
        source.addFeature(feature);
      });
    });

    const extent = source.getExtent();
    if (extent[0] !== Infinity) {
      const uniqueImeis = imeiList.length;
      mapInstance.current?.getView().fit(extent, {
        padding: uniqueImeis === 1 ? [80, 80, 80, 80] : [60, 60, 60, 60],
        maxZoom: uniqueImeis === 1 ? 17 : 13,
        duration: 600,
      });
    }
  }, [mapPoints]);

  // devices 최신 위치 마커 (mapPoints 없을 때)
  useEffect(() => {
    if (!markerLayer.current) return;
    const source = markerLayer.current.getSource();
    source.clear();

    if (mapPoints.length > 0) return;

    const valid = devices.filter(d => d.lat && d.lon);
    if (valid.length === 0) return;

    valid.forEach((d) => {
      const isSOS = d.eventcode === '4';
      const coord = fromLonLat([d.lon, d.lat]);
      const feature = new Feature({ geometry: new Point(coord), device: d });
      feature.setStyle(new Style({
        image: new Circle({
          radius: 9,
          fill: new Fill({ color: isSOS ? 'rgba(239,68,68,0.85)' : 'rgba(59,130,246,0.85)' }),
          stroke: new Stroke({ color: isSOS ? '#ff6464' : '#00d4f0', width: 3 }),
        }),
      }));
      source.addFeature(feature);
    });

    const extent = source.getExtent();
    if (extent[0] !== Infinity) {
      mapInstance.current?.getView().fit(extent, {
        padding: [60, 60, 60, 60],
        maxZoom: 12,
        duration: 600,
      });
    }
  }, [devices, mapPoints]);

  // AUTOPLAY 타이머
  useEffect(() => {
    if (autoplay) {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { setAutoplay(false); return 50 * 60; }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [autoplay]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const fitAll = useCallback(() => {
    const source = mapPoints.length > 0
      ? pointLayer.current?.getSource()
      : markerLayer.current?.getSource();
    if (!source) return;
    const extent = source.getExtent();
    if (extent[0] !== Infinity) {
      mapInstance.current?.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 13, duration: 600 });
    }
  }, [mapPoints]);

  const zoomIn = useCallback(() => mapInstance.current?.getView().animate({ zoom: (mapInstance.current.getView().getZoom() || 6) + 1, duration: 300 }), []);
  const zoomOut = useCallback(() => mapInstance.current?.getView().animate({ zoom: (mapInstance.current.getView().getZoom() || 6) - 1, duration: 300 }), []);
  const myLocation = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      mapInstance.current?.getView().animate({
        center: fromLonLat([pos.coords.longitude, pos.coords.latitude]),
        zoom: 13, duration: 600,
      });
    });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* 컨트롤 버튼 */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
        {[
          { label: '+', onClick: zoomIn, title: '확대' },
          { label: '−', onClick: zoomOut, title: '축소' },
          { label: '⊡', onClick: fitAll, title: 'Fit All' },
          { label: '◎', onClick: myLocation, title: 'My Location' },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick} title={btn.title}
            style={{ width: '32px', height: '32px', background: 'rgba(14,26,46,.9)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '7px', color: '#00d4f0', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(14,26,46,.9)'}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* AUTOPLAY */}
      <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 10 }}>
        <button onClick={() => { setAutoplay(p => !p); if (!autoplay) setCountdown(50 * 60); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: autoplay ? 'rgba(0,212,240,.15)' : 'rgba(14,26,46,.9)', border: `1px solid ${autoplay ? '#00d4f0' : 'rgba(0,212,240,.3)'}`, borderRadius: '8px', color: autoplay ? '#00d4f0' : '#6b8fae', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: autoplay ? '#00d4f0' : '#6b8fae', animation: autoplay ? 'sosBlink 1s ease-in-out infinite' : 'none', display: 'inline-block' }} />
          AUTOPLAY {autoplay ? formatTime(countdown) : 'OFF'}
        </button>
      </div>

      {/* 지도 정보 바 */}
      <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 10 }}>
        {[
          { label: 'SAT', value: 'IRIDIUM' },
          { label: 'DATUM', value: 'WGS84' },
          { label: 'POINTS', value: mapPoints.length || devices.filter(d => d.lat).length },
        ].map((info, i) => (
          <div key={i} style={{ padding: '4px 10px', background: 'rgba(14,26,46,.85)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '8px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>{info.label} </span>
            <span style={{ fontSize: '10px', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }}>{info.value}</span>
          </div>
        ))}
      </div>

      {/* 클릭 정보 박스 */}
      {clickedDevice && clickPos && (() => {
        const pos = clickedDevice.position?.split(',') || [];
        const alt = pos[4] ? `${parseFloat(pos[4]).toFixed(1)}m` : '-';
        const formatTime = (d) => {
          if (!d || d.length < 12) return '-';
          return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)} ${d.slice(8,10)}:${d.slice(10,12)}`;
        };
        const timeVal = formatTime(clickedDevice.lastUpdate || clickedDevice.regDate);
        const getAlias = (imei) => {
          const d = devices.find(d => d.imei === imei) || allDevices.find(d => d.imei === imei);
          return d?.alias || clickedDevice.alias || imei?.slice(-6) || '-';
        };
        const alias = getAlias(clickedDevice.imei);
        return (
          <div style={{ position: 'absolute', left: clickPos.x, top: clickPos.y - 10, transform: 'translate(-50%, -100%)', background: 'rgba(10,20,38,.97)', border: `1px solid ${clickedDevice.eventcode === '4' ? 'rgba(239,68,68,.5)' : 'rgba(0,212,240,.4)'}`, borderRadius: '12px', padding: '14px 20px', minWidth: '280px', zIndex: 20, backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: clickedDevice.eventcode === '4' ? '#ef4444' : '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>
                {clickedDevice.eventcode === '4' ? '🆘 SOS' : '📍 TRACK'} — {alias}
              </span>
              <button onClick={() => { setClickedDevice(null); setClickPos(null); }}
                style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            {[
              ['LAT', clickedDevice.lat?.toFixed(6)],
              ['LON', clickedDevice.lon?.toFixed(6)],
              ['SPD', `${clickedDevice.speed || 0}kn`],
              ['HDG', `${clickedDevice.heading || 0}°`],
              ['ALT', alt],
              ['TIME', timeVal],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                <span style={{ fontSize: '12px', color: k === 'TIME' ? '#f59e0b' : '#e8f4ff', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }}>{v}</span>
              </div>
            ))}
            {onOpenTrack && (
              <button onClick={() => { onOpenTrack(clickedDevice); setClickedDevice(null); setClickPos(null); }}
                style={{ marginTop: '10px', width: '100%', padding: '7px', background: 'rgba(0,212,240,.12)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '7px', color: '#00d4f0', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                📍 TRACK VIEW →
              </button>
            )}
          </div>
        );
      })()}

      <style>{`
        @keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .ol-viewport { border-radius: 0 !important; }
      `}</style>
    </div>
  );
}