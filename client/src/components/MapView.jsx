import { useEffect, useRef, useState } from 'react';
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
import LineString from 'ol/geom/LineString';
import { Style, Circle, Fill, Stroke, Icon } from 'ol/style';

export default function MapView({ devices }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const trackLayer = useRef(null);
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
    trackLayer.current = new VectorLayer({ source: new VectorSource() });

    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [osmLayer, seaLayer, trackLayer.current, markerLayer.current],
      view: new View({ center: fromLonLat([127, 37]), zoom: 6 }),
      controls: [],
    });

    // 지도 클릭 시 정보 박스
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

  // 마커 + 폴리라인 업데이트
  useEffect(() => {
    if (!markerLayer.current || !trackLayer.current) return;

    const markerSource = markerLayer.current.getSource();
    const trackSource = trackLayer.current.getSource();
    markerSource.clear();
    trackSource.clear();

    const validDevices = devices.filter(d => d.lat && d.lon);
    if (validDevices.length === 0) return;

    const coords = [];

    validDevices.forEach((d, idx) => {
      const isSOS = d.eventcode === '4';
      const isLatest = idx === 0;
      const coord = fromLonLat([d.lon, d.lat]);
      coords.push(coord);

      // 마커
      const feature = new Feature({ geometry: new Point(coord), device: d });
      const opacity = isLatest ? 1 : Math.max(0.25, 1 - idx * 0.15);

      feature.setStyle(new Style({
        image: new Circle({
          radius: isLatest ? 9 : 6,
          fill: new Fill({ color: isSOS ? `rgba(239,68,68,${opacity})` : `rgba(59,130,246,${opacity})` }),
          stroke: new Stroke({
            color: isSOS ? `rgba(239,68,68,${Math.min(1, opacity + 0.3)})` : `rgba(0,212,240,${Math.min(1, opacity + 0.3)})`,
            width: isLatest ? 3 : 1.5
          }),
        }),
      }));

      markerSource.addFeature(feature);
    });

    // 폴리라인 (점선)
    if (coords.length > 1) {
      const line = new Feature({ geometry: new LineString(coords) });
      line.setStyle(new Style({
        stroke: new Stroke({
          color: 'rgba(0,212,240,0.5)',
          width: 2,
          lineDash: [6, 8],
        }),
      }));
      trackSource.addFeature(line);
    }

    // 전체 장비 보이게 자동 줌
    const extent = markerSource.getExtent();
    if (extent[0] !== Infinity) {
      mapInstance.current?.getView().fit(extent, {
        padding: [60, 60, 60, 60],
        maxZoom: 12,
        duration: 600,
      });
    }
  }, [devices]);

  // AUTOPLAY 타이머
  useEffect(() => {
    if (autoplay) {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setAutoplay(false);
            return 50 * 60;
          }
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

  const fitAll = () => {
    const source = markerLayer.current?.getSource();
    if (!source) return;
    const extent = source.getExtent();
    if (extent[0] !== Infinity) {
      mapInstance.current?.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 12, duration: 600 });
    }
  };

  const zoomIn = () => mapInstance.current?.getView().animate({ zoom: (mapInstance.current.getView().getZoom() || 6) + 1, duration: 300 });
  const zoomOut = () => mapInstance.current?.getView().animate({ zoom: (mapInstance.current.getView().getZoom() || 6) - 1, duration: 300 });

  const myLocation = () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      mapInstance.current?.getView().animate({
        center: fromLonLat([pos.coords.longitude, pos.coords.latitude]),
        zoom: 13, duration: 600
      });
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 지도 */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* 지도 컨트롤 버튼 */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
        {[
          { label: '+', onClick: zoomIn, title: '확대' },
          { label: '−', onClick: zoomOut, title: '축소' },
          { label: '⊡', onClick: fitAll, title: 'Fit All' },
          { label: '◎', onClick: myLocation, title: 'My Location' },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick} title={btn.title}
            style={{ width: '32px', height: '32px', background: 'rgba(14,26,46,.9)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '7px', color: '#00d4f0', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'all .2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(14,26,46,.9)'}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* AUTOPLAY 버튼 */}
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
          { label: 'DEVICES', value: devices.filter(d => d.lat).length },
        ].map((info, i) => (
          <div key={i} style={{ padding: '4px 10px', background: 'rgba(14,26,46,.85)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '8px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>{info.label} </span>
            <span style={{ fontSize: '10px', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700' }}>{info.value}</span>
          </div>
        ))}
      </div>

      {/* 클릭 정보 박스 */}
      {clickedDevice && clickPos && (
        <div style={{ position: 'absolute', left: clickPos.x, top: clickPos.y - 10, transform: 'translate(-50%, -100%)', background: 'rgba(10,20,38,.95)', border: `1px solid ${clickedDevice.eventcode === '4' ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.3)'}`, borderRadius: '10px', padding: '10px 14px', minWidth: '180px', zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: clickedDevice.eventcode === '4' ? '#ef4444' : '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>
              {clickedDevice.eventcode === '4' ? '🆘 SOS' : '📍 TRACK'} — {clickedDevice.alias}
            </span>
            <button onClick={() => { setClickedDevice(null); setClickPos(null); }}
              style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '12px' }}>✕</button>
          </div>
          {[
            ['IMEI', clickedDevice.imei],
            ['LAT', clickedDevice.lat?.toFixed(6)],
            ['LON', clickedDevice.lon?.toFixed(6)],
            ['SPD', `${clickedDevice.speed || 0}kn`],
            ['HDG', `${clickedDevice.heading || 0}°`],
            ['TIME', clickedDevice.lastUpdate ? `${clickedDevice.lastUpdate.slice(0, 4)}-${clickedDevice.lastUpdate.slice(4, 6)}-${clickedDevice.lastUpdate.slice(6, 8)} ${clickedDevice.lastUpdate.slice(8, 10)}:${clickedDevice.lastUpdate.slice(10, 12)}` : ''],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
              <span style={{ fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
              <span style={{ fontSize: '9px', color: '#e8f4ff', fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pulse 애니메이션 CSS */}
      <style>{`
        @keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes mapPulse { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.5);opacity:0} }
        .ol-viewport { border-radius: 0 !important; }
      `}</style>
    </div>
  );
}