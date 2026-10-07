import { Router } from 'express';
import * as erpController from '../controllers/erp.controller.js';

const router = Router();

router.get('/cotizaciones', erpController.getCotizaciones);
router.get('/remisiones', erpController.getRemisiones);

export default router;