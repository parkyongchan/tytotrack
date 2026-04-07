import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

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
    try { const r = await api.get('/users'); setUsers(Array.isArray(r.data) ? r.data : []); } catch {}
  };

  const fetchProfiles = async () => {
    try { const r = await api.get('/profiles'); setProfiles(Array.isArray(r.data) ? r.data : []); } catch {}
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

        {/* 장비 등록 — Super Admin만 */}
        {isSuperAdmin && (
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

        {/* 장비 삭제 — Super Admin만 */}
        {isSuperAdmin && (
          <button onClick={async () => {
            if (selected.length === 0) { alert('장비를 선택해주세요.'); return; }
            if (!confirm(`${selected.length}개 장비를 삭제하시겠습니까?`)) return;
            for (const imei of selected) { try { await api.delete(`/devices/${imei}`); } catch {} }
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

        {/* GEO Fence — 모든 권한 */}
        <button onClick={() => setShowGeo(true)} style={btnStyle('#10b981')}>
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
              {['IMEI','Alias','Model','Type','계정','개통일','Profile','상태'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>등록된 장비 없음</td></tr>
            ) : paged.map((d, i) => {
              const isActive = d.lat || d.lastUpdate;
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
                    {d.openDate ? `${String(d.openDate).slice(0,4)}-${String(d.openDate).slice(4,6)}-${String(d.openDate).slice(6,8)}` : '-'}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.profileName || '-'}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: isActive ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)', color: isActive ? '#10b981' : '#ef4444' }}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
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
              <button onClick={() => setPage(1)} disabled={page===1} style={{ padding:'3px 8px', background:'rgba(0,212,240,.1)', border:'1px solid rgba(0,212,240,.2)', borderRadius:'5px', color:'#00d4f0', cursor:'pointer', fontSize:'10px', opacity:page===1?0.3:1 }}>«</button>
              <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ padding:'3px 8px', background:'rgba(0,212,240,.1)', border:'1px solid rgba(0,212,240,.2)', borderRadius:'5px', color:'#00d4f0', cursor:'pointer', fontSize:'10px', opacity:page===1?0.3:1 }}>‹</button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                <button key={p} onClick={()=>setPage(p)} style={{ padding:'3px 8px', background:p===page?'#00d4f0':'rgba(0,212,240,.1)', border:'1px solid rgba(0,212,240,.2)', borderRadius:'5px', color:p===page?'#0d1628':'#00d4f0', cursor:'pointer', fontSize:'10px', fontWeight:p===page?'700':'400' }}>{p}</button>
              ))}
              <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ padding:'3px 8px', background:'rgba(0,212,240,.1)', border:'1px solid rgba(0,212,240,.2)', borderRadius:'5px', color:'#00d4f0', cursor:'pointer', fontSize:'10px', opacity:page===totalPages?0.3:1 }}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page===totalPages} style={{ padding:'3px 8px', background:'rgba(0,212,240,.1)', border:'1px solid rgba(0,212,240,.2)', borderRadius:'5px', color:'#00d4f0', cursor:'pointer', fontSize:'10px', opacity:page===totalPages?0.3:1 }}>»</button>
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
  const [form, setForm] = useState({
    alias: '', imei: '', model: 'TYTO2', type: 'SBD',
    satellite: 'IRIDIUM', profileName: '', assignedUserId: '', openDate: '',
  });
  const [imeiMsg, setImeiMsg] = useState({ text: '', ok: false });

  const inp = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid rgba(0,212,240,.25)', background:'rgba(0,0,0,.3)', color:'#fff', fontSize:'12px', boxSizing:'border-box', outline:'none' };
  const lbl = { fontSize:'10px', color:'#6b8fae', display:'block', marginBottom:'5px', fontWeight:'600' };

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
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1a2d48', border:'1px solid rgba(0,212,240,.25)', borderRadius:'16px', padding:'28px', width:'560px', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', fontWeight:'700', color:'#00d4f0' }}>📡 장비 등록</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b8fae', cursor:'pointer', fontSize:'18px' }}>✕</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>

          {/* 유닛 네임 */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>유닛 네임 (ALIAS) *</label>
            <input style={inp} value={form.alias} onChange={e=>setForm(p=>({...p,alias:e.target.value}))} placeholder="장비 별칭" />
          </div>

          {/* IMEI */}
          <div>
            <label style={lbl}>IMEI *</label>
            <div style={{ display:'flex', gap:'8px' }}>
              <input style={{...inp,flex:1}} value={form.imei}
                onChange={e=>{ setForm(p=>({...p,imei:e.target.value.replace(/\D/g,'').slice(0,15)})); setImeiMsg({text:'',ok:false}); }}
                placeholder="15자리 IMEI" maxLength={15} />
              <button onClick={checkImei}
                style={{ padding:'0 14px', background:'rgba(0,212,240,.12)', border:'1px solid #00d4f0', borderRadius:'8px', color:'#00d4f0', fontSize:'11px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap' }}>
                검색
              </button>
            </div>
            {imeiMsg.text && <p style={{ fontSize:'10px', color: imeiMsg.ok ? '#10b981' : '#ef4444', marginTop:'4px' }}>{imeiMsg.text}</p>}
          </div>

          {/* Satellite */}
          <div>
            <label style={lbl}>SATELLITE COMPANY *</label>
            <select style={inp} value={form.satellite} onChange={e=>setForm(p=>({...p,satellite:e.target.value}))}>
              <option value="IRIDIUM">Iridium</option>
              <option value="GLOBALSTAR">Globalstar</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label style={lbl}>장비 종류 (TYPE) *</label>
            <select style={inp} value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))}>
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
            <select style={inp} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
              <option value="SBD">SBD</option>
              <option value="IMT">IMT</option>
            </select>
          </div>

          {/* 프로파일 */}
          <div>
            <label style={lbl}>프로파일</label>
            <select style={inp} value={form.profileName} onChange={e=>setForm(p=>({...p,profileName:e.target.value}))}>
              <option value="">— 선택 안 함 —</option>
              {profiles.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          {/* 계정 할당 */}
          <div>
            <label style={lbl}>계정 할당 *</label>
            <select style={inp} value={form.assignedUserId} onChange={e=>setForm(p=>({...p,assignedUserId:e.target.value}))}>
              <option value="">— 계정 선택 —</option>
              {users.filter(u=>u.role==='ADMIN'||u.role==='REVIEWER').map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.loginId})</option>
              ))}
            </select>
          </div>

          {/* 개통일자 */}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={lbl}>개통일자 *</label>
            <input style={{ ...inp, colorScheme:'dark' }} type="date"
              value={form.openDate ? `${form.openDate.slice(0,4)}-${form.openDate.slice(4,6)}-${form.openDate.slice(6,8)}` : ''}
              onChange={e => setForm(p => ({ ...p, openDate: e.target.value.replace(/-/g,'') }))} />
          </div>

        </div>

        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:'8px', border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'#6b8fae', cursor:'pointer', fontSize:'13px' }}>취소</button>
          <button onClick={handleSave} style={{ padding:'9px 24px', borderRadius:'8px', border:'none', background:'linear-gradient(135deg,#00d4f0,#0891b2)', color:'#0d1628', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>등록</button>
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

  const inp = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid rgba(0,212,240,.25)', background:'rgba(0,0,0,.3)', color:'#fff', fontSize:'12px', boxSizing:'border-box', outline:'none' };
  const lbl = { fontSize:'10px', color:'#6b8fae', display:'block', marginBottom:'5px', fontWeight:'600' };
  const fixedStyle = { ...inp, color:'#6b8fae', background:'rgba(0,0,0,.5)', cursor:'not-allowed' };

  const isSuperAdmin = myRole === 'SUPER_ADMIN';

  const handleSave = async () => {
    try {
      await api.put(`/devices/${device.imei}`, form);
      onSave();
    } catch (e) { alert(e.response?.data?.message || '수정 실패'); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1a2d48', border:'1px solid rgba(0,212,240,.25)', borderRadius:'16px', padding:'28px', width:'480px' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', fontWeight:'700', color:'#00d4f0' }}>✏️ 장비 수정</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b8fae', cursor:'pointer', fontSize:'18px' }}>✕</button>
        </div>

        {/* 수정 불가 항목 표시 */}
        <div style={{ background:'rgba(0,0,0,.3)', borderRadius:'10px', padding:'12px', marginBottom:'16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
          {[['IMEI (수정불가)', device.imei], ['MODEL (수정불가)', device.model], ['TYPE (수정불가)', device.type]].map(([label,val])=>(
            <div key={label}>
              <label style={{ ...lbl, color:'#4b6483' }}>{label}</label>
              <div style={fixedStyle}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gap:'14px' }}>
          <div>
            <label style={lbl}>유닛 네임 (ALIAS)</label>
            <input style={inp} value={form.alias} onChange={e=>setForm(p=>({...p,alias:e.target.value}))} />
          </div>
          <div>
            <label style={lbl}>프로파일</label>
            <select style={inp} value={form.profileName} onChange={e=>setForm(p=>({...p,profileName:e.target.value}))}>
              <option value="">— 선택 안 함 —</option>
              {profiles.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>그룹</label>
            <input style={inp} value={form.group} onChange={e=>setForm(p=>({...p,group:e.target.value}))} placeholder="그룹명" />
          </div>
        </div>

        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:'8px', border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'#6b8fae', cursor:'pointer', fontSize:'13px' }}>취소</button>
          <button onClick={handleSave} style={{ padding:'9px 24px', borderRadius:'8px', border:'none', background:'linear-gradient(135deg,#00d4f0,#0891b2)', color:'#0d1628', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>저장</button>
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
  const [form, setForm] = useState({ name:'', sosEmail:'', sosKakao:'', trackEmail:'', channels:[] });
  const [channelForm, setChannelForm] = useState({ channelName:'', channelId:'', ttl:'', endpoints:[''] });
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [page, setPage] = useState(1);
  const PER = 10;

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    try { const r = await api.get('/profiles'); setProfiles(Array.isArray(r.data) ? r.data : []); } catch {}
  };

  const saveProfile = async () => {
    try {
      await api.post('/profiles', form);
      setShowForm(false);
      setForm({ name:'', sosEmail:'', sosKakao:'', trackEmail:'', channels:[] });
      fetchProfiles();
    } catch (e) { alert(e.response?.data?.message || '저장 실패'); }
  };

  const deleteProfile = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await api.delete(`/profiles/${id}`); fetchProfiles(); } catch {}
  };

  const addChannel = () => {
    setForm(p=>({...p, channels:[...p.channels, {...channelForm}]}));
    setChannelForm({ channelName:'', channelId:'', ttl:'', endpoints:[''] });
    setShowChannelForm(false);
  };

  const inp = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid rgba(0,212,240,.25)', background:'rgba(0,0,0,.3)', color:'#fff', fontSize:'12px', boxSizing:'border-box', outline:'none' };
  const lbl = { fontSize:'10px', color:'#6b8fae', display:'block', marginBottom:'5px', fontWeight:'600' };

  const totalPages = Math.ceil(profiles.length / PER);
  const paged = profiles.slice((page-1)*PER, page*PER);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1a2d48', border:'1px solid rgba(0,212,240,.25)', borderRadius:'16px', padding:'28px', width:'700px', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', fontWeight:'700', color:'#8b5cf6' }}>📋 프로파일 & Messaging Hub</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b8fae', cursor:'pointer', fontSize:'18px' }}>✕</button>
        </div>

        {/* 프로파일 등록 폼 */}
        {showForm ? (
          <div style={{ background:'rgba(0,0,0,.2)', borderRadius:'12px', padding:'16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', color:'#8b5cf6', fontWeight:'700', marginBottom:'12px' }}>SOS / TRACK 알림 수신자</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>프로파일 명</label>
                <input style={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="프로파일 이름" />
              </div>
              <div>
                <label style={lbl}>SOS 이메일</label>
                <input style={inp} type="email" value={form.sosEmail} onChange={e=>setForm(p=>({...p,sosEmail:e.target.value}))} placeholder="sos@example.com" />
              </div>
              <div>
                <label style={lbl}>SOS 카카오톡</label>
                <input style={inp} value={form.sosKakao} onChange={e=>setForm(p=>({...p,sosKakao:e.target.value}))} placeholder="카카오톡 ID" />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>TRACK 이메일 수신자</label>
                <input style={inp} type="email" value={form.trackEmail} onChange={e=>setForm(p=>({...p,trackEmail:e.target.value}))} placeholder="track@example.com" />
              </div>
            </div>

            {/* Messaging Hub */}
            <div style={{ borderTop:'1px solid rgba(139,92,246,.3)', paddingTop:'12px', marginTop:'8px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                <span style={{ fontSize:'11px', color:'#8b5cf6', fontWeight:'700' }}>MESSAGING HUB</span>
                <button onClick={() => setShowChannelForm(true)}
                  style={{ padding:'4px 12px', background:'rgba(139,92,246,.15)', border:'1px solid rgba(139,92,246,.4)', borderRadius:'6px', color:'#8b5cf6', fontSize:'10px', cursor:'pointer' }}>
                  + 채널 추가
                </button>
              </div>
              <div style={{ fontSize:'9px', color:'#4b6483', marginBottom:'8px' }}>Minimum SkyLink firmware version needed for this feature: 2.33</div>

              {showChannelForm && (
                <div style={{ background:'rgba(0,0,0,.3)', borderRadius:'8px', padding:'12px', marginBottom:'12px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                    <div><label style={lbl}>CHANNEL NAME</label><input style={inp} value={channelForm.channelName} onChange={e=>setChannelForm(p=>({...p,channelName:e.target.value}))} placeholder="channel_name" /></div>
                    <div><label style={lbl}>CHANNEL ID</label><input style={inp} value={channelForm.channelId} onChange={e=>setChannelForm(p=>({...p,channelId:e.target.value}))} placeholder="channelid" /></div>
                    <div><label style={lbl}>TTL</label><input style={inp} value={channelForm.ttl} onChange={e=>setChannelForm(p=>({...p,ttl:e.target.value}))} placeholder="ttl (초)" /></div>
                    <div>
                      <label style={lbl}>ENDPOINT (누른으로 추가)</label>
                      {channelForm.endpoints.map((ep, i) => (
                        <div key={i} style={{ display:'flex', gap:'6px', marginBottom:'4px' }}>
                          <input style={{...inp,flex:1}} value={ep} onChange={e=>{ const arr=[...channelForm.endpoints]; arr[i]=e.target.value; setChannelForm(p=>({...p,endpoints:arr})); }} placeholder="http://... or mailto:..." />
                          {i === channelForm.endpoints.length - 1 && (
                            <button onClick={() => setChannelForm(p=>({...p,endpoints:[...p.endpoints,'']}))}
                              style={{ padding:'0 10px', background:'rgba(0,212,240,.12)', border:'1px solid #00d4f0', borderRadius:'6px', color:'#00d4f0', cursor:'pointer' }}>+</button>
                          )}
                        </div>
                      ))}
                      <div style={{ fontSize:'8px', color:'#4b6483', marginTop:'4px', lineHeight:1.6 }}>
                        Supported URI schemes:<br/>
                        http · https · tcp · mailto
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                    <button onClick={() => setShowChannelForm(false)} style={{ padding:'5px 14px', background:'transparent', border:'1px solid rgba(255,255,255,.1)', borderRadius:'6px', color:'#6b8fae', cursor:'pointer', fontSize:'11px' }}>취소</button>
                    <button onClick={addChannel} style={{ padding:'5px 14px', background:'rgba(139,92,246,.2)', border:'1px solid rgba(139,92,246,.4)', borderRadius:'6px', color:'#8b5cf6', cursor:'pointer', fontSize:'11px', fontWeight:'700' }}>저장</button>
                  </div>
                </div>
              )}

              {/* 채널 목록 */}
              {form.channels.length > 0 && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'10px' }}>
                  <thead>
                    <tr style={{ background:'rgba(0,0,0,.3)' }}>
                      {['Channel ID','Name','Endpoints','TTL','Actions'].map(h=>(
                        <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'#6b8fae', fontFamily:"'JetBrains Mono', monospace", fontSize:'8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.channels.map((c,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid rgba(0,212,240,.05)' }}>
                        <td style={{ padding:'6px 10px', color:'#7dd3fc' }}>{c.channelId}</td>
                        <td style={{ padding:'6px 10px', color:'#e8f4ff' }}>{c.channelName}</td>
                        <td style={{ padding:'6px 10px', color:'#6b8fae' }}>{c.endpoints.filter(Boolean).join(', ')}</td>
                        <td style={{ padding:'6px 10px', color:'#6b8fae' }}>{c.ttl}</td>
                        <td style={{ padding:'6px 10px' }}>
                          <button onClick={() => setForm(p=>({...p,channels:p.channels.filter((_,j)=>j!==i)}))}
                            style={{ padding:'2px 8px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:'4px', color:'#ef4444', cursor:'pointer', fontSize:'9px' }}>삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'14px' }}>
              <button onClick={() => setShowForm(false)} style={{ padding:'7px 16px', background:'transparent', border:'1px solid rgba(255,255,255,.1)', borderRadius:'7px', color:'#6b8fae', cursor:'pointer', fontSize:'12px' }}>클리어</button>
              <button onClick={saveProfile} style={{ padding:'7px 20px', background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', border:'none', borderRadius:'7px', color:'#fff', fontWeight:'700', fontSize:'12px', cursor:'pointer' }}>알림 설정 저장</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ padding:'7px 16px', background:'rgba(139,92,246,.15)', border:'1px solid rgba(139,92,246,.4)', borderRadius:'8px', color:'#8b5cf6', fontSize:'12px', fontWeight:'700', cursor:'pointer', marginBottom:'16px' }}>
            + 프로파일 생성
          </button>
        )}

        {/* 프로파일 목록 */}
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
          <thead>
            <tr style={{ background:'rgba(0,0,0,.4)' }}>
              {['No','프로파일명','SOS Email','TRACK Email','Actions'].map(h=>(
                <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontFamily:"'JetBrains Mono', monospace", fontSize:'9px', color:'#6b8fae', borderBottom:'1px solid rgba(0,212,240,.18)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:'20px', textAlign:'center', color:'#6b8fae' }}>저장된 프로파일이 없습니다.</td></tr>
            ) : paged.map((p,i)=>(
              <tr key={p.id} style={{ borderBottom:'1px solid rgba(0,212,240,.05)' }}>
                <td style={{ padding:'8px 12px', color:'#4b6483' }}>{(page-1)*PER+i+1}</td>
                <td style={{ padding:'8px 12px', color:'#e8f4ff', fontWeight:'700' }}>{p.name}</td>
                <td style={{ padding:'8px 12px', color:'#6b8fae' }}>{p.sosEmail}</td>
                <td style={{ padding:'8px 12px', color:'#6b8fae' }}>{p.trackEmail}</td>
                <td style={{ padding:'8px 12px' }}>
                  <button onClick={() => deleteProfile(p.id)}
                    style={{ padding:'3px 10px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:'5px', color:'#ef4444', cursor:'pointer', fontSize:'10px' }}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display:'flex', gap:'4px', justifyContent:'center', marginTop:'10px' }}>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)}
                style={{ padding:'3px 8px', background:p===page?'#8b5cf6':'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.3)', borderRadius:'5px', color:p===page?'#fff':'#8b5cf6', cursor:'pointer', fontSize:'10px' }}>{p}</button>
            ))}
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'16px' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:'8px', border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'#6b8fae', cursor:'pointer', fontSize:'13px' }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   장비 설정 패널
══════════════════════════════════════ */
function DeviceSettingPanel({ device, onClose }) {
  const [settings, setSettings] = useState({
    mode:'C', event:'ON', timeSelect:'', timeInput:'00000',
    distSelect:'', distInput:'00000', canUse:false, canGps:false,
    canTime:'00000', canGpsTime:'00000', sosUse:false, recipient:'', geoService:false,
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [callDisabled, setCallDisabled] = useState(false);
  const [changed, setChanged] = useState(false);

  const set = (key, val) => { setSettings(p=>({...p,[key]:val})); setChanged(true); };

  const toggleStyle = (on) => ({
    padding:'5px 16px', borderRadius:'6px', border:`1px solid ${on?'rgba(16,185,129,.4)':'rgba(239,68,68,.4)'}`,
    background:on?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)',
    color:on?'#10b981':'#ef4444', cursor:'pointer', fontSize:'12px', fontWeight:'700',
  });

  const inp = { padding:'7px 10px', borderRadius:'6px', border:'1px solid rgba(0,212,240,.25)', background:'rgba(0,0,0,.3)', color:'#fff', fontSize:'12px', outline:'none', fontFamily:"'JetBrains Mono', monospace" };

  const handleSave = async () => {
    if (!changed) return;
    setSaving(true); setSaveStatus('saving');
    try {
      const cmd = `MODE(${settings.mode}),TIME(${settings.timeInput}),DIST(${settings.distInput}),Event(${settings.event}),CAN(${settings.canUse?'ON':'OFF'}),CAN-Time(${settings.canTime}),SOS(${settings.sosUse?'ON':'OFF'}),ADDR(${settings.recipient||'000000000000000'}),GEO(${settings.geoService?'ON':'OFF'})`;
      await api.post('/location/command', { imei: device.imei, text: cmd });
      setSaveStatus('waiting');
      // 10분 후 타임아웃
      setTimeout(() => { if (saveStatus === 'waiting') setSaveStatus('failed'); }, 600000);
      setChanged(false);
    } catch { setSaveStatus('failed'); }
    finally { setSaving(false); }
  };

  const handleCall = async (cmd) => {
    setCallDisabled(true);
    try { await api.post('/location/command', { imei: device.imei, text: cmd }); }
    catch {}
    setTimeout(() => setCallDisabled(false), 60000);
  };

  const rowStyle = { display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid rgba(0,212,240,.06)' };
  const lblStyle = { width:'200px', fontSize:'12px', color:'#a0b4c8', flexShrink:0 };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1a2d48', border:'1px solid rgba(0,212,240,.25)', borderRadius:'16px', width:'700px', maxHeight:'90vh', overflowY:'auto' }}>

        {/* 헤더 */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(0,212,240,.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', fontWeight:'700', color:'#00d4f0' }}>DEVICE SETTINGS</span>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontSize:'10px', color:'#6b8fae', fontFamily:"'JetBrains Mono', monospace" }}>IMEI: {device.imei} Type: {device.type}</span>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b8fae', cursor:'pointer', fontSize:'16px' }}>✕</button>
          </div>
        </div>

        {/* 설정 항목들 */}
        <div style={{ padding:'8px 0' }}>

          {/* Mode */}
          <div style={rowStyle}>
            <span style={lblStyle}>Mode</span>
            <select value={settings.mode} onChange={e=>set('mode',e.target.value)} style={{...inp,width:'160px'}}>
              <option value="C">CAR (C)</option>
              <option value="U">UAT (U)</option>
              <option value="T">UAV (T)</option>
            </select>
          </div>

          {/* Event */}
          <div style={rowStyle}>
            <span style={lblStyle}>Event</span>
            <select value={settings.event} onChange={e=>set('event',e.target.value)} style={{...inp,width:'100px'}}>
              <option value="ON">ON</option>
              <option value="OFF">OFF</option>
            </select>
          </div>

          {/* 주기 Time */}
          <div style={rowStyle}>
            <span style={lblStyle}>주기 Time <span style={{fontSize:'9px',color:'#4b6483'}}>(단위:분)</span></span>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <select value={settings.timeSelect} onChange={e=>{ set('timeSelect',e.target.value); if(e.target.value) set('timeInput',e.target.value); }} style={{...inp,width:'100px'}}>
                <option value="">-- 선택 --</option>
                {['00001','00005','00010','00030','00060'].map(v=><option key={v} value={v}>{parseInt(v)}분</option>)}
              </select>
              <input style={{...inp,width:'90px'}} value={settings.timeInput} maxLength={5}
                onChange={e=>set('timeInput',e.target.value.replace(/\D/g,'').padStart(5,'0').slice(-5))} />
              <span style={{fontSize:'10px',color:'#4b6483'}}>5자리</span>
            </div>
          </div>

          {/* 주기 Distance */}
          <div style={rowStyle}>
            <span style={lblStyle}>주기 Distance <span style={{fontSize:'9px',color:'#4b6483'}}>(단위:10m)</span></span>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <select value={settings.distSelect} onChange={e=>{ set('distSelect',e.target.value); if(e.target.value) set('distInput',e.target.value); }} style={{...inp,width:'100px'}}>
                <option value="">-- 선택 --</option>
                {['00010','00050','00100','00500','01000'].map(v=><option key={v} value={v}>{parseInt(v)*10}m</option>)}
              </select>
              <input style={{...inp,width:'90px'}} value={settings.distInput} maxLength={5}
                onChange={e=>set('distInput',e.target.value.replace(/\D/g,'').padStart(5,'0').slice(-5))} />
              <span style={{fontSize:'10px',color:'#4b6483'}}>5자리</span>
            </div>
          </div>

          {/* CAN 사용 여부 */}
          <div style={rowStyle}>
            <span style={lblStyle}>CAN 사용 여부</span>
            <button style={toggleStyle(settings.canUse)} onClick={()=>set('canUse',!settings.canUse)}>
              {settings.canUse?'ON':'OFF'}
            </button>
          </div>

          {/* CAN 사용여부 (CAN+GPS) */}
          <div style={rowStyle}>
            <span style={lblStyle}>CAN 사용여부 (CAN+GPS)</span>
            <button style={toggleStyle(settings.canGps)} onClick={()=>set('canGps',!settings.canGps)}>
              {settings.canGps?'ON':'OFF'}
            </button>
          </div>

          {/* CAN 시간 설정 */}
          <div style={rowStyle}>
            <span style={lblStyle}>CAN 시간 설정 <span style={{fontSize:'9px',color:'#4b6483'}}>(단위:분)</span></span>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <input style={{...inp,width:'90px'}} value={settings.canTime} maxLength={5}
                onChange={e=>set('canTime',e.target.value.replace(/\D/g,'').padStart(5,'0').slice(-5))} />
              <span style={{fontSize:'10px',color:'#4b6483'}}>5자리</span>
            </div>
          </div>

          {/* CAN+GPS 시간 설정 */}
          <div style={rowStyle}>
            <span style={lblStyle}>CAN+GPS 시간 설정 <span style={{fontSize:'9px',color:'#4b6483'}}>(단위:분)</span></span>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <input style={{...inp,width:'90px'}} value={settings.canGpsTime} maxLength={5}
                onChange={e=>set('canGpsTime',e.target.value.replace(/\D/g,'').padStart(5,'0').slice(-5))} />
              <span style={{fontSize:'10px',color:'#4b6483'}}>5자리</span>
            </div>
          </div>

          {/* SOS 사용 여부 */}
          <div style={rowStyle}>
            <span style={lblStyle}>SOS 사용 여부</span>
            <button style={toggleStyle(settings.sosUse)} onClick={()=>set('sosUse',!settings.sosUse)}>
              {settings.sosUse?'ON':'OFF'}
            </button>
          </div>

          {/* 수신처 */}
          <div style={rowStyle}>
            <span style={lblStyle}>수신처 <span style={{fontSize:'9px',color:'#4b6483'}}>(유닛코드/IMEI)</span></span>
            <input style={{...inp,width:'280px'}} value={settings.recipient}
              onChange={e=>set('recipient',e.target.value)} placeholder="상대방 유닛코드 또는 IMEI" />
          </div>

          {/* GEO Service */}
          <div style={rowStyle}>
            <span style={lblStyle}>GEO Service</span>
            <button style={toggleStyle(settings.geoService)} onClick={()=>set('geoService',!settings.geoService)}>
              {settings.geoService?'ON':'OFF'}
            </button>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(0,212,240,.1)', display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={handleSave} disabled={!changed || saving}
            style={{ padding:'9px 24px', borderRadius:'8px', border:'none', background:changed?'linear-gradient(135deg,#00d4f0,#0891b2)':'rgba(255,255,255,.07)', color:changed?'#0d1628':'rgba(255,255,255,.2)', fontWeight:'700', fontSize:'12px', cursor:changed?'pointer':'not-allowed', transition:'all .2s' }}>
            💾 모든 설정 저장
          </button>
          <span style={{ fontSize:'10px', color:'#6b8fae' }}>※ ACK 수신시까지 최대 10분 대기</span>
          {saveStatus === 'waiting' && <span style={{ fontSize:'11px', color:'#f59e0b', animation:'sosBlink 1s infinite' }}>⏳ 대기 중...</span>}
          {saveStatus === 'failed' && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'11px', color:'#ef4444' }}>❌ 실패</span>
              <button onClick={handleSave} style={{ padding:'5px 12px', background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', borderRadius:'6px', color:'#ef4444', fontSize:'10px', cursor:'pointer' }}>재전송</button>
            </div>
          )}
          {saveStatus === 'success' && <span style={{ fontSize:'11px', color:'#10b981' }}>✅ 성공</span>}
        </div>

        {/* Device Call */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(0,212,240,.1)' }}>
          <div style={{ fontSize:'11px', color:'#f59e0b', fontWeight:'700', marginBottom:'8px' }}>
            DEVICE CALL <span style={{ fontSize:'9px', color:'#6b8fae', fontWeight:'400' }}>※ 클릭 후 1분간 전체 비활성화</span>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {[
              { label:'CAN-Call', cmd:'CAN', desc:'CAN 1회' },
              { label:'can-Call', cmd:'can', desc:'CAN+GPS' },
              { label:'CAR-Call', cmd:'CAR', desc:'CAR 1회' },
              { label:'UAV-Call', cmd:'UAV', desc:'UAV 1회' },
              { label:'UAT-Call', cmd:'UAT', desc:'UAT 1회' },
              { label:'VER-Call', cmd:'VER', desc:'VER 호출' },
            ].map(b=>(
              <div key={b.cmd} style={{ textAlign:'center' }}>
                <button onClick={() => handleCall(b.cmd)} disabled={callDisabled}
                  style={{ padding:'6px 14px', borderRadius:'7px', border:`1px solid ${b.cmd==='VER'?'rgba(0,212,240,.5)':'rgba(255,255,255,.15)'}`, background:b.cmd==='VER'?'rgba(0,212,240,.12)':'rgba(255,255,255,.05)', color:b.cmd==='VER'?'#00d4f0':'#e8f4ff', cursor:callDisabled?'not-allowed':'pointer', fontSize:'11px', fontWeight:'700', opacity:callDisabled?0.4:1 }}>
                  {b.label}
                </button>
                <div style={{ fontSize:'8px', color:'#4b6483', marginTop:'2px' }}>{b.desc}</div>
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
function GeoFencePanel({ devices, onClose }) {
  const [geoOn, setGeoOn] = useState(false);
  const [mode, setMode] = useState('DEF1');
  const [interval, setIntervalVal] = useState('S010');
  const [intervalT, setIntervalT] = useState('T010');
  const [points, setPoints] = useState([]);
  const [selectedGeo, setSelectedGeo] = useState(null);
  const [geoList, setGeoList] = useState(['GEO-1','GEO-2','GEO-3','GEO-4','GEO-5']);
  const [activeGeo, setActiveGeo] = useState(null);
  const [mapCenter] = useState({ lat: 37.5, lon: 127.0 });

  const MAX_POINTS = 8;
  const canvasW = 560;
  const canvasH = 340;

  // 위경도 → 캔버스 좌표
  const latRange = [37.3, 37.7];
  const lonRange = [126.7, 127.3];
  const toCanvas = (lat, lon) => ({
    x: ((lon - lonRange[0]) / (lonRange[1] - lonRange[0])) * canvasW,
    y: canvasH - ((lat - latRange[0]) / (latRange[1] - latRange[0])) * canvasH,
  });
  const fromCanvas = (x, y) => ({
    lat: latRange[0] + ((canvasH - y) / canvasH) * (latRange[1] - latRange[0]),
    lon: lonRange[0] + (x / canvasW) * (lonRange[1] - lonRange[0]),
  });

  const handleCanvasClick = (e) => {
    if (points.length >= MAX_POINTS) { alert(`최대 ${MAX_POINTS}개까지 추가 가능합니다.`); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { lat, lon } = fromCanvas(x, y);
    setPoints(p => [...p, { lat: parseFloat(lat.toFixed(6)), lon: parseFloat(lon.toFixed(6)) }]);
  };

  const fillColor = mode === 'DEF1' ? 'rgba(16,185,129,0.2)' : mode === 'DEF2' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)';
  const strokeColor = mode === 'DEF1' ? '#10b981' : mode === 'DEF2' ? '#ef4444' : '#3b82f6';

  // 프리뷰 커맨드
  const buildCommand = () => {
    if (!geoOn || points.length < 3) return '— 포트 3개 이상 추가 후 생성됩니다 —';
    const n = points.length;
    const coords = points.map((p,i) => `${n}-${i+1},${p.lat},${p.lon}`).join(',');
    const intervals = mode === 'DEF1' ? interval : mode === 'DEF2' ? intervalT : `${interval},${intervalT}`;
    return `'G1,${mode},${intervals},${n},${coords}'`;
  };

  const handleSend = async () => {
    if (!geoOn) { alert('GEO ON 상태에서만 전송 가능합니다.'); return; }
    if (points.length < 3) { alert('최소 3개 좌표가 필요합니다.'); return; }
    const cmd = `FF FF 7E ${buildCommand()} FF FF FE 00 00`;
    try {
      // 선택된 장비에 전송
      alert(`전송 준비: ${cmd}`);
    } catch {}
  };

  const INTERVAL_OPTIONS = [
    { value:'S001', label:'S001 - 1분' }, { value:'S005', label:'S005 - 5분' },
    { value:'S010', label:'S010 - 10분' }, { value:'S030', label:'S030 - 30분' },
  ];
  const INTERVAL_T_OPTIONS = [
    { value:'T001', label:'T001 - 1분' }, { value:'T005', label:'T005 - 5분' },
    { value:'T010', label:'T010 - 10분' }, { value:'T030', label:'T030 - 30분' },
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#0d1628', border:'1px solid rgba(0,212,240,.25)', borderRadius:'16px', width:'900px', maxHeight:'95vh', overflowY:'auto' }}>

        {/* 헤더 */}
        <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(0,212,240,.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:geoOn?'#10b981':'#ef4444', display:'inline-block' }} />
            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', fontWeight:'700', color:'#00d4f0' }}>GEO FENCE CONFIGURATION</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'10px', color:'#6b8fae' }}>Device: {selectedGeo || '—'}</span>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b8fae', cursor:'pointer', fontSize:'16px' }}>✕</button>
          </div>
        </div>

        {/* 컨트롤 바 */}
        <div style={{ padding:'10px 20px', borderBottom:'1px solid rgba(0,212,240,.1)', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          <button onClick={() => setGeoOn(true)}
            style={{ padding:'5px 14px', borderRadius:'7px', border:'none', background:geoOn?'#10b981':'rgba(16,185,129,.15)', color:geoOn?'#fff':'#10b981', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
            G1 ON
          </button>
          <button onClick={() => setGeoOn(false)}
            style={{ padding:'5px 14px', borderRadius:'7px', border:'none', background:!geoOn?'#ef4444':'rgba(239,68,68,.15)', color:!geoOn?'#fff':'#ef4444', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
            G2 OFF
          </button>

          <span style={{ color:'#4b6483', fontSize:'10px' }}>MODE</span>
          {['DEF1','DEF2','DEF3'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding:'5px 12px', borderRadius:'7px', border:'none', background:mode===m?(m==='DEF1'?'#10b981':m==='DEF2'?'#ef4444':'#3b82f6'):'rgba(255,255,255,.07)', color:mode===m?'#fff':'#6b8fae', fontSize:'10px', fontWeight:'700', cursor:'pointer' }}>
              {m === 'DEF1' ? 'DEF1 IN' : m === 'DEF2' ? 'DEF2 OUT' : 'DEF3 BOTH'}
            </button>
          ))}

          <span style={{ color:'#4b6483', fontSize:'10px' }}>INTERVAL</span>
          {(mode === 'DEF1' || mode === 'DEF3') && (
            <select value={interval} onChange={e=>setIntervalVal(e.target.value)}
              style={{ padding:'4px 8px', background:'#1a2d48', border:'1px solid rgba(0,212,240,.2)', borderRadius:'6px', color:'#00d4f0', fontSize:'10px', outline:'none' }}>
              {INTERVAL_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {(mode === 'DEF2' || mode === 'DEF3') && (
            <select value={intervalT} onChange={e=>setIntervalT(e.target.value)}
              style={{ padding:'4px 8px', background:'#1a2d48', border:'1px solid rgba(0,212,240,.2)', borderRadius:'6px', color:'#00d4f0', fontSize:'10px', outline:'none' }}>
              {INTERVAL_T_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </div>

        {/* 본문 */}
        <div style={{ display:'flex', gap:'0' }}>

          {/* 캔버스 영역 */}
          <div style={{ flex:1, padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
              <span style={{ fontSize:'10px', color:'#6b8fae', fontFamily:"'JetBrains Mono', monospace" }}>
                DRAWING AREA {points.length} / {MAX_POINTS} pts &nbsp;
                <span style={{ color:'#4b6483' }}>클릭으로 꼭짓점 추가 (최소 3개, 최대 {MAX_POINTS}개)</span>
              </span>
              <div style={{ display:'flex', gap:'6px' }}>
                <button onClick={() => setPoints(p=>p.slice(0,-1))}
                  style={{ padding:'4px 10px', background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'5px', color:'#f59e0b', fontSize:'10px', cursor:'pointer' }}>
                  ↩ Undo
                </button>
                <button onClick={() => setPoints([])}
                  style={{ padding:'4px 10px', background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', borderRadius:'5px', color:'#ef4444', fontSize:'10px', cursor:'pointer' }}>
                  ✕ Clear
                </button>
              </div>
            </div>

            {/* 캔버스 */}
            <div style={{ position:'relative', border:'1px solid rgba(0,212,240,.2)', borderRadius:'8px', overflow:'hidden', background:'#0a1628', cursor:'crosshair' }}>
              <svg width={canvasW} height={canvasH} onClick={handleCanvasClick} style={{ display:'block' }}>
                {/* 격자선 */}
                {Array.from({length:7},(_,i)=>(
                  <g key={i}>
                    <line x1={0} y1={i*(canvasH/6)} x2={canvasW} y2={i*(canvasH/6)} stroke="rgba(0,212,240,0.08)" strokeWidth="1" />
                    <line x1={i*(canvasW/6)} y1={0} x2={i*(canvasW/6)} y2={canvasH} stroke="rgba(0,212,240,0.08)" strokeWidth="1" />
                  </g>
                ))}
                {/* 위경도 눈금 */}
                {[0,1,2,3,4].map(i=>{
                  const lat = latRange[0] + i*(latRange[1]-latRange[0])/4;
                  const lon = lonRange[0] + i*(lonRange[1]-lonRange[0])/4;
                  const y = canvasH - (i/4)*canvasH;
                  const x = (i/4)*canvasW;
                  return (
                    <g key={i}>
                      <text x={4} y={y-4} fill="rgba(0,212,240,0.4)" fontSize="9">{lat.toFixed(1)}°N</text>
                      <text x={x+2} y={canvasH-4} fill="rgba(0,212,240,0.4)" fontSize="9">{lon.toFixed(1)}°E</text>
                    </g>
                  );
                })}

                {/* 폴리곤 */}
                {points.length >= 3 && (
                  <polygon
                    points={points.map(p=>{ const c=toCanvas(p.lat,p.lon); return `${c.x},${c.y}`; }).join(' ')}
                    fill={fillColor} stroke={strokeColor} strokeWidth="2" strokeDasharray="none"
                  />
                )}

                {/* 연결선 */}
                {points.length >= 2 && points.map((p,i)=>{
                  if(i===0) return null;
                  const c1=toCanvas(points[i-1].lat,points[i-1].lon);
                  const c2=toCanvas(p.lat,p.lon);
                  return <line key={i} x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4,3" />;
                })}

                {/* 포인트 */}
                {points.map((p,i)=>{
                  const c=toCanvas(p.lat,p.lon);
                  return (
                    <g key={i}>
                      <circle cx={c.x} cy={c.y} r={6} fill={strokeColor} stroke="#fff" strokeWidth="1.5" />
                      <text x={c.x+9} y={c.y-6} fill="#fff" fontSize="9" fontWeight="bold">{i+1}</text>
                      <text x={c.x+9} y={c.y+6} fill="rgba(255,255,255,0.6)" fontSize="8">{p.lat.toFixed(4)},{p.lon.toFixed(4)}</text>
                    </g>
                  );
                })}
              </svg>
              {/* 하단 정보 바 */}
              <div style={{ padding:'4px 10px', background:'rgba(0,0,0,.5)', display:'flex', gap:'12px', fontSize:'8px', color:'#4b6483', fontFamily:"'JetBrains Mono', monospace" }}>
                <span>WGS84</span>
                <span>위경도 기준</span>
                <span>꼭짓점 추가 (최소 3개, 최대 {MAX_POINTS}개)</span>
                <span>교차 선분 불가</span>
                <span>GEO 슬롯 저장 후 전송</span>
              </div>
            </div>
          </div>

          {/* 우측 패널 */}
          <div style={{ width:'280px', borderLeft:'1px solid rgba(0,212,240,.1)', padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>

            {/* 좌표 목록 */}
            <div>
              <div style={{ fontSize:'10px', color:'#00d4f0', fontWeight:'700', marginBottom:'8px', letterSpacing:'1px' }}>COORDINATE LIST</div>
              {points.length === 0 ? (
                <div style={{ fontSize:'10px', color:'#4b6483', textAlign:'center', padding:'12px' }}>지도를 클릭하여 꼭짓점을 추가하세요</div>
              ) : (
                <div style={{ maxHeight:'120px', overflowY:'auto' }}>
                  {points.map((p,i)=>(
                    <div key={i} style={{ fontSize:'9px', color:'#6b8fae', fontFamily:"'JetBrains Mono', monospace", padding:'3px 0', borderBottom:'1px solid rgba(0,212,240,.05)' }}>
                      {i+1}. {p.lat.toFixed(6)}, {p.lon.toFixed(6)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GEO 슬롯 */}
            <div>
              <div style={{ fontSize:'10px', color:'#00d4f0', fontWeight:'700', marginBottom:'8px', letterSpacing:'1px' }}>GEO-SETTING 목록 (저장 순번 1-5)</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'6px' }}>
                {geoList.map(g=>(
                  <button key={g} onClick={()=>setActiveGeo(activeGeo===g?null:g)}
                    style={{ padding:'5px 10px', borderRadius:'6px', border:`1px solid ${activeGeo===g?'#00d4f0':'rgba(0,212,240,.2)'}`, background:activeGeo===g?'rgba(0,212,240,.15)':'rgba(0,0,0,.3)', color:activeGeo===g?'#00d4f0':'#6b8fae', fontSize:'10px', fontWeight:'700', cursor:'pointer' }}>
                    {g}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:'9px', color:'#4b6483', lineHeight:1.6 }}>
                슬롯을 선택하면 저장된 폴리곤이 표시됩니다.<br/>
                ※ 최대 8개 꼭짓점 — 활성화 된 상태에서만 전송 가능
              </div>
            </div>

            {/* Command Preview */}
            <div>
              <div style={{ fontSize:'10px', color:'#00d4f0', fontWeight:'700', marginBottom:'8px', letterSpacing:'1px' }}>COMMAND PREVIEW</div>
              <div style={{ background:'rgba(0,0,0,.4)', border:'1px solid rgba(0,212,240,.15)', borderRadius:'6px', padding:'10px', fontSize:'9px', color:'#6b8fae', fontFamily:"'JetBrains Mono', monospace", lineHeight:1.6, minHeight:'60px', wordBreak:'break-all' }}>
                {buildCommand()}
              </div>
            </div>

            {/* Frame Structure */}
            <div>
              <div style={{ fontSize:'9px', color:'#4b6483', fontFamily:"'JetBrains Mono', monospace", lineHeight:1.8 }}>
                FRAME STRUCTURE<br/>
                <span style={{ color:'#6b8fae' }}>FF FF 7E</span><br/>
                <span style={{ color:'#a78bfa' }}>'G[1|2],DEF[1|2|3],S[interval],N,coords...'</span> <span style={{ color:'#6b8fae' }}>FF FF FE 00 00</span><br/>
                <span style={{ color:'#4b6483' }}>G1=ON G2=OFF · DEF1=IN DEF2=OUT DEF3=BOTH ·<br/>S010=10분 S005=5분 S001=1분 S030=30분</span>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(0,212,240,.1)', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <button onClick={async () => {
            if (!activeGeo) { alert('GEO 슬롯을 선택해주세요.'); return; }
            // 저장 로직
            alert(`${activeGeo}에 저장 완료!`);
          }}
            style={{ padding:'9px 24px', borderRadius:'8px', border:'1px solid rgba(0,212,240,.3)', background:'rgba(0,212,240,.1)', color:'#00d4f0', fontWeight:'700', fontSize:'12px', cursor:'pointer' }}>
            💾 저장
          </button>
          <button onClick={handleSend}
            style={{ padding:'9px 24px', borderRadius:'8px', border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontWeight:'700', fontSize:'12px', cursor:'pointer' }}>
            ▶ 전송
          </button>
        </div>
      </div>
    </div>
  );
}