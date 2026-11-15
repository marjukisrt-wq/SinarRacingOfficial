const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder-offline.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "placeholder-key";

const isConfigured = Boolean(
  process.env.SUPABASE_URL &&
  !process.env.SUPABASE_URL.includes("your-project-id") &&
  !process.env.SUPABASE_URL.includes("placeholder")
);

if (!isConfigured) {
  console.log("INFO: Database Supabase belum dikonfigurasi. Backend berjalan dalam Mode Demo Lokal.");
}

const supabase = createClient(supabaseUrl, supabaseKey);
supabase.isConfigured = isConfigured;

module.exports = supabase;
