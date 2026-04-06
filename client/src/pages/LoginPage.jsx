import { useState } from 'react';
import axios from 'axios';
import api from '../api/axiosConfig';

// 약관 내용
const TERMS = {
  privacy: { title: '개인정보처리방침', body: '<h3>1. 개인정보 수집 및 이용 목적</h3><p>TytoTrack(아리온통신㈜)은 서비스 제공을 위하여 개인정보를 처리합니다.</p>' },
  location: { title: '개인위치정보처리방침', body: '<h3>1. 위치정보 수집 목적</h3><p>위성 기반 실시간 위치 추적 서비스 제공을 위해 개인위치정보를 수집합니다.</p>' },
  satellite: { title: '위성기반 서비스 이용약관', body: '<h3>제1조 (목적)</h3><p>이 약관은 TytoTrack 위성기반 추적 서비스 이용에 관한 사항을 규정합니다.</p>' },
  gps: { title: '위치정보 서비스 이용약관', body: '<h3>제1조 (목적)</h3><p>이 약관은 GPS 위치정보 서비스 이용에 관한 사항을 규정합니다.</p>' },
};

const LANGS = {
  ko: {
    eyebrow: '위성 관제 시스템', title: 'TytoTrack에 오신 것을 환영합니다', sub: 'TytoTrack 모니터링 시스템에 로그인하세요.',
    idLabel: '아이디', pwLabel: '비밀번호', idPh: '아이디 입력', pwPh: '비밀번호 입력',
    loginBtn: '로그인', loggingIn: '로그인 중...', forgot: '비밀번호를 잊으셨나요?', error: '아이디 또는 비밀번호가 올바르지 않습니다.',
    tabLogin: '로그인', tabSignup: '회원가입',
    signupEyebrow: '회원가입', signupTitle: '회원가입', signupSub: '하기 내용을 기입 후 회원가입하여 주세요.',
    dupBtn: '중복체크', dupOk: '사용 가능한 아이디입니다.', dupFail: '이미 사용중인 아이디입니다.', dupMin: '5자리 이상 입력해주세요.',
    pwMatch: '비밀번호가 일치합니다.', pwNoMatch: '비밀번호가 일치하지 않습니다.',
    confirmPwLabel: '비밀번호 확인',
    signupBtn: '가입하기', signupOk: '가입이 완료되었습니다! 로그인 해주세요.',
    terms: ['개인정보 수집 및 이용에 동의합니다.', '개인위치정보 수집 및 이용에 동의합니다.', '위성기반 서비스 이용약관에 동의합니다.', '위치정보 서비스 이용약관에 동의합니다.'],
    termsKeys: ['privacy', 'location', 'satellite', 'gps'],
    termsLinks: [['개인정보처리방침','privacy'],['개인위치정보처리방침','location'],['위성기반 서비스 이용약관','satellite'],['위치정보 서비스 이용약관','gps']],
    company: '아리온통신㈜ · 통신판매신고번호: 영등포 19-1796호 · 사업자등록번호: 107-86-47974\n대표이사: 박웅범 · 서울특별시 영등포구 경인로 775, 에이스 하이테크시티 1동 1701호\nTEL: 02-6309-6800 · FAX: 02-6309-6809',
    forgotTitle: '비밀번호 찾기', forgotSub: '가입 시 등록한 정보를 입력해주세요.',
    nameLbl: '이름', idLbl: '아이디', emailLbl: '이메일', cancel: '취소', confirm: '확인',
    intro: '이리듐 위성망 기반 실시간 장비 관제 시스템으로 장비 활성화부터 긴급 상황까지 스마트하게 관리하세요!',
    feat1: '간편 등록', feat1b: '장비 활성화 정보와 긴급 연락처를 쉽게 등록·관리합니다.',
    feat2: '실시간 위치', feat2b: '사람, 차량, 선박의 위치를 지도에서 직접 확인합니다.',
    feat3: '양방향 통신', feat3b: '위성 메시지로 상황을 파악하고 안전을 확인합니다.',
  },
  en: {
    eyebrow: 'Satellite Monitoring System', title: 'Welcome to TYTO', sub: 'Sign in to continue to TytoTrack Monitoring System.',
    idLabel: 'ID', pwLabel: 'Password', idPh: 'Enter your ID', pwPh: 'Enter your password',
    loginBtn: 'Login', loggingIn: 'Signing in...', forgot: 'Forgot your password?', error: 'Invalid ID or password.',
    tabLogin: 'Login', tabSignup: 'Sign Up',
    signupEyebrow: 'Create Account', signupTitle: 'Sign Up', signupSub: 'Please fill in the details below to create your account.',
    dupBtn: 'Check', dupOk: 'This ID is available.', dupFail: 'This ID is already taken.', dupMin: 'Minimum 5 characters required.',
    pwMatch: 'Passwords match.', pwNoMatch: 'Passwords do not match.',
    confirmPwLabel: 'Confirm Password',
    signupBtn: 'Sign Up', signupOk: 'Registration complete! Please log in.',
    terms: [], termsKeys: [], termsLinks: [], company: '',
    forgotTitle: 'Password Recovery', forgotSub: 'Enter the information you registered with.',
    nameLbl: 'Name', idLbl: 'ID', emailLbl: 'Email', cancel: 'Cancel', confirm: 'Confirm',
    intro: 'Manage everything from device activation to emergency situations smartly with TYTO Tracker!',
    feat1: 'Easy Registration', feat1b: 'Easily register and manage device activation information.',
    feat2: 'Real-time Location', feat2b: 'Check device locations directly on the map.',
    feat3: 'Two-way Communication', feat3b: 'Grasp the situation through bidirectional satellite messages.',
  },
  ja: {
    eyebrow: '衛星監視システム', title: 'TYTOへようこそ', sub: 'TytoTrack監視システムにサインインしてください。',
    idLabel: 'ID', pwLabel: 'パスワード', idPh: 'IDを入力', pwPh: 'パスワードを入力',
    loginBtn: 'ログイン', loggingIn: 'ログイン中...', forgot: 'パスワードをお忘れですか？', error: 'IDまたはパスワードが正しくありません。',
    tabLogin: 'ログイン', tabSignup: '会員登録',
    signupEyebrow: '会員登録', signupTitle: '会員登録', signupSub: '以下の情報を入力して登録してください。',
    dupBtn: '重複確認', dupOk: '使用可能なIDです。', dupFail: 'すでに使用中のIDです。', dupMin: '5文字以上入力してください。',
    pwMatch: 'パスワードが一致します。', pwNoMatch: 'パスワードが一致しません。',
    confirmPwLabel: 'パスワード確認',
    signupBtn: '登録する', signupOk: '登録が完了しました！ログインしてください。',
    terms: [], termsKeys: [], termsLinks: [], company: '',
    forgotTitle: 'パスワード再発行', forgotSub: '登録時の情報を入力してください。',
    nameLbl: '名前', idLbl: 'ID', emailLbl: 'メール', cancel: 'キャンセル', confirm: '確認',
    intro: 'イリジウム衛星網ベースのリアルタイム機器監視システムです。',
    feat1: '簡単登録', feat1b: 'デバイスの有効化情報と緊急連絡先を簡単に管理。',
    feat2: 'リアルタイム位置', feat2b: '人や車両の位置をマップで直接確認できます。',
    feat3: '双方向通信', feat3b: '衛星メッセージで状況を把握し安全を確認します。',
  },
};

export default function LoginPage({ onLogin }) {
  const [lang, setLang] = useState('ko');
  const [tab, setTab] = useState('login');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 회원가입
  const [signupId, setSignupId] = useState('');
  const [signupPw, setSignupPw] = useState('');
  const [signupPwC, setSignupPwC] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showSignupPwC, setShowSignupPwC] = useState(false);
  const [dupMsg, setDupMsg] = useState({ text: '', ok: false, show: false });
  const [dupChecked, setDupChecked] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: '', ok: false, show: false });
  const [pwMatched, setPwMatched] = useState(false);
  const [termsChecked, setTermsChecked] = useState([false, false, false, false]);
  const [signupMsg, setSignupMsg] = useState('');

  // 약관 슬라이드 패널
  const [termsPanel, setTermsPanel] = useState({ open: false, title: '', body: '' });

  // 비밀번호 찾기 모달
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotName, setForgotName] = useState('');
  const [forgotId, setForgotId] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const t = LANGS[lang];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post('/api/auth/login', { loginId, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('loginId', res.data.loginId);
      localStorage.setItem('name', res.data.name);
      localStorage.setItem('role', res.data.role);
      onLogin(res.data);
    } catch { setError(t.error); }
    finally { setLoading(false); }
  };

  const checkDup = async () => {
    if (signupId.length < 5) {
      setDupMsg({ text: t.dupMin, ok: false, show: true });
      setDupChecked(false); return;
    }
    try {
      const res = await axios.get(`/api/users/check?loginId=${signupId}`);
      if (res.data.exists) {
        setDupMsg({ text: t.dupFail, ok: false, show: true });
        setDupChecked(false);
      } else {
        setDupMsg({ text: t.dupOk, ok: true, show: true });
        setDupChecked(true);
      }
    } catch {
      setDupMsg({ text: 'ID check failed. Please try again.', ok: false, show: true });
      setDupChecked(false);
    }
  };

  const checkPwMatch = (pw, pwc) => {
    if (!pwc) { setPwMsg({ text: '', ok: false, show: false }); setPwMatched(false); return; }
    if (pw === pwc) {
      setPwMsg({ text: t.pwMatch, ok: true, show: true }); setPwMatched(true);
    } else {
      setPwMsg({ text: t.pwNoMatch, ok: false, show: true }); setPwMatched(false);
    }
  };

  const allTermsChecked = lang === 'ko' ? termsChecked.every(Boolean) : true;
  const signupReady = dupChecked && pwMatched && allTermsChecked;

  const doSignup = async () => {
    if (!signupReady) return;
    try {
      await api.post('/auth/signup', { loginId: signupId, password: signupPw, role: 'REVIEWER' });
      setSignupMsg(t.signupOk);
      setTimeout(() => { setTab('login'); setSignupMsg(''); }, 1500);
    } catch (err) {
      setSignupMsg(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const openTerms = (key) => {
    const d = TERMS[key];
    if (d) setTermsPanel({ open: true, title: d.title, body: d.body });
  };

  const submitForgot = () => {
    if (!forgotName || !forgotId || !forgotEmail) {
      setForgotMsg('모든 항목을 입력해주세요.'); return;
    }
    setForgotMsg(`임시 비밀번호가 ${forgotEmail}로 발송되었습니다.`);
    setTimeout(() => { setForgotOpen(false); setForgotMsg(''); }, 2000);
  };

  const inpStyle = {
    width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
    borderRadius: '10px', padding: '13px 13px 13px 40px', fontFamily: "'Syne', sans-serif",
    fontSize: '13px', color: '#f4faff', outline: 'none', transition: 'all .2s', boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#111e34', fontFamily: "'Syne', sans-serif", overflow: 'hidden' }}>

      {/* ── 좌측 브랜드 ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px' }} className="lp-left-hide">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 15% 50%,rgba(0,212,240,.18) 0%,transparent 65%),linear-gradient(160deg,#0c1526 0%,#152035 55%,#0d1e30 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,212,240,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,240,.05) 1px,transparent 1px)', backgroundSize: '52px 52px', opacity: 0.6 }} />

        {/* 위성 SVG */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', opacity: 0.7 }}>
          <svg viewBox="0 0 400 500" style={{ width: '100%', height: '100%' }}>
            <circle cx="200" cy="320" r="60" fill="rgba(16,185,129,.12)" stroke="rgba(16,185,129,.25)" strokeWidth="1" />
            <ellipse cx="200" cy="320" rx="140" ry="50" fill="none" stroke="rgba(0,212,240,.15)" strokeWidth="1" />
            <ellipse cx="200" cy="320" rx="100" ry="140" fill="none" stroke="rgba(59,130,246,.10)" strokeWidth="1" />
            <g style={{ animation: 'orbitSat1 8s linear infinite', transformOrigin: '200px 320px' }}>
              <rect x="185" y="265" width="14" height="10" fill="rgba(0,212,240,.8)" rx="2" />
              <rect x="172" y="268" width="12" height="4" fill="rgba(59,130,246,.6)" rx="1" />
              <rect x="199" y="268" width="12" height="4" fill="rgba(59,130,246,.6)" rx="1" />
              <line x1="192" y1="275" x2="200" y2="310" stroke="rgba(0,212,240,.3)" strokeWidth="1" strokeDasharray="4 6" />
            </g>
            <circle cx="200" cy="305" r="3" fill="#00d4f0" style={{ animation: 'pingPulse 2s ease-in-out infinite' }} />
            <circle cx="170" cy="330" r="2" fill="#3b82f6" style={{ animation: 'pingPulse 2s ease-in-out .5s infinite' }} />
            <circle cx="200" cy="305" r="8" fill="none" stroke="rgba(0,212,240,.4)" strokeWidth="1" style={{ animation: 'sigWave 2s ease-out infinite' }} />
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#00d4f0,#3b82f6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🛰️</div>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: '17px', fontWeight: '700', letterSpacing: '3px', color: '#f4faff' }}>TYTO<span style={{ color: '#00d4f0' }}>TRACK</span></span>
          </div>
          <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: '900', letterSpacing: '4px', color: '#f4faff', marginBottom: '14px', lineHeight: 1.1 }}>
            TYTO<span style={{ color: '#00d4f0', display: 'block' }}>TRACKER</span>
          </h1>
          <p style={{ fontFamily: "'Orbitron', monospace", fontSize: '11px', fontWeight: '600', letterSpacing: '5px', color: '#0891b2', textTransform: 'uppercase', marginBottom: '44px' }}>
            WE GO FURTHER AND DEEPER
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(240,248,255,.65)', lineHeight: 1.9, marginBottom: '28px' }}>{t.intro}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[{ icon: '📋', title: t.feat1, body: t.feat1b }, { icon: '📍', title: t.feat2, body: t.feat2b }, { icon: '💬', title: t.feat3, body: t.feat3b }].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '34px', height: '34px', minWidth: '34px', background: 'rgba(0,212,240,.08)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(240,248,255,.92)', marginBottom: '2px' }}>{f.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(240,248,255,.52)', lineHeight: 1.6 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 우측 폼 ── */}
      <div style={{ width: '420px', minWidth: '420px', background: 'rgba(255,255,255,.025)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(0,212,240,.22)', display: 'flex', flexDirection: 'column' }} className="lp-right">
        <div style={{ flex: 1, overflowY: 'auto', padding: '44px 38px 24px', display: 'flex', flexDirection: 'column', scrollbarWidth: 'none' }}>

          {/* 탭 */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.04)', borderRadius: '10px', padding: '4px', marginBottom: '28px', flexShrink: 0 }}>
            {['login', 'signup'].map(t2 => (
              <button key={t2} onClick={() => setTab(t2)} style={{ flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontSize: '13px', fontWeight: '600', borderRadius: '7px', transition: 'all .25s', background: tab === t2 ? '#00d4f0' : 'transparent', color: tab === t2 ? '#111e34' : 'rgba(232,244,255,.4)', boxShadow: tab === t2 ? '0 4px 14px rgba(0,212,240,.35)' : 'none' }}>
                {t2 === 'login' ? t.tabLogin : t.tabSignup}
              </button>
            ))}
          </div>

          {/* ── 로그인 폼 ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <p style={{ fontFamily: "'Orbitron', monospace", fontSize: '10px', fontWeight: '600', letterSpacing: '3px', color: '#00d4f0', marginBottom: '6px' }}>{t.eyebrow}</p>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f4faff', marginBottom: '5px' }}>{t.title}</h2>
              <p style={{ fontSize: '12px', color: 'rgba(232,244,255,.36)', marginBottom: '26px', lineHeight: 1.7 }}>{t.sub}</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(232,244,255,.38)', marginBottom: '7px' }}>{t.idLabel}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>👤</span>
                  <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder={t.idPh} style={inpStyle}
                    onFocus={e => { e.target.style.borderColor = '#00d4f0'; e.target.style.background = 'rgba(0,212,240,.06)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.09)'; e.target.style.background = 'rgba(255,255,255,.05)'; }} />
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(232,244,255,.38)', marginBottom: '7px' }}>{t.pwLabel}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🔒</span>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t.pwPh} style={{ ...inpStyle, paddingRight: '40px' }}
                    onFocus={e => { e.target.style.borderColor = '#00d4f0'; e.target.style.background = 'rgba(0,212,240,.06)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.09)'; e.target.style.background = 'rgba(255,255,255,.05)'; }} />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                <button type="button" onClick={() => setForgotOpen(true)} style={{ fontSize: '11px', color: 'rgba(232,244,255,.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif" }}>{t.forgot}</button>
              </div>

              {error && <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '10px', fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'rgba(255,255,255,.07)' : 'linear-gradient(135deg,#00d4f0,#0891b2)', color: loading ? 'rgba(232,244,255,.2)' : '#111e34', boxShadow: '0 6px 22px rgba(0,212,240,.3)' }}>
                {loading ? t.loggingIn : t.loginBtn}
              </button>
            </form>
          )}

          {/* ── 회원가입 폼 ── */}
          {tab === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: "'Orbitron', monospace", fontSize: '10px', fontWeight: '600', letterSpacing: '3px', color: '#00d4f0', marginBottom: '6px' }}>{t.signupEyebrow}</p>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f4faff', marginBottom: '5px' }}>{t.signupTitle}</h2>
              <p style={{ fontSize: '12px', color: 'rgba(232,244,255,.36)', marginBottom: '20px', lineHeight: 1.7 }}>{t.signupSub}</p>

              {/* 아이디 + 중복체크 */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(232,244,255,.38)', marginBottom: '7px' }}>{t.idLabel}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>👤</span>
                    <input type="text" value={signupId} onChange={e => { setSignupId(e.target.value); setDupChecked(false); setDupMsg({ text: '', ok: false, show: false }); }} placeholder="Min. 5 characters"
                      style={{ ...inpStyle, borderColor: dupMsg.show ? (dupMsg.ok ? '#10b981' : '#ef4444') : 'rgba(255,255,255,.09)' }} />
                  </div>
                  <button type="button" onClick={checkDup}
                    style={{ padding: '0 16px', background: 'rgba(0,212,240,.12)', border: '1px solid #00d4f0', borderRadius: '10px', color: '#00d4f0', fontFamily: "'Syne', sans-serif", fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {t.dupBtn}
                  </button>
                </div>
                {dupMsg.show && <p style={{ fontSize: '11px', marginTop: '5px', color: dupMsg.ok ? '#10b981' : '#ef4444' }}>{dupMsg.text}</p>}
              </div>

              {/* 비밀번호 */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(232,244,255,.38)', marginBottom: '7px' }}>{t.pwLabel}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🔒</span>
                  <input type={showSignupPw ? 'text' : 'password'} value={signupPw} onChange={e => { setSignupPw(e.target.value); checkPwMatch(e.target.value, signupPwC); }} placeholder="Password"
                    style={{ ...inpStyle, paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowSignupPw(p => !p)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>
                    {showSignupPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* 비밀번호 확인 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(232,244,255,.38)', marginBottom: '7px' }}>{t.confirmPwLabel}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🔑</span>
                  <input type={showSignupPwC ? 'text' : 'password'} value={signupPwC} onChange={e => { setSignupPwC(e.target.value); checkPwMatch(signupPw, e.target.value); }} placeholder="Confirm password"
                    style={{ ...inpStyle, paddingRight: '40px', borderColor: pwMsg.show ? (pwMsg.ok ? '#10b981' : '#ef4444') : 'rgba(255,255,255,.09)' }} />
                  <button type="button" onClick={() => setShowSignupPwC(p => !p)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>
                    {showSignupPwC ? '🙈' : '👁️'}
                  </button>
                </div>
                {pwMsg.show && <p style={{ fontSize: '11px', marginTop: '5px', color: pwMsg.ok ? '#10b981' : '#ef4444' }}>{pwMsg.text}</p>}
              </div>

              {/* 한국어 약관 */}
              {lang === 'ko' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '16px' }}>
                  {t.terms.map((term, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={termsChecked[i]} onChange={e => {
                        const arr = [...termsChecked]; arr[i] = e.target.checked; setTermsChecked(arr);
                      }} style={{ display: 'none' }} />
                      <div style={{ width: '18px', height: '18px', minWidth: '18px', border: `1.5px solid ${termsChecked[i] ? '#00d4f0' : 'rgba(232,244,255,.2)'}`, borderRadius: '5px', background: termsChecked[i] ? '#00d4f0' : 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#111e34', transition: 'all .2s' }}>
                        {termsChecked[i] ? '✓' : ''}
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'rgba(232,244,255,.48)' }}>
                        <span onClick={() => openTerms(t.termsKeys[i])} style={{ color: '#00d4f0', cursor: 'pointer', textDecoration: 'underline' }}>{term}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {signupMsg && <p style={{ fontSize: '12px', marginBottom: '12px', textAlign: 'center', color: signupMsg.includes('완료') || signupMsg.includes('complete') ? '#10b981' : '#ef4444' }}>{signupMsg}</p>}

              <button type="button" onClick={doSignup} disabled={!signupReady}
                style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '10px', fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: '700', cursor: signupReady ? 'pointer' : 'not-allowed', background: signupReady ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,.07)', color: signupReady ? '#fff' : 'rgba(232,244,255,.2)', boxShadow: signupReady ? '0 6px 22px rgba(16,185,129,.3)' : 'none', transition: 'all .25s' }}>
                {t.signupBtn}
              </button>
            </div>
          )}
        </div>

        {/* ── 하단 언어 + 약관링크 + 회사정보 ── */}
        <div style={{ padding: '16px 38px 24px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          {/* 언어 선택 */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {[['ko', '🇰🇷 한국어'], ['en', '🇺🇸 English'], ['ja', '🇯🇵 日本語']].map(([code, label]) => (
              <button key={code} onClick={() => {
                setLang(code);
                setDupMsg({ text: '', ok: false, show: false });
                setDupChecked(false);
                setPwMsg({ text: '', ok: false, show: false });
                setPwMatched(false);
              }}
                style={{ padding: '5px 12px', background: lang === code ? 'rgba(0,212,240,.14)' : 'rgba(255,255,255,.04)', border: `1px solid ${lang === code ? '#00d4f0' : 'rgba(255,255,255,.09)'}`, borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: lang === code ? '#00d4f0' : 'rgba(232,244,255,.38)', cursor: 'pointer', transition: 'all .2s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* 한국어 약관 링크 */}
          {lang === 'ko' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', marginBottom: '10px' }}>
                {t.termsLinks.map(([label, key]) => (
                  <button key={key} onClick={() => openTerms(key)} style={{ fontSize: '10px', color: 'rgba(232,244,255,.25)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: "'Syne', sans-serif", transition: 'color .2s' }}
                    onMouseEnter={e => e.target.style.color = '#00d4f0'}
                    onMouseLeave={e => e.target.style.color = 'rgba(232,244,255,.25)'}>
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '9.5px', color: 'rgba(232,244,255,.16)', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
                {t.company}
              </p>
            </>
          )}

          {lang !== 'ko' && (
            <p style={{ fontSize: '9.5px', color: 'rgba(232,244,255,.16)', lineHeight: 1.9 }}>
              © 2026 TytoTrack. Powered by Iridium Satellite Network.
            </p>
          )}
        </div>
      </div>

      {/* ── 약관 슬라이드 패널 ── */}
      {termsPanel.open && (
        <div onClick={() => setTermsPanel({ ...termsPanel, open: false })}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.5)', display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(720px, 100%)', height: '100%', background: '#1a2d48', borderLeft: '1px solid rgba(0,212,240,.2)', display: 'flex', flexDirection: 'column', animation: 'slideInRight .3s ease' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,212,240,.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: '12px', fontWeight: '700', color: '#00d4f0' }}>{termsPanel.title}</span>
              <button onClick={() => setTermsPanel({ ...termsPanel, open: false })} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', fontSize: '13px', color: 'rgba(232,244,255,.7)', lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: termsPanel.body }} />
          </div>
        </div>
      )}

      {/* ── 비밀번호 찾기 모달 ── */}
      {forgotOpen && (
        <div onClick={() => setForgotOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '16px', padding: '32px', width: '340px' }}>
            <p style={{ fontFamily: "'Orbitron', monospace", fontSize: '13px', fontWeight: '700', color: '#00d4f0', marginBottom: '8px' }}>{t.forgotTitle}</p>
            <p style={{ fontSize: '12px', color: 'rgba(232,244,255,.4)', marginBottom: '20px' }}>{t.forgotSub}</p>
            {[[t.nameLbl, forgotName, setForgotName, 'text'], [t.idLbl, forgotId, setForgotId, 'text'], [t.emailLbl, forgotEmail, setForgotEmail, 'email']].map(([label, val, setter, type]) => (
              <div key={label} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: 'rgba(232,244,255,.38)', marginBottom: '5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</label>
                <input type={type} value={val} onChange={e => setter(e.target.value)} placeholder={label}
                  style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '9px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            {forgotMsg && <p style={{ fontSize: '12px', color: '#10b981', marginBottom: '12px', textAlign: 'center' }}>{forgotMsg}</p>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => setForgotOpen(false)} style={{ flex: 1, padding: '11px', border: '1px solid rgba(255,255,255,.1)', borderRadius: '9px', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>{t.cancel}</button>
              <button onClick={submitForgot} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: '9px', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#111e34', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>{t.confirm}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:none} }
        @keyframes dropDown { from{opacity:0;transform:translateY(-36px)} to{opacity:1;transform:none} }
        @keyframes sigPulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes pingPulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes sigWave { 0%{opacity:.6;transform:scale(1)} 100%{opacity:0;transform:scale(3)} }
        @keyframes orbitSat1 { from{transform:rotate(0deg) translateX(60px) rotate(0deg)} to{transform:rotate(360deg) translateX(60px) rotate(-360deg)} }
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        .lp-right { width: 420px; min-width: 420px; }
        @media(max-width:767px) {
          .lp-left-hide { display: none !important; }
          .lp-right { width: 100% !important; min-width: 0 !important; border-left: none !important; }
        }
      `}</style>
    </div>
  );
}