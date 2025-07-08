// src/middleware/multer.ts
import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  // Ditambahkan 'svg\+xml' untuk menerima file SVG
  if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp|svg\+xml)$/)) {
    // Tolak file jika bukan tipe gambar yang diizinkan
    return cb(
      new Error("Only jpeg, png, gif, webp, and svg files are allowed!"),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: fileFilter,
});

export default upload;
