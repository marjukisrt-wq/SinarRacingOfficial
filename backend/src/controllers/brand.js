const brandModel = require("../models/brand");
const wrapper = require("../utils/wrapper");

module.exports = {
  getAllBrands: async (request, response) => {
    try {
      const supabase = require("../config/supabase");
      const result = supabase.isConfigured ? (await brandModel.getAllBrands().catch(() => ({ data: null }))) : null;
      if (result?.data && result.data.length > 0) {
        return wrapper.response(response, 200, "Berhasil mengambil data merk motor", result.data);
      }
      const dummyBrands = [
        { id: 1, name: "Honda", description: "Sparepart Honda" },
        { id: 2, name: "Yamaha", description: "Sparepart Yamaha" },
        { id: 3, name: "Kawasaki", description: "Sparepart Kawasaki" },
        { id: 4, name: "Suzuki", description: "Sparepart Suzuki" },
        { id: 5, name: "Universal", description: "Kompatibel Semua Motor" },
      ];
      return wrapper.response(response, 200, "Data Merk Motor (Mode Demo)", dummyBrands);
    } catch (error) {
      console.error(error);
      const dummyBrands = [
        { id: 1, name: "Honda", description: "Sparepart Honda" },
        { id: 2, name: "Yamaha", description: "Sparepart Yamaha" },
        { id: 3, name: "Kawasaki", description: "Sparepart Kawasaki" },
        { id: 4, name: "Suzuki", description: "Sparepart Suzuki" },
        { id: 5, name: "Universal", description: "Kompatibel Semua Motor" },
      ];
      return wrapper.response(response, 200, "Data Merk Motor (Mode Demo)", dummyBrands);
    }
  },

  getBrandById: async (request, response) => {
    try {
      const { id } = request.params;
      const result = await brandModel.getBrandById(id);
      return wrapper.response(response, 200, "Berhasil mengambil detail merk", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 404, "Merk motor tidak ditemukan", error);
    }
  },

  createBrand: async (request, response) => {
    try {
      const { name, description } = request.body;
      if (!name) {
        return wrapper.response(response, 400, "Nama merk motor wajib diisi");
      }
      const result = await brandModel.createBrand({ name, description });
      return wrapper.response(response, 201, "Berhasil menambahkan merk motor baru", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menambahkan merk motor", error);
    }
  },

  updateBrand: async (request, response) => {
    try {
      const { id } = request.params;
      const { name, description } = request.body;
      const result = await brandModel.updateBrand(id, { name, description });
      return wrapper.response(response, 200, "Berhasil memperbarui merk motor", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui merk motor", error);
    }
  },

  deleteBrand: async (request, response) => {
    try {
      const { id } = request.params;
      await brandModel.deleteBrand(id);
      return wrapper.response(response, 200, "Berhasil menghapus merk motor");
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menghapus merk motor", error);
    }
  },
};
