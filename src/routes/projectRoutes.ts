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
import { cache, clearCache } from "../middlewares/cacheMiddleware";
const router = Router();
const PROJECTS_CACHE_KEY = "projects:all";
router.get("/", cache(PROJECTS_CACHE_KEY), getProjects);

router.post(
  "/",
  protect,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "projectImages", maxCount: 10 },
  ]),
  clearCache(PROJECTS_CACHE_KEY),

  createProject,
);
router.put(
  "/:id",
  protect, // Amankan rute ini
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "projectImages", maxCount: 10 },
  ]),

  clearCache(PROJECTS_CACHE_KEY),
  updateProject,
);
router.delete("/:id", protect, clearCache(PROJECTS_CACHE_KEY), deleteProject);

export default router;
