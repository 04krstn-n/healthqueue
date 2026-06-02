const express = require('express');
const router  = express.Router();
const { getConfigs, getConfig, updateConfig, createConfig } = require('../controllers/systemConfigController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.use(protect);
router.use(authorizeRoles('super_admin'));

router.get('/',      getConfigs);
router.post('/',     createConfig);
router.get('/:key',  getConfig);
router.put('/:id',   updateConfig);

module.exports = router;
