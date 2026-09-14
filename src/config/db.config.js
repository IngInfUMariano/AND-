const isLocal = !process.env.DB_HOST || process.env.DB_HOST === "localhost";

module.exports = {
  HOST: process.env.DB_HOST || "localhost",
  USER: process.env.DB_USER || "postgres",
  PASSWORD: process.env.DB_PASSWORD || "postgres",
  DB: process.env.DB_NAME || "inventa_db",
  PORT: process.env.DB_PORT || 5432,
  dialect: "postgres",
  dialectOptions: isLocal ? {} : {
    ssl: { require: true, rejectUnauthorized: false }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
