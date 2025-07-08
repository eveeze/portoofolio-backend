// convex/projects.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// --- QUERIES (Read operations) ---

// Get all projects dengan detail tech stack dan gambar
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").collect();

    // Untuk setiap proyek, kita akan mengambil data gambar dan tech stack terkait
    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        // Ambil gambar-gambar proyek
        const projectImages = await ctx.db
          .query("projectImages")
          .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
          .collect();

        // Ambil detail tech stack
        const techStackDetails = await Promise.all(
          project.techStack.map(async (techId) => {
            const tech = await ctx.db.get(techId);
            // Menghindari error jika tech stack telah dihapus
            if (!tech) return { name: "Unknown", logoUrl: "" };
            return tech;
          })
        );

        return {
          ...project,
          images: projectImages,
          techStack: techStackDetails,
        };
      })
    );

    return projectsWithDetails;
  },
});

// Get a single project by its ID dengan detail lengkap
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Ambil gambar-gambar proyek
    const projectImages = await ctx.db
      .query("projectImages")
      .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
      .collect();

    // Ambil detail tech stack
    const techStackDetails = await Promise.all(
      project.techStack.map(async (techId) => {
        const tech = await ctx.db.get(techId);
        if (!tech) return { name: "Unknown", logoUrl: "" };
        return tech;
      })
    );

    return {
      ...project,
      images: projectImages,
      techStack: techStackDetails,
    };
  },
});

// --- MUTATIONS (Write operations) ---

// Create a new project
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    techStack: v.array(v.id("techStacks")), // Menerima array ID
    projectUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    thumbnailUrl: v.string(),
    thumbnailId: v.string(),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      description: args.description,
      techStack: args.techStack,
      projectUrl: args.projectUrl,
      githubUrl: args.githubUrl,
      thumbnailUrl: args.thumbnailUrl,
      thumbnailId: args.thumbnailId,
    });
    return projectId;
  },
});

// Menambahkan gambar ke proyek yang sudah ada
export const addImageToProject = mutation({
  args: {
    projectId: v.id("projects"),
    imageUrl: v.string(),
    imageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("projectImages", {
      projectId: args.projectId,
      imageUrl: args.imageUrl,
      imageId: args.imageId,
    });
  },
});

// Delete a project
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    // Pertama, kita harus menghapus semua gambar terkait dari tabel projectImages
    const imagesToDelete = await ctx.db
      .query("projectImages")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.id))
      .collect();

    // Hapus setiap entri gambar
    await Promise.all(imagesToDelete.map((image) => ctx.db.delete(image._id)));

    // Kemudian, hapus proyek itu sendiri
    await ctx.db.delete(args.id);
  },
});
