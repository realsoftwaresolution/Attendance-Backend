const db = require("../config/dbConnection");

const asyncTransactionHandler = (handler) => {
    return async (req, res, next) => {

        const transaction = await db.sequelize.transaction();

        req.transaction = transaction;

        try {

            await handler(req, res, next);

            if (!transaction.finished) {
                await transaction.commit();
            }

        } catch (err) {

            try {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
            } catch (rollbackErr) {
                console.error(
                    'Rollback failed:',
                    rollbackErr.message
                );
            }

            next(err);
        }
    };
};

module.exports = asyncTransactionHandler;