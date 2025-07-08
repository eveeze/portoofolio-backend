// src/controllers/techStackController.ts
import { Request, Response } from "express";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import cloudinary from "../config/cloudinary";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL environment variable is not set!");
}

const convex = new ConvexHttpClient(process.env.CONVEX_URL as string);

const uploadToCloudinary = (fileBuffer: Buffer): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "tech_logos" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const getTechStacks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const techStacks = await convex.query(api.techStacks.getAll, {});
    res.status(200).json(techStacks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tech stacks", error });
  }
};

export const createTechStack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Logo file is required" });
      return;
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

    const newTechStack = {
      name: req.body.name,
      logoUrl: cloudinaryResult.secure_url,
      logoId: cloudinaryResult.public_id,
    };

    const techStackId = await convex.mutation(
      api.techStacks.create,
      newTechStack
    );
    res
      .status(201)
      .json({ message: "Tech stack created successfully", techStackId });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to create tech stack", error: error.message });
  }
};

export const deleteTechStack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const techStack = await convex.query(api.techStacks.getById, {
      id: id as any,
    });

    if (!techStack) {
      res.status(404).json({ message: "Tech stack not found" });
      return;
    }

    await cloudinary.uploader.destroy(techStack.logoId);

    await convex.mutation(api.techStacks.remove, { id: id as any });

    res.status(200).json({ message: "Tech stack deleted successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to delete tech stack", error: error.message });
  }
};
