class AppError extends Error {
    constructor(message, statusCode, isLoginRequired) {
        super(message);
        this.statusCode = statusCode;
        this.isLoginRequired = isLoginRequired || false;
        Error.captureStackTrace(this, this.constructor);
    }
}


module.exports = { AppError };