import express from 'express';
import {
  startSession,
  submitAnswer,
  completeSession,
  getSessionDetails,
  listSessions,
} from '../controllers/interviewController.js';
import { protect } from '../middlewares/auth.js';
import { aiRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply auth middleware to protect all routes
router.use(protect);

router.post('/start', aiRateLimiter, startSession);
router.post('/:sessionId/answer', aiRateLimiter, submitAnswer);
router.post('/:sessionId/complete', aiRateLimiter, completeSession);
router.get('/:sessionId', getSessionDetails);
router.get('/', listSessions);

export default router;
