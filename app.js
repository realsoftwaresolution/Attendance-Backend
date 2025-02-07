const express = require("express");
const dotenv = require("dotenv");
const db = require("./models");
const cors = require('cors');

dotenv.config();
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// app.use(bodyParser.json({ limit: '50mb', extended: true }));
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,PATCH,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Routes
app.use("/admin", require("./routes/admin.routes"));

// Sync Database
// db.sequelize.sync().then(() => {
//   console.log("Database connected");
// });

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
