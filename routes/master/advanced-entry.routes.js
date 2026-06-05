const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/advanced-entry.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { companySchema } = require('../../validations/master/company.schema');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');
const { createAdvanceSchema } = require('../../validations/master/advanced-entry.validation');


router.use(verifyToken);
router.post("/", checkPermission(FORMS.ADVANCED_ENTRY, 'create'), validate(createAdvanceSchema), asyncHandler(ctrl.createAdvance));
router.get(
    '/list',
    checkPermission(FORMS.ADVANCED_ENTRY, 'view'),
    asyncHandler(ctrl.getAdvanceList)
);
router.put(
    '/:advanceMstId',
    checkPermission(FORMS.ADVANCED_ENTRY, 'edit'),
    validate(createAdvanceSchema),
    asyncHandler(ctrl.updateAdvance)
);
router.delete(
    '/:advanceMstId',
    checkPermission(FORMS.ADVANCED_ENTRY, 'delete'),
    asyncHandler(ctrl.deleteAdvance)
);


module.exports = router;