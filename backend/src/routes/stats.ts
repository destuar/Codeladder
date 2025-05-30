import express from 'express';
import { getUserCount } from '../controllers/statsController';

const router = express.Router();

router.get('/user-count', getUserCount);

export default router; 