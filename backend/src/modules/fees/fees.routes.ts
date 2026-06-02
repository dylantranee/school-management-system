import { Router } from 'express';
import { generateSemesterFees, listFees, recordPayment, checkOverdueFees, handlePaymentWebhook } from './fees.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { validateRequest } from '../../middlewares/validateRequest';
import { generateFeesSchema, recordPaymentSchema } from './fees.schema';

const router = Router();

// Read operations: Students view their own, Admins/Staff list all (handled by controller checks)
router.get('/', requireAuth, listFees);

// Write operations: Restricted to Admin
router.post('/generate', requireAuth, requireRole(['Admin']), validateRequest(generateFeesSchema), generateSemesterFees);
router.post('/check-overdue', requireAuth, requireRole(['Admin']), checkOverdueFees);
router.post('/webhook', handlePaymentWebhook);
router.post('/:id/pay', requireAuth, requireRole(['Admin']), validateRequest(recordPaymentSchema), recordPayment);

export default router;
