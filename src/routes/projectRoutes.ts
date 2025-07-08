// src/routes/projectRoutes.ts
import { Router } from "express";
import {
  getProjects,
  createProject,
  deleteProject,
} from "../controllers/projectController";
import upload from "../middlewares/multer";

const router = Router();

router.get("/", getProjects);

// Menggunakan upload.fields untuk menerima beberapa jenis file
router.post(
  "/",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "projectImages", maxCount: 10 }, // Izinkan hingga 10 gambar proyek
  ]),
  createProject
);

router.delete("/:id", deleteProject);

export default router;
