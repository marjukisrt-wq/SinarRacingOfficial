import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { IoSettingsOutline, IoCheckmarkCircleOutline, IoLockClosedOutline, IoKeyOutline } from 'react-icons/io5';
import { BrandLogo } from '../components/BrandLogo';

export const SettingsView = () => {
  const [storeName, setStoreName] = useState('SINAR RACING OFFICIAL');
  const [tagline, setTagline] = useState('Pusat Sparepart & Servis Motor');
  const [address, setAddress] = useState('Jl. Raya Motor No. 123');
  const [phone, setPhone] = useState('0812-3456-7890');
  const [receiptFooter, setReceiptFooter] = useState('Terima kasih atas kunjungan Anda!\nGaransi servis 3 hari.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // State Ganti Password Sendiri
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data?.data) {
        const d = res.data.data;
        setStoreName(d.store_name || 'SINAR RACING OFFICIAL');
        setTagline(d.tagline || '');
        setAddress(d.address || '');
        setPhone(d.phone || '');
        setReceiptFooter(d.receipt_footer || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch('/settings', {
        store_name: storeName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        receipt_footer: receiptFooter.replace(/\\n/g, '\n').trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan profil toko');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setPasswordError('Password baru minimal 4 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok');
      return;
    }
    try {
      setPasswordSaving(true);
      setPasswordError(null);
      await api.patch('/auth/change-password', { new_password: newPassword });
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setPasswordError(err.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
          }}>
            <IoSettingsOutline />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>Pengaturan Profil Toko & Struk</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Data ini akan otomatis dicetak pada kepala (*header*) struk printer thermal bluetooth Anda
            </p>
          </div>
        </div>

        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}>
            <IoCheckmarkCircleOutline size={20} /> Pengaturan profil toko berhasil diperbarui!
          </div>
        )}

        {/* PREVIEW LOGO TOKO & LOGO STRUK THERMAL */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.25rem',
        }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.65rem', color: '#f87171' }}>
            Identitas & Logo Resmi: Sinar Racing Official
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{
              background: '#0a0d14',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.65rem' }}>
                Logo Resmi Bengkel (Aplikasi)
              </span>
              <BrandLogo variant="horizontal" size="sm" />
            </div>

            <div style={{
              background: '#ffffff',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#475569', display: 'block', marginBottom: '0.65rem', fontWeight: 600 }}>
                Logo Struk Thermal (Monochrome 58mm)
              </span>
              <BrandLogo variant="thermal" size="sm" />
            </div>
          </div>
          <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.65rem' }}>
            ✓ Logo otomatis dicetak di bagian paling atas struk saat menggunakan printer Bluetooth thermal maupun Cetak Standar.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Bengkel / Toko *</label>
            <input
              type="text"
              className="form-input"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Slogan / Tagline</label>
            <input
              type="text"
              className="form-input"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Alamat Lengkap</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Sunan Bonang, Tambak Sari Kidul"
            />
            <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
              Tips kertas 58mm: Pisahkan dengan koma atau baris baru agar rapi dan tidak terpotong.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Nomor Telepon / WhatsApp</label>
            <input
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Catatan Kaki Struk (Footer)</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Contoh: Terima kasih atas kunjungan Anda&#10;Garansi servis 3 hari."
            />
            <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
              Tekan Enter untuk membuat baris baru. Jangan ketik simbol '\n' secara manual.
            </small>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.85rem 1.5rem',
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              width: '100%',
              marginTop: '1.5rem',
            }}
          >
            <IoCheckmarkCircleOutline size={20} />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Profil'}
          </button>
        </form>
      </div>

      {/* KARTU GANTI PASSWORD AKUN SENDIRI */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginTop: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
          }}>
            <IoKeyOutline />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Keamanan & Ganti Password</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Perbarui kata sandi akun yang sedang Anda gunakan saat ini
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            ✓ Password berhasil diperbarui! Silakan gunakan password baru ini untuk login berikutnya.
          </div>
        )}

        {passwordError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            {passwordError}
          </div>
        )}

        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label className="form-label">Password Baru</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan password baru (minimal 4 karakter)"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru Anda"
              required
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            style={{
              padding: '0.75rem 1.25rem',
              background: '#334155',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              width: '100%',
              marginTop: '1rem',
              border: '1px solid #475569',
            }}
          >
            <IoLockClosedOutline size={18} />
            {passwordSaving ? 'Menyimpan Password...' : 'Perbarui Password Saya'}
          </button>
        </form>
      </div>
    </div>
  );
};
