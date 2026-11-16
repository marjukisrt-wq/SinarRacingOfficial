const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabase");

const LOCAL_FILE = path.resolve(__dirname, "../../data/mechanics.json");

const withTimeout = (promise, ms = 2500) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Supabase request timeout")), ms)
    ),
  ]);
};

const readLocalMechanics = () => {
  try {
    if (!fs.existsSync(LOCAL_FILE)) {
      return [];
    }
    const data = fs.readFileSync(LOCAL_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (e) {
    console.error("Gagal membaca local mechanics.json:", e);
    return [];
  }
};

const writeLocalMechanics = (data) => {
  try {
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Gagal menulis local mechanics.json:", e);
  }
};

module.exports = {
  getAllMechanics: async (includeInactive = false) => {
    // 1. Coba dari Supabase jika tersedia (maks 2.5 detik)
    try {
      let query = supabase.from("mechanics").select("*").order("name", { ascending: true });
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await withTimeout(query, 2000);
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // Abaikan jika tabel belum ada atau timeout offline
    }

    // 2. Fallback local JSON file
    let list = readLocalMechanics();
    if (!includeInactive) {
      list = list.filter((m) => m.is_active);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  getMechanicById: async (id) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from("mechanics").select("*").eq("id", id).single(),
        2000
      );
      if (!error && data) return data;
    } catch (e) {}

    const list = readLocalMechanics();
    return list.find((m) => String(m.id) === String(id)) || null;
  },

  createMechanic: async (mechanicData) => {
    // 1. Coba simpan ke Supabase
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
        2500
      );
      if (!error && data) {
        // Sinkronisasi ke local backup file
        const list = readLocalMechanics();
        list.push(data);
        writeLocalMechanics(list);
        return data;
      }
    } catch (e) {}

    // 2. Fallback local JSON
    const list = readLocalMechanics();
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
    writeLocalMechanics(list);
    return newRecord;
  },

  updateMechanic: async (id, updateData) => {
    // 1. Coba perbarui di Supabase
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("mechanics")
          .update(updateData)
          .eq("id", id)
          .select()
          .single(),
        2500
      );
      if (!error && data) {
        // Sinkronisasi ke local file
        const list = readLocalMechanics();
        const index = list.findIndex((m) => String(m.id) === String(id));
        if (index !== -1) {
          list[index] = { ...list[index], ...updateData, updated_at: new Date().toISOString() };
          writeLocalMechanics(list);
        }
        return data;
      }
    } catch (e) {}

    // 2. Fallback local file
    const list = readLocalMechanics();
    const index = list.findIndex((m) => String(m.id) === String(id));
    if (index !== -1) {
      list[index] = { ...list[index], ...updateData, updated_at: new Date().toISOString() };
      writeLocalMechanics(list);
      return list[index];
    }
    return null;
  },

  deleteMechanic: async (id) => {
    // 1. Coba hapus permanen dari Supabase
    let deletedSupabase = null;
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("mechanics")
          .delete()
          .eq("id", id)
          .select()
          .single(),
        2500
      );
      if (!error && data) {
        deletedSupabase = data;
      }
    } catch (e) {
      console.warn("Gagal delete mekanik di Supabase:", e?.message);
    }

    // 2. Selalu bersihkan juga dari local JSON file
    const list = readLocalMechanics();
    const index = list.findIndex((m) => String(m.id) === String(id));
    if (index !== -1) {
      const removed = list.splice(index, 1);
      writeLocalMechanics(list);
      return deletedSupabase || removed[0];
    }

    return deletedSupabase;
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

    // Ambil daftar mekanik untuk base rate & daftar nama
    let mechanicsList = [];
    try {
      const { data } = await withTimeout(supabase.from("mechanics").select("*"), 2000);
      if (data && data.length > 0) mechanicsList = data;
      else mechanicsList = readLocalMechanics();
    } catch (e) {
      mechanicsList = readLocalMechanics();
    }

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
