// src/index.ts
// src/index.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// Impor semua rute yang ada
import projectRoutes from "./routes/projectRoutes";
import techStackRoutes from "./routes/techStackRoutes";
import authRoutes from "./routes/authRoutes";
import devRoutes from "./routes/devRoutes";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5001;

// Atur CORS agar origin frontend bisa mengakses
const corsOptions = {
  origin: process.env.RP_ORIGIN || "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));

// Daftarkan semua routes
app.use("/api/auth", authRoutes); // Tambahkan ini
app.use("/api/tech-stacks", techStackRoutes); // Tambahkan ini
app.use("/api/projects", projectRoutes);
if (process.env.NODE_ENV !== "production") {
  console.log("🛠️  Development routes are enabled.");
  app.use("/api/dev", devRoutes);
}

app.get("/", (req: Request, res: Response) => {
  res.send("Portfolio Backend Server is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
