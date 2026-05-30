const { AppError } = require("./AppError");

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const message = error.details
            .map(el => el.message.replace(/['"]/g, ''))
            .join(', ');

        const formattedMessage = message.charAt(0).toUpperCase() + message.slice(1);

        throw new AppError(formattedMessage, 400);
    }
    next();
};

module.exports = validate;