import mongoose from "mongoose";

let conexion = null;

export async function conectarDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error("Falta MONGODB_URI en las variables de entorno");
  }
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  try {
    conexion = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    return conexion;
  } catch (err) {
    conexion = null;
    throw err;
  }
}
