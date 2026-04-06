import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('name');
    const loginId = localStorage.getItem('loginId');
    const role = localStorage.getItem('role');
    if (token && name) {
      setUser({ token, name, loginId, role });
    }
  }, []);

  // 401 이벤트 수신 → 강제 로그아웃
  useEffect(() => {
    const handleUnauth = () => {
      localStorage.clear();
      setUser(null);
    };
    window.addEventListener('unauthorized', handleUnauth);
    return () => window.removeEventListener('unauthorized', handleUnauth);
  }, []);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <DashboardPage user={user} onLogout={handleLogout} />;
}