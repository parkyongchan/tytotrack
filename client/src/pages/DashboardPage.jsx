import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';
import MapView from '../components/MapView';
import TextViewLocation from './TextViewLocation';
import UsersPage from './UsersPage';
import ChatRoom from './ChatRoom';
import TextViewData from './TextViewData';
import DevicesPage from './DevicesPage';
import ShareSettings from './ShareSettings';

export default function DashboardPage({ user, onLogout }) {
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activePage, setActivePage] = useState('dash');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.content || []);
    } catch (err) { console.error('장비 조회 실패:', err); }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get('/location/latest');
      const data = res.data;
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) { setLocations([]); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchLocations();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => fetchLocations(), 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLocations]);

  const devicesWithLocation = devices.map(d => {
    const loc = locations.find(l => l.imei === d.imei);
    if (loc && loc.position) {
      const parts = loc.position.split(',');
      return { ...d, lat: parseFloat(parts[0]), lon: parseFloat(parts[1]), heading: parseFloat(parts[2]) || 0, speed: parseFloat(parts[3]) || 0, lastUpdate: loc.regDate, eventcode: loc.eventcode };
    }
    return d;
  });

  const menuItems = [
    { id: 'dash',    icon: '📡', label: 'Map View' },
    { id: 'chat',    icon: '💬', label: 'Chat Room' },
    { id: 'tvloc',   icon: '📍', label: 'Text View (Location)' },
    { id: 'tvdata',  icon: '📊', label: 'Text View (Data)' },
    { id: 'devices', icon: '⚙️', label: 'Device Settings' },
    { id: 'share',   icon: '🔗', label: 'Share Settings' },
    { id: 'users',   icon: '👤', label: 'Users' },
  ];

  const sosCount = devicesWithLocation.filter(d => d.eventcode === '4').length;

  const handleMenuClick = (id) => {
    setActivePage(id);
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d1628', color: '#e8f4ff', fontFamily: "'Syne', sans-serif" }}>

      {/* ── 헤더 ── */}
      <header style={{ height: '58px', background: 'rgba(13,22,40,.97)', borderBottom: '1px solid rgba(0,212,240,.18)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '10px', flexShrink: 0, zIndex: 1000 }}>

        {/* 햄버거 버튼 (모바일) */}
        <button onClick={() => setSidebarOpen(p => !p)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: sidebarOpen ? 'rgba(239,68,68,.12)' : 'rgba(0,212,240,.1)', border: `1px solid ${sidebarOpen ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.3)'}`, borderRadius: '9px', cursor: 'pointer', flexShrink: 0 }}
          className="mob-only">
          <span style={{ fontSize: '18px' }}>{sidebarOpen ? '✕' : '☰'}</span>
        </button>

        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#00d4f0,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🛰️</div>
          <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: '700', letterSpacing: '2px', color: '#fff', fontSize: '13px' }}>TYTO<span style={{ color: '#00d4f0' }}>TRACK</span></span>
        </div>

        <div style={{ flex: 1 }} />

        {/* 배지 (PC) */}
        <div style={{ display: 'flex', gap: '6px' }} className="pc-only">
          {[
            { label: '사용 장비', value: devices.length, color: '#3b82f6', blink: false },
            { label: '사용자', value: users.length, color: '#00d4f0', blink: false },
            { label: '작동중', value: devicesWithLocation.filter(d => d.lat).length, color: '#10b981', blink: false },
            { label: 'SOS', value: sosCount, color: '#ef4444', blink: sosCount > 0 },
          ].map((badge, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: badge.blink ? 'rgba(239,68,68,.08)' : 'rgba(255,255,255,.04)', border: `1px solid ${badge.blink ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.18)'}`, borderRadius: '8px', padding: '4px 10px', fontSize: '10px', color: '#6b8fae', animation: badge.blink ? 'sosBlink 1s ease-in-out infinite' : 'none' }}>
              <span>{badge.label}</span>
              <span style={{ fontWeight: '700', fontSize: '12px', color: badge.color }}>{badge.value}</span>
            </div>
          ))}
        </div>

        {/* SOS 배지만 모바일에 표시 */}
        {sosCount > 0 && (
          <div className="mob-only" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', color: '#ef4444', animation: 'sosBlink 1s ease-in-out infinite' }}>
            SOS <span style={{ fontWeight: '700' }}>{sosCount}</span>
          </div>
        )}

        {/* AUTO 토글 */}
        <div onClick={() => setAutoRefresh(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: autoRefresh ? 'rgba(0,212,240,.1)' : 'rgba(255,255,255,.04)', border: `1px solid ${autoRefresh ? 'rgba(0,212,240,.3)' : 'rgba(255,255,255,.1)'}`, borderRadius: '8px', padding: '4px 10px', fontSize: '10px', color: autoRefresh ? '#00d4f0' : '#6b8fae', flexShrink: 0 }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: autoRefresh ? '#00d4f0' : '#6b8fae' }} />
          <span className="pc-only">AUTO </span>{autoRefresh ? 'ON' : 'OFF'}
        </div>

        {/* 사용자 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '8px', padding: '4px 12px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'rgba(232,244,255,.7)' }} className="pc-only">{user.name}</span>
          <button onClick={onLogout} style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', color: '#ef4444', cursor: 'pointer' }}>
            로그아웃
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* ── 모바일 오버레이 ── */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 150 }}
            className="mob-only" />
        )}

        {/* ── 사이드바 ── */}
        <aside style={{
          width: '220px', flexShrink: 0,
          background: 'linear-gradient(180deg,#192d48 0%,#0d1628 100%)',
          borderRight: '1px solid rgba(0,212,240,.18)',
          display: 'flex', flexDirection: 'column',
          position: 'relative', zIndex: 160,
          // 모바일: absolute + 슬라이드
          transition: 'transform .3s cubic-bezier(0.16,1,0.3,1)',
        }}
          className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>

          <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
            {menuItems.map(item => (
              <div key={item.id} onClick={() => handleMenuClick(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '12px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: activePage === item.id ? '#00d4f0' : 'rgba(240,248,255,.5)', background: activePage === item.id ? 'rgba(0,212,240,.1)' : 'transparent', borderLeft: activePage === item.id ? '3px solid #00d4f0' : '3px solid transparent', transition: 'all .2s' }}>
                <span style={{ fontSize: '17px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>

          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(0,212,240,.18)' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '2px', color: 'rgba(240,248,255,.4)', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>SYSTEM STATUS</div>
            {[
              { label: 'Switch',     status: 'ok',   text: 'Normal' },
              { label: 'Satellite',  status: 'ok',   text: 'Normal' },
              { label: 'IMT',        status: 'warn', text: 'Checking' },
              { label: 'SOS Active', status: sosCount > 0 ? 'err' : 'ok', text: String(sosCount) },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(240,248,255,.7)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.status === 'ok' ? '#10b981' : s.status === 'warn' ? '#f59e0b' : '#ef4444', boxShadow: `0 0 6px ${s.status === 'ok' ? '#10b981' : s.status === 'warn' ? '#f59e0b' : '#ef4444'}` }} />
                  <span>{s.label}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: s.status === 'ok' ? '#10b981' : s.status === 'warn' ? '#f59e0b' : '#ef4444' }}>{s.text}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── 메인 콘텐츠 ── */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative' }}>
          {activePage === 'dash' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'min(340px, 38%) 1fr', gridTemplateRows: '1fr 160px', gap: '8px', padding: '8px', flex: 1, overflow: 'hidden' }}
              className="dash-grid">
              <DevicePanel devices={devicesWithLocation} onRefresh={() => { fetchDevices(); fetchLocations(); }} />

              {/* 지도 */}
              <div style={{ background: 'rgba(13,26,46,.85)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', overflow: 'hidden' }}>
                <MapView devices={devicesWithLocation} />
              </div>

              {/* 이벤트 로그 */}
              <div style={{ background: 'rgba(14,26,46,.97)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '7px 13px', borderBottom: '1px solid rgba(0,212,240,.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>EVENT LOG</span>
                  <span style={{ fontSize: '10px', color: '#6b8fae' }}>{locations.length}건</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '55px 65px 1fr 80px', padding: '3px 13px', background: 'rgba(0,0,0,.2)', flexShrink: 0 }}>
                  {['Type', 'IMEI', 'Alias', 'Time'].map(h => (
                    <span key={h} style={{ fontSize: '8px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', color: '#4b6483', fontWeight: '700' }}>{h}</span>
                  ))}
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {locations.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: '#6b8fae', fontSize: '12px' }}>이벤트 없음</div>
                  ) : locations.slice(0, 20).map((l, i) => {
                    const isSOS = l.eventcode === '4';
                    const typeColor = isSOS ? '#ef4444' : '#60a5fa';
                    const typeBg = isSOS ? 'rgba(239,68,68,.15)' : 'rgba(59,130,246,.15)';
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '55px 65px 1fr 80px', padding: '4px 13px', borderBottom: '1px solid rgba(0,212,240,.05)', alignItems: 'center', animation: isSOS ? 'sosBlink 1.5s ease-in-out infinite' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: '8px', fontWeight: '700', padding: '2px 4px', borderRadius: '3px', background: typeBg, color: typeColor, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>
                          {isSOS ? 'SOS' : l.title || 'TRACK'}
                        </span>
                        <span style={{ fontSize: '9px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.imei?.slice(-8)}
                        </span>
                        <span style={{ fontSize: '10px', color: '#e8f4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.imei}</span>
                        <span style={{ fontSize: '9px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>
                          {l.regDate?.slice(8,10)}:{l.regDate?.slice(10,12)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activePage === 'devices' && <DevicesPage devices={devicesWithLocation} onRefresh={fetchDevices} />}
          {activePage === 'tvloc' && <TextViewLocation devices={devices} />}
          {activePage === 'chat' && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ChatRoom user={user} />
            </div>
          )}
          {activePage === 'tvdata' && <TextViewData devices={devices} />}
          {activePage === 'users' && <UsersPage />}
          {activePage === 'share' && <ShareSettings devices={devices} />}

          {activePage !== 'dash' && activePage !== 'devices' && activePage !== 'tvloc' && activePage !== 'users' && activePage !== 'chat' && activePage !== 'tvdata' && activePage !== 'share' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#6b8fae' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
                <div style={{ fontSize: '16px', fontWeight: '700' }}>개발 중...</div>
                <div style={{ fontSize: '13px', marginTop: '8px' }}>{menuItems.find(m => m.id === activePage)?.label}</div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── 반응형 CSS ── */}
      <style>{`
        @keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        html, body, #root { height: 100dvh !important; overflow: hidden !important; }
        .chat-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; max-height: 100%; }

        /* PC 기본 */
        .mob-only { display: none !important; }
        .pc-only { display: flex !important; }
        .sidebar { position: relative; transform: none; }

        /* 모바일 (768px 이하) */
        @media (max-width: 768px) {
          .mob-only { display: flex !important; }
          .pc-only { display: none !important; }
          .sidebar {
            position: fixed !important;
            top: 58px !important;
            left: 0 !important;
            bottom: 0 !important;
            transform: translateX(-100%) !important;
            z-index: 160 !important;
            box-shadow: 4px 0 24px rgba(0,0,0,.5) !important;
          }
          .sidebar.sidebar-open {
            transform: translateX(0) !important;
          }
          .dash-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: 300px 1fr 120px !important;
          }
        }

        /* 태블릿 (769px ~ 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .dash-grid {
            grid-template-columns: 260px 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function DevicePanel({ devices, onRefresh }) {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const PER_PAGE = 30;

  const tabs = [
    { id: 'all',   label: 'All',     color: '#6b8fae' },
    { id: 'track', label: 'Track',   color: '#3b82f6' },
    { id: 'sos',   label: 'SOS',     color: '#ef4444' },
    { id: 'msg',   label: 'Message', color: '#10b981' },
    { id: 'can',   label: 'CAN',     color: '#8b5cf6' },
    { id: 'event', label: 'Event',   color: '#f59e0b' },
  ];

  const filtered = devices.filter(d => {
    const matchSearch = !search ||
      d.imei?.includes(search) ||
      d.alias?.toLowerCase().includes(search.toLowerCase()) ||
      d.type?.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      activeTab === 'all' ? true :
      activeTab === 'sos' ? d.eventcode === '4' :
      activeTab === 'track' ? d.eventcode !== '4' : true;
    return matchSearch && matchTab;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div style={{ background: 'rgba(14,26,46,.97)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gridRow: 'span 2' }}>

      <div style={{ padding: '9px 13px', borderBottom: '1px solid rgba(0,212,240,.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>DEVICE LIST</span>
        <button onClick={onRefresh} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#00d4f0', cursor: 'pointer' }}>↻</button>
      </div>

      {/* 날짜 범위 */}
      <div style={{ padding: '7px 13px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', gap: '6px', alignItems: 'center' }}>
        {[{ label: startDate || 'Start', show: showStartPicker, setShow: setShowStartPicker, value: startDate, setValue: setStartDate, side: 'left' },
          { label: endDate || 'End', show: showEndPicker, setShow: setShowEndPicker, value: endDate, setValue: setEndDate, side: 'right' }
        ].map((picker, i) => (
          <div key={i} style={{ position: 'relative', flex: 1 }}>
            <button onClick={() => picker.setShow(p => !p)}
              style={{ width: '100%', padding: '5px 8px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,212,240,.25)', borderRadius: '6px', color: picker.value ? '#00d4f0' : '#6b8fae', fontSize: '10px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textAlign: 'left' }}>
              {picker.label}
            </button>
            {picker.show && (
              <div style={{ position: 'absolute', top: '100%', [picker.side]: 0, zIndex: 200, background: '#1a2d48', border: '1px solid rgba(0,212,240,.3)', borderRadius: '8px', padding: '10px', marginTop: '4px', width: '200px' }}>
                <input type="datetime-local" value={picker.value}
                  onChange={e => { picker.setValue(e.target.value); picker.setShow(false); }}
                  style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '6px', padding: '6px', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={() => { picker.setValue(''); picker.setShow(false); }}
                  style={{ marginTop: '6px', width: '100%', padding: '4px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>초기화</button>
              </div>
            )}
          </div>
        ))}
        <span style={{ color: '#6b8fae', fontSize: '10px' }}>~</span>
      </div>

      {/* 검색 */}
      <div style={{ padding: '6px 13px', borderBottom: '1px solid rgba(0,212,240,.1)' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="🔍 IMEI / Alias / Type"
          style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '7px', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* 탭 */}
      <div style={{ padding: '5px 13px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setPage(1); }}
            style={{ padding: '3px 8px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '9px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", background: activeTab === t.id ? t.color : 'rgba(255,255,255,.06)', color: activeTab === t.id ? '#fff' : '#6b8fae', transition: 'all .2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {paged.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b8fae', fontSize: '12px' }}>
            {search ? '검색 결과 없음' : '등록된 장비가 없습니다'}
          </div>
        ) : paged.map(d => (
          <div key={d.id} style={{ padding: '10px 13px', borderBottom: '1px solid rgba(0,212,240,.08)', cursor: 'pointer', background: d.eventcode === '4' ? 'rgba(239,68,68,.05)' : 'transparent', animation: d.eventcode === '4' ? 'sosBlink 1.5s ease-in-out infinite' : 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = d.eventcode === '4' ? 'rgba(239,68,68,.1)' : 'rgba(0,212,240,.04)'}
            onMouseLeave={e => e.currentTarget.style.background = d.eventcode === '4' ? 'rgba(239,68,68,.05)' : 'transparent'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
              <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: d.eventcode === '4' ? 'rgba(239,68,68,.2)' : 'rgba(59,130,246,.15)', color: d.eventcode === '4' ? '#ef4444' : '#60a5fa', fontFamily: "'JetBrains Mono', monospace" }}>
                {d.eventcode === '4' ? 'SOS' : 'TRACK'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{d.alias}</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#6b8fae', marginBottom: '2px' }}>{d.imei}</div>
            {d.lat && (
              <div style={{ fontSize: '10px', color: '#6b8fae', display: 'flex', gap: '8px' }}>
                <span><span style={{ color: '#00d4f0' }}>LAT</span> {d.lat?.toFixed(4)}</span>
                <span><span style={{ color: '#00d4f0' }}>LON</span> {d.lon?.toFixed(4)}</span>
                {d.speed > 0 && <span><span style={{ color: '#10b981' }}>⚡</span> {d.speed}kn</span>}
              </div>
            )}
            {d.lastUpdate && (
              <div style={{ fontSize: '9px', color: '#4b6483', marginTop: '2px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                {d.lastUpdate.slice(0,4)}-{d.lastUpdate.slice(4,6)}-{d.lastUpdate.slice(6,8)} {d.lastUpdate.slice(8,10)}:{d.lastUpdate.slice(10,12)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ padding: '7px 13px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length}건 {page}/{totalPages}p
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '11px', opacity: page === 1 ? 0.3 : 1 }}>‹</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '11px', opacity: page === totalPages ? 0.3 : 1 }}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}