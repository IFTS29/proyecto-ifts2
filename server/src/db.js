import mongoose from "mongoose";

let conexion = null;

export async function conectarDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta MONGODB_URI en las variables de entorno");
  }
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  try {
    conexion = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    return conexion;
  } catch (err) {
    conexion = null;
    throw err;
  }
}
