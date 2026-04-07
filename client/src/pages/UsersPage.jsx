import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const lang = localStorage.getItem('lang') || 'ko';

const T = {
  ko: {
    title: 'USER MANAGEMENT', addBtn: '+ 사용자 추가', addTitle: '사용자 추가', editTitle: '사용자 수정',
    loginId: '사용자 ID', pw: '비밀번호', pwConfirm: '비밀번호 확인', name: '이름', role: '권한',
    email: '이메일', country: 'COUNTRY', phone: '연락처', locFmt: 'LOCATION FORMAT',
    speedUnit: 'SPEED UNIT', gmtZone: 'GMT ZONE', tvRefresh: 'TEXT VIEW REFRESH',
    securecard: 'SECURECARD REISSUE', securecardBtn: '재발급 전송', assignedDevices: '할당 장비',
    cancel: '취소', save: '저장', edit: '수정', delete: '삭제', dupCheck: '중복체크',
    total: '총', persons: '명', no: 'No', id: '아이디', status: '상태', manage: '관리',
    active: 'Active', inactive: 'Inactive', pwNoMatch: '비밀번호가 일치하지 않습니다.',
    confirmDelete: '삭제 하시겠습니까?', loginIdFixed: '수정 시 ID 고정',
    use: 'Use', disuse: 'Disuse',
  },
  en: {
    title: 'USER MANAGEMENT', addBtn: '+ Add User', addTitle: 'Add User', editTitle: 'Edit User',
    loginId: 'User ID', pw: 'Password', pwConfirm: 'Confirm Password', name: 'Name', role: 'Role',
    email: 'Email', country: 'Country', phone: 'Phone', locFmt: 'Location Format',
    speedUnit: 'Speed Unit', gmtZone: 'GMT Zone', tvRefresh: 'Text View Refresh',
    securecard: 'Securecard Reissue', securecardBtn: 'Send Reissue', assignedDevices: 'Assigned Devices',
    cancel: 'Cancel', save: 'Save', edit: 'Edit', delete: 'Delete', dupCheck: 'Check',
    total: 'Total', persons: 'users', no: 'No', id: 'ID', status: 'Status', manage: 'Actions',
    active: 'Active', inactive: 'Inactive', pwNoMatch: 'Passwords do not match.',
    confirmDelete: 'Are you sure you want to delete?', loginIdFixed: 'ID cannot be changed',
    use: 'Use', disuse: 'Disuse',
  },
  ja: {
    title: 'USER MANAGEMENT', addBtn: '+ ユーザー追加', addTitle: 'ユーザー追加', editTitle: 'ユーザー編集',
    loginId: 'ユーザーID', pw: 'パスワード', pwConfirm: 'パスワード確認', name: '名前', role: '権限',
    email: 'メール', country: '国', phone: '連絡先', locFmt: '位置情報フォーマット',
    speedUnit: '速度単位', gmtZone: 'GMTゾーン', tvRefresh: 'テキスト更新',
    securecard: 'セキュアカード再発行', securecardBtn: '再発行送信', assignedDevices: '割当デバイス',
    cancel: 'キャンセル', save: '保存', edit: '編集', delete: '削除', dupCheck: '重複確認',
    total: '合計', persons: '人', no: 'No', id: 'ID', status: 'ステータス', manage: '管理',
    active: 'Active', inactive: 'Inactive', pwNoMatch: 'パスワードが一致しません。',
    confirmDelete: '削除しますか？', loginIdFixed: 'ID変更不可',
    use: '使用', disuse: '不使用',
  },
};

const t = T[lang] || T.ko;

const GMT_ZONES = [
  { value: -12, label: 'GMT-12' }, { value: -11, label: 'GMT-11' }, { value: -10, label: 'GMT-10' },
  { value: -9, label: 'GMT-9' }, { value: -8, label: 'GMT-8' }, { value: -7, label: 'GMT-7' },
  { value: -6, label: 'GMT-6' }, { value: -5, label: 'GMT-5' }, { value: -4, label: 'GMT-4' },
  { value: -3, label: 'GMT-3' }, { value: -2, label: 'GMT-2' }, { value: -1, label: 'GMT-1' },
  { value: 0, label: 'GMT+0 (UTC)' }, { value: 1, label: 'GMT+1' }, { value: 2, label: 'GMT+2' },
  { value: 3, label: 'GMT+3' }, { value: 4, label: 'GMT+4' }, { value: 5, label: 'GMT+5' },
  { value: 5.5, label: 'GMT+5:30 (IST)' }, { value: 6, label: 'GMT+6' }, { value: 7, label: 'GMT+7' },
  { value: 8, label: 'GMT+8 (CST)' }, { value: 9, label: 'GMT+9 (KST/JST)' },
  { value: 10, label: 'GMT+10' }, { value: 11, label: 'GMT+11' }, { value: 12, label: 'GMT+12' },
];

const REFRESH_MINS = [1, 2, 3, 5, 10, 15, 30];

const initForm = {
  loginId: '', password: '', passwordConfirm: '', name: '', role: 'REVIEWER',
  email: '', country: '', phone: '', locationFormat: 'DD', speedUnit: 'KN',
  gmtZone: 9, textViewRefresh: true, textViewRefreshMin: 1, active: true,
  assignedDeviceImeis: [],
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(initForm);
  const [pwMsg, setPwMsg] = useState('');
  const [dupMsg, setDupMsg] = useState({ text: '', ok: false });
  const [dupChecked, setDupChecked] = useState(false);
  const [page, setPage] = useState(1);
  const [securecardMsg, setSecurecardMsg] = useState('');
  const PER_PAGE = 10;

  // 현재 로그인 사용자 role
  const myRole = localStorage.getItem('role') || 'REVIEWER';

  useEffect(() => { fetchUsers(); fetchDevices(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { setUsers([]); }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.content || []);
    } catch { setDevices([]); }
  };

  const checkDup = async () => {
    if (form.loginId.length < 5) { setDupMsg({ text: '5자 이상 입력하세요.', ok: false }); return; }
    try {
      const res = await api.get(`/users/check?loginId=${form.loginId}`);
      if (res.data.exists) { setDupMsg({ text: '이미 사용중인 ID입니다.', ok: false }); setDupChecked(false); }
      else { setDupMsg({ text: '사용 가능한 ID입니다.', ok: true }); setDupChecked(true); }
    } catch { setDupMsg({ text: 'ID check failed.', ok: false }); }
  };

  const handleSubmit = async () => {
    if (!editUser && !dupChecked) { alert('아이디 중복체크를 해주세요.'); return; }
    if (form.password !== form.passwordConfirm) { setPwMsg(t.pwNoMatch); return; }
    try {
      const payload = { ...form };
      delete payload.passwordConfirm;
      if (editUser) {
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editUser.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      closeForm();
      fetchUsers();
    } catch (err) { alert(err.response?.data?.message || '오류가 발생했습니다.'); }
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setForm({ ...initForm, ...user, password: '', passwordConfirm: '',
      assignedDeviceImeis: user.assignedDeviceImeis || [] });
    setDupChecked(true);
    setPwMsg('');
    setDupMsg({ text: '', ok: false });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    await api.delete(`/users/${id}`);
    fetchUsers();
  };

  const closeForm = () => {
    setShowForm(false); setEditUser(null);
    setForm(initForm); setPwMsg(''); setDupMsg({ text: '', ok: false }); setDupChecked(false);
  };

  const sendSecurecard = async () => {
    try {
      await api.post(`/users/${editUser?.id}/securecard`);
      setSecurecardMsg('발송 완료!');
      setTimeout(() => setSecurecardMsg(''), 2000);
    } catch { setSecurecardMsg('발송 실패'); }
  };

  const toggleDevice = (imei) => {
    setForm(p => ({
      ...p,
      assignedDeviceImeis: p.assignedDeviceImeis.includes(imei)
        ? p.assignedDeviceImeis.filter(i => i !== imei)
        : [...p.assignedDeviceImeis, imei]
    }));
  };

  // 권한별 role 선택 옵션
  const roleOptions = myRole === 'SUPER_ADMIN'
    ? ['SUPER_ADMIN', 'ADMIN', 'REVIEWER']
    : ['ADMIN', 'REVIEWER'];

  const totalPages = Math.ceil(users.length / PER_PAGE);
  const paged = users.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)',
    color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none',
    fontFamily: "'Syne', sans-serif",
  };

  const lbl = { fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600', letterSpacing: '0.5px' };

  return (
    <div style={{ padding: '16px', flex: 1, overflowY: 'auto', background: '#0d1628' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
          {t.title}
        </span>
        {myRole !== 'REVIEWER' && (
          <button onClick={() => { closeForm(); setShowForm(true); }}
            style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            {t.addBtn}
          </button>
        )}
      </div>

      {/* 등록/수정 모달 */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && closeForm()}>
          <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', padding: '28px', width: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>

            {/* 모달 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', color: '#00d4f0' }}>
                👤 {editUser ? t.editTitle : t.addTitle}
              </span>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

              {/* 사용자 ID */}
              <div>
                <label style={lbl}>{t.loginId} *</label>
                {editUser ? (
                  <div style={{ ...inp, color: '#6b8fae', background: 'rgba(0,0,0,.5)' }}>{form.loginId}</div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input style={{ ...inp, flex: 1, borderColor: dupMsg.ok ? '#10b981' : dupMsg.text ? '#ef4444' : 'rgba(0,212,240,.25)' }}
                      value={form.loginId} onChange={e => { setForm(p => ({ ...p, loginId: e.target.value })); setDupChecked(false); setDupMsg({ text: '', ok: false }); }}
                      placeholder="Min. 5 characters" />
                    <button onClick={checkDup}
                      style={{ padding: '0 14px', background: 'rgba(0,212,240,.12)', border: '1px solid #00d4f0', borderRadius: '8px', color: '#00d4f0', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {t.dupCheck}
                    </button>
                  </div>
                )}
                {dupMsg.text && <p style={{ fontSize: '10px', color: dupMsg.ok ? '#10b981' : '#ef4444', marginTop: '4px' }}>{dupMsg.text}</p>}
              </div>

              {/* 권한 */}
              <div>
                <label style={lbl}>{t.role} *</label>
                <select style={inp} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* 비밀번호 */}
              <div>
                <label style={lbl}>{t.pw} *</label>
                <input style={inp} type="password" value={form.password}
                  onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setPwMsg(''); }}
                  placeholder="••••••••" />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label style={lbl}>{t.pwConfirm} *</label>
                <input style={{ ...inp, borderColor: pwMsg ? '#ef4444' : 'rgba(0,212,240,.25)' }} type="password"
                  value={form.passwordConfirm}
                  onChange={e => { setForm(p => ({ ...p, passwordConfirm: e.target.value })); setPwMsg(''); }}
                  placeholder="••••••••" />
                {pwMsg && <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>{pwMsg}</p>}
              </div>

              {/* 이름 */}
              <div>
                <label style={lbl}>{t.name} *</label>
                <input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t.name} />
              </div>

              {/* 이메일 */}
              <div>
                <label style={lbl}>{t.email} *</label>
                <input style={inp} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder={t.email} />
              </div>

              {/* 연락처 */}
              <div>
                <label style={lbl}>{t.phone}</label>
                <input style={inp} value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="010-0000-0000" />
              </div>

              {/* 국가 */}
              <div>
                <label style={lbl}>{t.country}</label>
                <input style={inp} value={form.country || ''} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder={t.country} />
              </div>

              {/* Location Format */}
              <div>
                <label style={lbl}>{t.locFmt}</label>
                <select style={inp} value={form.locationFormat || 'DD'} onChange={e => setForm(p => ({ ...p, locationFormat: e.target.value }))}>
                  <option value="DD">DD (Decimal Degrees) — 기본</option>
                  <option value="DMS">DMS (Degrees Minutes Seconds)</option>
                </select>
              </div>

              {/* Speed Unit */}
              <div>
                <label style={lbl}>{t.speedUnit}</label>
                <select style={inp} value={form.speedUnit || 'KN'} onChange={e => setForm(p => ({ ...p, speedUnit: e.target.value }))}>
                  <option value="KN">Knots (kn) — 기본</option>
                  <option value="KMH">km/h</option>
                  <option value="MPH">Mile/h</option>
                </select>
              </div>

              {/* GMT Zone */}
              <div>
                <label style={lbl}>{t.gmtZone}</label>
                <select style={inp} value={form.gmtZone ?? 9} onChange={e => setForm(p => ({ ...p, gmtZone: parseFloat(e.target.value) }))}>
                  {GMT_ZONES.map(g => <option key={g.value} value={g.value}>{g.label}{g.value === 9 ? ' — 기본 (KST)' : ''}</option>)}
                </select>
              </div>

              {/* Text View Refresh */}
              <div>
                <label style={lbl}>{t.tvRefresh}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select style={{ ...inp, flex: 1 }} value={form.textViewRefresh ? 'use' : 'disuse'}
                    onChange={e => setForm(p => ({ ...p, textViewRefresh: e.target.value === 'use' }))}>
                    <option value="use">{t.use}</option>
                    <option value="disuse">{t.disuse}</option>
                  </select>
                  <select style={{ ...inp, flex: 1 }} value={form.textViewRefreshMin || 1}
                    onChange={e => setForm(p => ({ ...p, textViewRefreshMin: parseInt(e.target.value) }))}>
                    {REFRESH_MINS.map(m => <option key={m} value={m}>{m}분{m === 1 ? ' — 기본' : ''}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 할당 장비 (SUPER_ADMIN 제외) */}
            {form.role !== 'SUPER_ADMIN' && devices.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <label style={lbl}>{t.assignedDevices}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'rgba(0,0,0,.2)', borderRadius: '8px', border: '1px solid rgba(0,212,240,.15)' }}>
                  {devices.map(d => {
                    const checked = form.assignedDeviceImeis?.includes(d.imei);
                    return (
                      <label key={d.imei} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleDevice(d.imei)} style={{ display: 'none' }} />
                        <div style={{ width: '14px', height: '14px', border: `1.5px solid ${checked ? '#00d4f0' : 'rgba(255,255,255,.2)'}`, borderRadius: '3px', background: checked ? '#00d4f0' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#0d1628' }}>
                          {checked ? '✓' : ''}
                        </div>
                        <span style={{ fontSize: '11px', color: checked ? '#e8f4ff' : '#6b8fae' }}>{d.alias}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Securecard Reissue (수정 시만) */}
            {editUser && (
              <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(0,0,0,.2)', borderRadius: '8px', border: '1px solid rgba(0,212,240,.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#6b8fae' }}>{t.securecard}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {securecardMsg && <span style={{ fontSize: '11px', color: '#10b981' }}>{securecardMsg}</span>}
                  <button onClick={sendSecurecard}
                    style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                    📧 {t.securecardBtn}
                  </button>
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={closeForm}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>
                {t.cancel}
              </button>
              <button onClick={handleSubmit}
                style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 테이블 */}
      <div style={{ border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', background: 'rgba(0,0,0,.2)', fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
          {t.total} {users.length}{t.persons}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)' }}>
              {[t.no, t.id, t.name, t.email, t.country, 'GMT', t.role, t.status, t.manage].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>사용자 없음</td></tr>
            ) : paged.map((u, i) => (
              <tr key={u.id}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,240,.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                <td style={{ padding: '8px 12px', color: '#4b6483' }}>{(page-1)*PER_PAGE + i + 1}</td>
                <td style={{ padding: '8px 12px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace" }}>{u.loginId}</td>
                <td style={{ padding: '8px 12px', color: '#fff', fontWeight: '700' }}>{u.name}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{u.email}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{u.country}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
                  GMT{u.gmtZone >= 0 ? '+' : ''}{u.gmtZone ?? 9}
                </td>
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
                    {u.active ? t.active : t.inactive}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {myRole !== 'REVIEWER' && (
                      <button onClick={() => handleEdit(u)}
                        style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', cursor: 'pointer', fontSize: '10px' }}>
                        {t.edit}
                      </button>
                    )}
                    {myRole !== 'REVIEWER' && (
                      <button onClick={() => handleDelete(u.id)}
                        style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.1)', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>
                        {t.delete}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
              {page}/{totalPages} page
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setPage(1)} disabled={page === 1}
                style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: '3px 8px', background: p === page ? '#00d4f0' : 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: p === page ? '#0d1628' : '#00d4f0', cursor: 'pointer', fontSize: '10px', fontWeight: p === page ? '700' : '400' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}