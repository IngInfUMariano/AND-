"use strict";

const multer = require("multer");

const upload = multer({
  storage: new multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten archivos de imagen (jpg, png, webp, etc.)"));
  },
});

module.exports = upload;
