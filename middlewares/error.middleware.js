const errorMiddleware = (err, req, res, next) => {
  const RED = '\x1b[31m';
  const RESET = '\x1b[0m';

  console.log(`${RED}--- Global Error Caught ---${RESET}`);

  // --- IMPROVED LOGGING ---
  let detailedError = err.message;

  // If it's a Sequelize error, try to get the original database message
  if (err.name === 'SequelizeDatabaseError' && err.original) {
    // Check if it's an AggregateError (common in MSSQL)
    if (err.original.errors && Array.isArray(err.original.errors)) {
      detailedError = err.original.errors.map(e => e.message).join(' | ');
    } else {
      detailedError = err.original.message || err.message;
    }

    console.log(`${RED}SQL Query: ${err.sql}${RESET}`);
  }

  console.log(`${RED}Detailed Message: ${detailedError}${RESET}`);
  console.log(`${RED}Stack: ${err.stack}${RESET}`);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let isLoginRequired = err.isLoginRequired || false;
  let isRefresh = err.isRefresh || false;

  /* -------------------------- JWT Errors -------------------------- */
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Access token expired';
    isRefresh = true;
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isLoginRequired = true;
  }

  /* -------------------------- Custom Session Errors -------------------------- */
  if (err.message === 'Session expired') {
    statusCode = 401;
    isLoginRequired = true;
  }

  /* -------------------------- Sequelize / DB error -------------------------- */
  if (err.code === 'EREQUEST' || err.name === 'SequelizeDatabaseError') {
    // Use the detailed error for the response so the frontend/dev knows what happened
    message = `Database Error: ${detailedError}`;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
        success: false,
        message: "Document limit exceeded. Maximum allowed is 4 documents total."
    });
}

  /* ------------------- Joi validation error ------------------ */
  if (err.isJoi) {
    const messages = err.details.map((e) => {
      const field = e.path[e.path.length - 1];
      let msg = e.message.replace(/["]/g, "");
      msg = msg.replace(/^.*\./, "");
      msg = msg.replace(new RegExp(`^${field}\\s*`, "i"), "");
      return `${field} ${msg}`.trim();
    });

    return res.status(400).json({
      success: false,
      isLoginRequired: false,
      isRefresh: false,
      message: messages.join(", "),
    });
  }

  /* -------------------------- Default Response -------------------------- */
  res.status(statusCode).json({
    success: false,
    isLoginRequired,
    isRefresh,
    message,
  });
};

module.exports = errorMiddleware;