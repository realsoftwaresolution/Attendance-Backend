const express = require("express");
const dotenv = require("dotenv");
const db = require("./models");

dotenv.config();
const app = express();

app.use(express.json());

// Routes
app.use("/admin", require("./routes/admin.routes"));

// Sync Database
// db.sequelize.sync().then(() => {
//   console.log("Database connected");
// });

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
