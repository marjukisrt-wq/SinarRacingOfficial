const categoryModel = require("../models/category");
const wrapper = require("../utils/wrapper");

module.exports = {
  getAllCategories: async (request, response) => {
    try {
      const supabase = require("../config/supabase");
      const result = supabase.isConfigured ? (await categoryModel.getAllCategories().catch(() => ({ data: null }))) : null;
      if (result?.data && result.data.length > 0) {
        return wrapper.response(response, 200, "Berhasil mengambil kategori sparepart", result.data);
      }
      const dummyCategories = [
        { id: 1, name: "Oli & Pelumas" },
        { id: 2, name: "Pengereman" },
        { id: 3, name: "Transmisi & CVT" },
        { id: 4, name: "Mesin" },
        { id: 5, name: "Kelistrikan & Busi" },
        { id: 6, name: "Rangka & Bodi" },
        { id: 7, name: "Ban & Roda" },
        { id: 8, name: "Aksesoris & Baut" },
        { id: 9, name: "Jasa & Servis" },
      ];
      return wrapper.response(response, 200, "Kategori Sparepart (Mode Demo)", dummyCategories);
    } catch (error) {
      console.error(error);
      const dummyCategories = [
        { id: 1, name: "Oli & Pelumas" },
        { id: 2, name: "Pengereman" },
        { id: 3, name: "Transmisi & CVT" },
        { id: 4, name: "Mesin" },
        { id: 5, name: "Kelistrikan & Busi" },
        { id: 6, name: "Rangka & Bodi" },
        { id: 7, name: "Ban & Roda" },
        { id: 8, name: "Aksesoris & Baut" },
        { id: 9, name: "Jasa & Servis" },
      ];
      return wrapper.response(response, 200, "Kategori Sparepart (Mode Demo)", dummyCategories);
    }
  },

  getCategoryById: async (request, response) => {
    try {
      const { id } = request.params;
      const result = await categoryModel.getCategoryById(id);
      return wrapper.response(response, 200, "Berhasil mengambil detail kategori", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 404, "Kategori tidak ditemukan", error);
    }
  },

  createCategory: async (request, response) => {
    try {
      const { name, description } = request.body;
      if (!name) {
        return wrapper.response(response, 400, "Nama kategori wajib diisi");
      }
      const result = await categoryModel.createCategory({ name, description });
      return wrapper.response(response, 201, "Berhasil menambahkan kategori baru", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menambahkan kategori", error);
    }
  },

  updateCategory: async (request, response) => {
    try {
      const { id } = request.params;
      const { name, description } = request.body;
      const result = await categoryModel.updateCategory(id, { name, description });
      return wrapper.response(response, 200, "Berhasil memperbarui kategori", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui kategori", error);
    }
  },

  deleteCategory: async (request, response) => {
    try {
      const { id } = request.params;
      await categoryModel.deleteCategory(id);
      return wrapper.response(response, 200, "Berhasil menghapus kategori");
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menghapus kategori", error);
    }
  },
};
