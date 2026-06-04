const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/pf.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');
const asyncTransactionHandler = require('../../middlewares/asyncTransaction.middleware');
const pfSchema = require('../../validations/master/pf.validation');
const validate = require('../../utils/validator');

router.use(verifyToken);
router.get(
    '/',
    checkPermission(FORMS.PF_MASTER, 'view'),
    asyncHandler(ctrl.getPFList)
);
router.post("/", checkPermission(FORMS.PF_MASTER, 'create'), validate(pfSchema), asyncTransactionHandler(ctrl.createPFDetail));
router.get(
    '/:PFCode',
    checkPermission(FORMS.PF_MASTER, 'view'),
    asyncHandler(ctrl.getPFDetailByPFCode)
);

router.put(
    "/:PFCode",
    checkPermission(FORMS.PF_MASTER, 'edit'),
    validate(pfSchema),
    asyncTransactionHandler(ctrl.updatePFDetail)
);
router.delete(
    '/:PFCode',
    checkPermission(FORMS.PF_MASTER, 'delete'),
    asyncTransactionHandler(ctrl.deletePFDetail)
);


module.exports = router;