// src/controllers/projectController.ts
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
      { resource_type: "image", folder: "portfolio_projects" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const getProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const projects = await convex.query(api.projects.getAll, {});
    res.status(200).json(projects);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to fetch projects", error: error.message });
  }
};

export const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const thumbnailFile = files?.["thumbnail"]?.[0];
    const projectImageFiles = files?.["projectImages"] || [];

    if (!thumbnailFile) {
      res.status(400).json({ message: "Thumbnail file is required" });
      return;
    }

    const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer);

    const techStackIds = JSON.parse(req.body.techStack || "[]");

    const newProjectData = {
      title: req.body.title,
      description: req.body.description,
      techStack: techStackIds,
      projectUrl: req.body.projectUrl,
      githubUrl: req.body.githubUrl,
      thumbnailUrl: thumbnailResult.secure_url,
      thumbnailId: thumbnailResult.public_id,
    };

    const projectId = await convex.mutation(
      api.projects.create,
      newProjectData
    );

    if (projectImageFiles.length > 0) {
      for (const file of projectImageFiles) {
        const imageResult = await uploadToCloudinary(file.buffer);
        await convex.mutation(api.projects.addImageToProject, {
          projectId: projectId as any,
          imageUrl: imageResult.secure_url,
          imageId: imageResult.public_id,
        });
      }
    }

    res
      .status(201)
      .json({ message: "Project created successfully", projectId });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to create project", error: error.message });
  }
};

export const deleteProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await convex.query(api.projects.getById, {
      projectId: id as any,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    await cloudinary.uploader.destroy(project.thumbnailId);

    if (project.images && project.images.length > 0) {
      for (const image of project.images) {
        await cloudinary.uploader.destroy(image.imageId);
      }
    }

    await convex.mutation(api.projects.remove, { id: id as any });

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to delete project", error: error.message });
  }
};
