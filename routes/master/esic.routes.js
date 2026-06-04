const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/esic.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');
const asyncTransactionHandler = require('../../middlewares/asyncTransaction.middleware');
const validate = require('../../utils/validator');
const { createESICSchema, updateESICSchema } = require('../../validations/master/esic.validation');

router.use(verifyToken);
router.get(
    '/',
    checkPermission(FORMS.ESIC_MASTER, 'view'),
    asyncHandler(ctrl.getESICList)
);
router.post(
    '/',
    checkPermission(FORMS.ESIC_MASTER, 'create'),
    validate(createESICSchema),
    asyncTransactionHandler(ctrl.createESICDetail)
);
router.get(
    '/:ESICCode',
    checkPermission(FORMS.ESIC_MASTER, 'view'),
    asyncHandler(ctrl.getESICDetailByESICCode)
);
router.put(
    '/:ESICCode',
    checkPermission(FORMS.ESIC_MASTER, 'edit'),
    validate(updateESICSchema),
    asyncTransactionHandler(ctrl.updateESICDetail)
);
router.delete(
    '/:ESICCode',
    checkPermission(FORMS.ESIC_MASTER, 'delete'),
    asyncTransactionHandler(ctrl.deleteESICDetail)
);



module.exports = router;