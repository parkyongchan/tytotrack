import { useState, useEffect, useRef } from 'react';
import api from '../api/axiosConfig';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import 'ol/ol.css';

const getRole = () => localStorage.getItem('role') || 'REVIEWER';
const lang = localStorage.getItem('lang') || 'ko';

export default function DevicesPage({ devices, onRefresh }) {
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [showRegister, setShowRegister] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDeviceSetting, setShowDeviceSetting] = useState(false);
  const [showGeo, setShowGeo] = useState(false);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const PER_PAGE = 10;

  useEffect(() => {
    fetchUsers();
    fetchProfiles();
  }, []);

  const fetchUsers = async () => {
    try { const r = await api.get('/users'); setUsers(Array.isArray(r.data) ? r.data : []); } catch { }
  };

  const fetchProfiles = async () => {
    try { const r = await api.get('/profiles'); setProfiles(Array.isArray(r.data) ? r.data : []); } catch { }
  };

  const toggleSelect = (imei) => {
    setSelected(p => p.includes(imei) ? p.filter(i => i !== imei) : [...p, imei]);
  };

  const toggleAll = () => {
    setSelected(selected.length === devices.length ? [] : devices.map(d => d.imei));
  };

  const selectedDevices = devices.filter(d => selected.includes(d.imei));
  const totalPages = Math.ceil(devices.length / PER_PAGE);
  const paged = devices.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const btnStyle = (color = '#00d4f0', disabled = false) => ({
    padding: '6px 14px', borderRadius: '7px', border: `1px solid ${color}40`,
    background: `${color}15`, color: disabled ? '#4b6483' : color,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700',
    opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
  });

  const myRole = getRole();
  const canEdit = myRole === 'SUPER_ADMIN' || myRole === 'ADMIN';
  const isSuperAdmin = myRole === 'SUPER_ADMIN';

  return (
    <div style={{ padding: '16px', flex: 1, overflowY: 'auto', background: '#0d1628' }}>

      {/* 헤더 + 액션 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0', marginRight: '8px' }}>
          DEVICE SETTINGS
        </span>
        <button onClick={onRefresh} style={btnStyle('#6b8fae')}>↻</button>

        {/* 장비 등록 — Super Admin + Admin */}
        {canEdit && (
          <button onClick={() => setShowRegister(true)} style={btnStyle('#10b981')}>
            ＋ 장비 등록
          </button>
        )}

        {/* 장비 수정 — Admin 이상, 1개 선택 시 */}
        {canEdit && (
          <button onClick={() => selected.length === 1 ? setShowEdit(true) : alert('장비 1개를 선택해주세요.')}
            style={btnStyle('#00d4f0', selected.length !== 1)}>
            ✏️ 장비 수정
          </button>
        )}

        {/* 장비 삭제 — Super Admin + Admin */}
        {canEdit && (
          <button onClick={async () => {
            if (selected.length === 0) { alert('장비를 선택해주세요.'); return; }
            if (!confirm(`${selected.length}개 장비를 삭제하시겠습니까?`)) return;
            for (const imei of selected) { try { await api.delete(`/devices/${imei}`); } catch { } }
            setSelected([]); onRefresh();
          }} style={btnStyle('#ef4444', selected.length === 0)}>
            🗑 장비 삭제
          </button>
        )}

        {/* 프로파일 — Admin 이상 */}
        {canEdit && (
          <button onClick={() => setShowProfile(true)} style={btnStyle('#8b5cf6')}>
            📋 프로파일
          </button>
        )}

        {/* 장비 설정 — Admin 이상, 1개 선택 */}
        {canEdit && (
          <button onClick={() => selected.length === 1 ? setShowDeviceSetting(true) : alert('장비 1개를 선택해주세요.')}
            style={btnStyle('#f59e0b', selected.length !== 1)}>
            ⚙️ 장비 설정
          </button>
        )}

        {/* GEO Fence — 1개 선택 시만 활성화 */}
        <button onClick={() => selected.length === 1 ? setShowGeo(true) : alert('장비 1개를 선택해주세요.')}
          style={btnStyle('#10b981', selected.length !== 1)}>
          🌐 GEO Fence
        </button>

        {selected.length > 0 && (
          <span style={{ fontSize: '10px', color: '#6b8fae', marginLeft: '4px' }}>
            {selected.length}개 선택됨
          </span>
        )}
      </div>

      {/* 장비 테이블 */}
      <div style={{ border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'center', width: '36px' }}>
                <input type="checkbox" checked={selected.length === devices.length && devices.length > 0}
                  onChange={toggleAll} style={{ cursor: 'pointer' }} />
              </th>
              {['IMEI', 'Alias', 'Model', 'Type', '계정', '개통일', 'Profile', '상태', ...(canEdit ? ['관리'] : [])].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>등록된 장비 없음</td></tr>
            ) : paged.map((d, i) => {
              const isActive = d.active !== false; // DB active 기준
              const isSelected = selected.includes(d.imei);
              return (
                <tr key={d.imei}
                  onClick={() => toggleSelect(d.imei)}
                  style={{ borderBottom: '1px solid rgba(0,212,240,.05)', cursor: 'pointer', background: isSelected ? 'rgba(0,212,240,.08)' : 'transparent', transition: 'background .15s' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,212,240,.04)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(d.imei)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '8px 10px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{d.imei}</td>
                  <td style={{ padding: '8px 10px', color: '#fff', fontWeight: '700' }}>{d.alias}</td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.model || '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.type || '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.satellite || '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae', fontSize: '10px' }}>
                    {d.openDate ? `${String(d.openDate).slice(0, 4)}-${String(d.openDate).slice(4, 6)}-${String(d.openDate).slice(6, 8)}` : '-'}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.profileName || '-'}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: isActive ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)', color: isActive ? '#10b981' : '#ef4444' }}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td style={{ padding: '6px 10px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {/* 수정 */}
                        <button onClick={() => { setSelected([d.imei]); setShowEdit(true); }}
                          style={{ padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(0,212,240,.4)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', fontSize: '9px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          수정
                        </button>
                        {/* 중지/활성 토글 */}
                        <button onClick={async () => {
                          try {
                            const res = await api.put(`/devices/${d.imei}/toggle`);
                            const newActive = res.data?.active;
                            alert(newActive ? '✅ 활성화 되었습니다.' : '⏸ 중지 되었습니다.');
                            onRefresh();
                          } catch (e) { alert(e.response?.data?.message || '변경 실패'); }
                        }}
                          style={{ padding: '3px 8px', borderRadius: '5px', border: `1px solid ${isActive ? 'rgba(245,158,11,.4)' : 'rgba(16,185,129,.4)'}`, background: isActive ? 'rgba(245,158,11,.1)' : 'rgba(16,185,129,.1)', color: isActive ? '#f59e0b' : '#10b981', fontSize: '9px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {isActive ? '중지' : '활성'}
                        </button>
                        {/* 삭제 */}
                        <button onClick={async () => {
                          if (!confirm(`${d.alias} 장비를 삭제하시겠습니까?`)) return;
                          try {
                            await api.delete(`/devices/${d.imei}`);
                            setSelected(p => p.filter(i => i !== d.imei));
                            onRefresh();
                          } catch (e) { alert(e.response?.data?.message || '삭제 실패'); }
                        }}
                          style={{ padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: '9px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          삭제
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
              {devices.length}개 / {page}/{totalPages}p
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ padding: '3px 8px', background: p === page ? '#00d4f0' : 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: p === page ? '#0d1628' : '#00d4f0', cursor: 'pointer', fontSize: '10px', fontWeight: p === page ? '700' : '400' }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── 장비 등록 팝업 ── */}
      {showRegister && (
        <RegisterPopup
          profiles={profiles} users={users}
          onClose={() => setShowRegister(false)}
          onSave={() => { setShowRegister(false); onRefresh(); }}
        />
      )}

      {/* ── 장비 수정 팝업 ── */}
      {showEdit && selectedDevices.length === 1 && (
        <EditPopup
          device={selectedDevices[0]} profiles={profiles}
          onClose={() => setShowEdit(false)}
          onSave={() => { setShowEdit(false); setSelected([]); onRefresh(); }}
        />
      )}

      {/* ── 프로파일 팝업 ── */}
      {showProfile && (
        <ProfilePopup onClose={() => setShowProfile(false)} />
      )}

      {/* ── 장비 설정 패널 ── */}
      {showDeviceSetting && selectedDevices.length === 1 && (
        <DeviceSettingPanel
          device={selectedDevices[0]}
          onClose={() => setShowDeviceSetting(false)}
        />
      )}

      {/* ── GEO Fence ── */}
      {showGeo && (
        <GeoFencePanel
          devices={devices}
          selectedDevice={selectedDevices.length === 1 ? selectedDevices[0] : null}
          onClose={() => setShowGeo(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   장비 등록 팝업
══════════════════════════════════════ */
function RegisterPopup({ profiles, users, onClose, onSave }) {
  const myRole = getRole();
  const isSuperAdmin = myRole === 'SUPER_ADMIN';

  const [form, setForm] = useState({
    alias: '', imei: '', model: 'TYTO2', type: 'SBD',
    satellite: 'IRIDIUM', profileName: '', assignedUserId: '', openDate: '',
  });
  const [imeiMsg, setImeiMsg] = useState({ text: '', ok: false });

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600' };

  const checkImei = async () => {
    if (form.imei.length !== 15) { setImeiMsg({ text: 'IMEI는 15자리여야 합니다.', ok: false }); return; }
    try {
      const res = await api.get(`/devices/${form.imei}`);
      if (res.data) setImeiMsg({ text: '이미 등록된 장비입니다.', ok: false });
    } catch (e) {
      if (e.response?.status === 404) setImeiMsg({ text: '등록 가능한 장비입니다.', ok: true });
      else setImeiMsg({ text: '확인 중 오류가 발생했습니다.', ok: false });
    }
  };

  const handleSave = async () => {
    if (!form.alias || !form.imei || !form.model || !form.type) { alert('필수 항목을 입력해주세요.'); return; }
    try {
      await api.post('/devices', form);
      onSave();
    } catch (e) { alert(e.response?.data?.message || '등록 실패'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', color: '#00d4f0' }}>📡 장비 등록</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* 유닛 네임 */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>유닛 네임 (ALIAS) *</label>
            <input style={inp} value={form.alias} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} placeholder="장비 별칭" />
          </div>

          {/* IMEI */}
          <div>
            <label style={lbl}>IMEI *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={{ ...inp, flex: 1 }} value={form.imei}
                onChange={e => { setForm(p => ({ ...p, imei: e.target.value.replace(/\D/g, '').slice(0, 15) })); setImeiMsg({ text: '', ok: false }); }}
                placeholder="15자리 IMEI" maxLength={15} />
              <button onClick={checkImei}
                style={{ padding: '0 14px', background: 'rgba(0,212,240,.12)', border: '1px solid #00d4f0', borderRadius: '8px', color: '#00d4f0', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                검색
              </button>
            </div>
            {imeiMsg.text && <p style={{ fontSize: '10px', color: imeiMsg.ok ? '#10b981' : '#ef4444', marginTop: '4px' }}>{imeiMsg.text}</p>}
          </div>

          {/* Satellite */}
          <div>
            <label style={lbl}>SATELLITE COMPANY *</label>
            <select style={inp} value={form.satellite} onChange={e => setForm(p => ({ ...p, satellite: e.target.value }))}>
              <option value="IRIDIUM">Iridium</option>
              <option value="GLOBALSTAR">Globalstar</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label style={lbl}>장비 종류 (TYPE) *</label>
            <select style={inp} value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}>
              <option value="TYTO2">TYTO2</option>
              <option value="TYTO5">TYTO5</option>
              <option value="TYTO6">TYTO6</option>
              <option value="TYTO100">TYTO100</option>
              <option value="9704">9704</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <label style={lbl}>타입 *</label>
            <select style={inp} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="SBD">SBD</option>
              <option value="IMT">IMT</option>
            </select>
          </div>

          {/* 프로파일 */}
          <div>
            <label style={lbl}>프로파일</label>
            <select style={inp} value={form.profileName} onChange={e => setForm(p => ({ ...p, profileName: e.target.value }))}>
              <option value="">— 선택 안 함 —</option>
              {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          {/* 계정 할당 — SUPER_ADMIN만 표시 */}
          {isSuperAdmin && (
            <div>
              <label style={lbl}>계정 할당 *</label>
              <select style={inp} value={form.assignedUserId} onChange={e => setForm(p => ({ ...p, assignedUserId: e.target.value }))}>
                <option value="">— 계정 선택 —</option>
                {users.filter(u => u.role === 'ADMIN' || u.role === 'REVIEWER').map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.loginId})</option>
                ))}
              </select>
            </div>
          )}

          {/* 개통일자 */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>개통일자 *</label>
            <input style={{ ...inp, colorScheme: 'dark' }} type="date"
              value={form.openDate ? `${form.openDate.slice(0, 4)}-${form.openDate.slice(4, 6)}-${form.openDate.slice(6, 8)}` : ''}
              onChange={e => setForm(p => ({ ...p, openDate: e.target.value.replace(/-/g, '') }))} />
          </div>

        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>취소</button>
          <button onClick={handleSave} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>등록</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   장비 수정 팝업
══════════════════════════════════════ */
function EditPopup({ device, profiles, onClose, onSave }) {
  const [form, setForm] = useState({
    alias: device.alias || '',
    profileName: device.profileName || '',
    group: device.group || '',
  });

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600' };
  const fixedStyle = { ...inp, color: '#6b8fae', background: 'rgba(0,0,0,.5)', cursor: 'not-allowed' };

  const handleSave = async () => {
    try {
      await api.put(`/devices/${device.imei}`, form);
      onSave();
    } catch (e) { alert(e.response?.data?.message || '수정 실패'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', padding: '28px', width: '480px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', color: '#00d4f0' }}>✏️ 장비 수정</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {/* 수정 불가 항목 표시 */}
        <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[['IMEI (수정불가)', device.imei], ['MODEL (수정불가)', device.model], ['TYPE (수정불가)', device.type]].map(([label, val]) => (
            <div key={label}>
              <label style={{ ...lbl, color: '#4b6483' }}>{label}</label>
              <div style={fixedStyle}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={lbl}>유닛 네임 (ALIAS)</label>
            <input style={inp} value={form.alias} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>프로파일</label>
            <select style={inp} value={form.profileName} onChange={e => setForm(p => ({ ...p, profileName: e.target.value }))}>
              <option value="">— 선택 안 함 —</option>
              {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>그룹</label>
            <input style={inp} value={form.group} onChange={e => setForm(p => ({ ...p, group: e.target.value }))} placeholder="그룹명" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>취소</button>
          <button onClick={handleSave} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>저장</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   프로파일 팝업
══════════════════════════════════════ */
function ProfilePopup({ onClose }) {
  const [profiles, setProfiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sosEmail: '', sosKakao: '', trackEmail: '', channels: [] });
  const [channelForm, setChannelForm] = useState({ channelName: '', channelId: '', ttl: '', endpoints: [''] });
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [page, setPage] = useState(1);
  const PER = 10;

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    try { const r = await api.get('/profiles'); setProfiles(Array.isArray(r.data) ? r.data : []); } catch { }
  };

  const saveProfile = async () => {
    try {
      await api.post('/profiles', form);
      setShowForm(false);
      setForm({ name: '', sosEmail: '', sosKakao: '', trackEmail: '', channels: [] });
      fetchProfiles();
    } catch (e) { alert(e.response?.data?.message || '저장 실패'); }
  };

  const deleteProfile = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await api.delete(`/profiles/${id}`); fetchProfiles(); } catch { }
  };

  const addChannel = () => {
    setForm(p => ({ ...p, channels: [...p.channels, { ...channelForm }] }));
    setChannelForm({ channelName: '', channelId: '', ttl: '', endpoints: [''] });
    setShowChannelForm(false);
  };

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600' };

  const totalPages = Math.ceil(profiles.length / PER);
  const paged = profiles.slice((page - 1) * PER, page * PER);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', padding: '28px', width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', color: '#8b5cf6' }}>📋 프로파일 & Messaging Hub</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {/* 프로파일 등록 폼 */}
        {showForm ? (
          <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '700', marginBottom: '12px' }}>SOS / TRACK 알림 수신자</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>프로파일 명</label>
                <input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="프로파일 이름" />
              </div>
              <div>
                <label style={lbl}>SOS 이메일</label>
                <input style={inp} type="email" value={form.sosEmail} onChange={e => setForm(p => ({ ...p, sosEmail: e.target.value }))} placeholder="sos@example.com" />
              </div>
              <div>
                <label style={lbl}>SOS 카카오톡</label>
                <input style={inp} value={form.sosKakao} onChange={e => setForm(p => ({ ...p, sosKakao: e.target.value }))} placeholder="카카오톡 ID" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>TRACK 이메일 수신자</label>
                <input style={inp} type="email" value={form.trackEmail} onChange={e => setForm(p => ({ ...p, trackEmail: e.target.value }))} placeholder="track@example.com" />
              </div>
            </div>

            {/* Messaging Hub */}
            <div style={{ borderTop: '1px solid rgba(139,92,246,.3)', paddingTop: '12px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '700' }}>MESSAGING HUB</span>
                <button onClick={() => setShowChannelForm(true)}
                  style={{ padding: '4px 12px', background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '6px', color: '#8b5cf6', fontSize: '10px', cursor: 'pointer' }}>
                  + 채널 추가
                </button>
              </div>
              <div style={{ fontSize: '9px', color: '#4b6483', marginBottom: '8px' }}>Minimum SkyLink firmware version needed for this feature: 2.33</div>

              {showChannelForm && (
                <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label style={lbl}>CHANNEL NAME</label><input style={inp} value={channelForm.channelName} onChange={e => setChannelForm(p => ({ ...p, channelName: e.target.value }))} placeholder="channel_name" /></div>
                    <div><label style={lbl}>CHANNEL ID</label><input style={inp} value={channelForm.channelId} onChange={e => setChannelForm(p => ({ ...p, channelId: e.target.value }))} placeholder="channelid" /></div>
                    <div><label style={lbl}>TTL</label><input style={inp} value={channelForm.ttl} onChange={e => setChannelForm(p => ({ ...p, ttl: e.target.value }))} placeholder="ttl (초)" /></div>
                    <div>
                      <label style={lbl}>ENDPOINT (누른으로 추가)</label>
                      {channelForm.endpoints.map((ep, i) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                          <input style={{ ...inp, flex: 1 }} value={ep} onChange={e => { const arr = [...channelForm.endpoints]; arr[i] = e.target.value; setChannelForm(p => ({ ...p, endpoints: arr })); }} placeholder="http://... or mailto:..." />
                          {i === channelForm.endpoints.length - 1 && (
                            <button onClick={() => setChannelForm(p => ({ ...p, endpoints: [...p.endpoints, ''] }))}
                              style={{ padding: '0 10px', background: 'rgba(0,212,240,.12)', border: '1px solid #00d4f0', borderRadius: '6px', color: '#00d4f0', cursor: 'pointer' }}>+</button>
                          )}
                        </div>
                      ))}
                      <div style={{ fontSize: '8px', color: '#4b6483', marginTop: '4px', lineHeight: 1.6 }}>
                        Supported URI schemes:<br />
                        http · https · tcp · mailto
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowChannelForm(false)} style={{ padding: '5px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#6b8fae', cursor: 'pointer', fontSize: '11px' }}>취소</button>
                    <button onClick={addChannel} style={{ padding: '5px 14px', background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '6px', color: '#8b5cf6', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>저장</button>
                  </div>
                </div>
              )}

              {/* 채널 목록 */}
              {form.channels.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,.3)' }}>
                      {['Channel ID', 'Name', 'Endpoints', 'TTL', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", fontSize: '8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.channels.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                        <td style={{ padding: '6px 10px', color: '#7dd3fc' }}>{c.channelId}</td>
                        <td style={{ padding: '6px 10px', color: '#e8f4ff' }}>{c.channelName}</td>
                        <td style={{ padding: '6px 10px', color: '#6b8fae' }}>{c.endpoints.filter(Boolean).join(', ')}</td>
                        <td style={{ padding: '6px 10px', color: '#6b8fae' }}>{c.ttl}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <button onClick={() => setForm(p => ({ ...p, channels: p.channels.filter((_, j) => j !== i) }))}
                            style={{ padding: '2px 8px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', fontSize: '9px' }}>삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#6b8fae', cursor: 'pointer', fontSize: '12px' }}>클리어</button>
              <button onClick={saveProfile} style={{ padding: '7px 20px', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', border: 'none', borderRadius: '7px', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>알림 설정 저장</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ padding: '7px 16px', background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '8px', color: '#8b5cf6', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px' }}>
            + 프로파일 생성
          </button>
        )}

        {/* 프로파일 목록 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)' }}>
              {['No', '프로파일명', 'SOS Email', 'TRACK Email', 'Actions'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#6b8fae' }}>저장된 프로파일이 없습니다.</td></tr>
            ) : paged.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                <td style={{ padding: '8px 12px', color: '#4b6483' }}>{(page - 1) * PER + i + 1}</td>
                <td style={{ padding: '8px 12px', color: '#e8f4ff', fontWeight: '700' }}>{p.name}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{p.sosEmail}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{p.trackEmail}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => deleteProfile(p.id)}
                    style={{ padding: '3px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '10px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: '3px 8px', background: p === page ? '#8b5cf6' : 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.3)', borderRadius: '5px', color: p === page ? '#fff' : '#8b5cf6', cursor: 'pointer', fontSize: '10px' }}>{p}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   장비 설정 패널
══════════════════════════════════════ */
function DeviceSettingPanel({ device, onClose }) {
  const [verData, setVerData] = useState(null); // DB에서 가져온 VER 원본
  const [original, setOriginal] = useState(null); // 원본 설정값
  const [settings, setSettings] = useState({
    mode: 'C', event: 'ON',
    timeInput: '0000', distInput: '0000',
    canUse: false, canGps: false,
    canTime: '0000', canGpsTime: '0000',
    sosUse: false, recipient: '', geoService: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'waiting', 'success', 'failed'
  const [retryCount, setRetryCount] = useState(0);
  const [callDisabled, setCallDisabled] = useState(false);
  const MAX_RETRY = 3;

  // VER 파싱
  const parseVer = (verStr) => {
    if (!verStr) return null;
    const get = (key) => {
      const m = verStr.match(new RegExp(`${key}\\(([^)]+)\\)`));
      return m ? m[1] : null;
    };
    const verNum = verStr.split(':')[0] || '-';
    return {
      verNum,
      mode: get('Mode') || 'C',
      time: (get('Time') || '0').padStart(4, '0'),
      dist: (get('Dist') || '0').padStart(4, '0'),
      addr: get('Addr') || '',
      event: get('Event') || 'OFF',
      can: get('CAN') || '0',   // 0=off, 1=can, 2=can+gps
      canTime: (get('CAN-Time') || '0').padStart(4, '0'),
      sos: get('SOS') || 'OFF',
      gps: get('GPS') || '0',
      signal: get('SIGNAL') || '0',
    };
  };

  const gpsLabel = (v) => {
    const map = { '0': '없음', '1': '약함', '2': '보통', '3': '최상' };
    return map[v] || v;
  };
  const signalLabel = (v) => {
    const map = { '0': '없음', '1': '매우약함', '2': '보통', '3': '정상', '4': '양호', '5': '최상' };
    return map[v] || v;
  };

  // 최신 VER 데이터 조회
  useEffect(() => {
    const fetchVer = async () => {
      try {
        const res = await api.get(`/location/${device.imei}`);
        const list = Array.isArray(res.data) ? res.data : [];
        const verItem = list.find(d => d.ver && d.ver.trim() !== '');
        if (verItem?.ver) {
          const parsed = parseVer(verItem.ver);
          setVerData(parsed);
          const init = {
            mode: parsed.mode,
            event: parsed.event,
            timeInput: parsed.time,
            distInput: parsed.dist,
            canUse: parsed.can === '1' || parsed.can === '2',
            canGps: parsed.can === '2',
            canTime: parsed.canTime,
            canGpsTime: parsed.canTime,
            sosUse: parsed.sos === 'ON',
            recipient: parsed.addr,
            geoService: false,
          };
          setSettings(init);
          setOriginal(init);
        }
      } catch (_) { /* 무시 */ }
    };
    fetchVer();
  }, [device.imei]);

  const set = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  // 변경된 값만 커맨드 생성
  const buildCommand = () => {
    if (!original) return null;
    const cmds = [];
    if (settings.mode !== original.mode) cmds.push(settings.mode);
    if (settings.timeInput !== original.timeInput) cmds.push(`T${settings.timeInput}`);
    if (settings.distInput !== original.distInput) cmds.push(`D${settings.distInput}`);
    if (settings.recipient !== original.recipient) {
      const r = settings.recipient.replace(/\D/g, '');
      if (r.length === 15) cmds.push(`M${r}`);
      else if (r.length === 10) cmds.push(`U${r}`);
    }
    if (settings.event !== original.event) cmds.push(settings.event === 'ON' ? 'E' : 'e');
    // CAN
    const origCan = original.canUse ? (original.canGps ? '2' : '1') : '0';
    const newCan = settings.canUse ? (settings.canGps ? '2' : '1') : '0';
    if (newCan !== origCan) {
      if (newCan === '0') cmds.push('a');
      else if (newCan === '1') { cmds.push('A'); cmds.push(`A${settings.canTime}`); }
      else if (newCan === '2') { cmds.push('A'); cmds.push(`a${settings.canGpsTime}`); }
    } else {
      if (newCan === '1' && settings.canTime !== original.canTime) cmds.push(`A${settings.canTime}`);
      if (newCan === '2' && settings.canGpsTime !== original.canGpsTime) cmds.push(`a${settings.canGpsTime}`);
    }
    return cmds.length > 0 ? cmds.join(',') : null;
  };

  const isChanged = () => {
    if (!original) return false;
    return JSON.stringify(settings) !== JSON.stringify(original);
  };

  const doSave = async () => {
    const cmd = buildCommand();
    if (!cmd) { alert('변경된 항목이 없습니다.'); return; }
    setSaving(true); setSaveStatus('saving');
    try {
      await api.post('/location/command', { imei: device.imei, text: cmd, eventcode: '2' });
      setSaveStatus('waiting');
      setTimeout(() => {
        setSaveStatus(prev => prev === 'waiting' ? 'failed' : prev);
      }, 600000);
    } catch (_) {
      setSaveStatus('failed');
    } finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (retryCount >= MAX_RETRY) { alert('재전송 횟수(3회)를 초과했습니다. 저장이 비활성화됩니다.'); return; }
    await doSave();
  };

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRY) { alert('재전송 횟수(3회)를 초과했습니다.'); return; }
    setRetryCount(p => p + 1);
    await doSave();
  };

  const handleCall = async (cmd) => {
    setCallDisabled(true);
    try { await api.post('/location/command', { imei: device.imei, text: cmd, eventcode: '2' }); }
    catch (_) { /* 무시 */ }
    setTimeout(() => setCallDisabled(false), 60000);
  };

  const toggleStyle = (on, disabled = false) => ({
    padding: '5px 16px', borderRadius: '6px',
    border: `1px solid ${on ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)'}`,
    background: on ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
    color: on ? '#10b981' : '#ef4444',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px', fontWeight: '700', opacity: disabled ? 0.4 : 1,
  });

  const inp = {
    padding: '7px 10px', borderRadius: '6px',
    border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)',
    color: '#fff', fontSize: '12px', outline: 'none',
    fontFamily: "'JetBrains Mono', monospace",
  };

  const rowStyle = { display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(0,212,240,.06)' };
  const lblStyle = { width: '200px', fontSize: '12px', color: '#a0b4c8', flexShrink: 0 };

  const canSave = isChanged() && !saving && retryCount < MAX_RETRY;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* 헤더 */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,212,240,.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: '700', color: '#00d4f0' }}>DEVICE SETTINGS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>IMEI: {device.imei} Type: {device.type}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        </div>

        {/* Firmware 버전 표시 */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(239,68,68,.05)' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>Firmware</span>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}>
            {verData ? verData.verNum : '— VER-Call 후 표시됩니다.'}
          </span>
        </div>

        {/* 설정 항목들 */}
        <div style={{ padding: '8px 0' }}>

          {/* Mode */}
          <div style={rowStyle}>
            <span style={lblStyle}>Mode</span>
            <select value={settings.mode} onChange={e => set('mode', e.target.value)} style={{ ...inp, width: '160px' }}>
              <option value="C">CAR (C)</option>
              <option value="U">UAT (U)</option>
              <option value="T">UAV (T)</option>
            </select>
          </div>

          {/* Event */}
          <div style={rowStyle}>
            <span style={lblStyle}>Event</span>
            <select value={settings.event} onChange={e => set('event', e.target.value)} style={{ ...inp, width: '100px' }}>
              <option value="ON">ON</option>
              <option value="OFF">OFF</option>
            </select>
          </div>

          {/* 주기 Time — 4자리 */}
          <div style={rowStyle}>
            <span style={lblStyle}>주기 Time <span style={{ fontSize: '9px', color: '#4b6483' }}>(단위:분)</span></span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select onChange={e => { if (e.target.value) set('timeInput', e.target.value); }} style={{ ...inp, width: '100px' }}>
                <option value="">-- 선택 --</option>
                {['0001','0005','0010','0030','0060'].map(v => <option key={v} value={v}>{parseInt(v)}분</option>)}
              </select>
              <input style={{ ...inp, width: '80px' }} value={settings.timeInput} maxLength={4}
                onChange={e => set('timeInput', e.target.value.replace(/\D/g, '').slice(0, 4).padStart(4, '0'))} />
              <span style={{ fontSize: '10px', color: '#8b5cf6' }}>4자리</span>
            </div>
          </div>

          {/* 주기 Distance — 4자리 */}
          <div style={rowStyle}>
            <span style={lblStyle}>주기 Distance <span style={{ fontSize: '9px', color: '#4b6483' }}>(단위:10m)</span></span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select onChange={e => { if (e.target.value) set('distInput', e.target.value); }} style={{ ...inp, width: '100px' }}>
                <option value="">-- 선택 --</option>
                {['0010','0050','0100','0500','1000'].map(v => <option key={v} value={v}>{parseInt(v) * 10}m</option>)}
              </select>
              <input style={{ ...inp, width: '80px' }} value={settings.distInput} maxLength={4}
                onChange={e => set('distInput', e.target.value.replace(/\D/g, '').slice(0, 4).padStart(4, '0'))} />
              <span style={{ fontSize: '10px', color: '#8b5cf6' }}>4자리</span>
            </div>
          </div>

          {/* CAN 사용 여부 */}
          <div style={{ ...rowStyle, background: 'rgba(16,185,129,.03)', border: '1px solid rgba(16,185,129,.15)', borderRadius: '6px', margin: '4px 8px' }}>
            <span style={lblStyle}>CAN 사용 여부</span>
            <button style={toggleStyle(settings.canUse && !settings.canGps)}
              onClick={() => {
                if (settings.canGps) return; // CAN+GPS ON이면 잠금
                const newVal = !settings.canUse;
                set('canUse', newVal);
                if (!newVal) set('canGps', false);
              }}>
              {settings.canUse && !settings.canGps ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* CAN 시간 설정 — CAN ON && CAN+GPS OFF 시 활성화 */}
          <div style={{ ...rowStyle, background: 'rgba(16,185,129,.03)', opacity: settings.canUse && !settings.canGps ? 1 : 0.35 }}>
            <span style={lblStyle}>CAN 시간 설정 <span style={{ fontSize: '9px', color: '#4b6483' }}>(단위:분)</span></span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input style={{ ...inp, width: '80px' }} value={settings.canTime} maxLength={4}
                disabled={!settings.canUse || settings.canGps}
                onChange={e => set('canTime', e.target.value.replace(/\D/g, '').slice(0, 4).padStart(4, '0'))} />
              <span style={{ fontSize: '10px', color: '#8b5cf6' }}>4자리</span>
            </div>
          </div>

          {/* CAN+GPS 사용 여부 */}
          <div style={{ ...rowStyle, border: '1px solid rgba(107,143,174,.2)', borderRadius: '6px', margin: '4px 8px' }}>
            <span style={lblStyle}>CAN+GPS 사용여부</span>
            <button style={toggleStyle(settings.canGps, settings.canUse && !settings.canGps)}
              onClick={() => {
                if (settings.canUse && !settings.canGps) return; // CAN ON이면 잠금
                const newVal = !settings.canGps;
                set('canGps', newVal);
                if (newVal) set('canUse', true); // CAN+GPS ON 시 canUse도 true
              }}>
              {settings.canGps ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* CAN+GPS 시간 설정 — CAN+GPS ON 시 활성화 */}
          <div style={{ ...rowStyle, opacity: settings.canGps ? 1 : 0.35 }}>
            <span style={lblStyle}>CAN+GPS 시간 설정 <span style={{ fontSize: '9px', color: '#4b6483' }}>(단위:분)</span></span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input style={{ ...inp, width: '80px' }} value={settings.canGpsTime} maxLength={4}
                disabled={!settings.canGps}
                onChange={e => set('canGpsTime', e.target.value.replace(/\D/g, '').slice(0, 4).padStart(4, '0'))} />
              <span style={{ fontSize: '10px', color: '#8b5cf6' }}>4자리</span>
            </div>
          </div>

          {/* SOS 사용 여부 */}
          <div style={rowStyle}>
            <span style={lblStyle}>SOS 사용 여부</span>
            <button style={toggleStyle(settings.sosUse)} onClick={() => set('sosUse', !settings.sosUse)}>
              {settings.sosUse ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 수신처 */}
          <div style={rowStyle}>
            <span style={lblStyle}>수신처 <span style={{ fontSize: '9px', color: '#4b6483' }}>(유닛코드/IMEI)</span></span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <input style={{ ...inp, width: '280px' }} value={settings.recipient}
                onChange={e => set('recipient', e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder="10자리(유닛코드) 또는 15자리(IMEI)" />
              {settings.recipient && settings.recipient.length !== 10 && settings.recipient.length !== 15 && (
                <span style={{ fontSize: '9px', color: '#ef4444' }}>10자리 또는 15자리만 가능합니다.</span>
              )}
              {settings.recipient && (settings.recipient.length === 10 || settings.recipient.length === 15) && (
                <span style={{ fontSize: '9px', color: '#10b981' }}>
                  {settings.recipient.length === 15 ? '✓ IMEI (15자리)' : '✓ 유닛코드 (10자리)'}
                </span>
              )}
            </div>
          </div>

          {/* GEO Service */}
          <div style={rowStyle}>
            <span style={lblStyle}>GEO Service</span>
            <button style={toggleStyle(settings.geoService)} onClick={() => set('geoService', !settings.geoService)}>
              {settings.geoService ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* GPS 표시 — 읽기전용 */}
          <div style={{ ...rowStyle, background: 'rgba(245,158,11,.04)' }}>
            <span style={{ ...lblStyle, color: '#fbbf24', fontWeight: '700' }}>GPS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}>
                {verData ? verData.gps : '—'}
              </span>
              <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                {verData ? gpsLabel(verData.gps) : ''}
              </span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: '6px', height: `${8 + i * 4}px`, borderRadius: '2px', background: verData && parseInt(verData.gps) > i ? '#fbbf24' : 'rgba(255,255,255,.1)', alignSelf: 'flex-end' }} />
                ))}
              </div>
            </div>
          </div>

          {/* SIGNAL 표시 — 읽기전용 */}
          <div style={{ ...rowStyle, background: 'rgba(16,185,129,.04)' }}>
            <span style={{ ...lblStyle, color: '#10b981', fontWeight: '700' }}>SIGNAL</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>
                {verData ? verData.signal : '—'}
              </span>
              <span style={{ fontSize: '11px', color: '#10b981' }}>
                {verData ? signalLabel(verData.signal) : ''}
              </span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ width: '6px', height: `${6 + i * 4}px`, borderRadius: '2px', background: verData && parseInt(verData.signal) > i ? '#10b981' : 'rgba(255,255,255,.1)', alignSelf: 'flex-end' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 커맨드 미리보기 */}
        {isChanged() && buildCommand() && (
          <div style={{ margin: '0 14px 8px', padding: '8px 12px', background: 'rgba(0,212,240,.05)', border: '1px solid rgba(0,212,240,.15)', borderRadius: '8px' }}>
            <span style={{ fontSize: '9px', color: '#6b8fae' }}>전송 커맨드: </span>
            <span style={{ fontSize: '10px', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>{buildCommand()}</span>
          </div>
        )}

        {/* 저장 버튼 */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleSave} disabled={!canSave}
            style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: canSave ? 'linear-gradient(135deg,#00d4f0,#0891b2)' : 'rgba(255,255,255,.07)', color: canSave ? '#0d1628' : 'rgba(255,255,255,.2)', fontWeight: '700', fontSize: '12px', cursor: canSave ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
            💾 모든 설정 저장
          </button>
          <span style={{ fontSize: '10px', color: '#6b8fae' }}>※ ACK 수신시까지 최대 10분 대기</span>

          {saveStatus === 'waiting' && (
            <span style={{ fontSize: '11px', color: '#f59e0b' }}>⏳ 대기 중... ({retryCount}/{MAX_RETRY}회)</span>
          )}
          {saveStatus === 'failed' && retryCount < MAX_RETRY && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#ef4444' }}>❌ 실패 ({retryCount}/{MAX_RETRY}회)</span>
              <button onClick={handleRetry}
                style={{ padding: '5px 12px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '6px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>
                재전송
              </button>
            </div>
          )}
          {saveStatus === 'failed' && retryCount >= MAX_RETRY && (
            <span style={{ fontSize: '11px', color: '#ef4444' }}>❌ 재전송 {MAX_RETRY}회 초과 — 저장 비활성화</span>
          )}
          {saveStatus === 'success' && (
            <span style={{ fontSize: '11px', color: '#10b981' }}>✅ 성공</span>
          )}
        </div>

        {/* Device Call */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(0,212,240,.1)' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700', marginBottom: '8px' }}>
            DEVICE CALL <span style={{ fontSize: '9px', color: '#6b8fae', fontWeight: '400' }}>※ 클릭 후 1분간 전체 비활성화</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'CAN-Call', cmd: 'CAN', desc: 'CAN 1회' },
              { label: 'can-Call', cmd: 'can', desc: 'CAN+GPS' },
              { label: 'CAR-Call', cmd: 'CAR', desc: 'CAR 1회' },
              { label: 'UAV-Call', cmd: 'UAV', desc: 'UAV 1회' },
              { label: 'UAT-Call', cmd: 'UAT', desc: 'UAT 1회' },
              { label: 'VER-Call', cmd: 'VER', desc: 'VER 호출', highlight: true },
            ].map(b => (
              <div key={b.cmd} style={{ textAlign: 'center' }}>
                <button onClick={() => handleCall(b.cmd)} disabled={callDisabled}
                  style={{ padding: '6px 14px', borderRadius: '7px', border: `1px solid ${b.highlight ? 'rgba(0,212,240,.5)' : 'rgba(255,255,255,.15)'}`, background: b.highlight ? 'rgba(0,212,240,.12)' : 'rgba(255,255,255,.05)', color: b.highlight ? '#00d4f0' : '#e8f4ff', cursor: callDisabled ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700', opacity: callDisabled ? 0.4 : 1 }}>
                  {b.label}
                </button>
                <div style={{ fontSize: '8px', color: '#4b6483', marginTop: '2px' }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   GEO Fence 패널
══════════════════════════════════════ */
function GeoFencePanel({ devices, selectedDevice, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawSourceRef = useRef(null);
  const vectorLayerRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [mode, setMode] = useState('DEF1');
  const [geoOn, setGeoOn] = useState(true);
  const [interval, setIntervalVal] = useState('S010');
  const [intervalT, setIntervalT] = useState('T010');
  const [activeGeo, setActiveGeo] = useState(null);
  const deviceKey = `geo_${selectedDevice?.imei || 'unknown'}`;

  const [savedSlots, setSavedSlots] = useState(() => {
    try {
      const saved = localStorage.getItem(`${deviceKey}_slots`);
      return saved ? JSON.parse(saved) : { 'GEO-1': null, 'GEO-2': null, 'GEO-3': null, 'GEO-4': null, 'GEO-5': null };
    } catch (_) {
      return { 'GEO-1': null, 'GEO-2': null, 'GEO-3': null, 'GEO-4': null, 'GEO-5': null };
    }
  });

  const [lastSentSlot, setLastSentSlot] = useState(() => {
    return localStorage.getItem(`${deviceKey}_lastSent`) || null;
  });
  const [sendStatus, setSendStatus] = useState(''); // '', 'waiting', 'success', 'failed'
  const [retryCount, setRetryCount] = useState(0);
  const [sendLocked, setSendLocked] = useState(false);
  const [intersectError, setIntersectError] = useState(false);
  const MAX_RETRY = 3;
  const MAX_POINTS = 8;


  // 선분 교차 검사
  const ccw = (A, B, C) => (C.lat - A.lat) * (B.lon - A.lon) > (B.lat - A.lat) * (C.lon - A.lon);
  const segmentsIntersect = (A, B, C, D) => ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
  const hasIntersection = (pts) => {
    const n = pts.length;
    if (n < 4) return false;

    // 모든 선분 목록 (열린 폴리라인 + 닫히는 선분)
    const edges = [];
    for (let i = 0; i < n - 1; i++) {
      edges.push([pts[i], pts[i + 1]]);
    }
    // 닫히는 선분: 마지막→첫번째
    edges.push([pts[n - 1], pts[0]]);

    // 모든 비인접 선분 쌍 교차 검사
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 2; j < edges.length; j++) {
        // 첫번째와 마지막 선분은 꼭짓점을 공유하므로 제외
        if (i === 0 && j === edges.length - 1) continue;
        if (segmentsIntersect(edges[i][0], edges[i][1], edges[j][0], edges[j][1])) {
          return true;
        }
      }
    }
    return false;
  };

  // OpenLayers 초기화
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const source = new VectorSource();
    drawSourceRef.current = source;

    const vectorLayer = new VectorLayer({ source });
    vectorLayerRef.current = vectorLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer,
      ],
      view: new View({ center: fromLonLat([127.5, 36.5]), zoom: 7 }),
    });
    mapInstanceRef.current = map;

    // 현재 위치
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.getView().setCenter(fromLonLat([pos.coords.longitude, pos.coords.latitude]));
          map.getView().setZoom(13);
        },
        () => {
          map.getView().setCenter(fromLonLat([127.5, 36.5]));
          map.getView().setZoom(7);
        }
      );
    }

    // 클릭으로 꼭짓점 추가
    map.on('click', (e) => {
      const [lon, lat] = toLonLat(e.coordinate);
      const newPt = { lat: parseFloat(lat.toFixed(6)), lon: parseFloat(lon.toFixed(6)) };
      setPoints(prev => {
        if (prev.length >= MAX_POINTS) return prev;
        const next = [...prev, newPt];
        if (next.length >= 4 && hasIntersection(next)) {
          setIntersectError(true);
          setTimeout(() => setIntersectError(false), 2000);
          return prev;
        }
        setIntersectError(false);
        return next;
      });
    });

    return () => { map.setTarget(undefined); mapInstanceRef.current = null; };
  }, []);

  // points 변경 시 지도 업데이트
  useEffect(() => {
    const source = drawSourceRef.current;
    if (!source) return;
    source.clear();

    const color = mode === 'DEF1' ? '#10b981' : mode === 'DEF2' ? '#ef4444' : '#3b82f6';

    if (points.length >= 3) {
      const coords = points.map(p => fromLonLat([p.lon, p.lat]));
      const polygon = new Feature({ geometry: new Polygon([[...coords, coords[0]]]) });
      polygon.setStyle(new Style({
        stroke: new Stroke({ color, width: 2 }),
        fill: new Fill({ color: color + '33' }),
      }));
      source.addFeature(polygon);
    }

    if (points.length >= 2) {
      const coords = points.map(p => fromLonLat([p.lon, p.lat]));
      const line = new Feature({ geometry: new LineString(coords) });
      line.setStyle(new Style({
        stroke: new Stroke({ color, width: 1.5, lineDash: [4, 4] }),
      }));
      source.addFeature(line);
    }

    points.forEach((p, i) => {
      const f = new Feature({ geometry: new Point(fromLonLat([p.lon, p.lat])) });
      f.setStyle(new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
        text: new Text({
          text: `${i + 1}`,
          fill: new Fill({ color: '#fff' }),
          font: 'bold 10px sans-serif',
          offsetY: -18,
        }),
      }));
      source.addFeature(f);
    });
  }, [points, mode]);

  const buildCommand = () => {
    if (!geoOn || points.length < 3) return null;
    const n = points.length;
    const coords = points.map((p, i) => `${n}-${i + 1},${p.lat},${p.lon}`).join(',');
    const intervalStr = mode === 'DEF1' ? interval : mode === 'DEF2' ? intervalT : `${interval},${intervalT}`;
    return `G1,${mode},${intervalStr},${n},${coords}`;
  };

  const handleSaveSlot = () => {
    if (!activeGeo) { alert('GEO 슬롯을 선택해주세요.'); return; }
    if (points.length < 3) { alert('최소 3개 좌표가 필요합니다.'); return; }
    const newSlots = { ...savedSlots, [activeGeo]: { points: [...points], mode, interval, intervalT } };
    setSavedSlots(newSlots);
    localStorage.setItem(`${deviceKey}_slots`, JSON.stringify(newSlots));
    alert(`${activeGeo}에 저장 완료!`);
  };

  const doSend = async () => {
    const cmd = buildCommand();
    if (!cmd) { alert('최소 3개 좌표가 필요합니다.'); return; }
    setSendStatus('waiting');
    try {
      await api.post('/location/command', { imei: selectedDevice?.imei, text: cmd, eventcode: '3' });
      setLastSentSlot(activeGeo);
      localStorage.setItem(`${deviceKey}_lastSent`, activeGeo);
      setSendLocked(true);
      setTimeout(() => setSendLocked(false), 120000); // 2분 잠금
      setTimeout(() => { setSendStatus(prev => prev === 'waiting' ? 'failed' : prev); }, 600000);
    } catch (_) {
      setSendStatus('failed');
    }
  };

  const handleSend = async () => {
    if (sendLocked) { alert('전송 후 2분간 잠금됩니다.'); return; }
    if (!activeGeo) { alert('GEO 슬롯을 선택해주세요.'); return; }
    setRetryCount(0);
    await doSend();
  };

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRY) { alert('재전송 3회 초과'); return; }
    setRetryCount(p => p + 1);
    await doSend();
  };

  const INTERVAL_OPTIONS = ['S001','S005','S010','S030'].map(v => ({ value: v, label: `${v} - ${parseInt(v.slice(1))}분` }));
  const INTERVAL_T_OPTIONS = ['T001','T005','T010','T030'].map(v => ({ value: v, label: `${v} - ${parseInt(v.slice(1))}분` }));

  const slotBorder = (g) => {
    if (g === lastSentSlot) return '2px solid #fbbf24';
    if (savedSlots[g]) return '2px solid #ef4444';
    return '1px solid rgba(0,212,240,.2)';
  };
  const slotBg = (g) => {
    if (g === activeGeo) return 'rgba(0,212,240,.15)';
    if (g === lastSentSlot) return 'rgba(245,158,11,.1)';
    if (savedSlots[g]) return 'rgba(239,68,68,.08)';
    return 'rgba(0,0,0,.3)';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1628', border: '1px solid rgba(0,212,240,.25)', borderRadius: '12px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,212,240,.2)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: geoOn ? '#10b981' : '#ef4444', display: 'inline-block', boxShadow: geoOn ? '0 0 6px #10b981' : '0 0 6px #ef4444' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: '700', color: '#00d4f0' }}>GEO FENCE CONFIGURATION</span>

          {/* G1 ON / G2 OFF */}
          <button onClick={() => setGeoOn(true)} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: geoOn ? '#10b981' : 'rgba(16,185,129,.15)', color: geoOn ? '#fff' : '#10b981', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>G1 ON</button>
          <button onClick={() => setGeoOn(false)} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: !geoOn ? '#ef4444' : 'rgba(239,68,68,.15)', color: !geoOn ? '#fff' : '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>G2 OFF</button>

          <span style={{ color: '#4b6483', fontSize: '10px' }}>MODE</span>
          {['DEF1', 'DEF2', 'DEF3'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: mode === m ? (m === 'DEF1' ? '#10b981' : m === 'DEF2' ? '#ef4444' : '#3b82f6') : 'rgba(255,255,255,.07)', color: mode === m ? '#fff' : '#6b8fae', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
              {m === 'DEF1' ? 'DEF1 IN' : m === 'DEF2' ? 'DEF2 OUT' : 'DEF3 BOTH'}
            </button>
          ))}

          <span style={{ color: '#4b6483', fontSize: '10px' }}>INTERVAL</span>
          {(mode === 'DEF1' || mode === 'DEF3') && (
            <select value={interval} onChange={e => setIntervalVal(e.target.value)}
              style={{ padding: '3px 8px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', outline: 'none' }}>
              {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {(mode === 'DEF2' || mode === 'DEF3') && (
            <select value={intervalT} onChange={e => setIntervalT(e.target.value)}
              style={{ padding: '3px 8px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', outline: 'none' }}>
              {INTERVAL_T_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#6b8fae' }}>Device: {selectedDevice?.alias || '—'}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>
        </div>

        {/* 교차 오류 */}
        {intersectError && (
          <div style={{ padding: '6px 20px', background: 'rgba(239,68,68,.15)', borderBottom: '1px solid rgba(239,68,68,.3)', fontSize: '11px', color: '#ef4444', fontWeight: '700', flexShrink: 0 }}>
            ⚠️ 선분이 교차됩니다. 다른 위치를 선택해주세요.
          </div>
        )}

        {/* 본문 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* 지도 영역 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: 'rgba(0,0,0,.3)' }}>
              <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
                DRAWING AREA {points.length} / {MAX_POINTS} pts
              </span>
              <span style={{ fontSize: '9px', color: '#4b6483' }}>지도 클릭으로 꼭짓점 추가 (최소 3개, 최대 {MAX_POINTS}개)</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                <button onClick={() => setPoints(p => p.slice(0, -1))}
                  style={{ padding: '3px 10px', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', borderRadius: '5px', color: '#f59e0b', fontSize: '10px', cursor: 'pointer' }}>↩ Undo</button>
                <button onClick={() => setPoints([])}
                  style={{ padding: '3px 10px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>✕ Clear</button>
              </div>
            </div>
            <div ref={mapRef} style={{ flex: 1, cursor: 'crosshair' }} />
          </div>

          {/* 우측 패널 */}
          <div style={{ width: '300px', borderLeft: '1px solid rgba(0,212,240,.1)', display: 'flex', flexDirection: 'column', gap: '0', overflowY: 'auto', background: '#0a1628' }}>

            {/* 좌표 목록 */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)' }}>
              <div style={{ fontSize: '10px', color: '#00d4f0', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>COORDINATE LIST</div>
              {points.length === 0 ? (
                <div style={{ fontSize: '10px', color: '#4b6483', textAlign: 'center', padding: '10px' }}>지도를 클릭하여 꼭짓점을 추가하세요</div>
              ) : points.map((p, i) => (
                <div key={i} style={{ fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", padding: '3px 0', borderBottom: '1px solid rgba(0,212,240,.05)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#00d4f0' }}>{i + 1}.</span>
                  <span>{p.lat.toFixed(5)}, {p.lon.toFixed(5)}</span>
                </div>
              ))}
            </div>

            {/* GEO 슬롯 */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)' }}>
              <div style={{ fontSize: '10px', color: '#00d4f0', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>GEO-SETTING 슬롯 (1-5)</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {['GEO-1','GEO-2','GEO-3','GEO-4','GEO-5'].map(g => (
                  <button key={g} onClick={() => {
                    setActiveGeo(activeGeo === g ? null : g);
                    if (savedSlots[g]) setPoints(savedSlots[g].points);
                  }}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: slotBorder(g), background: slotBg(g), color: activeGeo === g ? '#00d4f0' : savedSlots[g] ? '#ef4444' : '#6b8fae', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    {g}
                  </button>
                ))}
              </div>
              {lastSentSlot && (
                <div style={{ fontSize: '9px', color: '#fbbf24', padding: '4px 8px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '5px' }}>
                  📡 마지막 전송: {lastSentSlot}
                </div>
              )}
              {activeGeo && savedSlots[activeGeo] && (
                <div style={{ marginTop: '6px', fontSize: '9px', color: '#10b981', padding: '4px 8px', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: '5px' }}>
                  ✓ 저장된 슬롯: {savedSlots[activeGeo].points.length}개 꼭짓점 / {savedSlots[activeGeo].mode}
                </div>
              )}
            </div>

            {/* Command Preview */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)' }}>
              <div style={{ fontSize: '10px', color: '#00d4f0', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>COMMAND PREVIEW</div>
              <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(0,212,240,.15)', borderRadius: '6px', padding: '10px', fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, minHeight: '60px', wordBreak: 'break-all' }}>
                {buildCommand() || '— 포트 3개 이상 추가 후 생성됩니다 —'}
              </div>
            </div>

            {/* 안내 문구 */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)', fontSize: '10px', color: '#6b8fae', lineHeight: 1.8 }}>
              <div style={{ fontWeight: '700', color: '#00d4f0', marginBottom: '6px', fontSize: '11px' }}>📌 사용 안내</div>
              <div>• 슬롯(GEO-1~5)을 클릭하여 선택하세요.</div>
              <div>• 지도에서 꼭짓점을 추가 후 <span style={{ color: '#00d4f0', fontWeight: '700' }}>저장</span>하면 슬롯이 <span style={{ color: '#ef4444', fontWeight: '700' }}>빨간색</span>으로 변합니다.</div>
              <div>• 새 슬롯을 선택해 추가 저장할 수 있습니다. (총 5개)</div>
              <div>• <span style={{ color: '#00d4f0', fontWeight: '700' }}>전송</span>이 완료된 슬롯은 <span style={{ color: '#fbbf24', fontWeight: '700' }}>노란색</span>으로 변합니다.</div>
              <div style={{ marginTop: '8px', padding: '6px 8px', background: 'rgba(0,212,240,.05)', border: '1px solid rgba(0,212,240,.1)', borderRadius: '6px', fontSize: '9px', color: '#4b6483' }}>
                ※ 전송 후 2분간 잠금 / 실패 시 최대 3회 자동 재시도
              </div>
            </div>

            {/* 전송 상태 */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)' }}>
              {sendStatus === 'waiting' && (
                <div style={{ padding: '8px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '6px', fontSize: '10px', color: '#f59e0b' }}>
                  ⏳ 대기 중... ({retryCount}/{MAX_RETRY}회)
                </div>
              )}
              {sendStatus === 'failed' && retryCount < MAX_RETRY && (
                <div style={{ padding: '8px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', fontSize: '10px', color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>❌ 실패 ({retryCount}/{MAX_RETRY}회)</span>
                  <button onClick={handleRetry} style={{ padding: '3px 10px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>재전송</button>
                </div>
              )}
              {sendStatus === 'failed' && retryCount >= MAX_RETRY && (
                <div style={{ padding: '8px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', fontSize: '10px', color: '#ef4444' }}>
                  ❌ 재전송 {MAX_RETRY}회 초과 — 잠금
                </div>
              )}
              {sendStatus === 'success' && (
                <div style={{ padding: '8px', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: '6px', fontSize: '10px', color: '#10b981' }}>
                  ✅ 전송 성공
                </div>
              )}
              {sendLocked && sendStatus !== 'waiting' && (
                <div style={{ marginTop: '6px', fontSize: '9px', color: '#6b8fae' }}>🔒 2분간 잠금 중...</div>
              )}
            </div>

            {/* 버튼 */}
            <div style={{ padding: '14px', display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button onClick={handleSaveSlot}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                💾 저장
              </button>
              <button onClick={handleSend} disabled={sendLocked || retryCount >= MAX_RETRY}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: sendLocked || retryCount >= MAX_RETRY ? 'rgba(255,255,255,.07)' : 'linear-gradient(135deg,#10b981,#059669)', color: sendLocked || retryCount >= MAX_RETRY ? 'rgba(255,255,255,.2)' : '#fff', fontWeight: '700', fontSize: '12px', cursor: sendLocked || retryCount >= MAX_RETRY ? 'not-allowed' : 'pointer' }}>
                ▶ 전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}