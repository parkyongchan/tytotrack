import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axiosConfig';

const getRole = () => localStorage.getItem('role') || 'REVIEWER';
const getMyName = () => localStorage.getItem('name') || '';

export default function ChatRoom({ user }) {
  const [view, setView] = useState('grid'); // 'grid' | 'room'
  const [selectedImei, setSelectedImei] = useState(null);
  const [selectedAlias, setSelectedAlias] = useState('');
  const [devices, setDevices] = useState([]);
  const [sndMessages, setSndMessages] = useState([]); // 위성→웹
  const [rcvMessages, setRcvMessages] = useState([]); // 웹→위성
  const [showCompose, setShowCompose] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const myRole = getRole();
  const isSuperAdmin = myRole === 'SUPER_ADMIN';

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.content || []);
    } catch (_) { /* 무시 */ }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const [sndRes, rcvRes] = await Promise.all([
        api.get('/chat/snd'),
        api.get('/chat/rcv'),
      ]);
      setSndMessages(Array.isArray(sndRes.data) ? sndRes.data : []);
      setRcvMessages(Array.isArray(rcvRes.data) ? rcvRes.data : []);
    } catch (_) { /* 무시 */ }
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchMessages();
  }, []);

  useEffect(() => {
    const timer = setInterval(fetchMessages, 5000);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  // 장비별 메시지 그룹핑
  const getDeviceMessages = (imei) => {
    const snd = sndMessages.filter(m => m.imei === imei || m.rimei === imei);
    const rcv = rcvMessages.filter(m => m.imei === imei);
    const all = [
      ...snd.map(m => ({ ...m, _type: 'snd' })),
      ...rcv.map(m => ({ ...m, _type: 'rcv' })),
    ].sort((a, b) => (a.regDate || '').localeCompare(b.regDate || ''));
    return all;
  };

  // 채팅방이 있는 장비 목록 (메시지 있는 것)
  const chatImeis = [...new Set([
    ...sndMessages.map(m => m.imei),
    ...rcvMessages.map(m => m.imei),
  ])];

  const chatDevices = chatImeis.map(imei => {
    const device = devices.find(d => d.imei === imei);
    const msgs = getDeviceMessages(imei);
    return { imei, alias: device?.alias || imei, msgs };
  });

  // 전문 검색
  const handleSearch = () => {
    if (!searchKeyword.trim()) return;
    const kw = searchKeyword.toLowerCase();
    const results = [];
    chatDevices.forEach(({ imei, alias, msgs }) => {
      msgs.forEach(m => {
        const text = `${m.title || ''} ${m.memo || ''} ${m.text || ''}`.toLowerCase();
        if (text.includes(kw)) results.push({ imei, alias, msg: m });
      });
    });
    setSearchResults(results);
  };

  if (view === 'room' && selectedImei) {
    return (
      <ChatRoomFull
        imei={selectedImei}
        alias={selectedAlias}
        user={user}
        devices={devices}
        messages={getDeviceMessages(selectedImei)}
        rcvMessages={rcvMessages.filter(m => m.imei === selectedImei)}
        onBack={() => setView('grid')}
        onRefresh={fetchMessages}
        isSuperAdmin={isSuperAdmin}
      />
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a1628' }}>

      {/* 헤더 */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,212,240,.18)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
          💬 CHAT ROOM
        </span>
        <span style={{ fontSize: '11px', color: '#6b8fae' }}>Satellite bidirectional messaging</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 전문 검색 */}
          <button onClick={() => { setSearchMode(p => !p); setSearchResults([]); setSearchKeyword(''); }}
            style={{ padding: '5px 12px', background: searchMode ? 'rgba(139,92,246,.2)' : 'rgba(0,212,240,.08)', border: `1px solid ${searchMode ? 'rgba(139,92,246,.4)' : 'rgba(0,212,240,.2)'}`, borderRadius: '7px', color: searchMode ? '#8b5cf6' : '#00d4f0', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            🔍 전문검색
          </button>
          {/* 메시지 작성 */}
          <button onClick={() => setShowCompose(true)}
            style={{ padding: '5px 14px', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', border: 'none', borderRadius: '7px', color: '#0d1628', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            ✉️ 메시지 작성
          </button>
        </div>
      </div>

      {/* 전문 검색 바 */}
      {searchMode && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <input value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="메시지 내용 검색..."
            style={{ flex: 1, padding: '8px 14px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(139,92,246,.3)', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none' }} />
          <button onClick={handleSearch}
            style={{ padding: '8px 16px', background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '8px', color: '#8b5cf6', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            검색
          </button>
        </div>
      )}

      {/* 검색 결과 */}
      {searchMode && searchResults.length > 0 && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,212,240,.1)', maxHeight: '200px', overflowY: 'auto', flexShrink: 0 }}>
          {searchResults.map((r, i) => {
            const kw = searchKeyword.toLowerCase();
            const text = `${r.msg.title || ''} ${r.msg.memo || ''} ${r.msg.text || ''}`;
            const idx = text.toLowerCase().indexOf(kw);
            const highlighted = idx >= 0
              ? <>{text.slice(0, idx)}<mark style={{ background: '#8b5cf6', color: '#fff', borderRadius: '2px' }}>{text.slice(idx, idx + kw.length)}</mark>{text.slice(idx + kw.length)}</>
              : text;
            return (
              <div key={i} onClick={() => { setSelectedImei(r.imei); setSelectedAlias(r.alias); setView('room'); setSearchMode(false); }}
                style={{ padding: '6px 10px', marginBottom: '4px', background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', borderRadius: '6px', cursor: 'pointer' }}>
                <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: '700' }}>{r.alias} </span>
                <span style={{ fontSize: '11px', color: '#e8f4ff' }}>{highlighted}</span>
                <span style={{ fontSize: '9px', color: '#4b6483', marginLeft: '8px' }}>{r.msg.regDate?.slice(0, 4)}-{r.msg.regDate?.slice(4, 6)}-{r.msg.regDate?.slice(6, 8)} {r.msg.regDate?.slice(8, 10)}:{r.msg.regDate?.slice(10, 12)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 카드 그리드 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignContent: 'flex-start' }}>
        {chatDevices.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', color: '#6b8fae', fontSize: '13px', marginTop: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            위성 장비에서 메시지가 수신되면 대화방이 생성됩니다.
          </div>
        ) : chatDevices.map(({ imei, alias, msgs }) => {
          const last4 = msgs.slice(-4);
          const unread = msgs.filter(m => m._type === 'snd' && !m.read).length;
          const hasSOS = msgs.some(m => m.eventcode === '4');
          return (
            <div key={imei} onClick={() => { setSelectedImei(imei); setSelectedAlias(alias); setView('room'); }}
              style={{ width: '220px', background: 'rgba(14,26,46,.97)', border: `1px solid ${hasSOS ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.2)'}`, borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all .2s', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(0,212,240,.5)'}
              onMouseLeave={e => e.currentTarget.style.border = `1px solid ${hasSOS ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.2)'}`}>

              {/* 카드 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: hasSOS ? 'rgba(239,68,68,.2)' : 'rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📡</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alias}</div>
                  <div style={{ fontSize: '9px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis' }}>{imei}</div>
                </div>
                {unread > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>{unread}</span>
                )}
                {hasSOS && (
                  <span style={{ background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.5)', color: '#ef4444', fontSize: '8px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', animation: 'sosBlink 1s infinite' }}>SOS</span>
                )}
              </div>

              {/* 최신 4개 메시지 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {last4.map((m, i) => {
                  const isRcv = m._type === 'rcv';
                  const text = isRcv ? m.text : `${m.title || ''}${m.memo ? ` / ${m.memo}` : ''}`;
                  return (
                    <div key={i} style={{ fontSize: '10px', color: isRcv ? '#00d4f0' : '#a0c4d8', padding: '3px 6px', borderLeft: `2px solid ${isRcv ? '#00d4f0' : 'rgba(255,255,255,.15)'}`, borderRadius: '0 4px 4px 0', background: isRcv ? 'rgba(0,212,240,.05)' : 'transparent', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isRcv ? '▶ ' : '◀ '}{text || '(내용 없음)'}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 메시지 작성 팝업 */}
      {showCompose && (
        <ComposePopup
          devices={devices}
          onClose={() => setShowCompose(false)}
          onSent={fetchMessages}
        />
      )}

      <style>{`@keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   전체 화면 대화방
══════════════════════════════════════ */
function ChatRoomFull({ imei, alias, user, messages, rcvMessages, onBack, onRefresh, isSuperAdmin }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState(() => localStorage.getItem(`draft_${imei}`) || '');
  const bottomRef = useRef(null);
  const MAX = 200;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 자동저장 (30초)
  useEffect(() => {
    const timer = setInterval(() => {
      if (input.trim()) localStorage.setItem(`draft_${imei}`, input);
    }, 30000);
    return () => clearInterval(timer);
  }, [input, imei]);

  // 임시저장 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(`draft_${imei}`);
    if (saved) setInput(saved);
  }, [imei]);

  const sendMessage = async () => {
    if (!input.trim() || input.length > MAX) return;
    setSending(true);
    try {
      await api.post('/chat/rcv', { imei, text: input.trim() });
      setInput('');
      localStorage.removeItem(`draft_${imei}`);
      onRefresh();
    } catch (_) { alert('전송 실패'); }
    finally { setSending(false); }
  };

  const deleteMessage = async (id, type) => {
    if (!isSuperAdmin) return;
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await api.delete(`/chat/${type}/${id}`);
      onRefresh();
    } catch (_) { /* 무시 */ }
  };

  const formatDate = (d) => {
    if (!d || d.length < 12) return '';
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${d.slice(8, 10)}:${d.slice(10, 12)}`;
  };

  const getStatusIcon = (m) => {
    const mtCode = parseInt(m.mtStatus || '0');
    if (m.status === '2') return (
      <span style={{ color: '#ef4444', fontSize: '10px' }}>
        ✕ 실패 {m.mtStatus ? `(${getMtStatusDesc(mtCode)})` : ''}
      </span>
    );
    if (m.status === '1') {
      if (mtCode >= 1 && mtCode <= 50)
        return <span style={{ color: '#f59e0b', fontSize: '10px' }}>✓ GW 큐 등록 (대기 {mtCode}번)</span>;
      return <span style={{ color: '#10b981', fontSize: '10px' }}>✓✓ 전송 완료</span>;
    }
    return <span style={{ color: '#f59e0b', fontSize: '10px' }}>⏳ 대기중</span>;
  };

  const getMtStatusDesc = (code) => {
    if (code === -2) return '미등록 IMEI';
    if (code === -3) return '페이로드 초과';
    if (code === -5) return 'GW 큐 가득참';
    if (code === -11) return 'MTMSN 오류';
    return `오류(${code})`;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a1628' }}>

      {/* 헤더 */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,212,240,.18)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ padding: '4px 10px', background: 'rgba(0,212,240,.08)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '11px', cursor: 'pointer' }}>
          ← 목록
        </button>
        <span style={{ fontSize: '14px' }}>📡</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{alias}</div>
          <div style={{ fontSize: '9px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>{imei}</div>
        </div>
        <button onClick={onRefresh} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#00d4f0', cursor: 'pointer', fontSize: '14px' }}>↻</button>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b8fae', fontSize: '13px', marginTop: '40px' }}>메시지가 없습니다.</div>
        ) : messages.map((m, i) => {
          const isRcv = m._type === 'rcv'; // 웹→위성 (내가 보낸 것)
          const isSnd = m._type === 'snd'; // 위성→웹 (위성이 보낸 것)

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isRcv ? 'flex-end' : 'flex-start' }}>
              {isSnd && (
                <span style={{ fontSize: '10px', color: '#6b8fae', marginBottom: '3px', marginLeft: '4px' }}>
                  📡 {alias}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isRcv ? 'row-reverse' : 'row' }}>
                <div style={{
                  maxWidth: '65%', padding: '10px 14px',
                  borderRadius: isRcv ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isRcv ? 'linear-gradient(135deg,#00d4f0,#0891b2)' : 'rgba(255,255,255,.07)',
                  border: isRcv ? 'none' : '1px solid rgba(0,212,240,.15)',
                  color: isRcv ? '#0d1628' : '#e8f4ff',
                  fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word',
                }}>
                  {isSnd && m.title && (
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid rgba(245,158,11,.3)' }}>
                      📌 {m.title}
                    </div>
                  )}
                  {isSnd && m.memo && (
                    <div style={{ fontSize: '12px', color: '#a78bfa' }}>💬 {m.memo}</div>
                  )}
                  {isRcv && <div>{m.text}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRcv ? 'flex-end' : 'flex-start', gap: '2px' }}>
                  <span style={{ fontSize: '9px', color: '#4b6483', whiteSpace: 'nowrap' }}>
                    {formatDate(m.regDate)}
                  </span>
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
                </div>
                {isSuperAdmin && (
                  <button onClick={() => deleteMessage(m.idx || m.id, m._type)}
                    style={{ background: 'none', border: 'none', color: '#4b6483', cursor: 'pointer', fontSize: '10px', padding: '0 4px' }}>🗑</button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,212,240,.15)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="메시지 입력... (Enter 전송, Shift+Enter 줄바꿈)"
              rows={2}
              style={{ width: '100%', padding: '10px 14px', paddingBottom: '20px', borderRadius: '12px', border: `1px solid ${input.length > MAX * 0.9 ? 'rgba(239,68,68,.4)' : 'rgba(0,212,240,.3)'}`, background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <span style={{ position: 'absolute', bottom: '6px', right: '10px', fontSize: '9px', color: input.length > MAX * 0.9 ? '#ef4444' : '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>
              {input.length}/{MAX}
            </span>
          </div>
          <button onClick={sendMessage} disabled={sending || !input.trim() || input.length > MAX}
            style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: sending || !input.trim() ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontSize: '18px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {sending ? '⏳' : '➤'}
          </button>
        </div>
        {draft && input !== draft && (
          <div style={{ marginTop: '6px', fontSize: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📝 임시저장된 내용이 있습니다.
            <button onClick={() => setInput(draft)}
              style={{ background: 'none', border: '1px solid rgba(245,158,11,.3)', borderRadius: '4px', color: '#f59e0b', fontSize: '9px', cursor: 'pointer', padding: '1px 6px' }}>불러오기</button>
          </div>
        )}
      </div>

      <style>{`@keyframes sosBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   메시지 작성 팝업 (웹→위성)
══════════════════════════════════════ */
function ComposePopup({ devices, onClose, onSent }) {
  const [selectedImei, setSelectedImei] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // 'success' | 'fail'
  const MAX = 200;

  const selectedDevice = devices.find(d => d.imei === selectedImei);
  const isIMT = selectedDevice?.type === 'IMT';

  const handleSend = async () => {
    if (!selectedImei || !text.trim()) { alert('장비와 메시지를 입력해주세요.'); return; }
    setSending(true);
    setResult(null);
    try {
      await api.post('/chat/rcv', { imei: selectedImei, text: text.trim() });
      setResult('success');
      setText('');
      onSent();
    } catch (_) { setResult('fail'); }
    finally { setSending(false); }
  };

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', padding: '28px', width: '480px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', color: '#00d4f0' }}>✉️ 메시지 작성 (웹→위성)</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600' }}>수신 장비 선택 *</label>
            <select style={inp} value={selectedImei} onChange={e => setSelectedImei(e.target.value)}>
              <option value="">— 장비 선택 —</option>
              {devices.filter(d => d.active !== false).map(d => (
                <option key={d.imei} value={d.imei}>{d.alias} ({d.imei}) [{d.type}]</option>
              ))}
            </select>
          </div>

          {isIMT && (
            <div style={{ padding: '8px 12px', background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.3)', borderRadius: '8px', fontSize: '11px', color: '#a78bfa' }}>
              💡 IMT 장비 — 최대 80KB 파일 전송 가능
            </div>
          )}

          <div>
            <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600' }}>메시지 *</label>
            <div style={{ position: 'relative' }}>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: '100px', paddingBottom: '20px' }}
                value={text} onChange={e => setText(e.target.value.slice(0, MAX))}
                placeholder="전송할 메시지 입력..." />
              <span style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '9px', color: text.length > MAX * 0.9 ? '#ef4444' : '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>
                {text.length}/{MAX}
              </span>
            </div>
          </div>

          {result === 'success' && (
            <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', borderRadius: '8px', fontSize: '12px', color: '#10b981' }}>
              ✅ 전송 완료! 위성 장비로 전송 대기 중입니다.
            </div>
          )}
          {result === 'fail' && (
            <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '8px', fontSize: '12px', color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              ❌ 전송 실패
              <button onClick={handleSend} style={{ padding: '3px 10px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>재전송</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>닫기</button>
          <button onClick={handleSend} disabled={sending || !selectedImei || !text.trim()}
            style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: sending ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: (!selectedImei || !text.trim()) ? 0.5 : 1 }}>
            {sending ? '⏳ 전송중...' : '▶ 전송'}
          </button>
        </div>
      </div>
    </div>
  );
}