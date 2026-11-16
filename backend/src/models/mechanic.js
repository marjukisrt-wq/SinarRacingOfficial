const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabase");

const LOCAL_FILE = path.resolve(__dirname, "../../data/mechanics.json");
const CLOUD_FALLBACK_ID = 99; // Row cadangan di Supabase store_settings jika tabel mechanics belum dibuat

const withTimeout = (promise, ms = 3000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Supabase request timeout")), ms)
    ),
  ]);
};

// Baca cadangan lokal file JSON (jika filesystem writable)
const readLocalMechanics = () => {
  try {
    if (!fs.existsSync(LOCAL_FILE)) {
      return [];
    }
    const data = fs.readFileSync(LOCAL_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (e) {
    return [];
  }
};

const writeLocalMechanics = (data) => {
  try {
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    // Abaikan jika di Vercel serverless read-only filesystem
  }
};

// Helper: Cek apakah tabel dedicated 'mechanics' ada di Supabase
let dedicatedTableExists = null;
const checkDedicatedTable = async () => {
  if (dedicatedTableExists !== null) return dedicatedTableExists;
  try {
    const { error } = await withTimeout(supabase.from("mechanics").select("id").limit(1), 2500);
    if (!error) {
      dedicatedTableExists = true;
      return true;
    }
    if (error && error.code === "PGRST205") {
      dedicatedTableExists = false;
      return false;
    }
  } catch (e) {
    // Timeout atau offline
  }
  return false;
};

// Helper: Ambil data mekanik dari Supabase Cloud Store (id: 99)
const readCloudStore = async () => {
  try {
    const { data, error } = await withTimeout(
      supabase.from("store_settings").select("address").eq("id", CLOUD_FALLBACK_ID).single(),
      3000
    );
    if (!error && data && data.address) {
      const parsed = JSON.parse(data.address);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  return null;
};

// Helper: Simpan data mekanik ke Supabase Cloud Store (id: 99)
const writeCloudStore = async (list) => {
  try {
    await withTimeout(
      supabase.from("store_settings").upsert({
        id: CLOUD_FALLBACK_ID,
        store_name: "__MECHANICS_DATA__",
        tagline: "MECHANICS",
        address: JSON.stringify(list),
        phone: "SYSTEM",
        updated_at: new Date().toISOString(),
      }),
      3500
    );
  } catch (e) {
    console.warn("Gagal simpan ke Supabase Cloud Store id 99:", e?.message);
  }
};

module.exports = {
  getAllMechanics: async (includeInactive = false) => {
    // 1. Coba dari tabel dedicated Supabase jika ada
    const hasTable = await checkDedicatedTable();
    if (hasTable) {
      try {
        let query = supabase.from("mechanics").select("*").order("name", { ascending: true });
        if (!includeInactive) {
          query = query.eq("is_active", true);
        }
        const { data, error } = await withTimeout(query, 3000);
        if (!error && data) return data;
      } catch (e) {}
    }

    // 2. Ambil dari Supabase Cloud Store (id: 99) - Berfungsi di Vercel Production
    let list = await readCloudStore();

    // 3. Fallback ke local JSON jika cloud store kosong
    if (!list || list.length === 0) {
      list = readLocalMechanics();
      if (list.length > 0) {
        writeCloudStore(list).catch(() => {});
      }
    }

    if (!includeInactive) {
      list = list.filter((m) => m.is_active);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  getMechanicById: async (id) => {
    const hasTable = await checkDedicatedTable();
    if (hasTable) {
      try {
        const { data, error } = await withTimeout(
          supabase.from("mechanics").select("*").eq("id", id).single(),
          2500
        );
        if (!error && data) return data;
      } catch (e) {}
    }

    let list = await readCloudStore();
    if (!list) list = readLocalMechanics();
    return list.find((m) => String(m.id) === String(id)) || null;
  },

  createMechanic: async (mechanicData) => {
    const hasTable = await checkDedicatedTable();
    if (hasTable) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("mechanics")
            .insert([{
              name: mechanicData.name,
              phone: mechanicData.phone || "",
              commission_rate: Number(mechanicData.commission_rate) || 50,
              is_active: true,
            }])
            .select()
            .single(),
          3000
        );
        if (!error && data) {
          return data;
        }
      } catch (e) {}
    }

    // Simpan ke Supabase Cloud Store (id: 99)
    let list = await readCloudStore();
    if (!list || list.length === 0) list = readLocalMechanics();

    const newId = list.length > 0 ? Math.max(...list.map((m) => Number(m.id) || 0)) + 1 : 1;
    const newRecord = {
      id: newId,
      name: mechanicData.name,
      phone: mechanicData.phone || "",
      commission_rate: Number(mechanicData.commission_rate) || 50,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    list.push(newRecord);

    await writeCloudStore(list);
    writeLocalMechanics(list);
    return newRecord;
  },

  updateMechanic: async (id, updateData) => {
    const hasTable = await checkDedicatedTable();
    if (hasTable) {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("mechanics")
            .update(updateData)
            .eq("id", id)
            .select()
            .single(),
          3000
        );
        if (!error && data) {
          return data;
        }
      } catch (e) {}
    }

    // Perbarui di Supabase Cloud Store (id: 99)
    let list = await readCloudStore();
    if (!list || list.length === 0) list = readLocalMechanics();

    const index = list.findIndex((m) => String(m.id) === String(id));
    if (index !== -1) {
      list[index] = { ...list[index], ...updateData, updated_at: new Date().toISOString() };
      await writeCloudStore(list);
      writeLocalMechanics(list);
      return list[index];
    }
    return null;
  },

  deleteMechanic: async (id) => {
    const hasTable = await checkDedicatedTable();
    if (hasTable) {
      try {
        const { data, error } = await withTimeout(
          supabase.from("mechanics").delete().eq("id", id).select().single(),
          3000
        );
        if (!error && data) {
          return data;
        }
      } catch (e) {}
    }

    // Hapus dari Supabase Cloud Store (id: 99)
    let list = await readCloudStore();
    if (!list || list.length === 0) list = readLocalMechanics();

    const index = list.findIndex((m) => String(m.id) === String(id));
    if (index !== -1) {
      const removed = list.splice(index, 1);
      await writeCloudStore(list);
      writeLocalMechanics(list);
      return removed[0];
    }
    return null;
  },

  // Rekap Jasa Bulanan per Mekanik
  getMonthlyRecap: async (yearMonth) => {
    let target = yearMonth;
    if (!target) {
      const now = new Date();
      target = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const startDate = `${target}-01T00:00:00.000Z`;
    const [y, m] = target.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${target}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;

    // Ambil transaksi COMPLETED
    let transactions = [];
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("transactions")
          .select(`
            id, invoice_number, created_at, customer_name, vehicle_plate, vehicle_model,
            items:transaction_items (*)
          `)
          .neq("status", "DRAFT")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .order("created_at", { ascending: true }),
        3500
      );

      if (!error && data) {
        transactions = data;
      }
    } catch (e) {
      console.warn("Gagal mengambil transaksi Supabase untuk rekap mekanik:", e?.message);
    }

    // Ambil daftar mekanik
    let mechanicsList = await module.exports.getAllMechanics(true);

    const mechanicMap = {};
    for (const m of mechanicsList) {
      mechanicMap[m.name.toLowerCase().trim()] = {
        id: m.id,
        name: m.name,
        phone: m.phone || "",
        commission_rate: Number(m.commission_rate) || 50,
        total_services: 0,
        total_revenue: 0,
        total_commission: 0,
        jobs: [],
      };
    }

    // Default "Belum Dipilih / Umum"
    const unassignedKey = "umum / tanpa mekanik";
    mechanicMap[unassignedKey] = {
      id: null,
      name: "Umum / Belum Dipilih",
      phone: "-",
      commission_rate: 0,
      total_services: 0,
      total_revenue: 0,
      total_commission: 0,
      jobs: [],
    };

    let totalWorkshopServiceOmset = 0;
    let totalWorkshopServiceCount = 0;

    for (const trx of transactions) {
      if (!trx.items || !Array.isArray(trx.items)) continue;

      for (const item of trx.items) {
        if (!item.is_service) continue;

        const servicePrice = Number(item.subtotal || item.unit_price * item.quantity || 0);
        totalWorkshopServiceOmset += servicePrice;
        totalWorkshopServiceCount += Number(item.quantity || 1);

        let mechName = (item.mechanic_name || "").trim();
        let key = mechName ? mechName.toLowerCase() : unassignedKey;

        if (!mechanicMap[key]) {
          mechanicMap[key] = {
            id: item.mechanic_id || null,
            name: mechName,
            phone: "-",
            commission_rate: 50,
            total_services: 0,
            total_revenue: 0,
            total_commission: 0,
            jobs: [],
          };
        }

        const mObj = mechanicMap[key];
        const commRate = mObj.commission_rate || 50;
        const commissionAmount = (servicePrice * commRate) / 100;

        mObj.total_services += Number(item.quantity || 1);
        mObj.total_revenue += servicePrice;
        mObj.total_commission += commissionAmount;
        mObj.jobs.push({
          invoice_number: trx.invoice_number,
          date: trx.created_at,
          customer_name: trx.customer_name,
          vehicle_plate: trx.vehicle_plate || "-",
          vehicle_model: trx.vehicle_model || "-",
          service_name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
          subtotal: servicePrice,
          commission: commissionAmount,
        });
      }
    }

    const recapList = Object.values(mechanicMap)
      .filter((m) => m.total_services > 0 || (m.name !== "Umum / Belum Dipilih"))
      .sort((a, b) => b.total_revenue - a.total_revenue);

    return {
      period: target,
      total_workshop_service_omset: totalWorkshopServiceOmset,
      total_workshop_service_count: totalWorkshopServiceCount,
      mechanics: recapList,
    };
  },
};
