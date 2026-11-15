import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaMotorcycle } from 'react-icons/fa6';
import { IoLogInOutline, IoLockClosedOutline, IoPersonOutline } from 'react-icons/io5';
import { BrandLogo } from '../components/BrandLogo';

export const LoginView = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const loggedInUser = await login(username, password);
      onLoginSuccess(loggedInUser);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Username atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      background: 'radial-gradient(ellipse at top, #1e293b, #0b1120 70%)',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        padding: '2rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <BrandLogo variant="vertical" size="lg" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>POS & Stok Gudang</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Silakan masuk untuk mengelola kasir & inventaris bengkel
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <IoPersonOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <IoLockClosedOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.45)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              marginTop: '1.25rem',
            }}
          >
            <IoLogInOutline size={20} />
            {loading ? 'Masuk ke Sistem...' : 'Login Sekarang'}
          </button>

          <div style={{
            marginTop: '1rem',
            padding: '0.6rem 0.85rem',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            borderRadius: '8px',
            fontSize: '0.78rem',
            color: '#fca5a5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>Akun Demo: <strong>admin</strong> / <strong>admin123</strong></span>
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('admin123'); }}
              style={{
                background: '#dc2626',
                border: 'none',
                color: '#fff',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Isi Otomatis
            </button>
          </div>
        </form>

        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
        }}>
          Sistem Kasir & Stok Gudang Sinar Racing Official
        </div>
      </div>
    </div>
  );
};
