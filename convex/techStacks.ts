// convex/techStacks.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// --- QUERIES ---

// Mengambil semua tech stack
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("techStacks").order("desc").collect();
  },
});
/*
 get the length of total tech stack
  */
export const countAll = query({

  handler: async (ctx) => {
    const techstacks = await ctx.db.query("techStacks").collect();
    return techstacks.length
  }
})

// --- MUTATIONS ---

// Membuat tech stack baru
export const create = mutation({
  args: {
    name: v.string(),
    logoUrl: v.string(),
    logoId: v.string(),
  },
  handler: async (ctx, args) => {
    const techStackId = await ctx.db.insert("techStacks", {
      name: args.name,
      logoUrl: args.logoUrl,
      logoId: args.logoId,
    });
    return techStackId;
  },
});

// Menghapus tech stack
export const remove = mutation({
  args: { id: v.id("techStacks") },
  handler: async (ctx, args) => {
    // Di sini kita juga perlu menghapus logo dari Cloudinary,
    // yang akan kita handle di sisi server Express.
    await ctx.db.delete(args.id);
  },
});

// Helper untuk mendapatkan techStack by ID, berguna untuk proses delete
export const getById = query({
  args: { id: v.id("techStacks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
