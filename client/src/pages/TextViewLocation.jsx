import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';

const getRole = () => localStorage.getItem('role') || 'REVIEWER';
const PER_PAGE = 30;

export default function TextViewLocation({ devices, allDevices = [] }) {
  const [selectedImei, setSelectedImei] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [activePeriod, setActivePeriod] = useState('3일');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const isSuperAdmin = getRole() === 'SUPER_ADMIN';

  const applyFilter = (rawData, imei) => {
    const myImeis = devices.map(d => d.imei);
    let result = rawData.filter(d =>
      (d.eventcode === '1' || d.eventcode === '4')
      && d.position && d.position.trim() !== ''
      && myImeis.includes(d.imei)
    );
    if (imei) result = result.filter(d => d.imei === imei);
    return result;
  };

  const fetchByRange = useCallback(async (startStr, endStr) => {
    setLoading(true);
    try {
      const res = await api.get(`/location/range?start=${startStr}&end=${endStr}`);
      const raw = Array.isArray(res.data) ? res.data : [];
      setData(applyFilter(raw, selectedImei));
      setPage(1);
    } catch (_) { setData([]); }
    finally { setLoading(false); }
  }, [devices, selectedImei]);

  const getPeriodRange = (p) => {
    const now = new Date();
    const start = new Date(now);
    if (p === '24시') start.setHours(start.getHours() - 24);
    else if (p === '48시') start.setHours(start.getHours() - 48);
    else if (p === '3일') start.setDate(start.getDate() - 3);
    else if (p === '7일') start.setDate(start.getDate() - 7);
    else if (p === '30일') start.setDate(start.getDate() - 30);
    const fmt = d => d.toISOString().replace('T', '').replace(/-|:/g, '').slice(0, 12);
    return { start: fmt(start) + '00', end: fmt(now) + '99' };
  };

  useEffect(() => {
    const { start, end } = getPeriodRange('3일');
    fetchByRange(start, end);
  }, []);

  const parsePosition = (pos) => {
    if (!pos) return {};
    const parts = pos.split(',');
    return {
      lat: parts[0] || '-', lon: parts[1] || '-',
      heading: parts[2] || '-', speed: parts[3] || '-',
      altitude: parts[4] || '-', gmt: parts[5] || '-',
    };
  };

  const formatDate = (d) => {
    if (!d || d.length < 12) return d || '-';
    return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)} ${d.slice(8,10)}:${d.slice(10,12)}`;
  };

  const getAlias = (imei) => {
    const d = devices.find(d => d.imei === imei) || allDevices.find(d => d.imei === imei);
    return d?.alias || '-';
  };

  const handleDelete = async (idx) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await api.delete(`/location/snd/${idx}`);
      setData(prev => prev.filter(d => d.idx !== idx));
    } catch (_) { alert('삭제 실패'); }
  };

  const filtered = data.filter(d => {
    if (filterType === 'track') return d.eventcode === '1';
    if (filterType === 'sos') return d.eventcode === '4';
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const downloadCSV = () => {
    const headers = ['TYPE','IMEI','ALIAS','LAT','LON','COURSE','SPEED','ALT','SENT_TIME','SERVER_TIME'];
    const rows = filtered.map(d => {
      const p = parsePosition(d.position);
      return [d.eventcode === '4' ? 'SOS' : 'TRACK', d.imei, getAlias(d.imei), p.lat, p.lon, p.heading, p.speed, p.altitude, p.gmt, formatDate(d.regDate)].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'location.csv'; a.click();
  };

  const downloadKML = () => {
    const placemarks = filtered.map(d => {
      const p = parsePosition(d.position);
      return `<Placemark><name>${getAlias(d.imei)}</name><Point><coordinates>${p.lon},${p.lat},${p.altitude}</coordinates></Point></Placemark>`;
    }).join('');
    const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>${placemarks}</Document></kml>`;
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'location.kml'; a.click();
  };

  const downloadGPX = () => {
    const pts = filtered.map(d => {
      const p = parsePosition(d.position);
      return `<wpt lat="${p.lat}" lon="${p.lon}"><name>${getAlias(d.imei)}</name><ele>${p.altitude}</ele></wpt>`;
    }).join('');
    const gpx = `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">${pts}</gpx>`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'location.gpx'; a.click();
  };

  const btnStyle = (color = '#00d4f0') => ({
    padding: '5px 12px', borderRadius: '6px', border: `1px solid ${color}40`,
    background: `${color}15`, color, fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ padding: '16px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0d1628' }}>

      {/* 헤더 */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>TEXT VIEW (Location)</div>
        <div style={{ fontSize: '10px', color: '#4b6483', marginTop: '2px' }}>TRACK / SOS — 1 year data retention</div>
      </div>

      {/* 컨트롤 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>

        {/* 기간 버튼 */}
        <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>기간</span>
        {['24시', '48시', '3일', '7일', '30일'].map(p => (
          <button key={p} onClick={() => {
            setActivePeriod(p);
            const { start, end } = getPeriodRange(p);
            fetchByRange(start, end);
          }}
            style={{ padding: '4px 10px', background: activePeriod === p ? '#00d4f0' : 'rgba(0,212,240,.08)', border: `1px solid ${activePeriod === p ? '#00d4f0' : 'rgba(0,212,240,.2)'}`, borderRadius: '6px', color: activePeriod === p ? '#0a1628' : '#6b8fae', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
            {p}
          </button>
        ))}

        {/* 직접 설정 */}
        <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", marginLeft: '4px' }}>직접 설정</span>
        <input type="datetime-local" value={customStart} onChange={e => setCustomStart(e.target.value)}
          style={{ padding: '3px 6px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '9px', outline: 'none', colorScheme: 'dark' }} />
        <span style={{ fontSize: '10px', color: '#6b8fae' }}>~</span>
        <input type="datetime-local" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
          style={{ padding: '3px 6px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '9px', outline: 'none', colorScheme: 'dark' }} />
        <button onClick={() => {
          if (!customStart || !customEnd) return;
          setActivePeriod('');
          const start = customStart.replace('T', '').replace(/-|:/g, '').slice(0, 12) + '00';
          const end = customEnd.replace('T', '').replace(/-|:/g, '').slice(0, 12) + '99';
          fetchByRange(start, end);
        }}
          style={{ padding: '4px 10px', background: 'rgba(0,212,240,.12)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
          적용
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,240,.2)', margin: '0 4px' }} />

        {/* 장비 선택 — 로그인 유저 장비만 */}
        <select value={selectedImei} onChange={e => {
          const imei = e.target.value;
          setSelectedImei(imei);
          const { start, end } = getPeriodRange(activePeriod || '3일');
          // 선택 즉시 필터 적용
          setLoading(true);
          api.get(`/location/range?start=${start}&end=${end}`)
            .then(res => {
              const raw = Array.isArray(res.data) ? res.data : [];
              const myImeis = devices.map(d => d.imei);
              let result = raw.filter(d =>
                (d.eventcode === '1' || d.eventcode === '4')
                && d.position && d.position.trim() !== ''
                && myImeis.includes(d.imei)
              );
              if (imei) result = result.filter(d => d.imei === imei);
              setData(result);
              setPage(1);
            })
            .catch(() => setData([]))
            .finally(() => setLoading(false));
        }}
          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '11px', outline: 'none' }}>
          <option value="">All Devices</option>
          {devices.filter(d => d.active !== false).map(d => (
            <option key={d.imei} value={d.imei}>{d.alias} ({d.imei})</option>
          ))}
        </select>

        {/* 타입 필터 */}
        {['all', 'track', 'sos'].map(t => (
          <button key={t} onClick={() => { setFilterType(t); setPage(1); }}
            style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", background: filterType === t ? (t === 'sos' ? '#ef4444' : t === 'track' ? '#3b82f6' : '#6b8fae') : 'rgba(255,255,255,.06)', color: filterType === t ? '#fff' : '#6b8fae' }}>
            {t.toUpperCase()}
          </button>
        ))}

        {/* 다운로드 */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button onClick={downloadCSV} style={btnStyle('#10b981')}>↓ CSV</button>
          <button onClick={downloadKML} style={btnStyle('#3b82f6')}>↓ KML</button>
          <button onClick={downloadGPX} style={btnStyle('#8b5cf6')}>↓ GPX</button>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ flex: 1, overflow: 'hidden', border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowX: 'auto', flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,.4)', position: 'sticky', top: 0, zIndex: 1 }}>
                {['TYPE', 'IMEI', 'ALIAS', 'LAT', 'LON', 'COURSE', 'SPEED', 'ALT', 'SENT TIME', 'SERVER TIME', ...(isSuperAdmin ? ['삭제'] : [])].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={isSuperAdmin ? 11 : 10} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>
                  {loading ? '조회 중...' : '데이터가 없습니다.'}
                </td></tr>
              ) : paged.map((row) => {
                const pos = parsePosition(row.position);
                const isSOS = row.eventcode === '4';
                return (
                  <tr key={row.idx}
                    style={{ borderBottom: '1px solid rgba(0,212,240,.05)', background: isSOS ? 'rgba(239,68,68,.03)' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = isSOS ? 'rgba(239,68,68,.03)' : 'transparent'}>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: isSOS ? 'rgba(239,68,68,.2)' : 'rgba(59,130,246,.15)', color: isSOS ? '#ef4444' : '#60a5fa' }}>
                        {isSOS ? 'SOS' : 'TRACK'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{row.imei}</td>
                    <td style={{ padding: '6px 10px', color: '#fff', fontWeight: '700' }}>{getAlias(row.imei)}</td>
                    <td style={{ padding: '6px 10px', color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>{parseFloat(pos.lat).toFixed(4)}</td>
                    <td style={{ padding: '6px 10px', color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>{parseFloat(pos.lon).toFixed(4)}</td>
                    <td style={{ padding: '6px 10px', color: '#e8f4ff' }}>{pos.heading}°</td>
                    <td style={{ padding: '6px 10px', color: parseFloat(pos.speed) > 30 ? '#f59e0b' : '#e8f4ff', fontWeight: parseFloat(pos.speed) > 30 ? '700' : '400' }}>{pos.speed} km/h</td>
                    <td style={{ padding: '6px 10px', color: '#6b8fae' }}>{pos.altitude}m</td>
                    <td style={{ padding: '6px 10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', whiteSpace: 'nowrap' }}>{pos.gmt}</td>
                    <td style={{ padding: '6px 10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', whiteSpace: 'nowrap' }}>{formatDate(row.regDate)}</td>
                    {isSuperAdmin && (
                      <td style={{ padding: '6px 10px' }}>
                        <button onClick={() => handleDelete(row.idx)}
                          style={{ padding: '2px 8px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', fontSize: '9px' }}>삭제</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
              총 {filtered.length}건 / {page}/{totalPages}p
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const s = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = s + i;
                if (p > totalPages) return null;
                return <button key={p} onClick={() => setPage(p)} style={{ padding: '3px 8px', background: p === page ? '#00d4f0' : 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: p === page ? '#0d1628' : '#00d4f0', cursor: 'pointer', fontSize: '10px', fontWeight: p === page ? '700' : '400' }}>{p}</button>;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}