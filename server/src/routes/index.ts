import { Router } from 'express';
import roomRouter from './room';

const router = Router();

// health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok!' });
});

// register room routes
router.use('/room', roomRouter);

export default router; 