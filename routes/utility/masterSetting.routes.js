const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/utility/masterSetting.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');
const asyncTransactionHandler = require('../../middlewares/asyncTransaction.middleware');
const validate = require('../../utils/validator');
const { masterSettingMstSchema } = require('../../validations/utility/masterSetting.validation');

router.use(verifyToken);

router.post(
    '/',
    checkPermission(FORMS.MASTER_SETTINGS, 'create'),
    validate(masterSettingMstSchema),
    asyncTransactionHandler(ctrl.createMasterSetting)
);
router.get(
    '/',
    checkPermission(FORMS.MASTER_SETTINGS, 'view'),
    asyncHandler(ctrl.getMasterSettingList)
);
router.get(
    '/:SettingMstId',
    checkPermission(FORMS.MASTER_SETTINGS, 'view'),
    asyncHandler(ctrl.getMasterSettingDetails)
);

router.put(
    '/:SettingMstId',
    checkPermission(FORMS.MASTER_SETTINGS, 'edit'),
    validate(masterSettingMstSchema),
    asyncTransactionHandler(ctrl.updateMasterSetting)
);

router.delete(
    '/:SettingMstId',
    checkPermission(FORMS.MASTER_SETTINGS, 'delete'),
    asyncTransactionHandler(ctrl.deleteMasterSetting)
);


module.exports = router;