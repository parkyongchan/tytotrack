import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({
    loginId: '', password: '', name: '', email: '', country: '', role: 'REVIEWER'
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      console.log('응답:', res.data);
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('사용자 조회 실패:', err);
      setUsers([]);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, form);
      } else {
        await api.post('/users', form);
      }
      setShowForm(false);
      setEditUser(null);
      setForm({ loginId: '', password: '', name: '', email: '', country: '', role: 'REVIEWER' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setForm({ ...user, password: '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('비활성화 하시겠습니까?')) return;
    await api.delete(`/users/${id}`);
    fetchUsers();
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '7px',
    border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,0,0,.3)',
    color: '#fff', fontSize: '12px', boxSizing: 'border-box'
  };

  return (
    <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
          USER MANAGEMENT
        </span>
        <button onClick={() => { setShowForm(true); setEditUser(null); setForm({ loginId: '', password: '', name: '', email: '', country: '', role: 'REVIEWER' }); }}
          style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
          + 사용자 추가
        </button>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div style={{ background: 'rgba(14,26,46,.97)', border: '1px solid rgba(0,212,240,.3)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#00d4f0', marginBottom: '16px' }}>
            {editUser ? '✏️ 사용자 수정' : '➕ 사용자 추가'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {!editUser && (
              <div>
                <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>아이디 *</label>
                <input style={inputStyle} value={form.loginId} onChange={e => setForm(p => ({ ...p, loginId: e.target.value }))} placeholder="아이디" />
              </div>
            )}
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>비밀번호</label>
              <input style={inputStyle} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="비밀번호" />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>이름 *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="이름" />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>이메일</label>
              <input style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="이메일" />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>국가</label>
              <input style={inputStyle} value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="국가" />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '4px' }}>권한</label>
              <select style={inputStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="SUPER_ADMIN">SUPER ADMIN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="REVIEWER">REVIEWER</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditUser(null); }}
              style={{ padding: '7px 16px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '12px' }}>
              취소
            </button>
            <button onClick={handleSubmit}
              style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
              {editUser ? '수정' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* 사용자 테이블 */}
      <div style={{ border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,.2)', fontSize: '11px', color: '#6b8fae' }}>
          총 {users.length}명
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)' }}>
              {['No', '아이디', '이름', '이메일', '국가', '권한', '상태', '관리'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'monospace', fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>사용자 없음</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                <td style={{ padding: '8px 12px', color: '#4b6483' }}>{i + 1}</td>
                <td style={{ padding: '8px 12px', color: '#7dd3fc', fontFamily: 'monospace' }}>{u.loginId}</td>
                <td style={{ padding: '8px 12px', color: '#fff', fontWeight: '700' }}>{u.name}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{u.email}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{u.country}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                    background: u.role === 'SUPER_ADMIN' ? 'rgba(239,68,68,.15)' : u.role === 'ADMIN' ? 'rgba(245,158,11,.15)' : 'rgba(59,130,246,.15)',
                    color: u.role === 'SUPER_ADMIN' ? '#ef4444' : u.role === 'ADMIN' ? '#f59e0b' : '#60a5fa' }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                    background: u.active ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
                    color: u.active ? '#10b981' : '#ef4444' }}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleEdit(u)}
                      style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', cursor: 'pointer', fontSize: '10px' }}>
                      수정
                    </button>
                    <button onClick={() => handleDelete(u.id)}
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