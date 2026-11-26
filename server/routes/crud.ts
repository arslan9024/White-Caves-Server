import express from 'express';
import propertyRoutes from './crud/propertyRoutes.js';
import userAndLeadRoutes from './crud/userAndLeadRoutes.js';
import employeeAndServiceRoutes from './crud/employeeAndServiceRoutes.js';

const router = express.Router();
router.use(propertyRoutes);
router.use(userAndLeadRoutes);
router.use(employeeAndServiceRoutes);

export default router;
