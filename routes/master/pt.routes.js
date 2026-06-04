const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/pt.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');
const asyncTransactionHandler = require('../../middlewares/asyncTransaction.middleware');
const validate = require('../../utils/validator');
const { createPTSchema, updatePTSchema } = require('../../validations/master/pt.validation');

router.use(verifyToken);
router.get(
    '/',
    checkPermission(FORMS.PT_MASTER, 'view'),
    asyncHandler(ctrl.getPTList)
);
router.post(
    '/',
    checkPermission(FORMS.PT_MASTER, 'create'),
    validate(createPTSchema),
    asyncTransactionHandler(ctrl.createPTDetail)
);
router.get(
    '/:PTCode',
    checkPermission(FORMS.PT_MASTER, 'view'),
    asyncHandler(ctrl.getPTDetailByPTCode)
);
router.put(
    '/:PTCode',
    checkPermission(FORMS.PT_MASTER, 'edit'),
    validate(updatePTSchema),
    asyncTransactionHandler(ctrl.updatePTDetail)
);
router.delete(
    '/:PTCode',
    checkPermission(FORMS.PT_MASTER, 'delete'),
    asyncTransactionHandler(ctrl.deletePTDetail)
);


module.exports = router;