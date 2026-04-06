import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export default function ShareSettings({ devices }) {
  const [selectedImei, setSelectedImei] = useState('');
  const [shares, setShares] = useState([]);
  const [loginId, setLoginId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedImei) fetchShares();
  }, [selectedImei]);

  const fetchShares = async () => {
    try {
      const res = await api.get(`/share/${selectedImei}`);
      setShares(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('공유 목록 조회 실패:', err);
    }
  };

  const handleAdd = async () => {
    if (!selectedImei) return alert('장비를 선택해 주세요.');
    if (!loginId.trim()) return alert('사용자 아이디를 입력해 주세요.');
    setLoading(true);
    try {
      await api.post('/share', { imei: selectedImei, loginId: loginId.trim() });
      setLoginId('');
      fetchShares();
    } catch (err) {
      alert(err.response?.data?.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('공유를 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/share/${id}`);
      fetchShares();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  return (
    <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>

      {/* 헤더 */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
          SHARE SETTINGS
        </span>
        <p style={{ fontSize: '12px', color: '#6b8fae', marginTop: '6px' }}>
          장비별 공유 사용자를 관리합니다.
        </p>
      </div>

      {/* 장비 선택 */}
      <div style={{ background: 'rgba(14,26,46,.97)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: '#6b8fae', marginBottom: '8px', fontFamily: 'monospace' }}>DEVICE 선택</div>
        <select value={selectedImei} onChange={e => setSelectedImei(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px' }}>
          <option value=''>-- 장비 선택 --</option>
          {devices.map(d => (
            <option key={d.imei} value={d.imei}>{d.alias} ({d.imei})</option>
          ))}
        </select>
      </div>

      {selectedImei && (
        <>
          {/* 공유 추가 */}
          <div style={{ background: 'rgba(14,26,46,.97)', border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', color: '#6b8fae', marginBottom: '8px', fontFamily: 'monospace' }}>공유 추가</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="사용자 아이디 입력"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px' }}
              />
              <button onClick={handleAdd} disabled={loading}
                style={{ padding: '8px 20px', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                {loading ? '추가 중...' : '+ 추가'}
              </button>
            </div>
          </div>

          {/* 공유 목록 */}
          <div style={{ border: '1px solid rgba(0,212,240,.18)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '11px 13px', borderBottom: '1px solid rgba(0,212,240,.18)', background: 'rgba(0,0,0,.2)' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
                공유 목록 — {shares.length}명
              </span>
            </div>
            {shares.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#6b8fae', fontSize: '13px' }}>
                공유된 사용자가 없습니다
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,.4)' }}>
                    {['No', 'IMEI', '공유 아이디', '상태', '관리'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'monospace', fontSize: '9px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shares.map((s, i) => (
                    <tr key={s.id}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                      <td style={{ padding: '8px 12px', color: '#4b6483' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px', color: '#7dd3fc', fontFamily: 'monospace' }}>{s.imei}</td>
                      <td style={{ padding: '8px 12px', color: '#fff', fontWeight: '700' }}>{s.sharedLoginId}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,.12)', color: '#10b981' }}>
                          Active
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <button onClick={() => handleDelete(s.id)}
                          style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.1)', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}