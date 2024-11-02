import { Router } from 'express';

const router = Router();

// health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok!' });
});

export default router; 