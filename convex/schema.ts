// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Tabel untuk menyimpan detail proyek
  projects: defineTable({
    title: v.string(),
    description: v.string(),
    // Menyimpan array dari ID techStack, bukan lagi array of string
    techStack: v.array(v.id("techStacks")),
    projectUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    // Thumbnail proyek
    thumbnailUrl: v.string(),
    thumbnailId: v.string(),
  }).searchIndex("by_title", {
    searchField: "title",
  }),

  // Tabel baru untuk menyimpan gambar-gambar proyek (relasi one-to-many dengan projects)
  projectImages: defineTable({
    projectId: v.id("projects"),
    imageUrl: v.string(),
    imageId: v.string(),
  }).index("by_projectId", ["projectId"]),

  // Tabel baru untuk menyimpan daftar teknologi beserta logonya
  techStacks: defineTable({
    name: v.string(),
    logoUrl: v.string(),
    logoId: v.string(), // public_id dari Cloudinary untuk logo
  }).index("by_name", ["name"]),
});
