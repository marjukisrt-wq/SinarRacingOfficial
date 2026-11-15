const storeSettingsModel = require("../models/storeSettings");
const wrapper = require("../utils/wrapper");

module.exports = {
  getSettings: async (request, response) => {
    try {
      const supabase = require("../config/supabase");
      const result = supabase.isConfigured ? (await storeSettingsModel.getSettings().catch(() => ({ data: null }))) : null;
      if (result?.data) {
        return wrapper.response(response, 200, "Berhasil mengambil profil toko", result.data);
      }
      // Fallback profil toko Sinar Racing Official
      return wrapper.response(response, 200, "Profil Toko (Mode Demo)", {
        id: 1,
        store_name: "SINAR RACING OFFICIAL",
        tagline: "Pusat Sparepart & Servis Motor",
        address: "Jl. Raya Utama Bengkel No. 88",
        phone: "0812-3456-7890",
        receipt_footer: "Terima kasih atas kunjungan Anda!\nGaransi servis 3 hari.",
      });
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 200, "Profil Toko (Mode Demo)", {
        id: 1,
        store_name: "SINAR RACING OFFICIAL",
        tagline: "Pusat Sparepart & Servis Motor",
        address: "Jl. Raya Utama Bengkel No. 88",
        phone: "0812-3456-7890",
        receipt_footer: "Terima kasih atas kunjungan Anda!\nGaransi servis 3 hari.",
      });
    }
  },

  updateSettings: async (request, response) => {
    try {
      const { store_name, tagline, address, phone, receipt_footer } = request.body;
      const result = await storeSettingsModel.updateSettings({
        store_name,
        tagline,
        address,
        phone,
        receipt_footer,
      });
      return wrapper.response(response, 200, "Berhasil memperbarui profil toko", result.data);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui profil toko", error);
    }
  },
};
