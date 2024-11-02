import { Router } from 'express';
import roomRouter from './room';
import userRouter from './user';

const router = Router();

// health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok!' });
});

// register room routes
router.use('/room', roomRouter);
router.use('/user', userRouter);

export default router; 