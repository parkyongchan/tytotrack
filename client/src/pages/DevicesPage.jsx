import { useState } from 'react';
import api from '../api/axiosConfig';

export default function DevicesPage({ devices, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [form, setForm] = useState({
    imei: '', alias: '', model: '', type: '', satellite: 'IRIDIUM', profileName: ''
  });

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '7px',
    border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)',
    color: '#fff', fontSize: '12px', boxSizing: 'border-box'
  };

  const handleSubmit = async () => {
    try {
      if (editDevice) {
        await api.put(`/devices/${editDevice.imei}`, form);
      } else {
        await api.post('/devices', form);
      }
      setShowForm(false);
      setEditDevice(null);
      setForm({ imei: '', alias: '', model: '', type: '', satellite: 'IRIDIUM', profileName: '' });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleEdit = (device) => {
    setEditDevice(device);
    setForm({
      imei: device.imei,
      alias: device.alias || '',
      model: device.model || '',
      type: device.type || '',
      satellite: device.satellite || 'IRIDIUM',
      profileName: device.profileName || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (imei) => {
    if (!confirm(`${imei} 장비를 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/devices/${imei}`);
      onRefresh();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  return (
    <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
          DEVICE SETTINGS
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onRefresh}
            style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
            ↻ 새로고침
          </button>
          <button onClick={() => { setShowForm(true); setEditDevice(null); setForm({ imei: '', alias: '', model: '', type: '', satellite: 'IRIDIUM', profileName: '' }); }}
            style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            + 장비 등록
          </button>
        </div>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div style={{ background: 'rgba(14,26,46,.97)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#00d4f0', marginBottom: '16px', letterSpacing: '1px' }}>
            {editDevice ? '✏️ 장비 수정' : '➕ 장비 등록'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>IMEI *</label>
              <input style={inputStyle} value={form.imei}
                onChange={e => setForm(p => ({ ...p, imei: e.target.value }))}
                disabled={!!editDevice} placeholder="IMEI (15자리)" />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>Alias *</label>
              <input style={inputStyle} value={form.alias}
                onChange={e => setForm(p => ({ ...p, alias: e.target.value }))}
                placeholder="장비 별칭" />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>Model</label>
              <select style={inputStyle} value={form.model}
                onChange={e => setForm(p => ({ ...p, model: e.target.value }))}>
                <option value=''>선택</option>
                <option value='TYTO2'>TYTO2</option>
                <option value='TYTO5'>TYTO5</option>
                <option value='TYTO6'>TYTO6</option>
                <option value='TYTO100'>TYTO100</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>Type</label>
              <select style={inputStyle} value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value=''>선택</option>
                <option value='SBD'>SBD</option>
                <option value='TMIT'>TMIT</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>Satellite</label>
              <select style={inputStyle} value={form.satellite}
                onChange={e => setForm(p => ({ ...p, satellite: e.target.value }))}>
                <option value='IRIDIUM'>IRIDIUM</option>
                <option value='GLOBALSTAR'>GLOBALSTAR</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>Profile Name</label>
              <input style={inputStyle} value={form.profileName}
                onChange={e => setForm(p => ({ ...p, profileName: e.target.value }))}
                placeholder="프로파일명" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditDevice(null); }}
              style={{ padding: '7px 16px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '12px' }}>
              취소
            </button>
            <button onClick={handleSubmit}
              style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
              {editDevice ? '수정' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* 장비 테이블 */}
      <div style={{ border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)' }}>
              {['No','IMEI','Alias','Model','Type','Satellite','Profile','위도','경도','속도','상태','관리'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr><td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>등록된 장비 없음</td></tr>
            ) : devices.map((d, i) => (
              <tr key={d.id}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                <td style={{ padding: '8px 10px', color: '#4b6483' }}>{i + 1}</td>
                <td style={{ padding: '8px 10px', color: '#7dd3fc', fontFamily: 'monospace', fontSize: '10px' }}>{d.imei}</td>
                <td style={{ padding: '8px 10px', color: '#fff', fontWeight: '700' }}>{d.alias}</td>
                <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.model}</td>
                <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.type}</td>
                <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.satellite}</td>
                <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.profileName || '-'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '10px', color: '#10b981' }}>{d.lat?.toFixed(4) || '-'}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '10px', color: '#10b981' }}>{d.lon?.toFixed(4) || '-'}</td>
                <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.speed ? `${d.speed}kn` : '-'}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: d.active ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)', color: d.active ? '#10b981' : '#ef4444' }}>
                    {d.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleEdit(d)}
                      style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', cursor: 'pointer', fontSize: '10px' }}>
                      수정
                    </button>
                    <button onClick={() => handleDelete(d.imei)}
                      style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.1)', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}