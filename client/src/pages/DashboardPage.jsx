import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';
import MapView from '../components/MapView';
import TextViewLocation from './TextViewLocation';
import UsersPage from './UsersPage';
import ChatRoom from './ChatRoom';
import TextViewData from './TextViewData';
import DevicesPage from './DevicesPage';
import ShareSettings from './ShareSettings';
import TrackViewPopup from './TrackViewPopup';

export default function DashboardPage({ user, onLogout }) {
  const [devices, setDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activePage, setActivePage] = useState('dash');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mapPoints, setMapPoints] = useState([]);
  const [trackDevice, setTrackDevice] = useState(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.content || []);
    } catch (err) { console.error('장비 조회 실패:', err); }
  }, []);

  const fetchAllDevices = useCallback(async () => {
    try {
      const res = await api.get('/devices/all');
      setAllDevices(Array.isArray(res.data) ? res.data : []);
    } catch (_) { /* alias 조회 실패 무시 */ }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get('/location/latest');
      const data = res.data;
      setLocations(Array.isArray(data) ? data : []);
    } catch (_) { setLocations([]); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (_) { /* 무시 */ }
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchAllDevices();
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

  const sosCount = devicesWithLocation.filter(d => d.eventcode === '4').length;
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [todayLocCount, setTodayLocCount] = useState(0);

  const menuItems = [
    { id: 'dash', icon: '📡', label: 'Map View', badge: todayLocCount },
    { id: 'chat', icon: '💬', label: 'Chat Room', badge: unreadMsg },
    { id: 'tvloc', icon: '📍', label: 'Text View (Location)' },
    { id: 'tvdata', icon: '📊', label: 'Text View (Data)' },
    { id: 'devices', icon: '⚙️', label: 'Device Settings' },
    { id: 'share', icon: '🔗', label: 'Share Settings' },
    { id: 'users', icon: '👤', label: 'Users' },
  ];
  // 오늘 위치정보 배지
  useEffect(() => {
    const fetchTodayLoc = async () => {
      try {
        const now = new Date();
        const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const end = `${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')}0000`;
        const res = await api.get(`/location/range?start=${today}0000&end=${end}`);
        const data = Array.isArray(res.data) ? res.data : [];
        const count = data.filter(d => d.eventcode === '1' || d.eventcode === '4').length;
        setTodayLocCount(count);
      } catch { }
    };
    fetchTodayLoc();
    const timer = setInterval(fetchTodayLoc, 30000);
    return () => clearInterval(timer);
  }, []);

  // 오늘 미읽은 메시지 조회

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/chat/general');
        const msgs = res.data || [];
        // regDate 형식: yyyyMMddHHmmss
        const now = new Date();
        const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const todayMsgs = msgs.filter(m => m.regDate?.startsWith(today));
        const lastRead = parseInt(localStorage.getItem('lastReadMsgId') || '0');
        const unread = todayMsgs.filter(m => (m.id || 0) > lastRead).length;
        setUnreadMsg(unread);
      } catch (e) { console.error('unread error', e); }
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 10000);
    return () => clearInterval(timer);
  }, []);

  // 언어 감지 (localStorage에서)
  const lang = localStorage.getItem('lang') || 'ko';

  const BADGE_LABELS = {
    ko: { devices: '사용 장비', users: '사용자', active: '작동중', sos: 'SOS', logout: '로그아웃' },
    en: { devices: 'Devices', users: 'Users', active: 'Active', sos: 'SOS', logout: 'Logout' },
    ja: { devices: 'デバイス', users: 'ユーザー', active: '稼働中', sos: 'SOS', logout: 'ログアウト' },
  };
  const bl = BADGE_LABELS[lang] || BADGE_LABELS.ko;

  const handleMenuClick = (id) => {
    setActivePage(id);
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d1628', color: '#e8f4ff', fontFamily: "'Syne', sans-serif" }}>

      {/* ── 헤더 ── */}
      <header style={{ height: '58px', background: 'rgba(13,22,40,.97)', borderBottom: '1px solid rgba(0,212,240,.18)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '10px', flexShrink: 0, zIndex: 1000 }}>

        {/* 햄버거 버튼 (모바일) */}
        <button onClick={() => {
          // 모바일: sidebarOpen, PC: sidebarCollapsed
          if (window.innerWidth <= 768) setSidebarOpen(p => !p);
          else setSidebarCollapsed(p => !p);
        }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '9px', cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ fontSize: '18px' }}>☰</span>
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
            { label: bl.devices, value: devices.length, color: '#3b82f6', blink: false },
            { label: bl.users, value: users.length, color: '#00d4f0', blink: false },
            { label: bl.active, value: devicesWithLocation.filter(d => d.lat).length, color: '#10b981', blink: false },
            { label: bl.sos, value: sosCount, color: '#ef4444', blink: sosCount > 0 },
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
            {bl.logout}
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
          width: sidebarCollapsed ? '0' : '220px',
          flexShrink: 0,
          background: 'linear-gradient(180deg,#192d48 0%,#0d1628 100%)',
          borderRight: sidebarCollapsed ? 'none' : '1px solid rgba(0,212,240,.18)',
          display: 'flex', flexDirection: 'column',
          position: 'relative', zIndex: 160,
          overflow: 'hidden',
          transition: 'width .3s cubic-bezier(0.16,1,0.3,1)',
        }}
          className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>

          <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
            {menuItems.map(item => (
              <div key={item.id} onClick={() => { handleMenuClick(item.id); if (item.id === 'chat') { localStorage.setItem('lastReadMsgId', String(Date.now())); setUnreadMsg(0); } }}
                style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '12px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: activePage === item.id ? '#00d4f0' : 'rgba(240,248,255,.5)', background: activePage === item.id ? 'rgba(0,212,240,.1)' : 'transparent', borderLeft: activePage === item.id ? '3px solid #00d4f0' : '3px solid transparent', transition: 'all .2s' }}>
                <span style={{ fontSize: '17px' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{ background: '#8b5cf6', color: '#fff', fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center', animation: 'sosBlink 2s ease-in-out infinite' }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
            ))}
          </nav>

          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(0,212,240,.18)' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '2px', color: 'rgba(240,248,255,.4)', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>SYSTEM STATUS</div>
            {[
              { label: 'Switch', status: 'ok', text: 'Normal' },
              { label: 'Satellite', status: 'ok', text: 'Normal' },
              { label: 'IMT', status: 'warn', text: 'Checking' },
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
            <div style={{ display: 'grid', gridTemplateColumns: 'min(330px, 36%) 1fr', gridTemplateRows: '1fr 160px', gap: '8px', padding: '8px', flex: 1, overflow: 'hidden' }}
              className="dash-grid">
              <DevicePanel devices={devicesWithLocation} allDevices={allDevices} onRefresh={() => { fetchDevices(); fetchLocations(); }} onNavigate={setActivePage} onMapDataChange={setMapPoints} />

              {/* 지도 */}
              <div style={{ background: 'rgba(13,26,46,.85)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', overflow: 'hidden' }}>
                <MapView devices={devicesWithLocation} mapPoints={mapPoints} onOpenTrack={setTrackDevice} />
              </div>

              {/* 이벤트 로그 */}
              <div style={{ background: 'rgba(14,26,46,.97)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '7px 13px', borderBottom: '1px solid rgba(0,212,240,.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>EVENT LOG</span>
                  <span style={{ fontSize: '10px', color: '#6b8fae' }}>{locations.length}건</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '50px 120px 100px 1fr 60px', padding: '3px 13px', background: 'rgba(0,0,0,.2)', flexShrink: 0 }}>
                  {['Type', 'IMEI', 'Alias', 'Detail', 'Time'].map(h => (
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
                    const device = devices.find(d => d.imei === l.imei);
                    const alias = device?.alias || '-';
                    const detail = l.memo || l.can || l.title || '';
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 120px 100px 1fr 60px', padding: '4px 13px', borderBottom: '1px solid rgba(0,212,240,.05)', alignItems: 'center', animation: isSOS ? 'sosBlink 1.5s ease-in-out infinite' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: '8px', fontWeight: '700', padding: '2px 4px', borderRadius: '3px', background: typeBg, color: typeColor, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>
                          {isSOS ? 'SOS' : l.title || 'TRACK'}
                        </span>
                        <span style={{ fontSize: '9px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.imei}
                        </span>
                        <span style={{ fontSize: '9px', color: '#e8f4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alias}
                        </span>
                        <span style={{ fontSize: '9px', color: '#a78bfa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {detail}
                        </span>
                        <span style={{ fontSize: '9px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>
                          {l.regDate?.slice(8, 10)}:{l.regDate?.slice(10, 12)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activePage === 'devices' && <DevicesPage devices={devicesWithLocation} onRefresh={fetchDevices} />}
          {trackDevice && (
            <TrackViewPopup
              device={trackDevice}
              imei={trackDevice.imei}
              alias={trackDevice.alias}
              defaultPeriod="30일"
              onClose={() => setTrackDevice(null)}
            />
          )}
          {activePage === 'tvloc' && <TextViewLocation devices={devices} allDevices={allDevices} />}
          {activePage === 'chat' && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ChatRoom user={user} devices={devicesWithLocation} />
            </div>
          )}
          {activePage === 'tvdata' && <TextViewData devices={devices} allDevices={allDevices} />}
          {activePage === 'users' && <UsersPage user={user} devices={devicesWithLocation} />}
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
        .sidebar-collapsed { width: 0 !important; overflow: hidden !important; border: none !important; }

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

function DevicePanel({ devices, allDevices = [], onRefresh, onNavigate, onMapDataChange }) {
  const lang = localStorage.getItem('lang') || 'ko';
  const QUERY_LABEL = { ko: '조회', en: 'Search', ja: '検索' };
  const RESET_LABEL = { ko: '초기화', en: 'Reset', ja: 'リセット' };
  const LOADING_LABEL = { ko: '로딩 중...', en: 'Loading...', ja: '読込中...' };
  const NODATA_LABEL = { ko: '데이터 없음', en: 'No data', ja: 'データなし' };
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // 기본 날짜: 현재 기준 3일 전 ~ 현재
  const getDefault = () => {
    const now = new Date();
    const before3 = new Date(now);
    before3.setDate(before3.getDate() - 3);
    const fmt = d => d.toISOString().slice(0, 16);
    return { start: fmt(before3), end: fmt(now) };
  };
  const def = getDefault();
  const [startDate, setStartDate] = useState(def.start);
  const [endDate, setEndDate] = useState(def.end);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const PER_PAGE = 30;

  const tabs = [
    { id: 'all', label: 'All', color: '#6b8fae' },
    { id: 'track', label: 'Track', color: '#3b82f6' },
    { id: 'sos', label: 'SOS', color: '#ef4444' },
    { id: 'msg', label: 'Message', color: '#10b981' },
    { id: 'can', label: 'CAN', color: '#8b5cf6' },
    { id: 'event', label: 'Event', color: '#f59e0b' },
  ];

  // 날짜 범위 내 전체 수신 데이터 조회
  const updateMapPoints = (data, tab) => {
    const filtered = data.filter(d =>
      tab === 'sos' ? d.eventcode === '4' :
        tab === 'track' ? d.eventcode === '1' :
          tab === 'all' ? (d.eventcode === '4' || d.eventcode === '1') :
            false
    );
    if (onMapDataChange) onMapDataChange(filtered);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const startStr = startDate.replace('T', '').replace(/-|:/g, '').slice(0, 12);
      const endStr = endDate.replace('T', '').replace(/-|:/g, '').slice(0, 12);
      const start = startStr + '00';
      const end = endStr + '99';
      const res = await api.get(`/location/range?start=${start}&end=${end}`);
      // 내 장비 IMEI만 필터링
      const myImeis = devices.map(d => d.imei);
      const data = (Array.isArray(res.data) ? res.data : [])
        .filter(d => myImeis.includes(d.imei));
      setAllData(data);
      updateMapPoints(data, activeTab);
    } catch { setAllData([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, []);

  const getLatestPerDeviceAndType = (data) => {
    const map = new Map();
    data.forEach(d => {
      const key = `${d.imei}_${d.eventcode}`;
      if (!map.has(key)) map.set(key, d);
    });
    return Array.from(map.values());
  };

  const baseFiltered = allData.filter(d => {
    const matchSearch = !search ||
      d.imei?.includes(search) ||
      d.title?.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      activeTab === 'all' ? true :
        activeTab === 'sos' ? d.eventcode === '4' :
          activeTab === 'track' ? d.eventcode === '1' :
            activeTab === 'can' ? d.eventcode === '7' :
              activeTab === 'event' ? d.eventcode === '9' :
                activeTab === 'msg' ? d.eventcode === '3' : true;
    return matchSearch && matchTab;
  });

  // 모든 탭에서 장비별 최신값만 표시
  const filtered = getLatestPerDeviceAndType(baseFiltered);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getAlias = (imei) => {
    // 활성 장비 먼저, 없으면 전체(삭제 포함) 에서 찾기
    const d = devices.find(d => d.imei === imei)
      || allDevices.find(d => d.imei === imei);
    return d?.alias || `···${imei?.slice(-6)}`;
  };

  const getTypeInfo = (eventcode) => {
    switch (eventcode) {
      case '4': return { label: 'SOS', color: '#ef4444', bg: 'rgba(239,68,68,.2)' };
      case '1': return { label: 'TRACK', color: '#3b82f6', bg: 'rgba(59,130,246,.15)' };
      case '7': return { label: 'CAN', color: '#8b5cf6', bg: 'rgba(139,92,246,.15)' };
      case '9': return { label: 'EVENT', color: '#f59e0b', bg: 'rgba(245,158,11,.15)' };
      case '3': return { label: 'MSG', color: '#10b981', bg: 'rgba(16,185,129,.15)' };
      default: return { label: 'DATA', color: '#6b8fae', bg: 'rgba(107,143,174,.15)' };
    }
  };


  const handleCardClick = (item) => {
    if (item.eventcode === '4' || item.eventcode === '1') {
      setSelectedDevice(item);
    } else if (item.eventcode === '7') {
      onNavigate && onNavigate('tvdata');
    } else if (item.eventcode === '9') {
      onNavigate && onNavigate('tvdata');
    } else if (item.eventcode === '3') {
      onNavigate && onNavigate('chat');
    }
  };

  return (
    <>
      <div style={{ background: 'rgba(14,26,46,.97)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', gridRow: 'span 2' }}>

        {/* 헤더 */}
        <div style={{ padding: '9px 13px', borderBottom: '1px solid rgba(0,212,240,.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>RECEIVED DATA LIST</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={fetchAllData} style={{ fontSize: '12px', background: 'none', border: 'none', color: '#00d4f0', cursor: 'pointer' }}>↻</button>
          </div>
        </div>

        {/* 날짜 범위 */}
        <div style={{ padding: '7px 13px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', gap: '6px', alignItems: 'center' }}>
          {[
            { label: startDate || 'Start', show: showStartPicker, setShow: setShowStartPicker, value: startDate, setValue: setStartDate, side: 'left' },
            { label: endDate || 'End', show: showEndPicker, setShow: setShowEndPicker, value: endDate, setValue: setEndDate, side: 'right' }
          ].map((picker, i) => (
            <div key={i} style={{ position: 'relative', flex: 1 }}>
              <button onClick={() => picker.setShow(p => !p)}
                style={{ width: '100%', padding: '5px 8px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,212,240,.25)', borderRadius: '6px', color: picker.value ? '#00d4f0' : '#6b8fae', fontSize: '11px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textAlign: 'left' }}>
                {picker.value ? picker.value.replace('T', ' ') : (i === 0 ? 'Start' : 'End')}
              </button>
              {picker.show && (
                <div style={{ position: 'absolute', top: '100%', [picker.side]: 0, zIndex: 200, background: '#1a2d48', border: '1px solid rgba(0,212,240,.3)', borderRadius: '8px', padding: '10px', marginTop: '4px', width: '200px' }}>
                  <input type="datetime-local" value={picker.value}
                    onChange={e => { picker.setValue(e.target.value); picker.setShow(false); }}
                    style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '6px', padding: '6px', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => { picker.setValue(''); picker.setShow(false); }}
                    style={{ marginTop: '6px', width: '100%', padding: '4px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>{RESET_LABEL[lang] || '초기화'}</button>
                </div>
              )}
            </div>
          ))}
          <button onClick={fetchAllData}
            style={{ padding: '5px 10px', background: 'rgba(0,212,240,.12)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {QUERY_LABEL[lang] || '조회'}
          </button>
        </div>

        {/* 빠른 기간 선택 */}
        <div style={{ padding: '5px 13px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', gap: '4px', alignItems: 'center' }}>

          {[
            { label: '1시간', hours: 1 },
            { label: '24시', hours: 24 },
            { label: '3일', days: 3 },
            { label: '7일', days: 7 },
            { label: '30일', days: 30 },
          ].map((q, i) => (
            <button key={i} onClick={async () => {
              const now = new Date();
              const start = new Date(now);
              if (q.hours) start.setHours(start.getHours() - q.hours);
              if (q.days) start.setDate(start.getDate() - q.days);
              const fmt = d => d.toISOString().slice(0, 16);
              const s = fmt(start);
              const e = fmt(now);
              setStartDate(s);
              setEndDate(e);
              // 직접 API 호출
              setLoading(true);
              try {
                const startStr = s.replace('T', '').replace(/-|:/g, '').slice(0, 12) + '00';
                const endStr = e.replace('T', '').replace(/-|:/g, '').slice(0, 12) + '99';
                const res = await api.get(`/location/range?start=${startStr}&end=${endStr}`);
                const myImeis = devices.map(d => d.imei);
                const data = (Array.isArray(res.data) ? res.data : [])
                  .filter(d => myImeis.includes(d.imei));
                setAllData(data);
                setPage(1);
                updateMapPoints(data, activeTab);
              } catch { setAllData([]); }
              finally { setLoading(false); }
            }}
              style={{ padding: '3px 7px', background: 'rgba(0,212,240,.08)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,212,240,.08)'}>
              {q.label}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div style={{ padding: '6px 13px', borderBottom: '1px solid rgba(0,212,240,.1)' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍 IMEI / Alias"
            style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '7px', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* 탭 */}
        <div style={{ padding: '5px 13px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setPage(1); updateMapPoints(allData, t.id); }}
              style={{ padding: '3px 8px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", background: activeTab === t.id ? t.color : 'rgba(255,255,255,.06)', color: activeTab === t.id ? '#fff' : '#6b8fae', transition: 'all .2s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b8fae', fontSize: '12px' }}>{LOADING_LABEL[lang]}</div>
          ) : paged.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b8fae', fontSize: '12px' }}>{NODATA_LABEL[lang]}</div>
          ) : paged.map((d, i) => {
            const type = getTypeInfo(d.eventcode);
            const isSOS = d.eventcode === '4';
            const isClickable = d.eventcode === '4' || d.eventcode === '1';
            const parts = d.position?.split(',') || [];
            const lat = parts[0];
            const lon = parts[1];
            const isShort = d.eventcode === '7' || d.eventcode === '9' || d.eventcode === '3';

            return (
              <div key={i}
                onClick={() => handleCardClick(d)}
                style={{ padding: '7px 13px', borderBottom: '1px solid rgba(0,212,240,.08)', cursor: isClickable ? 'pointer' : 'default', background: isSOS ? 'rgba(239,68,68,.05)' : 'transparent', animation: isSOS ? 'sosBlink 1.5s ease-in-out infinite' : 'none', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = isSOS ? 'rgba(239,68,68,.1)' : 'rgba(0,212,240,.04)'}
                onMouseLeave={e => e.currentTarget.style.background = isSOS ? 'rgba(239,68,68,.05)' : 'transparent'}>

                {/* 1줄: 타입 + 애칭 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 4px', borderRadius: '3px', background: type.bg, color: type.color, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                    {type.label}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getAlias(d.imei)}
                  </span>
                </div>

                {/* 2줄: IMEI + 위경도/페이로드 + 날짜시간 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: '#4b6483', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', fontSize: '11px' }}>{d.imei}</span>
                  {isShort ? (
                    <span style={{ color: '#a78bfa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {(d.memo || d.can || d.title || '')?.slice(0, 12)}
                    </span>
                  ) : (
                    lat ? (
                      <span style={{ color: '#6b8fae', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#00d4f0' }}>LAT</span> {parseFloat(lat).toFixed(3)} <span style={{ color: '#00d4f0' }}>LON</span> {parseFloat(lon).toFixed(3)}
                      </span>
                    ) : <span style={{ flex: 1 }} />
                  )}
                  <span style={{ color: '#4b6483', flexShrink: 0 }}>
                    {d.regDate?.slice(0, 4)}-{d.regDate?.slice(4, 6)}-{d.regDate?.slice(6, 8)} {d.regDate?.slice(8, 10)}:{d.regDate?.slice(10, 12)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ padding: '7px 13px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
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

      {/* ── TRACK/SOS 전체화면 팝업 ── */}
      {/* ── TRACK/SOS 전체화면 팝업 ── */}
      {selectedDevice && (
        <TrackViewPopup
          device={selectedDevice}
          imei={selectedDevice.imei}
          alias={getAlias(selectedDevice.imei)}
          onClose={() => setSelectedDevice(null)}
        />
      )}


    </>
  );
}