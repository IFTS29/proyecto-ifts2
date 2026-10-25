import mongoose from "mongoose";

const deletedPostSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    discardedAt: { type: String, default: () => new Date().toISOString() },
    caption: { type: String, default: "" },
    mediaType: { type: String, default: "" },
  },
  { _id: false },
);

const instagramSyncSchema = new mongoose.Schema(
  {
    clave: { type: String, default: "global", unique: true, index: true },
    conectado: { type: Boolean, default: false },
    cuenta: { type: String, default: null },
    hashtag: { type: String, default: "#eventosIFTS2" },
    ultimaSincronizacion: { type: Date, default: null },
    estado: { type: String, default: "sin_sincronizar" },
    error: { type: String, default: null },
    deletedPosts: [deletedPostSchema],
    feedCache: [{ type: mongoose.Schema.Types.Mixed }],
  },
  {
    timestamps: true,
  },
);

export const InstagramSync =
  mongoose.models.InstagramSync || mongoose.model("InstagramSync", instagramSyncSchema);
