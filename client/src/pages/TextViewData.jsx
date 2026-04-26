import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';
import { IconTrash, IconSave, IconMapPin, IconMessage } from '../components/Icons';

const getRole = () => localStorage.getItem('role') || 'REVIEWER';
const PER_PAGE = 30;

export default function TextViewData({ devices, allDevices = [] }) {
  const [selectedImei, setSelectedImei] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [activePeriod, setActivePeriod] = useState('3일');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const isSuperAdmin = getRole() === 'SUPER_ADMIN';
  const [checkedIds, setCheckedIds] = useState([]);

  const toggleCheck = (idx) => {
    setCheckedIds(prev => prev.includes(idx) ? prev.filter(id => id !== idx) : [...prev, idx]);
  };

  const toggleAll = () => {
    const pagedIds = paged.map(r => r.idx);
    const allChecked = pagedIds.every(id => checkedIds.includes(id));
    if (allChecked) setCheckedIds(prev => prev.filter(id => !pagedIds.includes(id)));
    else setCheckedIds(prev => [...new Set([...prev, ...pagedIds])]);
  };

  const handleBulkDelete = async () => {
    if (checkedIds.length === 0) return;
    if (!confirm(`선택한 ${checkedIds.length}건을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(checkedIds.map(idx => api.delete(`/location/snd/${idx}`)));
      setData(prev => prev.filter(d => !checkedIds.includes(d.idx)));
      setCheckedIds([]);
    } catch { alert('삭제 실패'); }
  };

  const applyFilter = (rawData, imei) => {
    const myImeis = devices.map(d => d.imei);
    // TRACK(1), SOS(4) 제외 — 나머지 데이터만
    let result = rawData.filter(d =>
      d.eventcode !== '1' && d.eventcode !== '4'
      && myImeis.includes(d.imei)
    );
    if (imei) result = result.filter(d => d.imei === imei);
    return result;
  };

  const getPeriodRange = (p) => {
    const gmtZone = parseFloat(localStorage.getItem('gmtZone') ?? '9');
    const offsetMs = gmtZone * 3600 * 1000;
    const nowUtc = new Date();
    const localNow = new Date(nowUtc.getTime() + offsetMs);
    const localStart = new Date(localNow.getTime());
    if (p === '24시') localStart.setHours(localStart.getHours() - 24);
    else if (p === '48시') localStart.setHours(localStart.getHours() - 48);
    else if (p === '3일') localStart.setDate(localStart.getDate() - 3);
    else if (p === '7일') localStart.setDate(localStart.getDate() - 7);
    else if (p === '30일') localStart.setDate(localStart.getDate() - 30);
    const fmt = d => {
      const y = d.getUTCFullYear();
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      return `${y}${mo}${day}${h}${m}`;
    };
    return { start: fmt(localStart) + '00', end: fmt(localNow) + '99' };
  };

  const fetchByRange = useCallback(async (startStr, endStr, imei) => {
    setLoading(true);
    try {
      const res = await api.get(`/location/range?start=${startStr}&end=${endStr}`);
      const raw = Array.isArray(res.data) ? res.data : [];
      setData(applyFilter(raw, imei ?? selectedImei));
      setPage(1);
    } catch (_) { setData([]); }
    finally { setLoading(false); }
  }, [devices, selectedImei]);

  useEffect(() => {
    const { start, end } = getPeriodRange('3일');
    fetchByRange(start, end);
  }, []);

  const formatDate = (d) => {
    if (!d || d.length < 12) return d || '-';
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${d.slice(8, 10)}:${d.slice(10, 12)}`;
  };

  const getAlias = (imei) => {
    const d = devices.find(d => d.imei === imei) || (allDevices || []).find(d => d.imei === imei);
    return d?.alias || '-';
  };

  const handleDelete = async (idx) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await api.delete(`/location/snd/${idx}`);
      setData(prev => prev.filter(d => d.idx !== idx));
    } catch (_) { alert('삭제 실패'); }
  };

  const getTypeInfo = (row) => {
    const ec = row.eventcode;
    if (ec === '5') return { label: 'MSG', color: '#10b981', bg: 'rgba(16,185,129,.15)' };
    if (ec === '2') return { label: 'CAN', color: '#8b5cf6', bg: 'rgba(139,92,246,.15)' };
    if (ec === '3') return { label: 'CAN+GPS', color: '#8b5cf6', bg: 'rgba(139,92,246,.15)' };
    if (ec === '9') return { label: 'EVENT', color: '#f59e0b', bg: 'rgba(245,158,11,.15)' };
    if (row.etc4) return { label: 'IMT', color: '#3b82f6', bg: 'rgba(59,130,246,.15)' };
    return { label: `EC${ec}`, color: '#6b8fae', bg: 'rgba(107,143,174,.15)' };
  };

  const tabs = [
    { id: 'all', label: 'ALL', color: '#6b8fae' },
    { id: 'msg', label: 'MSG', color: '#10b981' },
    { id: 'can', label: 'CAN', color: '#8b5cf6' },
    { id: 'event', label: 'EVENT', color: '#f59e0b' },
    { id: 'imt', label: 'IMT', color: '#3b82f6' },
  ];

  const filtered = data.filter(d => {
    if (activeTab === 'msg') return d.eventcode === '5';
    if (activeTab === 'can') return d.eventcode === '2' || d.eventcode === '3';
    if (activeTab === 'event') return d.eventcode === '9';
    if (activeTab === 'imt') return !!d.etc4;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const downloadCSV = () => {
    const headers = ['TYPE', 'IMEI', 'ALIAS', 'SENDER', 'RECEIVER', 'TITLE', 'MEMO', 'DATA', 'TIME'];
    const rows = filtered.map(d => {
      const type = getTypeInfo(d);
      return [type.label, d.imei, getAlias(d.imei), d.imei, d.rimei || '-', d.title || '-', d.memo || '-', d.can || d.ver || '-', formatDate(d.regDate)].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'data.csv'; a.click();
  };

  const btnStyle = (color = '#00d4f0') => ({
    padding: '5px 12px', borderRadius: '6px', border: `1px solid ${color}40`,
    background: `${color}15`, color, fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ padding: '16px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0d1628' }}>

      {/* 헤더 */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>TEXT VIEW (Data)</div>
        <div style={{ fontSize: '10px', color: '#4b6483', marginTop: '2px' }}>MSG / CAN / EVENT / IMT — 1 year data retention</div>
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

        {/* 장비 선택 */}
        <select value={selectedImei} onChange={e => {
          const imei = e.target.value;
          setSelectedImei(imei);
          const { start, end } = getPeriodRange(activePeriod || '3일');
          fetchByRange(start, end, imei);
        }}
          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '11px', outline: 'none' }}>
          <option value="">All Devices</option>
          {devices.filter(d => d.active !== false).map(d => (
            <option key={d.imei} value={d.imei}>{d.alias} ({d.imei})</option>
          ))}
        </select>

        {/* 타입 탭 */}
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setPage(1); }}
            style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", background: activeTab === t.id ? t.color : 'rgba(255,255,255,.06)', color: activeTab === t.id ? '#fff' : '#6b8fae' }}>
            {t.label}
          </button>
        ))}

        {/* 다운로드 + 선택삭제 */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {isSuperAdmin && checkedIds.length > 0 && (
            <button onClick={handleBulkDelete}
              style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.15)', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <IconTrash size={12} color="#ef4444" /> 선택삭제 ({checkedIds.length})
            </button>
          )}
          <button onClick={downloadCSV} style={{ ...btnStyle('#10b981'), display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconSave size={12} color="#10b981" /> CSV
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ flex: 1, overflow: 'hidden', border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,.4)', position: 'sticky', top: 0, zIndex: 1 }}>
                {isSuperAdmin && (
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(0,212,240,.18)', width: '30px' }}>
                    <input type="checkbox"
                      checked={paged.length > 0 && paged.every(r => checkedIds.includes(r.idx))}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', accentColor: '#00d4f0' }} />
                  </th>
                )}
                {['TYPE', 'IMEI', 'ALIAS', '보낸이', '받는이', '내용', 'DATA', '수신시간', ...(isSuperAdmin ? ['삭제'] : [])].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={isSuperAdmin ? 9 : 8} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>
                  {loading ? '조회 중...' : '데이터가 없습니다.'}
                </td></tr>
              ) : paged.map((row) => {
                const typeInfo = getTypeInfo(row);
                const isIMT = !!row.etc4;
                return (
                  <tr key={row.idx}
                    style={{ borderBottom: '1px solid rgba(0,212,240,.05)', background: checkedIds.includes(row.idx) ? 'rgba(0,212,240,.05)' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = checkedIds.includes(row.idx) ? 'rgba(0,212,240,.05)' : 'transparent'}>
                    {isSuperAdmin && (
                      <td style={{ padding: '6px 10px' }}>
                        <input type="checkbox"
                          checked={checkedIds.includes(row.idx)}
                          onChange={() => toggleCheck(row.idx)}
                          style={{ cursor: 'pointer', accentColor: '#00d4f0' }} />
                      </td>
                    )}
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: typeInfo.bg, color: typeInfo.color }}>{typeInfo.label}</span>
                    </td>
                    <td style={{ padding: '6px 10px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{row.imei}</td>
                    <td style={{ padding: '6px 10px', color: '#fff', fontWeight: '700' }}>{getAlias(row.imei)}</td>
                    <td style={{ padding: '6px 10px', color: '#6b8fae', fontSize: '10px' }}>{row.imei}</td>
                    <td style={{ padding: '6px 10px', color: '#6b8fae', fontSize: '10px' }}>{row.rimei || '-'}</td>
                    <td style={{ padding: '6px 10px', maxWidth: '200px' }}>
                      {row.title && (
                        <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <IconMapPin size={10} color="#f59e0b" /> {row.title}
                        </div>
                      )}
                      {row.memo && (
                        <div style={{ fontSize: '10px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <IconMessage size={10} color="#a78bfa" /> {row.memo}
                        </div>
                      )}
                      {isIMT && (
                        <div style={{ fontSize: '10px', color: '#3b82f6', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <IconSave size={10} color="#3b82f6" /> IMT 바이너리 메시지
                        </div>
                      )}
                      {!row.title && !row.memo && !isIMT && <span style={{ color: '#4b6483' }}>-</span>}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#6b8fae', fontSize: '10px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.can || row.ver}>
                      {row.can || row.ver || '-'}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', whiteSpace: 'nowrap' }}>{formatDate(row.regDate)}</td>
                    {isSuperAdmin && (
                      <td style={{ padding: '6px 10px' }}>
                        <button onClick={() => handleDelete(row.idx)}
                          style={{ padding: '2px 8px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <IconTrash size={10} color="#ef4444" /> 삭제
                        </button>
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