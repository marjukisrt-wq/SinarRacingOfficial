const supabase = require("../config/supabase");

const normalizeCode = (str) => {
  if (!str) return "";
  return String(str).toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const findBestMatch = (targetCode, productList = []) => {
  if (!targetCode || !productList || productList.length === 0) return null;
  const rawTarget = String(targetCode).trim();
  const lowerTarget = rawTarget.toLowerCase();
  const normTarget = normalizeCode(rawTarget);

  let bestProduct = null;
  let highestScore = 0;

  for (const p of productList) {
    if (!p) continue;
    const rawSku = String(p.sku || "").trim();
    const lowerSku = rawSku.toLowerCase();
    const normSku = normalizeCode(rawSku);
    const rawName = String(p.name || "").trim();
    const lowerName = rawName.toLowerCase();
    const normName = normalizeCode(rawName);
    let score = 0;

    if (String(p.id).toLowerCase() === lowerTarget) {
      score = 100;
    } else if (rawSku && lowerSku === lowerTarget) {
      score = 99;
    } else if (normSku && normSku === normTarget) {
      score = 95;
    } else if (lowerName === lowerTarget || (normName && normName === normTarget)) {
      score = 94;
    } else if (normTarget.length === 12 && normTarget.endsWith("00") && normTarget.slice(0, 10) === normSku) {
      score = 90;
    } else if (normSku.length === 12 && normSku.endsWith("00") && normSku.slice(0, 10) === normTarget) {
      score = 90;
    } else if (lowerName.startsWith(lowerTarget) || (normName && normTarget && normName.startsWith(normTarget))) {
      score = 85;
    } else if (normSku.length >= 4 && normTarget.length >= 4 && (normSku.startsWith(normTarget) || normTarget.startsWith(normSku))) {
      score = 80;
    } else if ((lowerName.includes(lowerTarget) || (normName && normTarget && normName.includes(normTarget))) && normTarget.length >= 2) {
      score = 70;
    } else if (normName && normTarget.length >= 8 && normName.includes(normTarget.slice(0, 8))) {
      score = 55;
    }

    if (score > highestScore) {
      highestScore = score;
      bestProduct = p;
    }
  }

  return highestScore >= 50 ? bestProduct : null;
};

// Helper untuk memperluas pencarian SKU/Barcode OEM (Yamaha, Honda AHM, dll)
// Barcode Yamaha: 3C1H21003000 -> otomatis cocok dengan 3C1-H2100-30 dan sebaliknya
const buildSearchOrClause = (searchStr) => {
  if (!searchStr || !searchStr.trim()) return null;
  const raw = searchStr.trim();
  const cleanAlnum = raw.replace(/[^a-zA-Z0-9]/g, "");

  const searchVariants = new Set([raw]);
  if (cleanAlnum && cleanAlnum !== raw) {
    searchVariants.add(cleanAlnum);
  }

  // Barcode Yamaha OEM (12 digit berakhiran '00', contoh: 3C1H21003000 atau 1S7E21110000)
  if (cleanAlnum.length === 12 && cleanAlnum.endsWith("00")) {
    const core = cleanAlnum.slice(0, 10);
    searchVariants.add(core);
    const dashedYamaha = `${core.slice(0, 3)}-${core.slice(3, 8)}-${core.slice(8, 10)}`;
    searchVariants.add(dashedYamaha);
  }

  // Kode Part manual dengan strip (contoh: 3C1-H2100-30) -> cocokkan juga ke barcode '3C1H21003000'
  if (raw.includes("-")) {
    const noDash = raw.replace(/-/g, "");
    searchVariants.add(noDash);
    searchVariants.add(noDash + "00");
  }

  const clauses = [];
  for (const v of searchVariants) {
    clauses.push(`name.ilike.%${v}%`);
    clauses.push(`motor_compatibility.ilike.%${v}%`);
    clauses.push(`sku.ilike.%${v}%`);
  }
  return clauses.join(",");
};

module.exports = {
  getCountProduct: (filters = {}) =>
    new Promise((resolve, reject) => {
      let query = supabase.from("products").select("*", { count: "exact", head: true });

      if (filters.brandId) {
        query = query.eq("brand_id", filters.brandId);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.search) {
        const orClause = buildSearchOrClause(filters.search);
        if (orClause) {
          query = query.or(orClause);
        }
      }
      if (filters.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }
      if (filters.isService !== undefined) {
        query = query.eq("is_service", filters.isService);
      }

      query.then((result) => {
        if (!result.error) {
          resolve(result.count || 0);
        } else {
          reject(result);
        }
      });
    }),

  getAllProducts: (filters = {}, offset = 0, limit = 50) =>
    new Promise((resolve, reject) => {
      let query = supabase.from("products").select(`
        *,
        brand:brands ( id, name ),
        category:categories ( id, name )
      `);

      if (filters.brandId) {
        query = query.eq("brand_id", filters.brandId);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.search) {
        const orClause = buildSearchOrClause(filters.search);
        if (orClause) {
          query = query.or(orClause);
        }
      }
      if (filters.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }
      if (filters.isService !== undefined) {
        query = query.eq("is_service", filters.isService);
      }

      // Default sorting: urutkan berdasarkan nama barang (A-Z)
      const sortBy = filters.sortBy || "name";
      const sortOrder = filters.sortOrder === "desc" ? false : true;
      query = query.order(sortBy, { ascending: sortOrder });

      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      query.then((result) => {
        if (!result.error) {
          resolve(result);
        } else {
          reject(result);
        }
      });
    }),

  getProductById: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .select(`
          *,
          brand:brands ( id, name ),
          category:categories ( id, name )
        `)
        .eq("id", id)
        .single()
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  getProductBySku: (sku) =>
    new Promise((resolve, reject) => {
      if (!sku || !sku.trim()) return resolve({ data: null });
      const target = sku.trim();
      const orClause = buildSearchOrClause(target);
      let query = supabase
        .from("products")
        .select(`
          *,
          brand:brands ( id, name ),
          category:categories ( id, name )
        `);

      if (orClause) {
        query = query.or(orClause);
      } else {
        query = query.eq("sku", target);
      }

      query
        .limit(10)
        .then((result) => {
          if (!result.error) {
            const candidates = result.data || [];
            const best = findBestMatch(target, candidates);
            resolve({ data: best || candidates[0] || null });
          } else {
            reject(result);
          }
        });
    }),

  createProduct: (data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .insert([data])
        .select(`
          *,
          brand:brands ( id, name ),
          category:categories ( id, name )
        `)
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  updateProduct: (id, data) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(`
          *,
          brand:brands ( id, name ),
          category:categories ( id, name )
        `)
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  updateStock: (id, newStock) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", id)
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),

  deleteProduct: (id) =>
    new Promise((resolve, reject) => {
      supabase
        .from("products")
        .delete()
        .eq("id", id)
        .then((result) => {
          if (!result.error) {
            resolve(result);
          } else {
            reject(result);
          }
        });
    }),
};
