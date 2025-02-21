import express from 'express';
import healthRouter from './health';
import authRouter from './auth';
import profileRouter from './profile';
import adminRouter from './admin';
import learningRouter from './learning';
import problemsRouter from './problems';
import standaloneInfoRouter from './standalone-info';
import imageUploadRouter from './image-upload';

const router = express.Router();

// Mount all routes
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/admin', adminRouter);
router.use('/learning', learningRouter);
router.use('/problems', problemsRouter);
router.use('/standalone-info', standaloneInfoRouter);
router.use('/upload-image', imageUploadRouter);

export default router; 