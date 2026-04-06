import { useState } from 'react';
import api from '../api/axiosConfig';

export default function TextViewData({ devices }) {
  const [selectedImei, setSelectedImei] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fetchData = async () => {
    if (!selectedImei) return alert('장비를 선택해 주세요.');
    setLoading(true);
    try {
      const res = await api.get(`/location/${selectedImei}`);
      let result = res.data || [];

      if (startDate) {
        const start = startDate.replace(/-/g, '');
        result = result.filter(d => d.regDate >= start + '000000');
      }
      if (endDate) {
        const end = endDate.replace(/-/g, '');
        result = result.filter(d => d.regDate <= end + '235959');
      }

      setData(result);
    } catch (err) {
      console.error('조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d || d.length < 12) return d;
    return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)} ${d.slice(8,10)}:${d.slice(10,12)}:${d.slice(12,14)}`;
  };

  const filteredData = data.filter(d => {
    if (activeTab === 'all') return true;
    if (activeTab === 'ver') return d.eventcode === '1';
    if (activeTab === 'can') return d.eventcode === '2' || d.eventcode === '3';
    if (activeTab === 'sos') return d.eventcode === '4';
    return true;
  });

  const tabs = [
    { id: 'all', label: 'ALL' },
    { id: 'ver', label: 'VER' },
    { id: 'can', label: 'CAN' },
    { id: 'sos', label: 'SOS' },
  ];

  return (
    <div style={{ padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
          TEXT VIEW — DATA
        </span>

        <select value={selectedImei} onChange={e => setSelectedImei(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px' }}>
          <option value=''>-- 장비 선택 --</option>
          {devices.map(d => (
            <option key={d.imei} value={d.imei}>{d.alias} ({d.imei})</option>
          ))}
        </select>

        <input type='date' value={startDate} onChange={e => setStartDate(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px' }} />
        <span style={{ color: '#6b8fae' }}>~</span>
        <input type='date' value={endDate} onChange={e => setEndDate(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px' }} />

        <button onClick={fetchData} disabled={loading}
          style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
          {loading ? '조회 중...' : '🔍 조회'}
        </button>

        {data.length > 0 && (
          <span style={{ fontSize: '12px', color: '#00d4f0' }}>
            총 <strong>{filteredData.length}</strong>건
          </span>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '5px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'linear-gradient(135deg,#00d4f0,#0891b2)' : 'rgba(255,255,255,.06)',
              color: activeTab === tab.id ? '#0d1628' : '#6b8fae',
              fontWeight: '700', fontSize: '11px', fontFamily: 'monospace'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)', position: 'sticky', top: 0 }}>
              {['No','IMEI','타입','VER','CAN','ETC1(Istat)','ETC2(Sstat)','ETC4(IMT)','수신시간'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>
                  {loading ? '조회 중...' : '장비를 선택하고 조회 버튼을 클릭하세요'}
                </td>
              </tr>
            ) : filteredData.map((row, i) => (
              <tr key={row.idx}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                <td style={{ padding: '7px 10px', color: '#4b6483', fontFamily: 'monospace' }}>{i + 1}</td>
                <td style={{ padding: '7px 10px', color: '#7dd3fc', fontFamily: 'monospace' }}>{row.imei}</td>
                <td style={{ padding: '7px 10px' }}>
                  <span style={{
                    fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px',
                    background: row.eventcode === '4' ? 'rgba(239,68,68,.2)' : row.eventcode === '1' ? 'rgba(245,158,11,.15)' : 'rgba(59,130,246,.15)',
                    color: row.eventcode === '4' ? '#ef4444' : row.eventcode === '1' ? '#f59e0b' : '#60a5fa'
                  }}>
                    {row.eventcode === '4' ? 'SOS' : row.eventcode === '1' ? 'VER' : 'CAN'}
                  </span>
                </td>
                <td style={{ padding: '7px 10px', color: '#e8f4ff', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={row.ver}>{row.ver || '-'}</td>
                <td style={{ padding: '7px 10px', color: '#e8f4ff', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={row.can}>{row.can || '-'}</td>
                <td style={{ padding: '7px 10px', color: '#6b8fae' }}>{row.etc1 || '-'}</td>
                <td style={{ padding: '7px 10px', color: '#6b8fae' }}>{row.etc2 || '-'}</td>
                <td style={{ padding: '7px 10px', color: '#6b8fae' }}>{row.etc4 || '-'}</td>
                <td style={{ padding: '7px 10px', color: '#6b8fae', fontFamily: 'monospace', fontSize: '10px', whiteSpace: 'nowrap' }}>
                  {formatDate(row.regDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}