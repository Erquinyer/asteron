const express = require('express');
const router = express.Router();
const erpController = require('../controllers/erp.controller');

router.get('/cotizaciones', erpController.getCotizaciones);
router.get('/remisiones', erpController.getRemisiones);

module.exports = router;