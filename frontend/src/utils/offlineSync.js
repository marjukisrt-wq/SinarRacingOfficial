// Utilitas Mode Offline & Sinkronisasi Otomatis Sinar Racing Official

const QUEUE_KEY = 'sinarracing_offline_queue';
const CATALOG_KEY = 'sinarracing_cached_products';

export const isOnline = () => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// 1. KELOLA KATALOG PRODUK LOKAL (OFFLINE CACHE)
export const saveCatalogCache = (products) => {
  try {
    if (Array.isArray(products) && products.length > 0) {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(products));
      localStorage.setItem(CATALOG_KEY + '_time', new Date().toISOString());
    }
  } catch (e) {
    console.error('Gagal menyimpan cache katalog:', e);
  }
};

export const getCachedCatalog = () => {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Gagal mengambil cache katalog:', e);
    return [];
  }
};

export const deductCachedStock = (productId, qty) => {
  try {
    const catalog = getCachedCatalog();
    const updated = catalog.map((p) => {
      if (p.id === productId && !p.is_service) {
        return { ...p, stock: Math.max(0, (Number(p.stock) || 0) - Number(qty)) };
      }
      return p;
    });
    saveCatalogCache(updated);
  } catch (e) {
    console.error('Gagal memotong stok lokal offline:', e);
  }
};

// 2. KELOLA ANTREAN TRANSAKSI OFFLINE
export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Gagal mengambil antrean offline:', e);
    return [];
  }
};

export const enqueueOfflineTransaction = (trxPayload) => {
  try {
    const queue = getOfflineQueue();

    // Buat nomor invoice lokal sementara
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const offlineInvoice = `OFF-${dateStr}-${rand}`;

    const offlineTransaction = {
      ...trxPayload,
      invoice_number: offlineInvoice,
      offline_created_at: now.toISOString(),
      created_at: now.toISOString(),
      is_offline: true,
      status: 'COMPLETED',
      id: `local-${Date.now()}-${rand}`,
    };

    queue.push(offlineTransaction);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    // Potong stok produk di cache lokal segera
    if (Array.isArray(trxPayload.items)) {
      trxPayload.items.forEach((it) => {
        if (it.product_id && !it.is_service) {
          deductCachedStock(it.product_id, it.quantity);
        }
      });
    }

    // Trigger custom event agar komponen UI langsung update count antrean
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sinarracing:offline_queue_updated', {
        detail: { count: queue.length }
      }));
    }

    return offlineTransaction;
  } catch (e) {
    console.error('Gagal menyimpan transaksi ke antrean offline:', e);
    throw e;
  }
};

// 3. PROSES SINKRONISASI KE SERVER CLOUD
let isSyncing = false;

export const syncOfflineQueue = async (api) => {
  if (isSyncing) return { syncing: true };
  if (!isOnline()) return { offline: true };

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  isSyncing = true;
  let syncedCount = 0;
  const remainingQueue = [];

  for (const item of queue) {
    try {
      // Siapkan payload pengiriman transaksi
      const payload = {
        customer_name: item.customer_name || 'Pelanggan Umum',
        customer_phone: item.customer_phone || '',
        vehicle_plate: item.vehicle_plate || '',
        vehicle_model: item.vehicle_model || '',
        subtotal: item.subtotal,
        discount: item.discount || 0,
        total_amount: item.total_amount,
        payment_method: item.payment_method || 'CASH',
        cash_given: item.cash_given || 0,
        change_due: item.change_due || 0,
        notes: (item.notes ? item.notes + ' ' : '') + `[Sinkronisasi Transaksi Offline #${item.invoice_number}]`,
        items: item.items.map((it) => {
          const mechName = (it.mechanic_name || '').trim();
          return {
            product_id: it.product_id || null,
            product_name: it.product_name,
            brand_name: (it.is_service && mechName) ? `MEK:${mechName}` : (it.brand_name || null),
            is_service: Boolean(it.is_service),
            cost_price: it.cost_price || 0,
            unit_price: it.unit_price,
            quantity: it.quantity,
            subtotal: it.subtotal,
            mechanic_id: it.mechanic_id || null,
            mechanic_name: mechName || null,
          };
        }),
      };

      await api.post('/transactions', payload);
      syncedCount++;
    } catch (err) {
      console.warn('Gagal sinkron satu transaksi offline:', item.invoice_number, err.message);
      remainingQueue.push(item);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
  isSyncing = false;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sinarracing:offline_queue_updated', {
      detail: { count: remainingQueue.length, synced: syncedCount }
    }));
  }

  return { synced: syncedCount, remaining: remainingQueue.length };
};

// 4. PENDAFTARAN EVENT LISTENER OTOMATIS
export const initOfflineSync = (api, onNotify) => {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    console.info('Koneksi internet kembali tersambung. Memulai sinkronisasi otomatis...');
    try {
      const res = await syncOfflineQueue(api);
      if (res.synced > 0 && onNotify) {
        onNotify(`Otomatis tersinkron: ${res.synced} transaksi offline berhasil dikirim ke server!`);
      }
    } catch (e) {
      console.error('Error saat auto-sync online:', e);
    }
  };

  window.addEventListener('online', handleOnline);

  // Coba sinkronisasi saat inisialisasi awal jika ada sisa antrean dan sudah online
  if (isOnline() && getOfflineQueue().length > 0) {
    handleOnline();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
};
