import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  IoBuildOutline,
  IoPersonAddOutline,
  IoCalendarOutline,
  IoCashOutline,
  IoCheckmarkDoneCircleOutline,
  IoPeopleOutline,
  IoPrintOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoCloseOutline,
  IoEyeOutline,
  IoDocumentTextOutline,
} from 'react-icons/io5';

export const MechanicsView = () => {
  const [activeSubTab, setActiveSubTab] = useState('recap'); // 'recap' atau 'manage'
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter Bulan (Default bulan sekarang YYYY-MM)
  const currentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());

  // Data Rekap Bulanan
  const [recapData, setRecapData] = useState(null);
  const [loadingRecap, setLoadingRecap] = useState(false);

  // Modal Tambah/Edit Mekanik
  const [showModal, setShowModal] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', commission_rate: 50 });
  const [formError, setFormError] = useState(null);

  // Modal Detail Rincian Pekerjaan Mekanik
  const [selectedMechanicJobs, setSelectedMechanicJobs] = useState(null);

  // Ambil data mekanik
  const fetchMechanics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mechanics?include_inactive=true');
      setMechanics(res.data?.data || []);
    } catch (e) {
      console.error('Gagal mengambil daftar mekanik:', e);
    } finally {
      setLoading(false);
    }
  };

  // Ambil rekap bulanan
  const fetchRecap = async (month) => {
    try {
      setLoadingRecap(true);
      const res = await api.get(`/mechanics/recap/monthly?month=${month}`);
      setRecapData(res.data?.data || null);
    } catch (e) {
      console.error('Gagal mengambil rekap mekanik:', e);
    } finally {
      setLoadingRecap(false);
    }
  };

  useEffect(() => {
    fetchMechanics();
    fetchRecap(selectedMonth);
  }, []);

  const handleMonthChange = (e) => {
    const val = e.target.value;
    setSelectedMonth(val);
    fetchRecap(val);
  };

  // Buka Modal Tambah/Edit
  const handleOpenModal = (mechanic = null) => {
    setEditingMechanic(mechanic);
    setFormError(null);
    if (mechanic) {
      setFormData({
        name: mechanic.name,
        phone: mechanic.phone || '',
        commission_rate: mechanic.commission_rate || 50,
      });
    } else {
      setFormData({ name: '', phone: '', commission_rate: 50 });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama mekanik wajib diisi');
      return;
    }

    try {
      if (editingMechanic) {
        await api.put(`/mechanics/${editingMechanic.id}`, formData);
      } else {
        await api.post('/mechanics', formData);
      }
      setShowModal(false);
      fetchMechanics();
      fetchRecap(selectedMonth);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan data mekanik');
    }
  };

  const handleDeleteMechanic = async (mechanic) => {
    if (!window.confirm(`Yakin ingin menghapus mekanik "${mechanic.name}" dari sistem bengkel? Tindakan ini akan menghapus data mekanik secara permanen.`)) {
      return;
    }

    try {
      await api.delete(`/mechanics/${mechanic.id}`);
      fetchMechanics();
      fetchRecap(selectedMonth);
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menghapus data mekanik');
    }
  };

  const handleToggleActive = async (mechanic) => {
    const confirmText = mechanic.is_active
      ? `Nonaktifkan mekanik "${mechanic.name}"? (Mekanik tidak akan muncul di pilihan kasir)`
      : `Aktifkan kembali mekanik "${mechanic.name}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      await api.put(`/mechanics/${mechanic.id}`, { is_active: !mechanic.is_active });
      fetchMechanics();
      fetchRecap(selectedMonth);
    } catch (e) {
      alert('Gagal mengubah status mekanik');
    }
  };

  const handlePrintRecap = () => {
    window.print();
  };

  return (
    <div style={{ padding: '1.25rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Judul */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
          }}>
            <IoBuildOutline size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Rekap Jasa & Staf Mekanik
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
              Kelola nama mekanik bengkel & rekapitulasi komisi jasa otomatis per bulan
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#0f172a', padding: '4px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('recap')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeSubTab === 'recap' ? '#dc2626' : 'transparent',
              color: activeSubTab === 'recap' ? '#fff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <IoDocumentTextOutline size={16} /> Rekap Jasa Bulanan
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('manage')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeSubTab === 'manage' ? '#dc2626' : 'transparent',
              color: activeSubTab === 'manage' ? '#fff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <IoPeopleOutline size={16} /> Data Mekanik ({mechanics.filter(m => m.is_active).length})
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: REKAP JASA BULANAN */}
      {/* ======================================================== */}
      {activeSubTab === 'recap' && (
        <div>
          {/* Bar Kontrol Bulan & Tombol Cetak */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <IoCalendarOutline size={20} style={{ color: '#facc15' }} />
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>Pilih Bulan:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handlePrintRecap}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
              }}
            >
              <IoPrintOutline size={18} /> Cetak Rekap Laporan
            </button>
          </div>

          {/* Kartu Ringkasan Omset Jasa */}
          {recapData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15), rgba(15, 23, 42, 0.9))',
                border: '1px solid rgba(220, 38, 38, 0.35)',
                borderRadius: '12px',
                padding: '1.15rem',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Total Omset Jasa Bengkel</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#facc15', margin: '0.35rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                  Rp {Number(recapData.total_workshop_service_omset || 0).toLocaleString('id-ID')}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Bulan {recapData.period}</span>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.15rem',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Total Pekerjaan Servis</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', margin: '0.35rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                  {recapData.total_workshop_service_count || 0} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Unit/Jasa</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>Selesai dikerjakan</span>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.15rem',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Total Komisi Mekanik</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8', margin: '0.35rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                  Rp {Number(recapData.mechanics?.reduce((acc, m) => acc + (m.total_commission || 0), 0) || 0).toLocaleString('id-ID')}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Hak bagi hasil staf mekanik</span>
              </div>
            </div>
          )}

          {/* Tabel Rekapitulasi per Mekanik */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Rincian Perolehan Jasa per Mekanik
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Otomatis dihitung dari nota transaksi kasir
              </span>
            </div>

            {loadingRecap ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                Menghitung rekapitulasi jasa mekanik...
              </div>
            ) : (!recapData?.mechanics || recapData.mechanics.length === 0) ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                Belum ada transaksi jasa servis pada bulan {selectedMonth}.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#0b1120', borderBottom: '1px solid var(--border-color)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>Mekanik</th>
                      <th style={{ padding: '0.85rem 1rem' }}>No Kontak</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Rate Komisi</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Jml Pekerjaan</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Jasa (Rp)</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Hak Komisi (Rp)</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recapData.mechanics.map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                          {m.name}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                          {m.phone || '-'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}>
                            {m.commission_rate}%
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#facc15' }}>
                          {m.total_services}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                          Rp {Number(m.total_revenue).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                          Rp {Number(m.total_commission).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {m.jobs && m.jobs.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedMechanicJobs(m)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#f8fafc',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer',
                              }}
                            >
                              <IoEyeOutline size={14} /> Detail ({m.jobs.length})
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: KELOLA DATA MEKANIK */}
      {/* ======================================================== */}
      {activeSubTab === 'manage' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              style={{
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                color: '#fff',
                border: 'none',
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
              }}
            >
              <IoPersonAddOutline size={18} /> + Tambah Mekanik Baru
            </button>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0b1120', borderBottom: '1px solid var(--border-color)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Nama Mekanik</th>
                  <th style={{ padding: '0.85rem 1rem' }}>No WhatsApp / Telepon</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Bagi Hasil Jasa</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {mechanics.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #1e293b', opacity: m.is_active ? 1 : 0.6 }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {m.name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                      {m.phone || '-'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        background: 'rgba(250, 204, 21, 0.15)',
                        color: '#facc15',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}>
                        {m.commission_rate || 50}%
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(m)}
                        style={{
                          cursor: 'pointer',
                          border: 'none',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: m.is_active ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: m.is_active ? '#4ade80' : '#f87171',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                        title={m.is_active ? 'Klik untuk menonaktifkan status kerja' : 'Klik untuk mengaktifkan kembali'}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.is_active ? '#4ade80' : '#f87171' }} />
                        {m.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenModal(m)}
                          style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#38bdf8',
                            borderRadius: '6px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Edit Data Mekanik"
                        >
                          <IoPencilOutline size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMechanic(m)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            borderRadius: '6px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Hapus Mekanik Permanen"
                        >
                          <IoTrashOutline size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT MEKANIK */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 15, 0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '420px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {editingMechanic ? 'Edit Data Mekanik' : 'Tambah Mekanik Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IoCloseOutline size={22} />
              </button>
            </div>

            {formError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                padding: '0.65rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nama Mekanik</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Agus Pratama"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">No WhatsApp / Telepon (Opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: 08123456789"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Persentase Bagi Hasil Jasa (%)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="100"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Standar bengkel biasanya 50% untuk mekanik dan 50% untuk bengkel.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Simpan Mekanik
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RINCIAN PEKERJAAN MEKANIK */}
      {selectedMechanicJobs && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 15, 0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Rincian Servis: {selectedMechanicJobs.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Periode {recapData?.period} • Total {selectedMechanicJobs.jobs?.length || 0} Pekerjaan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMechanicJobs(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IoCloseOutline size={22} />
              </button>
            </div>

            <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>No Nota</th>
                    <th style={{ padding: '0.5rem' }}>Motor / Plat</th>
                    <th style={{ padding: '0.5rem' }}>Jasa Servis</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Tarif</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Komisi ({selectedMechanicJobs.commission_rate}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMechanicJobs.jobs?.map((j, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.5rem', color: '#facc15', fontFamily: 'var(--font-mono)' }}>
                        {j.invoice_number}
                      </td>
                      <td style={{ padding: '0.5rem', color: '#cbd5e1' }}>
                        {j.vehicle_model} ({j.vehicle_plate})
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f8fafc' }}>
                        {j.service_name}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                        Rp {Number(j.subtotal).toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#4ade80', fontWeight: 700 }}>
                        Rp {Number(j.commission).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #1e293b', background: '#0b1120', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Hak Komisi:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                  Rp {Number(selectedMechanicJobs.total_commission).toLocaleString('id-ID')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMechanicJobs(null)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
