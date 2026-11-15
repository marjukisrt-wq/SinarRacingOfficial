const mechanicModel = require("../models/mechanic");
const wrapper = require("../utils/wrapper");

module.exports = {
  getAllMechanics: async (request, response) => {
    try {
      const includeInactive = request.query.include_inactive === "true";
      const mechanics = await mechanicModel.getAllMechanics(includeInactive);
      return wrapper.response(response, 200, "Berhasil mengambil daftar mekanik", mechanics);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil daftar mekanik", error);
    }
  },

  getMechanicById: async (request, response) => {
    try {
      const { id } = request.params;
      const mechanic = await mechanicModel.getMechanicById(id);
      if (!mechanic) {
        return wrapper.response(response, 404, "Data mekanik tidak ditemukan");
      }
      return wrapper.response(response, 200, "Berhasil mengambil detail mekanik", mechanic);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil detail mekanik", error);
    }
  },

  createMechanic: async (request, response) => {
    try {
      const { name, phone, commission_rate } = request.body;
      if (!name || !name.trim()) {
        return wrapper.response(response, 400, "Nama mekanik wajib diisi");
      }
      const newMechanic = await mechanicModel.createMechanic({
        name: name.trim(),
        phone: phone || "",
        commission_rate: commission_rate !== undefined ? Number(commission_rate) : 50,
      });
      return wrapper.response(response, 201, "Mekanik baru berhasil ditambahkan", newMechanic);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menambahkan mekanik", error);
    }
  },

  updateMechanic: async (request, response) => {
    try {
      const { id } = request.params;
      const { name, phone, commission_rate, is_active } = request.body;

      const updatePayload = {};
      if (name !== undefined) updatePayload.name = name.trim();
      if (phone !== undefined) updatePayload.phone = phone.trim();
      if (commission_rate !== undefined) updatePayload.commission_rate = Number(commission_rate);
      if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

      const updated = await mechanicModel.updateMechanic(id, updatePayload);
      if (!updated) {
        return wrapper.response(response, 404, "Data mekanik tidak ditemukan");
      }
      return wrapper.response(response, 200, "Data mekanik berhasil diperbarui", updated);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui data mekanik", error);
    }
  },

  deleteMechanic: async (request, response) => {
    try {
      const { id } = request.params;
      const deleted = await mechanicModel.deleteMechanic(id);
      if (!deleted) {
        return wrapper.response(response, 404, "Data mekanik tidak ditemukan");
      }
      return wrapper.response(response, 200, "Mekanik berhasil dinonaktifkan", deleted);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menghapus mekanik", error);
    }
  },

  getMonthlyRecap: async (request, response) => {
    try {
      const { month } = request.query; // contoh: "2026-11"
      const recap = await mechanicModel.getMonthlyRecap(month);
      return wrapper.response(response, 200, "Berhasil mengambil rekap jasa mekanik", recap);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal mengambil rekap jasa mekanik", error);
    }
  },
};
