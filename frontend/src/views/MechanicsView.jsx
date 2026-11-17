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
  IoAddCircleOutline,
  IoWalletOutline,
  IoConstructOutline,
  IoReceiptOutline,
} from 'react-icons/io5';

// Format angka menjadi format ribuan Rupiah
const formatRupiahInput = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const cleanNumber = String(val).replace(/\D/g, '');
  if (!cleanNumber) return '';
  return new Intl.NumberFormat('id-ID').format(cleanNumber);
};

const parseRupiahInput = (val) => {
  const cleanNumber = String(val).replace(/\D/g, '');
  return cleanNumber ? Number(cleanNumber) : 0;
};

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

  // Modal Input Jasa Manual Langsung
  const [showManualJobModal, setShowManualJobModal] = useState(false);
  const [manualJobLoading, setManualJobLoading] = useState(false);
  const [manualJobError, setManualJobError] = useState(null);
  const [manualJobForm, setManualJobForm] = useState({
    mechanic_name: '',
    is_custom_mechanic: false,
    service_name: '',
    vehicle_plate: '',
    vehicle_model: '',
    price: 0,
    commission: 0,
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

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

  const handleOpenManualJobModal = (presetMechanicName = '') => {
    setManualJobError(null);
    const defaultMech = presetMechanicName || (mechanics.find(m => m.is_active)?.name || '');
    setManualJobForm({
      mechanic_name: defaultMech,
      is_custom_mechanic: !defaultMech,
      service_name: '',
      vehicle_plate: '',
      vehicle_model: '',
      price: 0,
      commission: 0,
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setShowManualJobModal(true);
  };

  const handleSubmitManualJob = async (e) => {
    e.preventDefault();
    if (!manualJobForm.service_name.trim()) {
      setManualJobError('Nama pekerjaan / jasa servis wajib diisi');
      return;
    }
    const numPrice = Number(manualJobForm.price) || 0;
    if (numPrice <= 0) {
      setManualJobError('Tarif jasa harus lebih dari Rp 0');
      return;
    }
    if (!manualJobForm.mechanic_name.trim()) {
      setManualJobError('Nama mekanik wajib diisi atau dipilih');
      return;
    }

    try {
      setManualJobLoading(true);
      setManualJobError(null);
      await api.post('/mechanics/manual-job', {
        mechanic_name: manualJobForm.mechanic_name.trim(),
        service_name: manualJobForm.service_name.trim(),
        vehicle_plate: manualJobForm.vehicle_plate.trim().toUpperCase(),
        vehicle_model: manualJobForm.vehicle_model.trim(),
        price: numPrice,
        commission: Number(manualJobForm.commission) || 0,
        date: manualJobForm.date,
        notes: manualJobForm.notes.trim(),
      });
      setShowManualJobModal(false);
      fetchRecap(selectedMonth);
      fetchMechanics();
      alert('Pekerjaan jasa mekanik berhasil dicatat & disinkronkan ke Rekap Mekanik!');
    } catch (err) {
      setManualJobError(err.response?.data?.message || 'Gagal menyimpan pekerjaan jasa manual');
    } finally {
      setManualJobLoading(false);
    }
  };

  const handleDeleteManualJob = async (jobId) => {
    if (!window.confirm('Yakin ingin menghapus entri pekerjaan manual ini? Data transaksi terkait juga akan dihapus.')) return;
    try {
      await api.delete(`/mechanics/manual-job/${jobId}`);
      if (selectedMechanicJobs) {
        setSelectedMechanicJobs(prev => ({
          ...prev,
          jobs: prev.jobs.filter(j => j.id !== jobId)
        }));
      }
      fetchRecap(selectedMonth);
    } catch (e) {
      alert('Gagal menghapus entri jasa manual');
    }
  };

  // Cetak Slip Gaji Resmi Mekanik
  const handlePrintSlip = (m) => {
    const printWindow = window.open('', '_blank', 'width=750,height=850');
    if (!printWindow) {
      alert('Popup diblokir oleh browser. Izinkan popup untuk mencetak slip komisi mekanik.');
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Slip Komisi Jasa Mekanik - ${m.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; font-size: 13px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
          .header h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #0f172a; }
          .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 12px; background: #f8fafc; padding: 12px 14px; border-radius: 6px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .total-box { margin-top: 15px; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
          .total-highlight { font-size: 16px; font-weight: 800; color: #15803d; border-top: 2px dashed #cbd5e1; padding-top: 10px; margin-top: 8px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 55px; text-align: center; }
          .sig-box { width: 200px; }
          .sig-line { border-bottom: 1px solid #0f172a; margin-top: 60px; margin-bottom: 5px; }
          @media print {
            body { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SINAR RACING OFFICIAL</h2>
          <p>Bengkel Motor & Sparepart • Rekapitulasi Pembagian Hasil Jasa Mekanik</p>
        </div>
        <div class="meta">
          <div>
            <div><strong>Nama Mekanik:</strong> ${m.name}</div>
            <div><strong>No Kontak:</strong> ${m.phone || '-'}</div>
            <div><strong>Bagi Hasil Jasa:</strong> ${m.total_revenue > 0 ? Math.round((m.total_commission / m.total_revenue) * 100) : (m.commission_rate || 50)}%</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Periode:</strong> Bulan ${recapData?.period || selectedMonth}</div>
            <div><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div><strong>Total Pekerjaan:</strong> ${m.jobs?.length || 0} Unit / Jasa</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th>No Nota</th>
              <th>Tanggal</th>
              <th>Motor / Plat</th>
              <th>Pekerjaan Jasa</th>
              <th style="text-align: right;">Tarif Jasa (Rp)</th>
              <th style="text-align: right;">Hak Mekanik (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${(m.jobs || []).map((j, i) => `
              <tr>
                <td>${i + 1}</td>
                <td style="font-family: monospace; font-weight: 600;">${j.invoice_number}</td>
                <td>${new Date(j.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}</td>
                <td>${j.vehicle_plate !== '-' ? j.vehicle_plate : ''} ${j.vehicle_model !== '-' ? `(${j.vehicle_model})` : ''}</td>
                <td style="font-weight: 600;">${j.service_name}</td>
                <td style="text-align: right; font-family: monospace;">Rp ${Number(j.subtotal || j.price).toLocaleString('id-ID')}</td>
                <td style="text-align: right; font-weight: bold; color: #15803d; font-family: monospace;">
                  Rp ${Number(j.commission).toLocaleString('id-ID')}
                  <span style="font-size: 11px; color: #b45309; font-weight: normal;"> (${j.subtotal > 0 ? Math.round((Number(j.commission) / Number(j.subtotal)) * 100) : 0}%)</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-box">
          <div class="total-row">
            <span>Total Nilai Jasa Pelanggan:</span>
            <span style="font-family: monospace; font-weight: 600;">Rp ${Number(m.total_revenue).toLocaleString('id-ID')}</span>
          </div>
          <div class="total-row">
            <span>Bagian Laba Bersih Bengkel:</span>
            <span style="font-family: monospace; font-weight: 600;">Rp ${Number(m.total_workshop_share || (m.total_revenue - m.total_commission)).toLocaleString('id-ID')}</span>
          </div>
          <div class="total-row total-highlight">
            <span>TOTAL KOMISI BERSIH DIBAYARKAN KE MEKANIK:</span>
            <span style="font-family: monospace;">Rp ${Number(m.total_commission).toLocaleString('id-ID')}</span>
          </div>
        </div>
        <div class="signatures">
          <div class="sig-box">
            <span>Penerima (Mekanik)</span>
            <div class="sig-line"></div>
            <strong>(${m.name})</strong>
          </div>
          <div class="sig-box">
            <span>Kasir / Pemilik Bengkel</span>
            <div class="sig-line"></div>
            <strong>(Sinar Racing Official)</strong>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
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

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleOpenManualJobModal()}
                style={{
                  background: 'linear-gradient(135deg, #9333ea, #7e22ce)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(147, 51, 234, 0.35)',
                }}
              >
                <IoAddCircleOutline size={18} /> + Input Jasa Manual Mekanik
              </button>

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
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(15, 23, 42, 0.9))',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                borderRadius: '12px',
                padding: '1.15rem',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Total Omset Jasa Bengkel</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#facc15', margin: '0.35rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                  Rp {Number(recapData.total_workshop_service_omset || 0).toLocaleString('id-ID')}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Total bruto dibayar pelanggan ({recapData.total_workshop_service_count || 0} pekerjaan)</span>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(15, 23, 42, 0.9))',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '12px',
                padding: '1.15rem',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Total Hak Komisi Mekanik</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8', margin: '0.35rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                  Rp {Number(recapData.total_mechanic_commission || recapData.mechanics?.reduce((acc, m) => acc + (m.total_commission || 0), 0) || 0).toLocaleString('id-ID')}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>Hak bagi hasil yang dibayarkan ke staf mekanik</span>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(15, 23, 42, 0.9))',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: '12px',
                padding: '1.15rem',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Laba Bersih Bengkel dari Jasa</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4ade80', margin: '0.35rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                  Rp {Number(recapData.total_workshop_service_profit !== undefined ? recapData.total_workshop_service_profit : ((recapData.total_workshop_service_omset || 0) - (recapData.total_mechanic_commission || 0))).toLocaleString('id-ID')}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>Keuntungan murni masuk ke kas bengkel</span>
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
                Otomatis dihitung dari nota transaksi kasir & input manual
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
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Bagi Hasil Jasa</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Jml Pekerjaan</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Jasa (Rp)</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Hak Komisi (Rp)</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Laba Bengkel (Rp)</th>
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
                            background: 'rgba(250, 204, 21, 0.15)',
                            color: '#facc15',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}>
                            {m.total_revenue > 0 ? Math.round((m.total_commission / m.total_revenue) * 100) : (m.commission_rate || 50)}%
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
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                          Rp {Number(m.total_workshop_share || (m.total_revenue - m.total_commission)).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            {m.jobs && m.jobs.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setSelectedMechanicJobs(m)}
                                style={{
                                  background: '#1e293b',
                                  border: '1px solid #334155',
                                  color: '#f8fafc',
                                  padding: '0.35rem 0.65rem',
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
                              <button
                                type="button"
                                onClick={() => handleOpenManualJobModal(m.name)}
                                style={{
                                  background: '#1e293b',
                                  border: '1px solid #334155',
                                  color: '#9333ea',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  cursor: 'pointer',
                                }}
                              >
                                + Input Jasa
                              </button>
                            )}
                            {m.jobs && m.jobs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handlePrintSlip(m)}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  color: '#38bdf8',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  cursor: 'pointer',
                                }}
                                title="Cetak Slip Gaji & Rekap Komisi Mekanik"
                              >
                                <IoPrintOutline size={14} /> Slip Gaji
                              </button>
                            )}
                          </div>
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
                  Persentase acuan awal. Pada saat transaksi di kasir POS atau input jasa, komisi dapat langsung diisi nominal Rupiah (Rp) secara bebas tanpa terikat persen.
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
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Hak Mekanik</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMechanicJobs.jobs?.map((j, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.5rem', color: '#facc15', fontFamily: 'var(--font-mono)' }}>
                        {j.invoice_number}
                      </td>
                      <td style={{ padding: '0.5rem', color: '#cbd5e1' }}>
                        {j.vehicle_plate !== '-' ? j.vehicle_plate : ''} {j.vehicle_model !== '-' ? `(${j.vehicle_model})` : ''}
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f8fafc' }}>
                        {j.service_name}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                        Rp {Number(j.subtotal).toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#4ade80', fontWeight: 700 }}>
                        Rp {Number(j.commission).toLocaleString('id-ID')}{' '}
                        <span style={{ fontSize: '0.72rem', color: '#facc15', fontWeight: 600 }}>
                          ({j.subtotal > 0 ? Math.round((Number(j.commission) / Number(j.subtotal)) * 100) : 0}%)
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        {j.invoice_number?.startsWith('MAN-') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteManualJob(j.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: '4px',
                              padding: '2px 5px',
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                            title="Hapus entri jasa manual ini"
                          >
                            <IoTrashOutline size={12} />
                          </button>
                        )}
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
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handlePrintSlip(selectedMechanicJobs)}
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <IoPrintOutline size={15} /> Cetak Slip
                </button>
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
        </div>
      )}

      {/* MODAL INPUT JASA MANUAL MEKANIK */}
      {showManualJobModal && (
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
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'linear-gradient(135deg, #9333ea, #7e22ce)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <IoConstructOutline size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    Input Jasa Manual Mekanik
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Catat pekerjaan jasa langsung ke rekapitulasi mekanik
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualJobModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IoCloseOutline size={22} />
              </button>
            </div>

            {manualJobError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                padding: '0.65rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
              }}>
                {manualJobError}
              </div>
            )}

            <form onSubmit={handleSubmitManualJob}>
              {/* Mekanik */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Mekanik yang Mengerjakan <span style={{ color: '#ef4444' }}>*</span></label>
                  <button
                    type="button"
                    onClick={() => setManualJobForm(prev => ({ ...prev, is_custom_mechanic: !prev.is_custom_mechanic }))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    {manualJobForm.is_custom_mechanic ? '← Pilih dari Daftar' : '+ Ketik Nama Manual'}
                  </button>
                </div>

                {manualJobForm.is_custom_mechanic ? (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Budi (Freelance)"
                    value={manualJobForm.mechanic_name}
                    onChange={(e) => setManualJobForm(prev => ({ ...prev, mechanic_name: e.target.value }))}
                    required
                  />
                ) : (
                  <select
                    className="form-input"
                    value={manualJobForm.mechanic_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CUSTOM__') {
                        setManualJobForm(prev => ({ ...prev, is_custom_mechanic: true, mechanic_name: '' }));
                      } else {
                        setManualJobForm(prev => ({ ...prev, mechanic_name: val }));
                      }
                    }}
                    required
                  >
                    <option value="">-- Pilih Mekanik --</option>
                    {mechanics.filter(m => m.is_active).map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                    <option value="__CUSTOM__">+ Ketik Nama Manual...</option>
                  </select>
                )}
              </div>

              {/* Nama Jasa */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nama Pekerjaan Jasa <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Bubut Tromol / Baut Slek / Las Knalpot"
                  value={manualJobForm.service_name}
                  onChange={(e) => setManualJobForm(prev => ({ ...prev, service_name: e.target.value }))}
                  required
                />
              </div>

              {/* Tarif, Komisi & Tanggal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tarif Jasa (Rp) <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      style={{ paddingLeft: '28px', fontFamily: 'var(--font-mono)' }}
                      placeholder="0"
                      value={manualJobForm.price ? formatRupiahInput(manualJobForm.price) : ''}
                      onChange={(e) => setManualJobForm(prev => ({ ...prev, price: parseRupiahInput(e.target.value) }))}
                      required
                    />
                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, pointerEvents: 'none' }}>
                      Rp
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0 }}>Komisi Mekanik (Rp)</label>
                    {Number(manualJobForm.price) > 0 && (
                      <button
                        type="button"
                        onClick={() => setManualJobForm(prev => ({ ...prev, commission: Math.round(Number(manualJobForm.price) * 0.5) }))}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textDecoration: 'underline'
                        }}
                      >
                        Bagi 50% Otomatis
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      style={{ paddingLeft: '28px', fontFamily: 'var(--font-mono)', color: '#4ade80' }}
                      placeholder="0"
                      value={manualJobForm.commission !== undefined && manualJobForm.commission !== null && manualJobForm.commission !== '' ? formatRupiahInput(manualJobForm.commission) : ''}
                      onChange={(e) => setManualJobForm(prev => ({ ...prev, commission: parseRupiahInput(e.target.value) }))}
                    />
                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, pointerEvents: 'none' }}>
                      Rp
                    </span>
                  </div>
                </div>
              </div>

              {/* Tanggal */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Tanggal Pengerjaan</label>
                <input
                  type="date"
                  className="form-input"
                  value={manualJobForm.date}
                  onChange={(e) => setManualJobForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              {/* Motor & Plat */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Plat Nomor (Opsional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="B 1234 ABC"
                    value={manualJobForm.vehicle_plate}
                    onChange={(e) => setManualJobForm(prev => ({ ...prev, vehicle_plate: e.target.value.toUpperCase() }))}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipe Motor (Opsional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Vario / Beat / NMAX"
                    value={manualJobForm.vehicle_model}
                    onChange={(e) => setManualJobForm(prev => ({ ...prev, vehicle_model: e.target.value }))}
                  />
                </div>
              </div>

              {/* Preview Perhitungan */}
              {Number(manualJobForm.price) > 0 && (
                <div style={{
                  marginBottom: '1.25rem',
                  padding: '0.75rem',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Tarif Jasa:</span>
                    <strong style={{ color: '#facc15', fontFamily: 'var(--font-mono)' }}>
                      Rp {Number(manualJobForm.price).toLocaleString('id-ID')}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Hak Komisi Mekanik:</span>
                    <strong style={{ color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                      Rp {Number(manualJobForm.commission || 0).toLocaleString('id-ID')}{' '}
                      <span style={{ color: '#facc15' }}>
                        ({Number(manualJobForm.price) > 0 ? Math.round((Number(manualJobForm.commission || 0) / Number(manualJobForm.price)) * 100) : 0}%)
                      </span>
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '4px', marginTop: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Bagian Kas Bengkel:</span>
                    <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      Rp {Math.max(0, Number(manualJobForm.price) - Number(manualJobForm.commission || 0)).toLocaleString('id-ID')}{' '}
                      <span style={{ color: '#38bdf8' }}>
                        ({Number(manualJobForm.price) > 0 ? 100 - Math.round((Number(manualJobForm.commission || 0) / Number(manualJobForm.price)) * 100) : 0}%)
                      </span>
                    </strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={manualJobLoading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #9333ea, #7e22ce)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: manualJobLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(147, 51, 234, 0.35)',
                  }}
                >
                  {manualJobLoading ? 'Menyimpan...' : '+ Catat ke Rekap Jasa'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualJobModal(false)}
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
    </div>
  );
};
