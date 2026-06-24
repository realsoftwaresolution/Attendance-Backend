require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { loadFaceModels } = require("./utils/face.utils");
const errorMiddleware = require("./middlewares/error.middleware");
require("./config/dbConnection");
const http = require("http");
const { initializeSocket } = require("./socket");
const initAllJobs = require("./jobs/index.job");
const seedDatabase = require("./utils/dbSeeder");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 2026;  


app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,PATCH,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));


/* --------------------------------- Routes --------------------------------- */
app.get("/api/system/seed", async (req, res, next) => {
  try {
    await seedDatabase();
    return res.status(200).json({ success: true, message: "Database seeding and configuration synced successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Seeding failed", error: error.message });
  }
});


app.get("/", (req, res) => {
  res.json({ success: true, message: "Server is running", timestamp: new Date().toISOString() });
});
app.use('/api', require('./routes/index.routes'))
app.use("/admin", require("./routes/admin.routes"));
app.use("/pc", require("./routes/pc.routes"));
app.use("/reminder", require("./routes/task.routes"));
app.use("/qr", require("./routes/qr.routes"));

/* ---------------- Error handler must be the LAST middleware --------------- */
app.use(errorMiddleware);


(async () => {
  try {
    console.log("⏳ Initializing system components...");

    // Load AI models before starting server
    await loadFaceModels();
    initializeSocket(server);

    initAllJobs();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ App startup failed:", err);
    process.exit(1);
  }
})();