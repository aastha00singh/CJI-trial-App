import OpenAI from 'openai';
import { z } from 'zod';

// Define Zod schemas for AI response validation
export const parsedResumeSchema = z.object({
  skills: z.array(z.string()),
  experienceLevel: z.enum(['Junior', 'Mid', 'Senior', 'Entry-Level', 'Lead', 'Executive', 'Not Specified']),
  summary: z.string(),
});

export const questionSchema = z.object({
  questionText: z.string(),
  topic: z.string(),
  expectedKeywords: z.array(z.string()),
});

export const evaluationSchema = z.object({
  scores: z.object({
    grammar: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    technicalKnowledge: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
  }),
  feedback: z.string(),
});

export const finalReportSchema = z.object({
  verdict: z.enum(['Strongly Recommend', 'Recommend', 'Keep Training']),
  summary: z.string(),
  topStrengths: z.array(z.string()).min(1),
  keyAreasToImprove: z.array(z.string()).min(1),
  nonVerbalNotes: z.string(),
  recommendedNextSteps: z.array(z.string()).min(1),
});

// Detect mock mode
const getOpenAIKey = () => process.env.OPENAI_API_KEY;
const isMockMode = () => {
  const key = getOpenAIKey();
  return !key || key === 'mock_key_or_replace_with_actual' || key.startsWith('mock');
};

// Initialize OpenAI client only if not in mock mode
let openai;
if (!isMockMode()) {
  openai = new OpenAI({
    apiKey: getOpenAIKey(),
  });
}

// Clean markdown code blocks from AI JSON response
const cleanJSON = (str) => {
  let clean = str.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```json\s*/i, '');
    clean = clean.replace(/```$/, '');
  }
  return clean.trim();
};

// Wrapper with retry-once logic
const callOpenAIWithRetry = async (messages, temperature, schema) => {
  if (isMockMode()) {
    throw new Error('Attempting to call OpenAI in mock mode');
  }

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature,
        response_format: { type: 'json_object' },
      });

      const rawContent = response.choices[0].message.content;
      const parsedContent = JSON.parse(cleanJSON(rawContent));
      return schema.parse(parsedContent);
    } catch (err) {
      console.warn(`OpenAI call failed on attempt ${attempt}:`, err.message);
      lastError = err;
      if (attempt < 2) {
        // Wait 500ms before retrying
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  throw lastError;
};

// --- MOCK SERVICE IMPLEMENTATIONS ---

const mockParseResumeText = (text) => {
  console.log('[AI Service] Running mock resume parser...');
  const lowercaseText = text.toLowerCase();
  
  // Simple keyword matching for mock mode
  const skillsCatalog = [
    'javascript', 'typescript', 'react', 'node.js', 'express', 'mongodb', 
    'python', 'django', 'java', 'spring', 'c++', 'docker', 'aws', 'kubernetes',
    'html', 'css', 'sql', 'git', 'next.js', 'vue', 'tailwind'
  ];
  
  const detectedSkills = skillsCatalog.filter(skill => lowercaseText.includes(skill));
  if (detectedSkills.length === 0) {
    detectedSkills.push('JavaScript', 'HTML/CSS', 'Software Engineering');
  }

  let expLevel = 'Mid';
  if (lowercaseText.includes('senior') || lowercaseText.includes('lead') || lowercaseText.includes('architect')) {
    expLevel = 'Senior';
  } else if (lowercaseText.includes('junior') || lowercaseText.includes('intern') || lowercaseText.includes('entry')) {
    expLevel = 'Junior';
  }

  return {
    skills: detectedSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    experienceLevel: expLevel,
    summary: 'A self-motivated software professional experienced in full-stack application development and systems engineering.',
  };
};

const mockGenerateQuestion = (jobRole, difficulty, interviewType, skills = [], previousQuestions = []) => {
  console.log('[AI Service] Running mock question generator...');
  
  const mockQuestions = [
    {
      role: 'Frontend',
      questions: [
        { text: 'Explain the difference between state and props in React.', topic: 'React Basics', keywords: ['state', 'props', 'immutable', 'component'] },
        { text: 'How does React virtual DOM work under the hood?', topic: 'Virtual DOM', keywords: ['reconciliation', 'fiber', 'render', 'diffing'] },
        { text: 'What are React hooks, and what rules must they follow?', topic: 'React Hooks', keywords: ['hooks', 'useState', 'useEffect', 'top-level', 'functional'] }
      ]
    },
    {
      role: 'Backend',
      questions: [
        { text: 'Explain the event loop in Node.js.', topic: 'Node.js Internals', keywords: ['event loop', 'call stack', 'callback queue', 'non-blocking'] },
        { text: 'How do you design a secure JWT access and refresh token authentication system?', topic: 'Web Security', keywords: ['JWT', 'httpOnly', 'cookie', 'refresh token', 'XSS'] },
        { text: 'Compare SQL and NoSQL databases, when would you use MongoDB over PostgreSQL?', topic: 'Databases', keywords: ['schema', 'document', 'relational', 'scaling', 'ACID'] }
      ]
    },
    {
      role: 'Generic',
      questions: [
        { text: 'Describe a challenging technical project you worked on and how you resolved the obstacles.', topic: 'Problem Solving', keywords: ['challenge', 'architecture', 'debugging', 'solution'] },
        { text: 'Explain the concept of REST APIs and how they differ from GraphQL.', topic: 'Web Services', keywords: ['REST', 'endpoint', 'HTTP methods', 'GraphQL', 'over-fetching'] },
        { text: 'What is git rebase and how does it differ from git merge?', topic: 'Version Control', keywords: ['rebase', 'merge', 'history', 'commit', 'conflict'] }
      ]
    }
  ];

  // Try to find questions for role, default to generic
  const isRoleMatch = (roleStr) => jobRole.toLowerCase().includes(roleStr.toLowerCase());
  let poolGroup = mockQuestions.find(g => isRoleMatch(g.role));
  if (!poolGroup) {
    poolGroup = mockQuestions.find(g => g.role === 'Generic');
  }

  // Filter out previous questions to avoid duplicates
  let unusedQuestions = poolGroup.questions.filter(q => 
    !previousQuestions.some(pq => pq.toLowerCase().includes(q.text.toLowerCase().slice(0, 10)))
  );

  if (unusedQuestions.length === 0) {
    unusedQuestions = poolGroup.questions; // Reset pool if exhausted
  }

  // Pick random question from list
  const selected = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];

  return {
    questionText: selected.text,
    topic: selected.topic,
    expectedKeywords: selected.keywords,
  };
};

const mockEvaluateAnswer = (questionText, expectedKeywords = [], transcript) => {
  console.log('[AI Service] Running mock answer evaluator...');
  
  if (!transcript || transcript.trim().length < 5) {
    return {
      scores: { grammar: 10, confidence: 10, technicalKnowledge: 5, communication: 10 },
      feedback: 'The candidate did not provide a substantial answer. Please speak clearly into the microphone.'
    };
  }

  const cleanAns = transcript.toLowerCase();
  // Count matching keywords to fake a technical score
  const matchedKeywords = expectedKeywords.filter(k => cleanAns.includes(k.toLowerCase()));
  const keywordRatio = expectedKeywords.length ? (matchedKeywords.length / expectedKeywords.length) : 1;
  
  // Mock scores
  const technicalKnowledge = Math.round(50 + (keywordRatio * 45) + Math.random() * 5);
  const communication = Math.round(60 + (cleanAns.length > 50 ? 25 : 10) + Math.random() * 5);
  const grammar = Math.round(70 + Math.random() * 20);
  const confidence = Math.round(65 + Math.random() * 25);

  return {
    scores: {
      grammar: Math.min(grammar, 100),
      confidence: Math.min(confidence, 100),
      technicalKnowledge: Math.min(technicalKnowledge, 100),
      communication: Math.min(communication, 100)
    },
    feedback: `Good effort answering this question. You touched upon key points: ${matchedKeywords.length > 0 ? matchedKeywords.join(', ') : 'basics'}. To improve, expand on practical implementations and structure your explanation step-by-step.`
  };
};

const mockGenerateFinalReport = (session) => {
  console.log('[AI Service] Running mock final report generator...');
  
  const role = session.jobRole || 'Software Engineer';
  const score = session.overallScore || 75;
  
  let verdict = 'Keep Training';
  if (score >= 85) verdict = 'Strongly Recommend';
  else if (score >= 70) verdict = 'Recommend';

  return {
    verdict,
    summary: `The candidate completed a simulated interview for the role of ${role}. Overall, they demonstrated a solid foundation, scoring an average of ${score}%. They showed clear strengths in key conceptual aspects of their stack, though they would benefit from more practical elaboration and structure.`,
    topStrengths: [
      'Strong basic conceptual knowledge',
      'Good communication flow and active engagement',
      'Matches the core skills mentioned on their resume'
    ],
    keyAreasToImprove: [
      'Needs deeper technical detail on framework internals',
      'Grammar structures could be refined during technical speaking',
      'Confidence scoring indicates minor hesitation markers'
    ],
    nonVerbalNotes: 'Good smile presence observed indicating enthusiasm. Maintained solid eye contact, and head movement levels were in normal comfortable thresholds.',
    recommendedNextSteps: [
      'Review React/Node documentation details regarding thread management and virtual DOM architecture.',
      'Practice mock speaking without filler words to increase confidence scores.',
      'Attempt another mock session focusing on system design topics.'
    ]
  };
};


// --- PUBLIC SERVICES EXPORT ---

// 1. Resume Parser
export const parseResumeText = async (text) => {
  if (isMockMode()) {
    return mockParseResumeText(text);
  }

  const messages = [
    {
      role: 'system',
      content: 'You are an expert AI resume parser. Extract skills, experience level, and summary from the given resume text. Respond ONLY in valid JSON format matching the schema: { "skills": ["skill1", "skill2"], "experienceLevel": "Junior" | "Mid" | "Senior" | "Entry-Level" | "Lead" | "Executive" | "Not Specified", "summary": "brief summary string" }.'
    },
    {
      role: 'user',
      content: `Resume text:\n\n${text}`
    }
  ];

  return callOpenAIWithRetry(messages, 0.2, parsedResumeSchema);
};

// 2. Generate Question
export const generateQuestion = async (jobRole, difficulty, interviewType, skills = [], previousQuestions = []) => {
  if (isMockMode()) {
    return mockGenerateQuestion(jobRole, difficulty, interviewType, skills, previousQuestions);
  }

  const skillsStr = skills.length > 0 ? skills.join(', ') : 'General software engineering';
  const previousStr = previousQuestions.length > 0 ? previousQuestions.map(q => `"${q}"`).join(', ') : 'None';

  const messages = [
    {
      role: 'system',
      content: `You are an expert technical interviewer. Generate a single, professional interview question.
Parameters:
- Job Role: ${jobRole}
- Difficulty: ${difficulty}
- Interview Type: ${interviewType}
- Candidate Skills: ${skillsStr}

Respond ONLY in valid JSON matching this schema:
{
  "questionText": "Question string",
  "topic": "Specific conceptual topic",
  "expectedKeywords": ["keyword1", "keyword2", "keyword3"]
}

Constraint: DO NOT generate any questions similar to the following previous questions: [ ${previousStr} ].`
    }
  ];

  return callOpenAIWithRetry(messages, 0.7, questionSchema);
};

// 3. Evaluate Single Answer
export const evaluateAnswer = async (questionText, expectedKeywords = [], transcript) => {
  if (isMockMode()) {
    return mockEvaluateAnswer(questionText, expectedKeywords, transcript);
  }

  const keywordsStr = expectedKeywords.join(', ');

  const messages = [
    {
      role: 'system',
      content: `You are an AI interviewer evaluator. Evaluate the candidate's response to the interview question.
Question: "${questionText}"
Expected concepts/keywords: [ ${keywordsStr} ]
Candidate's Speech Transcript: "${transcript}"

Assess the candidate from 0 to 100 on these dimensions:
- grammar (grammatical correctness, phrasing)
- confidence (absence of fillers, hesitations, assertiveness)
- technicalKnowledge (accuracy and depth of topic explanation)
- communication (structure, articulation, explanation flow)

Provide a brief constructive feedback (2-3 sentences) detailing what they explained well and what was missing.

Respond ONLY in valid JSON matching this schema:
{
  "scores": {
    "grammar": 80,
    "confidence": 85,
    "technicalKnowledge": 70,
    "communication": 75
  },
  "feedback": "constructive feedback text"
}`
    }
  ];

  return callOpenAIWithRetry(messages, 0.3, evaluationSchema);
};

// 4. Generate Final Session Report
export const generateFinalReport = async (session) => {
  if (isMockMode()) {
    return mockGenerateFinalReport(session);
  }

  // Build compact text summary of questions/evaluations for the prompt
  const questionsSummarized = session.questions.map((q, idx) => `
Question ${idx + 1}: ${q.questionText}
Topic: ${q.topic}
Candidate Answer: ${q.transcript}
Evaluation Scores: Grammar: ${q.scores.grammar}, Confidence: ${q.scores.confidence}, Technical: ${q.scores.technicalKnowledge}, Comm: ${q.scores.communication}
Feedback: ${q.feedback}
Non-Verbal (Avg Smile: ${q.emotionData?.avgSmileScore || 'N/A'}, Eye Contact: ${q.emotionData?.avgEyeContact || 'N/A'}, Head Movement: ${q.emotionData?.headMovementScore || 'N/A'})
`).join('\n---\n');

  const messages = [
    {
      role: 'system',
      content: `You are a senior hiring manager. Review the complete candidate interview session and compile an aggregated final report.
Job Role: ${session.jobRole}
Interview Type: ${session.interviewType}
Difficulty: ${session.difficulty}
Overall Average Score: ${session.overallScore}

Interview Q&A History:
${questionsSummarized}

Generate a JSON object matching this schema:
{
  "verdict": "Strongly Recommend" | "Recommend" | "Keep Training",
  "summary": "Detailed executive summary paragraph (3-4 sentences)",
  "topStrengths": ["Strength 1", "Strength 2", "Strength 3"],
  "keyAreasToImprove": ["Area 1", "Area 2", "Area 3"],
  "nonVerbalNotes": "Synthesize the non-verbal metrics like smile levels, eye contact, and head movements into actionable notes.",
  "recommendedNextSteps": ["Step 1", "Step 2", "Step 3"]
}

Ensure the report is constructive, clear, and matches the data provided.`
    }
  ];

  return callOpenAIWithRetry(messages, 0.5, finalReportSchema);
};
