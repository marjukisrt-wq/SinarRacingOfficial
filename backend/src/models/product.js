const supabase = require("../config/supabase");

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
      // Cari produk dengan SKU persis atau varian OEM Yamaha/Honda
      const orClause = buildSearchOrClause(sku);
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
        query = query.eq("sku", sku);
      }

      query
        .limit(1)
        .then((result) => {
          if (!result.error) {
            resolve({ data: result.data?.[0] || null });
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
