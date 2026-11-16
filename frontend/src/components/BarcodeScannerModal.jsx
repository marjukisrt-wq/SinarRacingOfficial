import React, { useState, useEffect, useRef } from 'react';
import {
  IoCloseOutline,
  IoCameraOutline,
  IoFlashOutline,
  IoFlashOffOutline,
  IoSearchOutline,
  IoCartOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoBarcodeOutline,
  IoRefreshOutline,
} from 'react-icons/io5';

// Fungsi bantuan untuk bunyi BEEP kasir saat scan berhasil (menggunakan Web Audio API tanpa perlu file mp3)
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Audio context tidak didukung atau terblokir
  }
};

export const BarcodeScannerModal = ({
  isOpen,
  onClose,
  mode = 'CHECK_PRICE', // 'CHECK_PRICE', 'ADD_TO_CART', atau 'CAPTURE_CODE'
  products = [],
  onAddToCart,
  onCaptureCode,
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const fileInputRef = useRef(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);

  // Cari produk berdasarkan SKU / Barcode atau Nama
  const lookupProduct = (code) => {
    if (!code || !code.trim()) return null;
    const cleanCode = code.trim().toLowerCase();

    return products.find((p) => {
      const matchSku = p.sku && p.sku.toLowerCase() === cleanCode;
      const matchId = String(p.id).toLowerCase() === cleanCode;
      const matchName = p.name && p.name.toLowerCase().includes(cleanCode);
      return matchSku || matchId || matchName;
    }) || null;
  };

  const handleBarcodeFound = (barcodeText) => {
    if (!barcodeText || scanningRef.current) return;
    scanningRef.current = true;
    playBeep();

    // Mode Khusus: Mengisi Kode Barcode / SKU saat Input Stok
    if (mode === 'CAPTURE_CODE') {
      if (onCaptureCode) {
        onCaptureCode(barcodeText);
      }
      onClose();
      scanningRef.current = false;
      return;
    }

    const product = lookupProduct(barcodeText);

    if (product) {
      setScannedResult(product);
      setNotFoundBarcode(null);

      // Jika dalam mode kasir langsung, tambahkan ke keranjang
      if (mode === 'ADD_TO_CART' && onAddToCart) {
        onAddToCart(product);
      }
    } else {
      setScannedResult(null);
      setNotFoundBarcode(barcodeText);
    }

    // Beri jeda 1.2 detik sebelum bisa scan berikutnya
    setTimeout(() => {
      scanningRef.current = false;
    }, 1200);
  };

  // Deteksi Barcode dari Foto / Gambar Kemasan
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!('BarcodeDetector' in window)) {
        alert('Fitur deteksi barcode dari foto memerlukan browser modern (Chrome/Edge/Safari terbaru). Gunakan kamera live atau input manual jika belum didukung.');
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        try {
          const detector = new window.BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e'],
          });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            handleBarcodeFound(barcodes[0].rawValue);
          } else {
            alert('Tidak ada barcode yang terdeteksi pada foto ini. Pastikan foto tegak lurus, garis-garis barcode jelas, dan pencahayaan terang.');
          }
        } catch (err) {
          console.error('Gagal deteksi foto:', err);
          alert('Gagal mendeteksi barcode dari foto: ' + err.message);
        }
      };
    } catch (err) {
      console.error(err);
    }
  };

  // Inisialisasi Kamera & Barcode Detector dengan fallback bertahap
  const startCamera = async () => {
    try {
      setCameraError(null);
      scanningRef.current = false;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser ini tidak mendukung akses kamera langsung melalui WebRTC.');
        setCameraActive(false);
        return;
      }

      let stream = null;

      // 1. Coba kamera belakang terlebih dahulu (ideal untuk smartphone di bengkel)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (e1) {
        // 2. Fallback ke webcam apa pun yang ada (Laptop / PC Webcam USB)
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e2) {
          throw e2;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err) {
      console.warn('Tidak dapat membuka kamera:', err);
      let message = 'Kamera tidak dapat diakses.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Izin kamera ditolak di browser. Klik ikon di sebelah kiri alamat URL (di samping localhost:5173) lalu ubah opsi "Camera" menjadi "Allow / Izinkan".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'Tidak ada perangkat kamera/webcam yang terdeteksi di komputer ini. Jika menggunakan PC desktop kasir, Anda bisa menggunakan alat Barcode Gun USB atau input manual di bawah. Pada HP Android/iPhone, kamera akan otomatis aktif.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Kamera sedang digunakan oleh aplikasi lain (seperti Zoom/OBS/aplikasi kamera Windows).';
      } else if (err.name === 'OverconstrainedError') {
        message = 'Resolusi kamera yang diminta tidak didukung oleh perangkat ini.';
      } else {
        message = `Gagal membuka kamera (${err.message || err.name || 'Error'}). Silakan gunakan input manual atau Barcode Gun.`;
      }

      setCameraError(message);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Loop deteksi frame video menggunakan BarcodeDetector API browser
  const startScanningLoop = () => {
    if (!('BarcodeDetector' in window)) {
      console.info('BarcodeDetector native tidak didukung di browser ini.');
      return;
    }

    const detector = new window.BarcodeDetector({
      formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e'],
    });

    const loop = async () => {
      if (!streamRef.current || !videoRef.current) return;

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && !scanningRef.current) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            handleBarcodeFound(barcodes[0].rawValue);
          }
        } catch (e) {
          // Frame skip
        }
      }

      if (streamRef.current) {
        requestAnimationFrame(loop);
      }
    };

    requestAnimationFrame(loop);
  };

  // Toggle Senter HP jika didukung
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn }],
          });
          setTorchOn(!torchOn);
        } else {
          alert('Lampu senter tidak didukung pada kamera perangkat ini.');
        }
      } catch (e) {
        console.warn('Gagal mengubah status senter:', e);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedResult(null);
      setNotFoundBarcode(null);
      setManualBarcode('');
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleBarcodeFound(manualBarcode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.88)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}>
              <IoBarcodeOutline size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {mode === 'CAPTURE_CODE' ? 'Foto / Scan Barcode Kemasan' : (mode === 'CHECK_PRICE' ? 'Cek Harga Sparepart' : 'Scan Barcode ke Kasir')}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                {mode === 'CAPTURE_CODE' ? 'Arahkan kamera atau unggah foto barcode dari bungkus part' : (mode === 'CHECK_PRICE' ? 'Arahkan kamera ke barcode part motor' : 'Scan barang untuk langsung masuk keranjang kasir')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <IoCloseOutline size={20} />
          </button>
        </div>

        {/* Viewfinder Kamera */}
        <div style={{ position: 'relative', background: '#020617', overflow: 'hidden', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '260px',
              objectFit: 'cover',
              display: cameraActive ? 'block' : 'none',
            }}
          />

          {cameraActive && (
            <>
              {/* Target Aiming Box */}
              <div style={{
                position: 'absolute',
                width: '230px',
                height: '140px',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 15px rgba(239, 68, 68, 0.4)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '90%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #facc15, #dc2626, transparent)',
                  animation: 'scannerLaser 1.8s infinite ease-in-out',
                }} />
              </div>

              {/* Tombol Flashlight / Senter */}
              <button
                type="button"
                onClick={toggleTorch}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: torchOn ? '#facc15' : 'rgba(15, 23, 42, 0.8)',
                  color: torchOn ? '#0f172a' : '#f8fafc',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 5,
                }}
                title="Lampu Senter"
              >
                {torchOn ? <IoFlashOutline size={20} /> : <IoFlashOffOutline size={20} />}
              </button>
            </>
          )}

          {!cameraActive && (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <IoCameraOutline size={48} style={{ color: '#475569', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: cameraError ? '#f87171' : '#94a3b8' }}>
                {cameraError || 'Kamera sedang disiapkan...'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <IoRefreshOutline size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Coba Buka Kamera Lagi
              </button>
            </div>
          )}
        </div>

        {/* Input Manual / Barcode Gun USB */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b', background: '#0b1120' }}>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <IoSearchOutline style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Scan pakai Barcode Gun atau ketik SKU/Kode part..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.2rem',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cek
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
              title="Ambil foto atau pilih gambar barcode dari galeri HP/PC"
            >
              📷 Foto/Galeri
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </form>

          {products && products.length > 0 && (
            <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Coba tes cepat part:</span>
              {products.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleBarcodeFound(p.sku || p.name)}
                  style={{
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                  title={`Klik untuk tes cek harga "${p.name}"`}
                >
                  {p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* HASIL KARTU CEK HARGA */}
        <div style={{ padding: '1.25rem', flex: 1 }}>
          {scannedResult ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(15, 23, 42, 0.9))',
              border: '1px solid #ef4444',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                }}>
                  {scannedResult.brand?.name || 'Sinar Racing'}
                </span>
                <span style={{
                  fontSize: '0.78rem',
                  color: Number(scannedResult.stock) > 0 ? '#4ade80' : '#f87171',
                  fontWeight: 700,
                }}>
                  {scannedResult.is_service ? 'Jasa Servis' : `Stok: ${scannedResult.stock} ${scannedResult.unit || 'pcs'}`}
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
                  {scannedResult.name}
                </h4>
                {scannedResult.motor_compatibility && (
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                    Cocok: <span style={{ color: '#facc15' }}>{scannedResult.motor_compatibility}</span>
                  </p>
                )}
                {scannedResult.rack_location && (
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                    Lokasi Rak: <strong style={{ color: '#f8fafc' }}>{scannedResult.rack_location}</strong>
                  </p>
                )}
              </div>

              {/* Harga Jual Besar */}
              <div style={{
                background: '#090d16',
                border: '1px dashed rgba(250, 204, 21, 0.35)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Harga Jual Konsumen</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#facc15', fontFamily: 'var(--font-mono)' }}>
                  Rp {Number(scannedResult.selling_price).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {onAddToCart && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(scannedResult);
                      playBeep();
                      if (mode === 'CHECK_PRICE') {
                        setScannedResult(null);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer',
                    }}
                  >
                    <IoCartOutline size={18} /> + Masukkan ke Kasir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setScannedResult(null)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Scan Lainnya
                </button>
              </div>
            </div>
          ) : notFoundBarcode ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px dashed #ef4444',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
            }}>
              <IoAlertCircleOutline size={36} style={{ color: '#f87171', marginBottom: '0.5rem' }} />
              <h5 style={{ color: '#f87171', fontSize: '0.95rem', margin: '0 0 0.35rem 0' }}>Barang Tidak Ditemukan</h5>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                Barcode <strong>"{notFoundBarcode}"</strong> belum terdaftar di data stok Sinar Racing.
              </p>
              <button
                type="button"
                onClick={() => setNotFoundBarcode(null)}
                style={{
                  marginTop: '0.75rem',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: 'none',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Scan Ulang
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#64748b' }}>
              <p style={{ fontSize: '0.82rem', margin: 0 }}>
                Arahkan barcode part motor ke dalam kotak merah di atas, atau masukkan kode part secara manual.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
