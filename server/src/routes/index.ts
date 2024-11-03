import { Router } from 'express';
import roomRouter from './room';
import userRouter from './user';
import playlistRouter from './playlist';

const router = Router();

// health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok!' });
});

// register room routes
router.use('/room', roomRouter);
router.use('/user', userRouter);
router.use('/playlist', playlistRouter);
export default router; 