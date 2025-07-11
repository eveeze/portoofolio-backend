// src/controllers/techStackController.ts
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
      { resource_type: "image", folder: "tech_logos" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    uploadStream.end(fileBuffer);
  });
};

/*
 * @desc    Fetch semua tech stack
 * @route   GET /api/tech-stacks
 * @access  Public
 */
export const getTechStacks = asyncHandler(
  async (req: Request, res: Response) => {
    const techStacks = await convex.query(api.techStacks.getAll, {});
    res.status(200).json(techStacks);
  },
);

/*
 * @desc    Membuat tech stack baru
 * @route   POST /api/tech-stacks
 * @access  Private
 */
export const createTechStack = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400);
      throw new Error("Logo file is required");
    }
    if (!req.body.name) {
      res.status(400);
      throw new Error("Name is required");
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

    const newTechStack = {
      name: req.body.name,
      logoUrl: cloudinaryResult.secure_url,
      logoId: cloudinaryResult.public_id,
    };

    const techStackId = await convex.mutation(
      api.techStacks.create,
      newTechStack,
    );
    res
      .status(201)
      .json({ message: "Tech stack created successfully", techStackId });
  },
);

/*
 * @desc    Menghapus sebuah tech stack
 * @route   DELETE /api/tech-stacks/:id
 * @access  Private
 */
export const deleteTechStack = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const techStackId = id as Id<"techStacks">;

    const techStack = await convex.query(api.techStacks.getById, {
      id: techStackId,
    });

    if (!techStack) {
      res.status(404);
      throw new Error("Tech stack not found");
    }

    // 1. Hapus logo dari Cloudinary
    await cloudinary.uploader.destroy(techStack.logoId);

    // 2. Hapus tech stack dari database Convex
    await convex.mutation(api.techStacks.remove, { id: techStackId });

    res.status(200).json({ message: "Tech stack deleted successfully" });
  },
);
