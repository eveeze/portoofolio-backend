// src/controllers/projectController.ts
// src/controllers/projectController.ts
import { Request, Response } from "express";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import cloudinary from "../config/cloudinary";
import dotenv from "dotenv";
import asyncHandler from "express-async-handler";
import { Id } from "../../convex/_generated/dataModel";

dotenv.config();

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL environment variable is not set!");
}

const convex = new ConvexHttpClient(process.env.CONVEX_URL as string);

/**
 * Helper function untuk mengunggah file ke Cloudinary.
 * @param fileBuffer Buffer dari file yang akan diunggah.
 * @returns Promise yang resolve dengan hasil dari Cloudinary.
 */
const uploadToCloudinary = (fileBuffer: Buffer): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "portfolio_projects" }, // Folder spesifik untuk proyek
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    uploadStream.end(fileBuffer);
  });
};

/*
 * @desc    Fetch semua project
 * @route   GET /api/projects
 * @access  Public
 */
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const projects = await convex.query(api.projects.getAll, {});
  res.status(200).json(projects);
});

/*
 * @desc    Membuat project baru
 * @route   POST /api/projects
 * @access  Private
 */
export const createProject = asyncHandler(
  async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { title, description, techStack, projectUrl, githubUrl } = req.body;

    const thumbnailFile = files?.["thumbnail"]?.[0];
    const projectImageFiles = files?.["projectImages"] || [];

    if (!thumbnailFile) {
      res.status(400);
      throw new Error("Thumbnail file is required");
    }
    if (!title || !description || !techStack) {
      res.status(400);
      throw new Error("Title, description, and techStack are required");
    }

    const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer);

    const newProjectData = {
      title,
      description,
      techStack: JSON.parse(techStack || "[]"),
      projectUrl: projectUrl || "",
      githubUrl: githubUrl || "",
      thumbnailUrl: thumbnailResult.secure_url,
      thumbnailId: thumbnailResult.public_id,
    };

    const projectId = await convex.mutation(
      api.projects.create,
      newProjectData,
    );

    if (projectImageFiles.length > 0) {
      for (const file of projectImageFiles) {
        const imageResult = await uploadToCloudinary(file.buffer);
        await convex.mutation(api.projects.addImageToProject, {
          projectId: projectId, // Tipe Id sudah benar di sini
          imageUrl: imageResult.secure_url,
          imageId: imageResult.public_id,
        });
      }
    }

    res
      .status(201)
      .json({ message: "Project created successfully", projectId });
  },
);

/*
 * @desc    Update sebuah project
 * @route   PUT /api/projects/:id
 * @access  Private
 */
export const updateProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const projectId = id as Id<"projects">;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const {
      title,
      description,
      techStack,
      projectUrl,
      githubUrl,
      removedImages, // Berisi array string public_id gambar yang akan dihapus
    } = req.body;

    const existingProject = await convex.query(api.projects.getById, {
      projectId,
    });

    if (!existingProject) {
      res.status(404);
      throw new Error("Project not found");
    }

    // 1. Kumpulkan data teks untuk di-update
    const updatedData: { [key: string]: any } = {};
    if (title) updatedData.title = title;
    if (description) updatedData.description = description;
    if (projectUrl) updatedData.projectUrl = projectUrl;
    if (githubUrl) updatedData.githubUrl = githubUrl;
    if (techStack) updatedData.techStack = JSON.parse(techStack);

    // 2. Handle update thumbnail jika ada file baru
    const thumbnailFile = files?.["thumbnail"]?.[0];
    if (thumbnailFile) {
      await cloudinary.uploader.destroy(existingProject.thumbnailId);
      const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer);
      updatedData.thumbnailUrl = thumbnailResult.secure_url;
      updatedData.thumbnailId = thumbnailResult.public_id;
    }

    // 3. Handle penghapusan gambar spesifik
    if (removedImages) {
      const imagePublicIdsToRemove: string[] = JSON.parse(removedImages);
      for (const publicId of imagePublicIdsToRemove) {
        const imageDoc = existingProject.images.find(
          (img) => img.imageId === publicId,
        );
        if (imageDoc) {
          await cloudinary.uploader.destroy(publicId);
          await convex.mutation(api.projects.removeImageFromProject, {
            imageId: imageDoc._id,
          });
        }
      }
    }

    // 4. Handle penambahan gambar baru
    const projectImageFiles = files?.["projectImages"] || [];
    for (const file of projectImageFiles) {
      const imageResult = await uploadToCloudinary(file.buffer);
      await convex.mutation(api.projects.addImageToProject, {
        projectId: projectId,
        imageUrl: imageResult.secure_url,
        imageId: imageResult.public_id,
      });
    }

    // 5. Kirim pembaruan ke Convex jika ada perubahan data
    if (Object.keys(updatedData).length > 0) {
      await convex.mutation(api.projects.update, {
        id: projectId,
        ...updatedData,
      });
    }

    res.status(200).json({ message: "Project updated successfully" });
  },
);

/*
 * @desc    Menghapus sebuah project
 * @route   DELETE /api/projects/:id
 * @access  Private
 */
export const deleteProject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const projectId = id as Id<"projects">;
    const project = await convex.query(api.projects.getById, {
      projectId,
    });

    if (!project) {
      res.status(404);
      throw new Error("Project not found");
    }

    // 1. Hapus thumbnail dari Cloudinary
    await cloudinary.uploader.destroy(project.thumbnailId);

    // 2. Hapus semua gambar proyek terkait dari Cloudinary
    if (project.images && project.images.length > 0) {
      const imageIdsToDelete = project.images.map((image) => image.imageId);
      // 'delete_resources' lebih efisien untuk menghapus banyak file
      await cloudinary.api.delete_resources(imageIdsToDelete);
    }

    // 3. Hapus project dari database Convex (ini juga akan menghapus relasi gambar)
    await convex.mutation(api.projects.remove, { id: projectId });

    res.status(200).json({ message: "Project deleted successfully" });
  },
);
