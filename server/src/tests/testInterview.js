import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import User from '../models/User.js';
import InterviewSession from '../models/InterviewSession.js';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n=============================================');
  console.log('  STARTING RESUME UPLOAD & INTERVIEW Q&A TEST');
  console.log('=============================================\n');

  // Short delay to ensure server is ready
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const testUser = {
    name: 'Interview Test User',
    email: `int-test-${Date.now()}@example.com`,
    password: 'securePassword123!',
  };

  const tempPdfPath = path.resolve('src/tests/temp_resume.pdf');
  let accessToken = '';
  let sessionId = '';
  let regUserId = '';
  let uploadResumeUrl = '';

  try {
    // 0. Create valid PDF file using Puppeteer
    console.log('0. Generating valid PDF resume using Puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>John Doe - Software Engineer Resume</h1>
          <p><strong>Summary:</strong> Experienced full-stack developer specializing in building scalable web applications.</p>
          <p><strong>Skills:</strong> React, Node.js, JavaScript, MongoDB, Express, Git, HTML, CSS</p>
          <p><strong>Experience:</strong> 3 years working as a software developer, building REST APIs and frontend components.</p>
        </body>
      </html>
    `);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    console.log('   ✅ Valid PDF created at:', tempPdfPath);

    // 1. Register User
    console.log('\n1. Registering user...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    if (regRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    accessToken = regData.accessToken;
    regUserId = regData.user.id;
    console.log('   ✅ Registered user ID:', regUserId);

    // 2. Upload and Parse Resume
    console.log('\n2. Testing POST /api/resume/upload...');
    const formData = new FormData();
    const fileStream = fs.readFileSync(tempPdfPath);
    const pdfBlob = new Blob([fileStream], { type: 'application/pdf' });
    formData.append('resume', pdfBlob, 'temp_resume.pdf');

    const uploadRes = await fetch(`${API_URL}/resume/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (uploadRes.status !== 200) {
      throw new Error(`Resume upload failed (Status ${uploadRes.status}): ${JSON.stringify(uploadData)}`);
    }
    uploadResumeUrl = uploadData.resumeUrl;
    console.log('   ✅ Resume uploaded and parsed successfully!');
    console.log('   Skills detected:', uploadData.resumeParsedData.skills);
    console.log('   Experience level:', uploadData.resumeParsedData.experienceLevel);

    // 3. Start Interview Session
    console.log('\n3. Testing POST /api/interview/start (Tailored from resume)...');
    const startRes = await fetch(`${API_URL}/interview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        jobRole: 'Full Stack Developer',
        interviewType: 'Technical',
        difficulty: 'Mid',
        questionCount: 3,
      }),
    });

    const startData = await startRes.json();
    if (startRes.status !== 201) {
      throw new Error(`Start session failed (Status ${startRes.status}): ${JSON.stringify(startData)}`);
    }
    sessionId = startData.sessionId;
    console.log('   ✅ Session started. ID:', sessionId);
    console.log('   Question 1:', startData.currentQuestion.questionText);

    // 4. Answer Question 1 (Loop Step 1)
    console.log('\n4. Testing POST /api/interview/:sessionId/answer (Question 1)...');
    const ans1Res = await fetch(`${API_URL}/interview/${sessionId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        transcript: 'Yes, React uses components to manage state and props. State is internal and mutable, whereas props are read-only.',
        emotionData: { avgEyeContact: 85, avgSmileScore: 70, headMovementScore: 40 },
      }),
    });

    const ans1Data = await ans1Res.json();
    if (ans1Res.status !== 200) {
      throw new Error(`Submitting answer 1 failed: ${JSON.stringify(ans1Data)}`);
    }
    console.log('   ✅ Answer 1 submitted.');
    console.log('   Scores:', ans1Data.evaluation.scores);
    console.log('   Feedback:', ans1Data.evaluation.feedback);
    console.log('   Question 2:', ans1Data.nextQuestion.questionText);

    // 5. Answer Question 2 (Loop Step 2)
    console.log('\n5. Testing POST /api/interview/:sessionId/answer (Question 2)...');
    const ans2Res = await fetch(`${API_URL}/interview/${sessionId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        transcript: 'The virtual DOM in React is a lightweight copy of the real DOM. React reconciles differences using diffing algorithms.',
        emotionData: { avgEyeContact: 90, avgSmileScore: 80, headMovementScore: 30 },
      }),
    });

    const ans2Data = await ans2Res.json();
    if (ans2Res.status !== 200) {
      throw new Error(`Submitting answer 2 failed: ${JSON.stringify(ans2Data)}`);
    }
    console.log('   ✅ Answer 2 submitted.');
    console.log('   Scores:', ans2Data.evaluation.scores);
    console.log('   Question 3:', ans2Data.nextQuestion.questionText);

    // 6. Answer Question 3 (Loop Step 3 - Final)
    console.log('\n6. Testing POST /api/interview/:sessionId/answer (Question 3)...');
    const ans3Res = await fetch(`${API_URL}/interview/${sessionId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        transcript: 'Node.js is asynchronous and uses an event loop, allowing it to handle concurrent operations on a single thread.',
        emotionData: { avgEyeContact: 95, avgSmileScore: 75, headMovementScore: 50 },
      }),
    });

    const ans3Data = await ans3Res.json();
    if (ans3Res.status !== 200) {
      throw new Error(`Submitting answer 3 failed: ${JSON.stringify(ans3Data)}`);
    }
    console.log('   ✅ Answer 3 submitted.');
    console.log('   Scores:', ans3Data.evaluation.scores);
    console.log('   Interview Finished? ', ans3Data.isCompleted);

    // 7. Complete Session
    console.log('\n7. Testing POST /api/interview/:sessionId/complete...');
    const completeRes = await fetch(`${API_URL}/interview/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const completeData = await completeRes.json();
    if (completeRes.status !== 200) {
      throw new Error(`Completing session failed (Status ${completeRes.status}): ${JSON.stringify(completeData)}`);
    }
    console.log('   ✅ Session completed successfully!');
    console.log('   Overall score average:', completeData.session.overallScore);
    console.log('   AI Verdict:', completeData.session.finalReport.verdict);
    console.log('   Summary:', completeData.session.finalReport.summary);

    // 8. Fetch session details
    console.log('\n8. Testing GET /api/interview/:sessionId...');
    const detailsRes = await fetch(`${API_URL}/interview/${sessionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const detailsData = await detailsRes.json();
    if (detailsRes.status !== 200) {
      throw new Error(`Fetching session details failed: ${JSON.stringify(detailsData)}`);
    }
    console.log('   ✅ Retrieved session details. Status:', detailsData.session.status);

    // 9. List past sessions
    console.log('\n9. Testing GET /api/interview...');
    const listRes = await fetch(`${API_URL}/interview`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listData = await listRes.json();
    if (listRes.status !== 200) {
      throw new Error(`Listing sessions failed: ${JSON.stringify(listData)}`);
    }
    console.log('   ✅ Past sessions list matches. Count:', listData.sessions.length);

    // Cleanup resources
    console.log('\n10. Cleaning up test assets...');
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
      console.log('   ✅ Local PDF file deleted.');
    }

    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-interview-simulator';
    await mongoose.connect(dbUri);
    
    // Clean up uploaded PDF from disk
    const uploadFilename = path.basename(uploadResumeUrl || '');
    if (uploadFilename) {
      const localFilePath = path.join('uploads', uploadFilename);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log('   ✅ Uploaded resume PDF deleted from disk:', localFilePath);
      }
    }

    await InterviewSession.deleteMany({ userId: regUserId });
    await User.deleteOne({ _id: regUserId });
    console.log('   ✅ Database records purged successfully.');
    await mongoose.disconnect();

    console.log('\n=============================================');
    console.log('  SUCCESS: ALL RESUME & INTERVIEW TESTS PASSED!');
    console.log('=============================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FAILURE: Test failed:', error.message);
    
    if (fs.existsSync(tempPdfPath)) {
      try { fs.unlinkSync(tempPdfPath); } catch (e) {}
    }
    
    try {
      const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-interview-simulator';
      await mongoose.connect(dbUri);
      
      if (uploadResumeUrl) {
        const uploadFilename = path.basename(uploadResumeUrl);
        const localFilePath = path.join('uploads', uploadFilename);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      }
      
      if (regUserId) {
        await InterviewSession.deleteMany({ userId: regUserId });
        await User.deleteOne({ _id: regUserId });
      }
      await mongoose.disconnect();
      console.log('   DB cleanup completed post-failure.');
    } catch (e) {
      console.error('   Could not clean up DB post-failure:', e.message);
    }
    
    process.exit(1);
  }
}

runTests();
