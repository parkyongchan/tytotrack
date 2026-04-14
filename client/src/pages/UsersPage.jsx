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
  assignedDeviceImeis: [], companyId: '',
};

export default function UsersPage({ user, devices: propDevices = [] }) {
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
  const [searchKeyword, setSearchKeyword] = useState('');
  const [checkedIds, setCheckedIds] = useState([]);
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
      const allDevices = res.data.content || [];
      // 권한별 장비 필터링
      if (myRole === 'SUPER_ADMIN') {
        setDevices(allDevices);
      } else {
        // ADMIN/REVIEWER: 본인에게 할당된 장비만
        const myAssigned = user?.assignedDeviceImeis || propDevices.map(d => d.imei);
        setDevices(allDevices.filter(d => myAssigned.includes(d.imei)));
      }
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
    if (!form.companyId?.trim()) {
      alert('Company ID는 필수입니다.');
      return;
    }
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
    setForm({
      ...initForm, ...user, password: '', passwordConfirm: '',
      assignedDeviceImeis: user.assignedDeviceImeis || []
    });
    setDupChecked(true);
    setPwMsg('');
    setDupMsg({ text: '', ok: false });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (e) { alert('삭제 실패'); }
  };

  const closeForm = () => {
    setShowForm(false); setEditUser(null);
    setForm({ ...initForm, companyId: myRole === 'ADMIN' ? (user?.companyId || '') : '' });
    setPwMsg(''); setDupMsg({ text: '', ok: false }); setDupChecked(false);
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

  // 검색 필터링 + 최신 등록순 정렬
  const filteredUsers = users
    .filter(u => {
      if (!searchKeyword.trim()) return true;
      const kw = searchKeyword.toLowerCase();
      return (
        u.loginId?.toLowerCase().includes(kw) ||
        u.name?.toLowerCase().includes(kw) ||
        u.companyId?.toLowerCase().includes(kw) ||
        u.role?.toLowerCase().includes(kw)
      );
    })
    .sort((a, b) => {
      const aDate = a.createdAt || '';
      const bDate = b.createdAt || '';
      return bDate > aDate ? 1 : bDate < aDate ? -1 : 0;
    });
   

  const toggleCheck = (id) => {
    setCheckedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAllCheck = () => {
    const pagedIds = paged.map(u => u.id);
    const allChecked = pagedIds.every(id => checkedIds.includes(id));
    if (allChecked) setCheckedIds(prev => prev.filter(id => !pagedIds.includes(id)));
    else setCheckedIds(prev => [...new Set([...prev, ...pagedIds])]);
  };

  const handleBulkDelete = async () => {
    if (checkedIds.length === 0) return;
    if (!confirm(`선택한 ${checkedIds.length}명을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(checkedIds.map(id => api.delete(`/users/${id}`)));
      setCheckedIds([]);
      fetchUsers();
    } catch { alert('삭제 실패'); }
  };

  const totalPages = Math.ceil(filteredUsers.length / PER_PAGE);
  const paged = filteredUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0' }}>
          {t.title}
        </span>

        {/* 검색창 */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#6b8fae' }}>🔍</span>
          <input
            value={searchKeyword}
            onChange={e => { setSearchKeyword(e.target.value); setPage(1); }}
            placeholder="ID / 이름 / Company / 권한"
            style={{ padding: '6px 12px 6px 30px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,212,240,.25)', borderRadius: '8px', color: '#fff', fontSize: '11px', outline: 'none', width: '220px' }}
          />
          {searchKeyword && (
            <button onClick={() => { setSearchKeyword(''); setPage(1); }}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '12px' }}>✕</button>
          )}
        </div>
        <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
          {filteredUsers.length}{t.persons}
          {searchKeyword && <span style={{ color: '#f59e0b', marginLeft: '6px' }}>검색중</span>}
        </span>

        {/* 선택삭제 */}
        {myRole !== 'REVIEWER' && checkedIds.length > 0 && (
          <button onClick={handleBulkDelete}
            style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.15)', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            🗑 선택삭제 ({checkedIds.length})
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
        {myRole !== 'REVIEWER' && (
          <InviteCodeBtn userCompanyId={user?.companyId} />
        )}

        {myRole !== 'REVIEWER' && (
          <button onClick={() => {
            setForm({ ...initForm, companyId: myRole !== 'SUPER_ADMIN' ? (user?.companyId || '') : '' });
            setEditUser(null); setPwMsg(''); setDupMsg({ text: '', ok: false }); setDupChecked(false);
            setShowForm(true);
          }}
            style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            {t.addBtn}
          </button>
        )}
        </div>
      </div>

      {/* 등록/수정 모달 */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                {myRole === 'REVIEWER' ? (
                  <div style={{ ...inp, color: '#6b8fae', background: 'rgba(0,0,0,.5)' }}>{form.role}</div>
                ) : (
                  <select style={inp} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
              </div>

              {/* 비밀번호 — REVIEWER는 본인 수정 시만, SUPER_ADMIN은 항상 */}
              {(myRole === 'SUPER_ADMIN' ||
                myRole === 'ADMIN' ||
                (editUser && editUser.loginId === localStorage.getItem('loginId'))
              ) && (
                <>
                  <div>
                    <label style={lbl}>{t.pw}</label>
                    <input style={inp} type="password" value={form.password}
                      onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setPwMsg(''); }}
                      placeholder="••••••••" />
                  </div>
                  <div>
                    <label style={lbl}>{t.pwConfirm}</label>
                    <input style={{ ...inp, borderColor: pwMsg ? '#ef4444' : 'rgba(0,212,240,.25)' }} type="password"
                      value={form.passwordConfirm}
                      onChange={e => { setForm(p => ({ ...p, passwordConfirm: e.target.value })); setPwMsg(''); }}
                      placeholder="••••••••" />
                    {pwMsg && <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>{pwMsg}</p>}
                  </div>
                </>
              )}

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

              {/* Company ID */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>
                  COMPANY ID <span style={{ color: '#ef4444' }}>* 필수</span>
                  <span style={{ color: '#4b6483', fontSize: '9px', marginLeft: '6px' }}>같은 회사 Admin/Reviewer끼리 공유</span>
                </label>
                {(() => {
                  const isLocked = myRole === 'REVIEWER' || myRole === 'ADMIN';
                  const placeholder = myRole === 'SUPER_ADMIN' && form.role === 'REVIEWER'
                    ? '리뷰어가 소속된 회사 ID를 입력하세요. ID 입력 후 소속 회사 장비도 반드시 할당해야 합니다.'
                    : '예: company-A, tyto-korea 등 약속된id 입력';
                  return (
                    <>
                      <input style={{ ...inp, background: isLocked ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,.3)', color: isLocked ? '#6b8fae' : '#fff', borderColor: !form.companyId?.trim() ? 'rgba(239,68,68,.5)' : 'rgba(0,212,240,.25)' }}
                        value={form.companyId || ''}
                        onChange={e => !isLocked && setForm(p => ({ ...p, companyId: e.target.value }))}
                        readOnly={isLocked}
                        placeholder={placeholder} />
                      {!form.companyId?.trim() && (
                        <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>Company ID는 필수입니다.</p>
                      )}
                    </>
                  );
                })()}
              </div>
              {/* REVIEWER가 타인 수정 시 아래 설정 숨김 */}
              {(myRole !== 'REVIEWER' || (editUser && editUser.loginId === localStorage.getItem('loginId'))) && (
                <>
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
                </>
              )}
              {/* 할당 장비 — REVIEWER만 표시 */}
              {form.role === 'REVIEWER' && devices.length > 0 && (
                <DeviceAssignPanel
                  devices={devices}
                  selected={form.assignedDeviceImeis || []}
                  onToggle={toggleDevice}
                  myRole={myRole}
                  lbl={lbl}
                  label={t.assignedDevices}
                />
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
        </div>
      )}

      {/* 사용자 테이블 */}
      <div style={{ border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', background: 'rgba(0,0,0,.2)', fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
          {t.total} {filteredUsers.length}{t.persons}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)' }}>
              {myRole !== 'REVIEWER' && (
                <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,212,240,.18)', width: '30px' }}>
                  <input type="checkbox"
                    checked={paged.length > 0 && paged.every(u => checkedIds.includes(u.id))}
                    onChange={toggleAllCheck}
                    style={{ cursor: 'pointer', accentColor: '#00d4f0' }} />
                </th>
              )}
              {[t.no, t.id, t.name, t.email, t.country, 'GMT', 'Company', t.role, '등록일', t.status, t.manage].map(h => (
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
                onMouseLeave={e => e.currentTarget.style.background = checkedIds.includes(u.id) ? 'rgba(0,212,240,.05)' : 'transparent'}
                style={{ borderBottom: '1px solid rgba(0,212,240,.05)', background: checkedIds.includes(u.id) ? 'rgba(0,212,240,.05)' : 'transparent' }}>
                {myRole !== 'REVIEWER' && (
                  <td style={{ padding: '8px 12px' }}>
                    <input type="checkbox"
                      checked={checkedIds.includes(u.id)}
                      onChange={() => toggleCheck(u.id)}
                      style={{ cursor: 'pointer', accentColor: '#00d4f0' }} />
                  </td>
                )}
                <td style={{ padding: '8px 12px', color: '#4b6483' }}>{(page - 1) * PER_PAGE + i + 1}</td>
                <td style={{ padding: '8px 12px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace" }}>{u.loginId}</td>
                <td style={{ padding: '8px 12px', color: '#fff', fontWeight: '700' }}>{u.name}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{u.email}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{u.country}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
                  GMT{u.gmtZone >= 0 ? '+' : ''}{u.gmtZone ?? 9}
                </td>
                <td style={{ padding: '8px 12px', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                  {u.companyId || '-'}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                    background: u.role === 'SUPER_ADMIN' ? 'rgba(239,68,68,.15)' : u.role === 'ADMIN' ? 'rgba(245,158,11,.15)' : 'rgba(59,130,246,.15)',
                    color: u.role === 'SUPER_ADMIN' ? '#ef4444' : u.role === 'ADMIN' ? '#f59e0b' : '#60a5fa'
                  }}>
                    {u.role}
                  </span>
                </td>

            

                <td style={{ padding: '8px 12px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                  {(() => {
                    if (!u.createdAt) return '-';
                    // 배열 형태: [2026, 4, 14, ...]
                    if (Array.isArray(u.createdAt)) {
                      const [y, m, d] = u.createdAt;
                      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    }
                    // 문자열 형태: "2026-04-14T15:00:00"
                    return String(u.createdAt).slice(0, 10);
                  })()}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                    background: u.active ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
                    color: u.active ? '#10b981' : '#ef4444'
                  }}>
                    {u.active ? t.active : t.inactive}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(myRole !== 'REVIEWER' || u.loginId === localStorage.getItem('loginId')) && (
                      <button onClick={() => handleEdit(u)}
                        style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', cursor: 'pointer', fontSize: '10px' }}>
                        {t.edit}
                      </button>
                    )}
                    {myRole !== 'REVIEWER' && (
                      <button onClick={async () => {
                        try {
                          const res = await api.put(`/users/${u.id}/toggle`);
                          fetchUsers();
                        } catch (e) { alert('오류가 발생했습니다.'); }
                      }}
                        style={{ padding: '3px 10px', borderRadius: '5px', border: `1px solid ${u.active ? 'rgba(245,158,11,.3)' : 'rgba(16,185,129,.3)'}`, background: u.active ? 'rgba(245,158,11,.1)' : 'rgba(16,185,129,.1)', color: u.active ? '#f59e0b' : '#10b981', cursor: 'pointer', fontSize: '10px' }}>
                        {u.active ? '중지' : '활성'}
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: '3px 8px', background: p === page ? '#00d4f0' : 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: p === page ? '#0d1628' : '#00d4f0', cursor: 'pointer', fontSize: '10px', fontWeight: p === page ? '700' : '400' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
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
function DeviceAssignPanel({ devices, selected, onToggle, myRole, lbl, label }) {
  const [deviceSearch, setDeviceSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const PAGE_SIZE = 20;

  const filtered = devices.filter(d =>
    !deviceSearch ||
    d.alias?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
    d.imei?.includes(deviceSearch) ||
    d.registeredByCompany?.toLowerCase().includes(deviceSearch.toLowerCase())
  );

  const displayed = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const selectedCount = selected.length;

  return (
    <div style={{ marginTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label style={lbl}>{label} <span style={{ color: '#00d4f0' }}>({selectedCount}/{devices.length})</span></label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => devices.forEach(d => !selected.includes(d.imei) && onToggle(d.imei))}
            style={{ padding: '2px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '4px', color: '#00d4f0', fontSize: '9px', cursor: 'pointer' }}>
            전체선택
          </button>
          <button onClick={() => devices.forEach(d => selected.includes(d.imei) && onToggle(d.imei))}
            style={{ padding: '2px 8px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '4px', color: '#ef4444', fontSize: '9px', cursor: 'pointer' }}>
            전체해제
          </button>
        </div>
      </div>

      {/* 검색 */}
      <input
        value={deviceSearch}
        onChange={e => setDeviceSearch(e.target.value)}
        placeholder="🔍 장비 검색 (Alias / IMEI / Company)"
        style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '7px', color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
      />

      {/* 장비 목록 */}
      <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,.2)', borderRadius: '8px', border: '1px solid rgba(0,212,240,.15)' }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4b6483', fontSize: '11px', padding: '12px' }}>검색 결과 없음</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {displayed.map(d => {
              const checked = selected.includes(d.imei);
              return (
                <label key={d.imei} onClick={() => onToggle(d.imei)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '5px 8px', borderRadius: '6px', background: checked ? 'rgba(0,212,240,.08)' : 'transparent', border: `1px solid ${checked ? 'rgba(0,212,240,.2)' : 'transparent'}`, transition: 'all .15s' }}>
                  <div style={{ width: '14px', height: '14px', border: `1.5px solid ${checked ? '#00d4f0' : 'rgba(255,255,255,.2)'}`, borderRadius: '3px', background: checked ? '#00d4f0' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#0d1628', flexShrink: 0 }}>
                    {checked ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: checked ? '#e8f4ff' : '#6b8fae', fontWeight: checked ? '700' : '400' }}>{d.alias}</div>
                    <div style={{ fontSize: '8px', color: '#4b6483', fontFamily: "'JetBrains Mono', monospace" }}>{d.imei?.slice(-6)}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* 더 보기 */}
        {!showAll && filtered.length > PAGE_SIZE && (
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <button onClick={() => setShowAll(true)}
              style={{ padding: '4px 16px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', cursor: 'pointer' }}>
              + {filtered.length - PAGE_SIZE}개 더 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InviteCodeBtn({ userCompanyId }) {
  const [code, setCode] = useState('');
  const [expires, setExpires] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const generate = async () => {
    if (!userCompanyId) { alert('Company ID가 설정되지 않았습니다. 먼저 본인 계정에 Company ID를 설정해주세요.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/users/invite');
      setCode(res.data.code);
      setExpires(res.data.expiresAt?.slice(0, 10));
      setShow(true);
    } catch (e) { alert(e.response?.data?.message || '초대코드 생성 실패'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={generate} disabled={loading}
        style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(139,92,246,.4)', background: 'rgba(139,92,246,.12)', color: '#8b5cf6', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
        🔑 초대코드 생성
      </button>

      {show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShow(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#1a2d48', border: '1px solid rgba(139,92,246,.3)', borderRadius: '16px', padding: '28px', width: '380px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#8b5cf6', fontWeight: '700', marginBottom: '16px', fontFamily: "'JetBrains Mono', monospace" }}>🔑 초대 코드 생성 완료</div>
            <div style={{ background: 'rgba(0,0,0,.4)', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '22px', fontWeight: '700', color: '#00d4f0', letterSpacing: '3px', marginBottom: '8px' }}>{code}</div>
              <div style={{ fontSize: '11px', color: '#6b8fae' }}>만료일: {expires} (7일)</div>
            </div>
            <p style={{ fontSize: '11px', color: '#6b8fae', marginBottom: '16px', lineHeight: 1.6 }}>
              이 코드를 회원가입할 사용자에게 전달해주세요.<br />
              가입 시 초대코드 입력하면 자동으로 같은 회사로 연결됩니다.
            </p>
            <button onClick={() => { navigator.clipboard.writeText(code); }}
              style={{ padding: '8px 20px', background: 'rgba(0,212,240,.12)', border: '1px solid #00d4f0', borderRadius: '8px', color: '#00d4f0', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginRight: '8px' }}>
              📋 복사
            </button>
            <button onClick={() => setShow(false)}
              style={{ padding: '8px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', borderRadius: '8px', color: '#6b8fae', fontSize: '12px', cursor: 'pointer' }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}