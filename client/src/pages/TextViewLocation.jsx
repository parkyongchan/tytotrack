import { useState } from 'react';
import api from '../api/axiosConfig';

export default function TextViewLocation({ devices }) {
  const [selectedImei, setSelectedImei] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!selectedImei) return alert('장비를 선택해 주세요.');
    setLoading(true);
    try {
      const res = await api.get(`/location/${selectedImei}`);
      let result = res.data || [];

      // 날짜 필터링
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

  const parsePosition = (pos) => {
    if (!pos) return {};
    const parts = pos.split(',');
    return {
      lat: parts[0] || '-',
      lon: parts[1] || '-',
      heading: parts[2] || '-',
      speed: parts[3] || '-',
      altitude: parts[4] || '-',
      gmt: parts[5] || '-',
    };
  };

  const formatDate = (d) => {
    if (!d || d.length < 12) return d;
    return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)} ${d.slice(8,10)}:${d.slice(10,12)}:${d.slice(12,14)}`;
  };

  return (
    <div style={{ padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
          TEXT VIEW — LOCATION
        </span>

        {/* 장비 선택 */}
        <select
          value={selectedImei}
          onChange={e => setSelectedImei(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
        >
          <option value=''>-- 장비 선택 --</option>
          {devices.map(d => (
            <option key={d.imei} value={d.imei}>{d.alias} ({d.imei})</option>
          ))}
        </select>

        {/* 시작 날짜 */}
        <input
          type='date'
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px' }}
        />
        <span style={{ color: '#6b8fae' }}>~</span>
        {/* 종료 날짜 */}
        <input
          type='date'
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px' }}
        />

        {/* 조회 버튼 */}
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
        >
          {loading ? '조회 중...' : '🔍 조회'}
        </button>

        {/* 건수 */}
        {data.length > 0 && (
          <span style={{ fontSize: '12px', color: '#00d4f0' }}>
            총 <strong>{data.length}</strong>건
          </span>
        )}
      </div>

      {/* 테이블 */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)', position: 'sticky', top: 0 }}>
              {['No','IMEI','위도','경도','방향(°)','속도(kn)','고도(m)','GMT시간','수신시간','이벤트'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>
                  {loading ? '조회 중...' : '장비를 선택하고 조회 버튼을 클릭하세요'}
                </td>
              </tr>
            ) : data.map((row, i) => {
              const pos = parsePosition(row.position);
              return (
                <tr key={row.idx}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                  <td style={{ padding: '7px 10px', color: '#4b6483', fontFamily: 'monospace' }}>{i + 1}</td>
                  <td style={{ padding: '7px 10px', color: '#7dd3fc', fontFamily: 'monospace' }}>{row.imei}</td>
                  <td style={{ padding: '7px 10px', color: '#10b981', fontFamily: 'monospace' }}>{pos.lat}</td>
                  <td style={{ padding: '7px 10px', color: '#10b981', fontFamily: 'monospace' }}>{pos.lon}</td>
                  <td style={{ padding: '7px 10px', color: '#e8f4ff' }}>{pos.heading}</td>
                  <td style={{ padding: '7px 10px', color: '#e8f4ff' }}>{pos.speed}</td>
                  <td style={{ padding: '7px 10px', color: '#e8f4ff' }}>{pos.altitude}</td>
                  <td style={{ padding: '7px 10px', color: '#6b8fae', fontFamily: 'monospace', fontSize: '10px' }}>{pos.gmt}</td>
                  <td style={{ padding: '7px 10px', color: '#6b8fae', fontFamily: 'monospace', fontSize: '10px', whiteSpace: 'nowrap' }}>{formatDate(row.regDate)}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: row.eventcode === '4' ? 'rgba(239,68,68,.2)' : 'rgba(59,130,246,.15)', color: row.eventcode === '4' ? '#ef4444' : '#60a5fa' }}>
                      {row.eventcode === '4' ? 'SOS' : row.title || 'TRACK'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}