import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  expectedKeywords: {
    type: [String],
    default: [],
  },
  transcript: {
    type: String,
    default: '',
  },
  scores: {
    grammar: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    technicalKnowledge: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
  },
  feedback: {
    type: String,
    default: '',
  },
  emotionData: {
    avgEyeContact: { type: Number, default: 0 },
    avgSmileScore: { type: Number, default: 0 },
    headMovementScore: { type: Number, default: 0 },
  },
});

const InterviewSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  jobRole: {
    type: String,
    required: true,
    trim: true,
  },
  interviewType: {
    type: String,
    required: true,
    trim: true,
  },
  difficulty: {
    type: String,
    required: true,
    trim: true,
  },
  maxQuestions: {
    type: Number,
    default: 5,
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress',
  },
  questions: [QuestionSchema],
  overallScore: {
    type: Number,
    default: 0,
  },
  finalReport: {
    verdict: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    topStrengths: {
      type: [String],
      default: [],
    },
    keyAreasToImprove: {
      type: [String],
      default: [],
    },
    nonVerbalNotes: {
      type: String,
      default: '',
    },
    recommendedNextSteps: {
      type: [String],
      default: [],
    },
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
});

export default mongoose.model('InterviewSession', InterviewSessionSchema);
