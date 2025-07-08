// src/routes/projectRoutes.ts
import { Router } from "express";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController";
import upload from "../middlewares/multer";
// Impor middleware protect
import { protect } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", getProjects);

router.post(
  "/",
  protect,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "projectImages", maxCount: 10 },
  ]),
  createProject
);
router.put(
  "/:id",
  protect, // Amankan rute ini
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "projectImages", maxCount: 10 },
  ]),
  updateProject
);
router.delete("/:id", protect, deleteProject);

export default router;
