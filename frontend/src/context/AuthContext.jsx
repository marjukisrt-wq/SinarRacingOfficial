import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ambil token & user yang tersimpan
    const token = localStorage.getItem('sinarracing_token') || localStorage.getItem('monesca_token');
    const storedUser = localStorage.getItem('sinarracing_user') || localStorage.getItem('monesca_user');

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Migrasi otomatis key jika sebelumnya masih menggunakan monesca_
        if (!localStorage.getItem('sinarracing_token')) {
          localStorage.setItem('sinarracing_token', token);
          localStorage.setItem('sinarracing_user', storedUser);
          localStorage.removeItem('monesca_token');
          localStorage.removeItem('monesca_user');
        }

        // Verifikasi profil pengguna ke backend di latar belakang.
        // PENTING: JANGAN PERNAH logout paksa jika:
        // - Perangkat offline / mode pesawat / sinyal putus (navigator.onLine === false)
        // - Jaringan timeout / lambat / cold-start serverless Vercel
        // - Server 500 / 502 / 503 / 504
        // Hanya logout jika server secara eksplisit merespon 401 Unauthorized / Token Expired.
        api.get('/auth/profile')
          .then((res) => {
            if (res.data?.data) {
              setUser(res.data.data);
              localStorage.setItem('sinarracing_user', JSON.stringify(res.data.data));
            }
          })
          .catch((err) => {
            if (err.response) {
              const status = err.response.status;
              const msg = (err.response.data?.message || '').toLowerCase();
              // Hanya logout jika sesi benar-benar tidak valid menurut server
              if (status === 401 || (status === 403 && (msg.includes('kedaluwarsa') || msg.includes('expired') || msg.includes('invalid')))) {
                console.warn('Sesi login telah berakhir, silakan login kembali.');
                logout();
              }
            } else {
              // Network error / offline / timeout: pertahankan sesi lokal agar tidak terjadi login berulang
              console.info('Koneksi sedang offline atau tidak stabil, mempertahankan sesi login lokal.');
            }
          });
      } catch (e) {
        console.error('Gagal membaca data sesi lokal:', e);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { user: userData, token } = response.data.data;
    localStorage.setItem('sinarracing_token', token);
    localStorage.setItem('sinarracing_user', JSON.stringify(userData));
    // Bersihkan sisa token lama jika ada
    localStorage.removeItem('monesca_token');
    localStorage.removeItem('monesca_user');
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('sinarracing_token');
    localStorage.removeItem('sinarracing_user');
    localStorage.removeItem('monesca_token');
    localStorage.removeItem('monesca_user');
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isKasir = user?.role === 'KASIR';
  const isGudang = user?.role === 'GUDANG';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isSuperAdmin, isKasir, isGudang }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
