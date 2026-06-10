const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt.config");
const { AppError } = require("../utils/AppError");

const verifyToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) throw new AppError("Token not found", 401, true);

  const token = authHeader.split(" ")[1];
  try {
    const verified = jwt.verify(token, secret);

    req.user = verified;
    req.logId = verified.UserMstId;
    req.pcId =
      req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    next();
  } catch (err) {
    throw new AppError("Invalid or Expired Token", 401, true);
  }
};

const checkPermission = (resource, action, userType = null) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // UserType check (optional)
    if (userType && user.UserType !== userType) {
      return res.status(403).json({
        success: false,
        message: `Only ${userType} can access this resource`,
      });
    }

    const permissions = user.access || {};
    const access = permissions[resource];

    if (!access) {
      return res.status(403).json({
        success: false,
        message: `No permission for ${resource}`,
      });
    }

    const actionMap = {
      create: 0,
      edit: 1,
      view: 2,
      delete: 3,
    };

    if (access.length === 1) {
      if (!access[0]) {
        return res.status(403).json({
          success: false,
          message: `Access denied for ${resource}`,
        });
      }

      return next();
    }

    const index = actionMap[action];

    if (index === undefined) {
      return res.status(500).json({
        success: false,
        message: `Invalid action: ${action}`,
      });
    }

    if (!access[index]) {
      return res.status(403).json({
        success: false,
        message: `${action} permission denied for ${resource}`,
      });
    }

    next();
  };
};

const checkReportPermission = (reportFormName) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !user.access) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Access permissions not found.",
      });
    }

    const reportAccess = user.access[reportFormName];

    if (!reportAccess || reportAccess.length === 0 || !reportAccess[0]) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You do not have permission to view this report.`,
      });
    }

    next();
  };
};

module.exports = { verifyToken, checkPermission,checkReportPermission };
