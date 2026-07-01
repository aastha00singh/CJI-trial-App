import { z } from 'zod';

export const startSessionSchema = z.object({
  jobRole: z.string().min(2, { message: 'Job role must be at least 2 characters' }),
  interviewType: z.string().min(2, { message: 'Interview type must be at least 2 characters' }),
  difficulty: z.string().min(2, { message: 'Difficulty must be at least 2 characters' }),
  questionCount: z.number().min(1).max(10).default(5),
});

export const submitAnswerSchema = z.object({
  transcript: z.string(),
  emotionData: z.object({
    avgEyeContact: z.number().min(0).max(100).default(0),
    avgSmileScore: z.number().min(0).max(100).default(0),
    headMovementScore: z.number().min(0).max(100).default(0),
  }).optional(),
});
