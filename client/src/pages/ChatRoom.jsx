import { useState, useEffect, useRef } from 'react';
import api from '../api/axiosConfig';

export default function ChatRoom({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [room] = useState('general');
  const [lastId, setLastId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { fetchMessages(); }, []);

  useEffect(() => {
    const timer = setInterval(() => { fetchNewMessages(); }, 3000);
    return () => clearInterval(timer);
  }, [lastId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${room}`);
      const data = res.data || [];
      setMessages(data);
      if (data.length > 0) setLastId(data[data.length - 1].id);
    } catch (err) { console.error('채팅 조회 실패:', err); }
  };

  const fetchNewMessages = async () => {
    if (!lastId) return;
    try {
      const res = await api.get(`/chat/${room}?lastId=${lastId}`);
      const data = res.data || [];
      if (data.length > 0) {
        setMessages(prev => [...prev, ...data]);
        setLastId(data[data.length - 1].id);
      }
    } catch (err) {}
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      await api.post(`/chat/${room}`, { sender: user.name, message: input.trim() });
      setInput('');
      fetchMessages();
    } catch (err) { console.error('메시지 전송 실패:', err); }
  };

  const formatDate = (d) => {
    if (!d || d.length < 12) return '';
    return `${d.slice(8,10)}:${d.slice(10,12)}`;
  };

  const isMyMessage = (msg) => msg.sender === user.name;

  return (
    <>
      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          padding: 16px;
          gap: 12px;
          overflow: hidden;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 4px;
          min-height: 0;
          overscroll-behavior: contain;
        }
        .chat-input-wrap {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .chat-container {
            padding: 12px;
            gap: 8px;
          }
        }
      `}</style>

      <div className="chat-container">

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
            💬 CHAT ROOM
          </span>
          <span style={{ fontSize: '11px', color: '#6b8fae' }}>— General</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '11px', color: '#10b981' }}>실시간</span>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b8fae', fontSize: '13px', marginTop: '40px' }}>
              메시지가 없습니다. 첫 메시지를 보내보세요! 😊
            </div>
          ) : messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMyMessage(msg) ? 'flex-end' : 'flex-start' }}>
              {!isMyMessage(msg) && (
                <span style={{ fontSize: '10px', color: '#6b8fae', marginBottom: '3px', marginLeft: '4px' }}>
                  {msg.sender}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isMyMessage(msg) ? 'row-reverse' : 'row' }}>
                <div style={{
                  maxWidth: '65%', padding: '10px 14px',
                  borderRadius: isMyMessage(msg) ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMyMessage(msg) ? 'linear-gradient(135deg,#00d4f0,#0891b2)' : 'rgba(255,255,255,.07)',
                  border: isMyMessage(msg) ? 'none' : '1px solid rgba(0,212,240,.15)',
                  color: isMyMessage(msg) ? '#0d1628' : '#e8f4ff',
                  fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word',
                  fontWeight: isMyMessage(msg) ? '600' : '400'
                }}>
                  {msg.message}
                </div>
                <span style={{ fontSize: '9px', color: '#4b6483', whiteSpace: 'nowrap' }}>
                  {formatDate(msg.regDate)}
                </span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="chat-input-wrap">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="메시지 입력... (Enter로 전송)"
            style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: '13px', outline: 'none' }}
          />
          <button onClick={sendMessage}
            style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ➤
          </button>
        </div>
      </div>
    </>
  );
}