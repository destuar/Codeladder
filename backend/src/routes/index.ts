import express from 'express';
import healthRouter from './health';
import authRouter from '../api/auth/route';
import profileRouter from '../api/profile/route';
import adminRouter from './admin';
import learningRouter from './learning';
import problemsRouter from './problems';
import standaloneInfoRouter from './standalone-info';
import imageUploadRouter from './image-upload';
import collectionsRouter from './collections';
import spacedRepetitionRoutes from './spacedRepetition';
import codeExecutionRouter from './codeExecution';
import quizRouter from './quiz';
import statsRouter from './stats';

const router = express.Router();

// Mount all routes
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/admin', adminRouter);
router.use('/learning', learningRouter);
router.use('/problems', problemsRouter);
router.use('/standalone-info', standaloneInfoRouter);
router.use('/image-upload', imageUploadRouter);
router.use('/collections', collectionsRouter);
router.use('/spaced-repetition', spacedRepetitionRoutes);
router.use('/code', codeExecutionRouter);
router.use('/quizzes', quizRouter);
router.use('/stats', statsRouter);

export default router; 