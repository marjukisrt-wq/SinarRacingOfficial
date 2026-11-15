const bcrypt = require("bcrypt");
const userModel = require("../models/user");
const wrapper = require("../utils/wrapper");

module.exports = {
  getAllUsers: async (request, response) => {
    try {
      const result = await userModel.getAllUsers().catch(() => ({ data: null }));
      if (result?.data && result.data.length > 0) {
        return wrapper.response(response, 200, "Berhasil mengambil daftar pengguna", result.data);
      }
      const dummyUsers = [
        {
          id: "00000000-0000-0000-0000-000000000001",
          username: "admin",
          name: "Owner Sinar Racing Official",
          role: "SUPER_ADMIN",
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "00000000-0000-0000-0000-000000000002",
          username: "kasir1",
          name: "Kasir Sinar Racing",
          role: "KASIR",
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];
      return wrapper.response(response, 200, "Daftar Pengguna (Mode Demo)", dummyUsers);
    } catch (error) {
      console.error(error);
      const dummyUsers = [
        {
          id: "00000000-0000-0000-0000-000000000001",
          username: "admin",
          name: "Owner Sinar Racing Official",
          role: "SUPER_ADMIN",
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];
      return wrapper.response(response, 200, "Daftar Pengguna (Mode Demo)", dummyUsers);
    }
  },

  createUser: async (request, response) => {
    try {
      const { username, password, name, role = "KASIR" } = request.body;

      if (!username || !password || !name) {
        return wrapper.response(response, 400, "Username, password, dan nama wajib diisi");
      }

      // Cek apakah username sudah dipakai
      const existingUser = await userModel.getUserByUsername(username).catch(() => ({ data: null }));
      if (existingUser && existingUser.data) {
        return wrapper.response(response, 400, "Username sudah digunakan, silakan pilih username lain");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const validRoles = ["SUPER_ADMIN", "KASIR", "GUDANG"];
      const userRole = validRoles.includes(role?.toUpperCase()) ? role.toUpperCase() : "KASIR";

      const payload = {
        username: username.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        role: userRole,
        is_active: true,
      };

      const result = await userModel.createUser(payload);
      return wrapper.response(response, 201, "Berhasil membuat akun pengguna baru", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal membuat akun pengguna", error);
    }
  },

  updateUser: async (request, response) => {
    try {
      const { id } = request.params;
      const { name, role, is_active, password } = request.body;

      const updatePayload = {};
      if (name !== undefined) updatePayload.name = name.trim();
      if (role !== undefined) {
        const validRoles = ["SUPER_ADMIN", "KASIR", "GUDANG"];
        if (validRoles.includes(role.toUpperCase())) {
          updatePayload.role = role.toUpperCase();
        }
      }
      if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

      if (password) {
        updatePayload.password = await bcrypt.hash(password, 10);
      }

      const result = await userModel.updateUser(id, updatePayload);
      return wrapper.response(response, 200, "Berhasil memperbarui data pengguna", result.data[0]);
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal memperbarui data pengguna", error);
    }
  },

  deleteUser: async (request, response) => {
    try {
      const { id } = request.params;
      // Jangan biarkan admin menghapus dirinya sendiri
      if (request.user && request.user.id === id) {
        return wrapper.response(response, 400, "Anda tidak dapat menghapus akun Anda sendiri");
      }
      await userModel.deleteUser(id);
      return wrapper.response(response, 200, "Berhasil menghapus akun pengguna");
    } catch (error) {
      console.error(error);
      return wrapper.response(response, 500, "Gagal menghapus akun pengguna", error);
    }
  },
};
