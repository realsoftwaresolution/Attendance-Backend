const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt.config");
const { AppError } = require("../utils/AppError");

const verifyToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) throw new AppError("Token not found", 401);

    const token = authHeader.split(" ")[1];
    try {
        const verified = jwt.verify(token, secret);

        req.user = verified;
        req.logId = verified.UserMstId;
        req.pcId = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        next();
    } catch (err) {
        throw new AppError("Invalid or Expired Token", 401);
    }
};

module.exports = verifyToken;