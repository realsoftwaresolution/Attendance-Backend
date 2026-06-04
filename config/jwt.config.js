require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || "secretkey",
  expiresIn: "1d",
};
