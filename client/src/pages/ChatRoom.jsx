import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axiosConfig';

const getRole = () => localStorage.getItem('role') || 'REVIEWER';

// 한글 3바이트, 영문 1바이트 계산
const getByteLength = (str) => {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 127) bytes += 3;
    else bytes += 1;
  }
  return bytes;
};

export default function ChatRoom({ user, devices = [] }) {
  const [view, setView] = useState('grid');
  const [selectedImei, setSelectedImei] = useState(null);
  const [selectedAlias, setSelectedAlias] = useState('');
  const [sndMessages, setSndMessages] = useState([]);
  const [rcvMessages, setRcvMessages] = useState([]);
  const [showCompose, setShowCompose] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const myRole = getRole();
  const isSuperAdmin = myRole === 'SUPER_ADMIN';

  // 내 장비 IMEI 목록
  const myImeis = devices.map(d => d.imei);

  const fetchMessages = useCallback(async () => {
    try {
      const [sndRes, rcvRes] = await Promise.all([
        api.get('/chat/snd'),
        api.get('/chat/rcv'),
      ]);
      // MSG만 (eventcode=3, memo 있는 것) + 내 장비만
      const snd = (Array.isArray(sndRes.data) ? sndRes.data : [])
        .filter(m => m.eventcode === '5' && myImeis.includes(m.imei));
      const rcv = (Array.isArray(rcvRes.data) ? rcvRes.data : [])
        .filter(m => myImeis.includes(m.imei));
      setSndMessages(snd);
      setRcvMessages(rcv);
    } catch (_) { /* 무시 */ }
  }, [devices]);

  useEffect(() => {
    fetchMessages();
    const timer = setInterval(fetchMessages, 5000);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  // 장비별 메시지 그룹핑
  const getDeviceMessages = (imei) => {
    const snd = sndMessages.filter(m => m.imei === imei || m.rimei === imei);
    const rcv = rcvMessages.filter(m => m.imei === imei);
    return [
      ...snd.map(m => ({ ...m, _type: 'snd' })),
      ...rcv.map(m => ({ ...m, _type: 'rcv' })),
    ].sort((a, b) => (a.regDate || '').localeCompare(b.regDate || ''));
  };

  // 채팅방 있는 장비 (내 장비 중 메시지 있는 것)
  const chatImeis = [...new Set([
    ...sndMessages.map(m => m.imei),
    ...rcvMessages.map(m => m.imei),
  ])].filter(imei => myImeis.includes(imei));

  const chatDevices = chatImeis.map(imei => {
    const device = devices.find(d => d.imei === imei);
    const msgs = getDeviceMessages(imei);
    return { imei, alias: device?.alias || imei, msgs, device };
  });

  // 전문 검색
  const handleSearch = () => {
    if (!searchKeyword.trim()) return;
    const kw = searchKeyword.toLowerCase();
    const results = [];
    chatDevices.forEach(({ imei, alias, msgs }) => {
      msgs.forEach(m => {
        const text = `${m.memo || ''}`.toLowerCase();
        if (text.includes(kw)) results.push({ imei, alias, msg: m });
      });
    });
    setSearchResults(results);
  };

  const formatDate = (d) => {
    if (!d || d.length < 12) return '';
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${d.slice(8, 10)}:${d.slice(10, 12)}`;
  };

  if (view === 'room' && selectedImei) {
    return (
      <ChatRoomFull
        imei={selectedImei}
        alias={selectedAlias}
        messages={getDeviceMessages(selectedImei)}
        onBack={() => setView('grid')}
        onRefresh={fetchMessages}
        isSuperAdmin={isSuperAdmin}
        devices={devices}
      />
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(180deg,#0a1628 0%,#0d1e38 100%)' }}>

      {/* 헤더 */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(0,212,240,.15)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, background: 'rgba(10,20,40,.8)', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💬</div>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '13px', fontWeight: '700', color: '#fff', letterSpacing: '2px' }}>CHAT ROOM</div>
            <div style={{ fontSize: '10px', color: '#4b6483' }}>Satellite MSG — {chatDevices.length} active channels</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontSize: '10px', color: '#10b981' }}>실시간</span>
          <button onClick={() => { setSearchMode(p => !p); setSearchResults([]); setSearchKeyword(''); }}
            style={{ padding: '6px 14px', background: searchMode ? 'rgba(139,92,246,.2)' : 'rgba(0,212,240,.08)', border: `1px solid ${searchMode ? 'rgba(139,92,246,.5)' : 'rgba(0,212,240,.2)'}`, borderRadius: '8px', color: searchMode ? '#a78bfa' : '#00d4f0', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            🔍 전문검색
          </button>
          <button onClick={() => setShowCompose(true)}
            style={{ padding: '6px 16px', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', border: 'none', borderRadius: '8px', color: '#0d1628', fontSize: '11px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,212,240,.3)' }}>
            ✉️ 메시지 작성
          </button>
        </div>
      </div>

      {/* 전문 검색 */}
      {searchMode && (
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', gap: '8px', flexShrink: 0, background: 'rgba(139,92,246,.05)' }}>
          <input value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="메시지 내용 검색..."
            style={{ flex: 1, padding: '8px 16px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(139,92,246,.3)', borderRadius: '10px', color: '#fff', fontSize: '12px', outline: 'none' }} />
          <button onClick={handleSearch}
            style={{ padding: '8px 20px', background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '10px', color: '#a78bfa', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            검색
          </button>
        </div>
      )}

      {/* 검색 결과 */}
      {searchMode && searchResults.length > 0 && (
        <div style={{ padding: '10px 24px', borderBottom: '1px solid rgba(0,212,240,.1)', maxHeight: '180px', overflowY: 'auto', flexShrink: 0 }}>
          {searchResults.map((r, i) => {
            const kw = searchKeyword.toLowerCase();
            const text = r.msg.memo || '';
            const idx = text.toLowerCase().indexOf(kw);
            const highlighted = idx >= 0
              ? <>{text.slice(0, idx)}<mark style={{ background: '#8b5cf6', color: '#fff', borderRadius: '2px', padding: '0 2px' }}>{text.slice(idx, idx + kw.length)}</mark>{text.slice(idx + kw.length)}</>
              : text;
            return (
              <div key={i} onClick={() => { setSelectedImei(r.imei); setSelectedAlias(r.alias); setView('room'); setSearchMode(false); }}
                style={{ padding: '8px 12px', marginBottom: '6px', background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', flexShrink: 0 }}>📡 {r.alias}</span>
                <span style={{ fontSize: '11px', color: '#e8f4ff' }}>{highlighted}</span>
                <span style={{ fontSize: '9px', color: '#4b6483', marginLeft: 'auto', flexShrink: 0 }}>{formatDate(r.msg.regDate)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 카드 그리드 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignContent: 'flex-start' }}>
        {chatDevices.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', marginTop: '80px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📡</div>
            <div style={{ fontSize: '14px', color: '#6b8fae', fontWeight: '700' }}>수신된 메시지가 없습니다</div>
            <div style={{ fontSize: '11px', color: '#4b6483', marginTop: '6px' }}>위성 장비에서 MSG 수신 시 자동으로 대화방이 생성됩니다.</div>
          </div>
        ) : chatDevices.map(({ imei, alias, msgs }) => {
          const last4 = msgs.slice(-4);
          const unread = msgs.filter(m => m._type === 'snd').length;
          const hasSOS = msgs.some(m => m.eventcode === '4');
          const lastMsg = msgs[msgs.length - 1];

          return (
            <div key={imei} onClick={() => { setSelectedImei(imei); setSelectedAlias(alias); setView('room'); }}
              style={{ width: '260px', background: 'linear-gradient(135deg,rgba(20,35,60,.95),rgba(14,26,46,.95))', border: `1px solid ${hasSOS ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.2)'}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 4px 20px rgba(0,0,0,.3)', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,212,240,.15)'; e.currentTarget.style.border = '1px solid rgba(0,212,240,.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.3)'; e.currentTarget.style.border = `1px solid ${hasSOS ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.2)'}`; }}>

              {/* 카드 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: hasSOS ? 'linear-gradient(135deg,rgba(239,68,68,.3),rgba(239,68,68,.1))' : 'linear-gradient(135deg,rgba(0,212,240,.2),rgba(59,130,246,.1))', border: `1px solid ${hasSOS ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📡</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alias}</div>
                  <div style={{ fontSize: '9px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis' }}>{imei}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {unread > 0 && (
                    <span style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(239,68,68,.4)' }}>{unread}</span>
                  )}
                  {hasSOS && (
                    <span style={{ background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.5)', color: '#ef4444', fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', animation: 'sosBlink 1s infinite' }}>SOS</span>
                  )}
                </div>
              </div>

              {/* 마지막 메시지 시간 */}
              {lastMsg && (
                <div style={{ fontSize: '9px', color: '#4b6483', marginBottom: '8px', fontFamily: "'JetBrains Mono', monospace" }}>
                  🕐 {formatDate(lastMsg.regDate)}
                </div>
              )}

              {/* 구분선 */}
              <div style={{ height: '1px', background: 'rgba(0,212,240,.1)', marginBottom: '10px' }} />

              {/* 최신 4개 메시지 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {last4.length === 0 ? (
                  <div style={{ fontSize: '10px', color: '#4b6483', textAlign: 'center', padding: '8px' }}>메시지 없음</div>
                ) : last4.map((m, i) => {
                  const isRcv = m._type === 'rcv';
                  const text = isRcv ? m.text : (m.memo || '');
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ fontSize: '8px', color: isRcv ? '#00d4f0' : '#a78bfa', flexShrink: 0, marginTop: '2px' }}>{isRcv ? '▶' : '◀'}</span>
                      <span style={{ fontSize: '10px', color: isRcv ? '#e8f4ff' : '#c4b5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {text || '(내용 없음)'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 하단 — 메시지 수 */}
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,212,240,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#4b6483' }}>총 {msgs.length}개 메시지</span>
                <span style={{ fontSize: '9px', color: '#00d4f0', fontWeight: '700' }}>대화 열기 →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 메시지 작성 팝업 */}
      {showCompose && (
        <ComposePopup devices={devices} onClose={() => setShowCompose(false)} onSent={fetchMessages} />
      )}

      <style>{`@keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   전체 화면 대화방
══════════════════════════════════════ */
function ChatRoomFull({ imei, alias, messages, onBack, onRefresh, isSuperAdmin, devices }) {
  const [input, setInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const MAX = 200;
  const TITLE_MAX = 20;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 임시저장
  useEffect(() => {
    const saved = localStorage.getItem(`draft_${imei}`);
    if (saved) setInput(saved);
  }, [imei]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (input.trim()) localStorage.setItem(`draft_${imei}`, input);
    }, 30000);
    return () => clearInterval(timer);
  }, [input, imei]);

  const sendMessage = async () => {
    if (!input.trim() || getByteLength(input) > MAX) return;
    if (getByteLength(titleInput) > TITLE_MAX) { alert(`타이틀은 ${TITLE_MAX}바이트 이내여야 합니다.`); return; }
    setSending(true);
    try {
      await api.post('/chat/rcv', { imei, title: titleInput.trim(), text: input.trim() });
      setInput('');
      setTitleInput('');
      localStorage.removeItem(`draft_${imei}`);
      onRefresh();
    } catch (_) { alert('전송 실패'); }
    finally { setSending(false); }
  };

  const deleteMessage = async (idx, type) => {
    if (!isSuperAdmin || !confirm('삭제하시겠습니까?')) return;
    try {
      await api.delete(`/chat/${type}/${idx}`);
      onRefresh();
    } catch (_) { /* 무시 */ }
  };

  const formatDate = (d) => {
    if (!d || d.length < 12) return '';
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${d.slice(8, 10)}:${d.slice(10, 12)}`;
  };

  const getStatusIcon = (m) => {
    if (m.status === '2') return <span style={{ fontSize: '9px', color: '#ef4444' }}>✕ 실패</span>;
    if (m.status === '1') return <span style={{ fontSize: '9px', color: '#10b981' }}>✓✓ 전송됨</span>;
    return <span style={{ fontSize: '9px', color: '#f59e0b' }}>⏳ 대기중</span>;
  };

  const draft = localStorage.getItem(`draft_${imei}`);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(180deg,#0a1628 0%,#0d1e38 100%)' }}>

      {/* 헤더 */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,212,240,.15)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, background: 'rgba(10,20,40,.9)', backdropFilter: 'blur(10px)' }}>
        <button onClick={onBack}
          style={{ padding: '6px 12px', background: 'rgba(0,212,240,.08)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '8px', color: '#00d4f0', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
          ← 목록
        </button>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,rgba(0,212,240,.2),rgba(59,130,246,.1))', border: '1px solid rgba(0,212,240,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📡</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{alias}</div>
          <div style={{ fontSize: '9px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>{imei}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#6b8fae' }}>{messages.length}개 메시지</span>
          <button onClick={onRefresh} style={{ background: 'none', border: 'none', color: '#00d4f0', cursor: 'pointer', fontSize: '16px' }}>↻</button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b8fae', fontSize: '13px', marginTop: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>💬</div>
            메시지가 없습니다.
          </div>
        ) : messages.map((m, i) => {
          const isRcv = m._type === 'rcv';

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isRcv ? 'flex-end' : 'flex-start' }}>
              {!isRcv && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', marginLeft: '4px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'rgba(0,212,240,.15)', border: '1px solid rgba(0,212,240,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>📡</div>
                  <span style={{ fontSize: '10px', color: '#6b8fae', fontWeight: '700' }}>{alias}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isRcv ? 'row-reverse' : 'row', maxWidth: '70%' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: isRcv ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isRcv
                    ? 'linear-gradient(135deg,#00d4f0,#0891b2)'
                    : 'rgba(255,255,255,.06)',
                  border: isRcv ? 'none' : '1px solid rgba(0,212,240,.15)',
                  color: isRcv ? '#0d1628' : '#e8f4ff',
                  fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word',
                  boxShadow: isRcv ? '0 4px 15px rgba(0,212,240,.2)' : '0 2px 8px rgba(0,0,0,.2)',
                }}>
                  {!isRcv && (
                    <>
                      {m.title && (
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#7dd3fc', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,.15)' }}>
                          📌 {m.title}
                        </div>
                      )}
                      {m.memo && <div>{m.memo}</div>}
                    </>
                  )}
                  {isRcv && (
                    <>
                      {m.title && (
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#0a4a5a', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid rgba(0,0,0,.15)' }}>
                          📌 {m.title}
                        </div>
                      )}
                      <div>{m.text}</div>
                    </>
                  )}
                  {!isRcv && m.rimei && (
                    <div style={{ marginTop: '5px', fontSize: '9px', color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>
                      ➤ {devices?.find(d => d.imei === m.rimei)?.alias || m.rimei}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRcv ? 'flex-end' : 'flex-start', gap: '3px', flexShrink: 0 }}>
                  <span style={{ fontSize: '9px', color: '#4b6483', whiteSpace: 'nowrap' }}>{formatDate(m.regDate)}</span>
                  {isRcv && <div>{getStatusIcon(m)}</div>}
                  {isRcv && m.status === '2' && (
                    <button onClick={async () => {
                      try { await api.put(`/chat/rcv/${m.idx}/retry`); onRefresh(); }
                      catch (_) { alert('재전송 실패'); }
                    }}
                      style={{ padding: '2px 8px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '4px', color: '#ef4444', fontSize: '9px', cursor: 'pointer' }}>
                      재전송
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button onClick={() => deleteMessage(m.idx, m._type)}
                      style={{ background: 'none', border: 'none', color: '#4b6483', cursor: 'pointer', fontSize: '10px' }}>🗑</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 임시저장 알림 */}
      {draft && input !== draft && (
        <div style={{ padding: '6px 20px', background: 'rgba(245,158,11,.08)', borderTop: '1px solid rgba(245,158,11,.2)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', color: '#f59e0b' }}>📝 임시저장된 내용이 있습니다.</span>
          <button onClick={() => setInput(draft)}
            style={{ padding: '2px 8px', background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', borderRadius: '4px', color: '#f59e0b', fontSize: '9px', cursor: 'pointer' }}>불러오기</button>
        </div>
      )}

      {/* 입력창 */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,212,240,.15)', flexShrink: 0, background: 'rgba(10,20,40,.8)', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* 타이틀 입력 */}
            <div style={{ position: 'relative' }}>
              <input
                value={titleInput}
                onChange={e => {
                  const val = e.target.value;
                  if (getByteLength(val) <= TITLE_MAX) setTitleInput(val);
                }}
                placeholder="타이틀 (선택, 최대 20bytes)"
                style={{ width: '100%', padding: '8px 70px 8px 14px', borderRadius: '10px', border: '1px solid rgba(0,212,240,.2)', background: 'rgba(255,255,255,.04)', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: getByteLength(titleInput) > TITLE_MAX * 0.9 ? '#ef4444' : '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>
                {getByteLength(titleInput)}/{TITLE_MAX}b
              </span>
            </div>
            {/* 메시지 입력 */}
            <div style={{ position: 'relative' }}>
              <textarea
                value={input}
                onChange={e => {
                  const val = e.target.value;
                  if (getByteLength(val) <= MAX) setInput(val);
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="메시지 입력... (Enter 전송, Shift+Enter 줄바꿈)"
                rows={2}
                style={{ width: '100%', padding: '12px 16px', paddingBottom: '24px', borderRadius: '14px', border: `1px solid ${getByteLength(input) > MAX * 0.9 ? 'rgba(239,68,68,.5)' : 'rgba(0,212,240,.25)'}`, background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.5', backdropFilter: 'blur(5px)' }}
              />
              <span style={{ position: 'absolute', bottom: '8px', right: '14px', fontSize: '9px', color: getByteLength(input) > MAX * 0.9 ? '#ef4444' : '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>
                {getByteLength(input)}/{MAX}bytes
              </span>
            </div>
          </div>
          <button onClick={sendMessage} disabled={sending || !input.trim() || getByteLength(input) > MAX}
            style={{ width: '48px', height: '48px', borderRadius: '14px', border: 'none', background: sending || !input.trim() ? 'rgba(255,255,255,.08)' : 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontSize: '20px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sending || !input.trim() ? 'none' : '0 4px 15px rgba(0,212,240,.3)', transition: 'all .2s' }}>
            {sending ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      <style>{`@keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div >
  );
}

/* ══════════════════════════════════════
   메시지 작성 팝업
══════════════════════════════════════ */
function ComposePopup({ devices, onClose, onSent }) {
  const [selectedImei, setSelectedImei] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const MAX = 200;
  const TITLE_MAX = 20;

  const inp = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' };

  const handleSend = async () => {
    if (!selectedImei || !text.trim()) { alert('장비와 메시지를 입력해주세요.'); return; }
    if (getByteLength(title) > TITLE_MAX) { alert(`타이틀은 ${TITLE_MAX}바이트 이내여야 합니다.`); return; }
    setSending(true); setResult(null);
    try {
      await api.post('/chat/rcv', { imei: selectedImei, title: title.trim(), text: text.trim() });
      setResult('success'); setTitle(''); setText(''); onSent();
    } catch (_) { setResult('fail'); }
    finally { setSending(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'linear-gradient(135deg,#1a2d48,#0d1e38)', border: '1px solid rgba(0,212,240,.25)', borderRadius: '20px', padding: '28px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: '13px', fontWeight: '700', color: '#00d4f0', letterSpacing: '1px' }}>✉️ 메시지 작성</div>
            <div style={{ fontSize: '10px', color: '#4b6483', marginTop: '2px' }}>웹 → 위성 장비</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '8px', color: '#6b8fae', cursor: 'pointer', fontSize: '14px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '6px', fontWeight: '600', letterSpacing: '1px' }}>수신 장비 *</label>
            <select style={inp} value={selectedImei} onChange={e => setSelectedImei(e.target.value)}>
              <option value="">— 장비 선택 —</option>
              {devices.filter(d => d.active !== false).map(d => (
                <option key={d.imei} value={d.imei}>{d.alias} ({d.imei}) [{d.type}]</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '6px', fontWeight: '600', letterSpacing: '1px' }}>타이틀 <span style={{ color: '#4b6483' }}>(선택, 최대 20bytes)</span></label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inp, paddingRight: '70px' }}
                value={title}
                onChange={e => {
                  const val = e.target.value;
                  if (getByteLength(val) <= TITLE_MAX) setTitle(val);
                }}
                placeholder="메시지 제목 (선택사항)" />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: getByteLength(title) > TITLE_MAX * 0.9 ? '#ef4444' : '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>
                {getByteLength(title)}/{TITLE_MAX}b
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '6px', fontWeight: '600', letterSpacing: '1px' }}>메시지 *</label>
            <div style={{ position: 'relative' }}>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: '100px', paddingBottom: '24px' }}
                value={text} onChange={e => {
                  const val = e.target.value;
                  if (getByteLength(val) <= MAX) setText(val);
                }}
                placeholder="전송할 메시지를 입력하세요..." />
              <span style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '9px', color: getByteLength(text) > MAX * 0.9 ? '#ef4444' : '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>
                {getByteLength(text)}/{MAX}bytes
              </span>
            </div>
          </div>

          {result === 'success' && (
            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', borderRadius: '10px', fontSize: '12px', color: '#10b981' }}>
              ✅ 전송 완료! 위성 장비로 전송 대기 중입니다.
            </div>
          )}
          {result === 'fail' && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '10px', fontSize: '12px', color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              ❌ 전송 실패
              <button onClick={handleSend} style={{ padding: '3px 10px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '6px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>재전송</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>닫기</button>
          <button onClick={handleSend} disabled={sending || !selectedImei || !text.trim()}
            style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: sending || !selectedImei || !text.trim() ? 'rgba(255,255,255,.08)' : 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,212,240,.2)', opacity: (!selectedImei || !text.trim()) ? 0.5 : 1 }}>
            {sending ? '⏳ 전송중...' : '▶ 전송'}
          </button>
        </div>
      </div>
    </div>
  );
}