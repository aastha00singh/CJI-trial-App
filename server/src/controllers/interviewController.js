import InterviewSession from '../models/InterviewSession.js';
import User from '../models/User.js';
import * as aiService from '../services/aiService.js';
import { startSessionSchema, submitAnswerSchema } from '../validators/interview.js';

// @desc    Start a new interview session
// @route   POST /api/interview/start
// @access  Private
export const startSession = async (req, res, next) => {
  try {
    // 1. Validate payload
    const parsed = startSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { jobRole, interviewType, difficulty, questionCount } = parsed.data;

    // 2. Get candidate's skills from resume
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const skills = user.resumeParsedData?.skills || [];

    // 3. Generate first question using AI
    let firstQuestion;
    try {
      firstQuestion = await aiService.generateQuestion(
        jobRole,
        difficulty,
        interviewType,
        skills,
        []
      );
    } catch (aiErr) {
      return res.status(500).json({
        message: 'Failed to generate the first question. Please try again.',
        error: aiErr.message,
      });
    }

    // 4. Create interview session in DB
    const session = await InterviewSession.create({
      userId: req.user.userId,
      jobRole,
      interviewType,
      difficulty,
      maxQuestions: questionCount,
      questions: [
        {
          questionText: firstQuestion.questionText,
          topic: firstQuestion.topic,
          expectedKeywords: firstQuestion.expectedKeywords,
        },
      ],
    });

    return res.status(201).json({
      message: 'Interview session started',
      sessionId: session._id,
      jobRole: session.jobRole,
      interviewType: session.interviewType,
      difficulty: session.difficulty,
      maxQuestions: session.maxQuestions,
      currentQuestion: {
        questionText: firstQuestion.questionText,
        topic: firstQuestion.topic,
        questionIndex: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit answer to current question & get evaluation + next question
// @route   POST /api/interview/:sessionId/answer
// @access  Private
export const submitAnswer = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // 1. Validate payload
    const parsed = submitAnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { transcript, emotionData } = parsed.data;

    // 2. Find the active interview session
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId: req.user.userId,
      status: 'in-progress',
    });

    if (!session) {
      return res.status(404).json({ message: 'Active interview session not found' });
    }

    // 3. Identify current question (the last one pushed)
    const currentQuestionIndex = session.questions.length - 1;
    const currentQuestion = session.questions[currentQuestionIndex];

    // 4. Evaluate answer with AI
    let evaluation;
    try {
      evaluation = await aiService.evaluateAnswer(
        currentQuestion.questionText,
        currentQuestion.expectedKeywords,
        transcript
      );
    } catch (aiErr) {
      return res.status(500).json({
        message: 'AI Evaluation failed. Please try resubmitting.',
        error: aiErr.message,
      });
    }

    // 5. Update current question details
    currentQuestion.transcript = transcript;
    currentQuestion.scores = evaluation.scores;
    currentQuestion.feedback = evaluation.feedback;
    if (emotionData) {
      currentQuestion.emotionData = {
        avgEyeContact: emotionData.avgEyeContact || 0,
        avgSmileScore: emotionData.avgSmileScore || 0,
        headMovementScore: emotionData.headMovementScore || 0,
      };
    }

    const isCompleted = session.questions.length >= session.maxQuestions;
    let nextQuestion = null;

    // 6. Generate next question if not completed
    if (!isCompleted) {
      const user = await User.findById(req.user.userId);
      const skills = user?.resumeParsedData?.skills || [];
      const previousQuestions = session.questions.map((q) => q.questionText);

      try {
        const generatedQ = await aiService.generateQuestion(
          session.jobRole,
          session.difficulty,
          session.interviewType,
          skills,
          previousQuestions
        );

        nextQuestion = {
          questionText: generatedQ.questionText,
          topic: generatedQ.topic,
          expectedKeywords: generatedQ.expectedKeywords,
        };

        // Push next question
        session.questions.push(nextQuestion);
      } catch (aiErr) {
        console.error('Failed to generate next question:', aiErr.message);
        // Fallback next question
        nextQuestion = {
          questionText: 'Can you explain the principles of clean code and how they apply to your work?',
          topic: 'Software Best Practices',
          expectedKeywords: ['clean code', 'refactoring', 'readability', 'SOLID'],
        };
        session.questions.push(nextQuestion);
      }
    }

    // 7. Save session progress
    await session.save();

    return res.json({
      message: 'Answer submitted successfully',
      evaluation: {
        scores: currentQuestion.scores,
        feedback: currentQuestion.feedback,
        questionIndex: currentQuestionIndex,
      },
      isCompleted,
      nextQuestion: nextQuestion
        ? {
            questionText: nextQuestion.questionText,
            topic: nextQuestion.topic,
            questionIndex: session.questions.length - 1,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Finalize interview session & generate summary report
// @route   POST /api/interview/:sessionId/complete
// @access  Private
export const completeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // 1. Find active session
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId: req.user.userId,
      status: 'in-progress',
    });

    if (!session) {
      return res.status(404).json({ message: 'Active session not found or already completed' });
    }

    // Calculate overallScore (average of the average scores per question)
    const questionsCount = session.questions.length;
    if (questionsCount === 0) {
      return res.status(400).json({ message: 'No questions have been generated in this session' });
    }

    let totalCumulativeScore = 0;
    let answeredQuestionsCount = 0;

    session.questions.forEach((q) => {
      // Only count questions that have been answered (have transcript/scores set)
      if (q.transcript) {
        const qAvg = (q.scores.grammar + q.scores.confidence + q.scores.technicalKnowledge + q.scores.communication) / 4;
        totalCumulativeScore += qAvg;
        answeredQuestionsCount++;
      }
    });

    const overallScore = answeredQuestionsCount > 0 ? Math.round(totalCumulativeScore / answeredQuestionsCount) : 0;
    session.overallScore = overallScore;

    // 2. Generate Final Report using AI
    let finalReport;
    try {
      finalReport = await aiService.generateFinalReport(session);
    } catch (aiErr) {
      console.error('Final report generation failed:', aiErr.message);
      // Fallback final report
      finalReport = {
        verdict: overallScore >= 70 ? 'Recommend' : 'Keep Training',
        summary: `The candidate completed the session. Overall score is ${overallScore}%. They expressed good communication skills.`,
        topStrengths: ['Good efforts across questions', 'Demonstrated understanding of job topics'],
        keyAreasToImprove: ['Requires more detailed technical answers', 'Reduce hesitations in speech'],
        nonVerbalNotes: 'Metrics were within normal range.',
        recommendedNextSteps: ['Prepare key architectural concepts', 'Conduct more practices'],
      };
    }

    // 3. Save final details
    session.finalReport = finalReport;
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    return res.json({
      message: 'Interview session completed successfully',
      session,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details of a specific interview session
// @route   GET /api/interview/:sessionId
// @access  Private
export const getSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId: req.user.userId,
    });

    if (!session) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    return res.json({ session });
  } catch (error) {
    next(error);
  }
};

// @desc    List user's past interview sessions (paginated)
// @route   GET /api/interview
// @access  Private
export const listSessions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await InterviewSession.countDocuments({ userId: req.user.userId });
    const sessions = await InterviewSession.find({ userId: req.user.userId })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit);

    const pages = Math.ceil(total / limit);

    return res.json({
      sessions,
      pagination: {
        total,
        page,
        pages,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};
