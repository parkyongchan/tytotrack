import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axiosConfig';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { Style, Circle, Fill, Stroke, Icon } from 'ol/style';
import Overlay from 'ol/Overlay';
import { defaults as defaultControls } from 'ol/control';

export default function TrackViewPopup({ device, imei, alias, onClose }) {
    const mapRef = useRef(null);
    const mapObj = useRef(null);
    const vectorSource = useRef(new VectorSource());
    const overlayRef = useRef(null);
    const overlayEl = useRef(null);
    const [popupPos, setPopupPos] = useState(null);
    const playTimer = useRef(null);

    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [playIdx, setPlayIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(1);
    const [period, setPeriod] = useState('3일');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const PER_PAGE = 30;
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

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
            setAllData(data);
            setFilteredData(data);
            setPlayIdx(data.length - 1);
            setPlaying(false);
            setPage(1);
        } catch { }
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
            setAllData(data);
            setFilteredData(data);
            setPlayIdx(data.length - 1);
            setPlaying(false);
        } catch { setAllData([]); setFilteredData([]); }
        finally { setLoading(false); }
    }, [imei]);

    useEffect(() => { fetchData(period); }, []);

    // 지도 초기화
    useEffect(() => {
        if (!mapRef.current || mapObj.current) return;
        mapObj.current = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                new VectorLayer({ source: vectorSource.current }),
            ],
            view: new View({ center: fromLonLat([127.5, 36.5]), zoom: 7 }),
            controls: [],
        });

        mapObj.current.on('click', (e) => {
            const features = mapObj.current.getFeaturesAtPixel(e.pixel);
            if (features.length > 0 && features[0].get('pointData')) {
                const pd = features[0].get('pointData');
                setSelectedPoint(pd);
                setPopupPos({ x: e.pixel[0], y: e.pixel[1] });
            } else {
                setSelectedPoint(null);
                setPopupPos(null);
            }
        });

        return () => { mapObj.current?.setTarget(undefined); mapObj.current = null; };
    }, []);

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
                regDate: d.regDate || d.reg_date,
                eventcode: d.eventcode,
            };
        }).filter(p => p.lat && p.lon);

        if (points.length === 0) return;

        // 폴리라인
        const coords = points.map(p => fromLonLat([p.lon, p.lat]));
        const line = new Feature({ geometry: new LineString(coords) });
        line.setStyle(new Style({
            stroke: new Stroke({ color: 'rgba(0,212,240,0.6)', width: 2, lineDash: [6, 4] })
        }));
        vectorSource.current.addFeature(line);

        // 마커 (오래된것 희미하게)
        const total = points.length;
        points.forEach((p, i) => {
            const ratio = (i + 1) / total;
            const isSOS = p.eventcode === '4';
            const isLatest = i === total - 1;
            const isPlaying = i === playIdx;

            const color = isSOS ? `rgba(239,68,68,${0.3 + ratio * 0.7})`
                : `rgba(0,212,240,${0.2 + ratio * 0.8})`;

            const size = isLatest ? 10 : isPlaying ? 12 : 5 + ratio * 4;

            const feat = new Feature({ geometry: new Point(fromLonLat([p.lon, p.lat])) });
            feat.set('pointData', p);
            feat.setStyle(new Style({
                image: new Circle({
                    radius: size,
                    fill: new Fill({ color }),
                    stroke: new Stroke({
                        color: isLatest ? '#fff' : isSOS ? '#ef4444' : '#00d4f0',
                        width: isLatest ? 2.5 : 1
                    })
                })
            }));
            vectorSource.current.addFeature(feat);
        });

        // 현재 재생 위치 표시
        if (playIdx < points.length) {
            const curr = points[playIdx];
            const playFeat = new Feature({ geometry: new Point(fromLonLat([curr.lon, curr.lat])) });
            playFeat.setStyle(new Style({
                image: new Circle({
                    radius: 14,
                    fill: new Fill({ color: 'rgba(16,185,129,0.3)' }),
                    stroke: new Stroke({ color: '#10b981', width: 2.5 })
                })
            }));
            vectorSource.current.addFeature(playFeat);
        }

        // 지도 범위 맞추기
        const extent = vectorSource.current.getExtent();
        if (extent[0] !== Infinity) {
            mapObj.current.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 14 });
        }
    }, [filteredData, playIdx]);

    // 재생
    useEffect(() => {
        if (playing) {
            playTimer.current = setInterval(() => {
                setPlayIdx(p => {
                    if (p <= 0) { setPlaying(false); return 0; }
                    return p - 1;
                });
            }, 1000 / playSpeed);
        } else {
            clearInterval(playTimer.current);
        }
        return () => clearInterval(playTimer.current);
    }, [playing, playSpeed, filteredData.length]);

    const formatDate = (reg) => {
        if (!reg || reg.length < 12) return '';
        return `${reg.slice(0, 4)}-${reg.slice(4, 6)}-${reg.slice(6, 8)} ${reg.slice(8, 10)}:${reg.slice(10, 12)}`;
    };

    const totalPages = Math.ceil(filteredData.length / PER_PAGE);
    const paged = filteredData.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#0a1628', display: 'flex', flexDirection: 'column', fontFamily: "'Syne', sans-serif" }}>

            {/* ── 상단 헤더 ── */}
            <div style={{ height: '48px', background: 'rgba(13,22,40,.98)', borderBottom: '1px solid rgba(0,212,240,.2)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', flexShrink: 0, zIndex: 10 }}>
                <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg,#00d4f0,#3b82f6)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🛰️</div>
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#fff' }}>TYTO<span style={{ color: '#00d4f0' }}>TRACK</span></span>
                <div style={{ width: '1px', height: '18px', background: 'rgba(0,212,240,.2)' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>
                    {device?.eventcode === '4' ? 'SOS' : 'TRACK'} — {alias}
                </span>
                <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{imei}</span>
                <button onClick={onClose} style={{ marginLeft: 'auto', padding: '5px 14px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '7px', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                    ✕ 닫기
                </button>
            </div>

            {/* ── 기간 + 재생 컨트롤 ── */}
            <div style={{ height: '44px', background: 'rgba(10,20,38,.95)', borderBottom: '1px solid rgba(0,212,240,.15)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px', flexShrink: 0 }}>
                {/* 기간 버튼 */}
                <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>기간</span>
                {['24시', '48시', '3일', '7일'].map(p => (
                    <button key={p} onClick={() => { setPeriod(p); fetchData(p); setPage(1); }}
                        style={{ padding: '4px 10px', background: period === p ? '#00d4f0' : 'rgba(0,212,240,.08)', border: `1px solid ${period === p ? '#00d4f0' : 'rgba(0,212,240,.2)'}`, borderRadius: '6px', color: period === p ? '#0a1628' : '#6b8fae', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                        {p}
                    </button>
                ))}

                <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,240,.2)' }} />

                {/* 직접 날짜 설정 */}
                <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>직접 설정</span>
                <input type="datetime-local" value={customStart} onChange={e => setCustomStart(e.target.value)}
                    style={{ padding: '3px 6px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
                <span style={{ fontSize: '10px', color: '#6b8fae' }}>~</span>
                <input type="datetime-local" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                    style={{ padding: '3px 6px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
                <button onClick={applyCustomDate}
                    style={{ padding: '4px 10px', background: 'rgba(0,212,240,.12)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                    적용
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,240,.2)' }} />

                {/* 재생 컨트롤 */}
                <button onClick={() => { setPlayIdx(filteredData.length - 1); setPlaying(false); }}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#6b8fae', fontSize: '10px', cursor: 'pointer' }}>
                    ⏮ REWIND
                </button>
                <button onClick={() => setPlayIdx(p => Math.max(0, p - 1))}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#6b8fae', fontSize: '10px', cursor: 'pointer' }}>◀◀ 이전</button>
                <button onClick={() => setPlaying(p => !p)}
                    style={{ padding: '4px 12px', background: playing ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)', border: `1px solid ${playing ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}`, borderRadius: '6px', color: playing ? '#ef4444' : '#10b981', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    {playing ? '⏸ 끄기' : '▶ 재생'}
                </button>
                <button onClick={() => setPlayIdx(p => Math.min(filteredData.length - 1, p + 1))}
                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#6b8fae', fontSize: '10px', cursor: 'pointer' }}>다음 ▶▶</button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,240,.2)' }} />

                {/* 속도 */}
                <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>속도</span>
                <select value={playSpeed} onChange={e => setPlaySpeed(Number(e.target.value))}
                    style={{ padding: '3px 8px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                    {[0.5, 1, 2, 5, 10].map(s => <option key={s} value={s}>x{s}</option>)}
                </select>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
                        {playIdx + 1} / {filteredData.length}건
                    </span>
                    {filteredData[playIdx] && (
                        <span style={{ fontSize: '10px', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatDate(filteredData[playIdx]?.regDate)}
                        </span>
                    )}
                </div>
            </div>

            {/* ── 본문 ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* 빨간색 — 리스트 */}
                <div style={{ width: '260px', flexShrink: 0, background: 'rgba(10,20,38,.97)', borderRight: '1px solid rgba(0,212,240,.15)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,212,240,.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>TRACK LIST</span>
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
                            <div style={{ padding: '20px', textAlign: 'center', color: '#6b8fae', fontSize: '12px' }}>로딩 중...</div>
                        ) : paged.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#6b8fae', fontSize: '12px' }}>데이터 없음</div>
                        ) : paged.map((d, i) => {
                            const globalIdx = (page - 1) * PER_PAGE + i;
                            const parts = d.position?.split(',') || [];
                            const lat = parseFloat(parts[0]);
                            const lon = parseFloat(parts[1]);
                            const spd = parseFloat(parts[3]) || 0;
                            const isSOS = d.eventcode === '4';
                            const isCurrent = globalIdx === playIdx;

                            return (
                                <div key={i} onClick={() => { setPlayIdx(globalIdx); setSelectedPoint({ lat, lon, heading: parseFloat(parts[2]) || 0, speed: spd, regDate: d.regDate, eventcode: d.eventcode }); }}
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
                <div style={{ flex: 1, position: 'relative' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                    {/* 지도 컨트롤 버튼 */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
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

                    {/* 클릭 팝업 */}
                    {selectedPoint && popupPos && (
                        <div style={{ position: 'absolute', left: popupPos.x, top: popupPos.y - 10, transform: 'translate(-50%, -100%)', background: 'rgba(10,20,38,.95)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '10px', padding: '10px 14px', minWidth: '160px', zIndex: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '700', color: selectedPoint.eventcode === '4' ? '#ef4444' : '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>
                                    {selectedPoint.eventcode === '4' ? '🆘 SOS' : '📍 TRACK'}
                                </span>
                                <button onClick={() => { setSelectedPoint(null); setPopupPos(null); }}
                                    style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                            </div>
                            {[
                                ['LAT', selectedPoint.lat?.toFixed(6)],
                                ['LON', selectedPoint.lon?.toFixed(6)],
                                ['SPD', `${selectedPoint.speed}kn`],
                                ['HDG', `${selectedPoint.heading}°`],
                                ['TIME', formatDate(selectedPoint.regDate)],
                            ].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                                    <span style={{ fontSize: '9px', color: '#e8f4ff', fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
        </div>
    );
}