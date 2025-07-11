// src/controllers/projectController.ts
import { Request, Response } from "express";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import cloudinary from "../config/cloudinary";
import dotenv from "dotenv";
import { Id } from "../../convex/_generated/dataModel";

import asyncHandler from "express-async-handler";
dotenv.config();

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL environment variable is not set!");
}

const convex = new ConvexHttpClient(process.env.CONVEX_URL as string);

const uploadToCloudinary = (fileBuffer: Buffer): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "portfolio_projects" }, // Opsi folder
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );
    uploadStream.end(fileBuffer);
  });
};

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const projects = await convex.query(api.projects.getAll, {});
  res.status(200).json(projects);
});

export const createProject = asyncHandler(
  async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { title, description, techStack, projectUrl, githubUrl } = req.body;

    const thumbnailFile = files?.["thumbnail"]?.[0];
    const projectImageFiles = files?.["projectImages"] || [];

    if (!thumbnailFile) {
      res.status(400).json({ message: "Thumbnail file is required" });
      return;
    }
    if (!title || !description || !techStack) {
      res
        .status(400)
        .json({ message: "Title, description, and techStack are required" });
      return;
    }

    const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer);

    const techStackIds = JSON.parse(techStack || "[]");

    const newProjectData = {
      title,
      description,
      techStack: techStackIds,
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
          projectId: projectId as any,
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
// without async hadnler
//export const createProject = async (
//  req: Request,
//  res: Response,
//): Promise<void> => {
//  try {
//    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//    const { title, description, techStack, projectUrl, githubUrl } = req.body;
//
//    const thumbnailFile = files?.["thumbnail"]?.[0];
//    const projectImageFiles = files?.["projectImages"] || [];
//
//    if (!thumbnailFile) {
//      res.status(400).json({ message: "Thumbnail file is required" });
//      return;
//    }
//    if (!title || !description || !techStack) {
//      res
//        .status(400)
//        .json({ message: "Title, description, and techStack are required" });
//      return;
//    }
//
//    const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer);
//
//    const techStackIds = JSON.parse(techStack || "[]");
//
//    const newProjectData = {
//      title,
//      description,
//      techStack: techStackIds,
//      projectUrl: projectUrl || "",
//      githubUrl: githubUrl || "",
//      thumbnailUrl: thumbnailResult.secure_url,
//      thumbnailId: thumbnailResult.public_id,
//    };
//
//    const projectId = await convex.mutation(
//      api.projects.create,
//      newProjectData,
//    );
//
//    if (projectImageFiles.length > 0) {
//      for (const file of projectImageFiles) {
//        const imageResult = await uploadToCloudinary(file.buffer);
//        await convex.mutation(api.projects.addImageToProject, {
//          projectId: projectId as any,
//          imageUrl: imageResult.secure_url,
//          imageId: imageResult.public_id,
//        });
//      }
//    }
//    res
//      .status(201)
//      .json({ message: "Project created successfully", projectId });
//  } catch (error: any) {
//    console.error("Create project error:", error);
//    res
//      .status(500)
//      .json({ message: "Failed to create project", error: error.message });
//  }
//};
//
export const updateProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const {
      title,
      description,
      techStack,
      projectUrl,
      githubUrl,
      removedImages,
    } = req.body;

    const existingProject = await convex.query(api.projects.getById, {
      // **PERBAIKAN: Menggunakan 'as any' untuk menghindari error 'Id' not found**
      projectId: id as any,
    });

    if (!existingProject) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const updatedData: { [key: string]: any } = {};
    if (title) updatedData.title = title;
    if (description) updatedData.description = description;
    if (projectUrl) updatedData.projectUrl = projectUrl;
    if (githubUrl) updatedData.githubUrl = githubUrl;
    if (techStack) updatedData.techStack = JSON.parse(techStack);

    const thumbnailFile = files?.["thumbnail"]?.[0];
    if (thumbnailFile) {
      await cloudinary.uploader.destroy(existingProject.thumbnailId);
      const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer);
      updatedData.thumbnailUrl = thumbnailResult.secure_url;
      updatedData.thumbnailId = thumbnailResult.public_id;
    }

    if (removedImages) {
      const imagePublicIdsToRemove: string[] = JSON.parse(removedImages);
      for (const publicId of imagePublicIdsToRemove) {
        const imageDoc = existingProject.images.find(
          (img) => img.imageId === publicId,
        );
        if (imageDoc) {
          await cloudinary.uploader.destroy(publicId);
          await convex.mutation(api.projects.removeImageFromProject, {
            imageId: imageDoc._id as any,
          });
        }
      }
    }

    const projectImageFiles = files?.["projectImages"] || [];
    for (const file of projectImageFiles) {
      const imageResult = await uploadToCloudinary(file.buffer);
      await convex.mutation(api.projects.addImageToProject, {
        projectId: id as any,
        imageUrl: imageResult.secure_url,
        imageId: imageResult.public_id,
      });
    }

    if (Object.keys(updatedData).length > 0) {
      await convex.mutation(api.projects.update, {
        id: id as any,
        ...updatedData,
      });
    }

    res.status(200).json({ message: "Project updated successfully" });
  } catch (error: any) {
    console.error("Update project error:", error);
    res
      .status(500)
      .json({ message: "Failed to update project", error: error.message });
  }
};


export const deleteProject = asyncHandler(
  async (req: Request, res: Response) => {
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
  },
);
