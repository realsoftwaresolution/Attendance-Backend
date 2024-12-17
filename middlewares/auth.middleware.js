const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt.config");

module.exports = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access Denied" });
  console.log(token);
  try {
    const verified = jwt.verify(token.split(" ")[1], secret);
    req.user = verified;  // This will attach the decoded token data (including userId) to req.user
    next();
  } catch (err) {
    return res.status(400).json({ message: "Invalid Token" });
  }
};
