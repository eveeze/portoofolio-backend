import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../../convex/_generated/api";

import dotenv from "dotenv";

const { CONVEX_URL } = process.env;

if (!CONVEX_URL) {
  throw new Error("CONVEX_URL environment belum di set");
}

const convex = new ConvexHttpClient(CONVEX_URL);

/*
 @deskripsi Dapatkan statistik untuk admin dashboard
 @route GET /api/dashboard/stats 
 @access Private
 * */


export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const [totalProjects, totalTechStacks] = await Promise.all([
    convex.query(api.projects.countAll),
    convex.query(api.techStacks.countAll),
  ]);

  res.status(200).json({
    message: "statistik dashboard berhasil difetch",
    data: {
      totalProjects,
      totalTechStacks,
    },
  });
});
