// src/routes/projectRoutes.ts
import { Router } from "express";
import {
  getProjects,
  createProject,
  deleteProject,
} from "../controllers/projectController";
import upload from "../middlewares/multer";
// Impor middleware protect
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// Rute ini tetap publik, siapa saja bisa melihat proyek
router.get("/", getProjects);

// Amankan rute untuk membuat proyek baru
router.post(
  "/",
  protect, // Tambahkan ini: Hanya user yang sudah login bisa mengakses
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "projectImages", maxCount: 10 },
  ]),
  createProject
);

// Amankan rute untuk menghapus proyek
router.delete("/:id", protect, deleteProject); // Tambahkan protect di sini

export default router;
