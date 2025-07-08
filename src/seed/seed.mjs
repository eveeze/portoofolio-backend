// src/seed/seed.mjs

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../../convex/_generated/api.js";

// Muat environment variables
dotenv.config();

const { CONVEX_URL } = process.env;
if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL environment variable is not set!");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

const usersToSeed = [
  { username: "dev_user" },
  { username: "admin_test" },
  { username: "qa_tester" },
];

const runSeed = async () => {
  console.log("🌱 Memulai proses seeding...");

  let successCount = 0;
  let existCount = 0;

  for (const user of usersToSeed) {
    try {
      await convex.mutation(api.users.createUser, {
        username: user.username,
      });
      console.log(`✅ User "${user.username}" berhasil dibuat.`);
      successCount++;
    } catch (error) {
      // Disesuaikan untuk menangkap error dari Convex dengan benar
      if (error.data?.message?.includes("Username already exists")) {
        console.warn(`🔶 User "${user.username}" sudah ada. Dilewati.`);
        existCount++;
      } else {
        console.error(
          `🔥 Gagal membuat user "${user.username}":`,
          error.data?.message || error
        );
      }
    }
  }

  console.log("\n--- Ringkasan Seeding ---");
  console.log(`✅ ${successCount} user berhasil dibuat.`);
  console.log(`🔶 ${existCount} user sudah ada.`);
  console.log("--- Seeding selesai! ---\n");
};

runSeed();
