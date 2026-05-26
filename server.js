// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir o build do Vite
app.use(express.static(path.join(__dirname, "frontend", "dist")));

// Rota de exemplo pra API
app.get("/api/status", (req, res) => {
  res.json({ status: "API funcionando 🔥" });
});

// Rota coringa (funciona no Express 4)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
