"use strict";

const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Sube un buffer en memoria a Cloudinary sin tocar el disco.
// Compatible con Render y cualquier plataforma sin almacenamiento persistente.
const subirBuffer = (buffer, opciones = {}) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(opciones, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(buffer);
  });

module.exports = { cloudinary, subirBuffer };
