import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import InterviewSession from '../models/InterviewSession.js';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n=============================================');
  console.log('  STARTING PDF GENERATION INTEGRATION TEST');
  console.log('=============================================\n');

  // Short delay to ensure server is ready
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const testUser = {
    name: 'PDF Test User',
    email: `pdf-test-${Date.now()}@example.com`,
    password: 'securePassword123!',
  };

  let accessToken = '';
  let sessionId = '';
  let userId = '';

  try {
    // 1. Register user
    console.log('1. Registering user for PDF credentials...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    if (regRes.status !== 201) {
      throw new Error(`Register failed: ${JSON.stringify(regData)}`);
    }
    accessToken = regData.accessToken;
    userId = regData.user.id;
    console.log('   ✅ User registered. ID:', userId);

    // 2. Create a mock completed session in DB
    console.log('\n2. Creating a mock completed session in database...');
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-interview-simulator';
    await mongoose.connect(dbUri);

    const mockSession = await InterviewSession.create({
      userId,
      jobRole: 'Systems Architect',
      interviewType: 'Mixed',
      difficulty: 'Senior',
      status: 'completed',
      overallScore: 88,
      questions: [
        {
          questionText: 'How do you design a high-throughput queue system in Node.js?',
          topic: 'System Architecture',
          expectedKeywords: ['BullMQ', 'Redis', 'workers', 'concurrency'],
          transcript: 'I would use Redis and BullMQ to distribute workers and manage concurrency.',
          scores: { grammar: 90, confidence: 85, technicalKnowledge: 90, communication: 90 },
          feedback: 'Excellent response with practical stack choice.',
          emotionData: { avgEyeContact: 85, avgSmileScore: 30, headMovementScore: 20 },
        },
      ],
      finalReport: {
        verdict: 'Strongly Recommend',
        summary: 'Excellent knowledge of system scaling patterns.',
        topStrengths: ['Architecture choices', 'Concise explanations'],
        keyAreasToImprove: ['Minor speech pacing issues'],
        nonVerbalNotes: 'Maintained strong professional posture.',
        recommendedNextSteps: ['Prepare for next executive rounds.'],
      },
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
    });

    sessionId = mockSession._id.toString();
    console.log('   ✅ Mock completed session created. ID:', sessionId);
    await mongoose.disconnect();

    // 3. Test PDF Streaming Route
    console.log('\n3. Testing GET /api/report/:sessionId/pdf...');
    const pdfRes = await fetch(`${API_URL}/report/${sessionId}/pdf`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (pdfRes.status !== 200) {
      const errText = await pdfRes.text();
      throw new Error(`PDF request failed with status ${pdfRes.status}: ${errText}`);
    }

    const contentType = pdfRes.headers.get('content-type');
    const contentDisposition = pdfRes.headers.get('content-disposition');
    
    // Read response buffer
    const arrayBuffer = await pdfRes.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    console.log('   ✅ Received Response Headers:');
    console.log('      Content-Type:', contentType);
    console.log('      Content-Disposition:', contentDisposition);
    console.log(`      Received PDF Byte Size: ${pdfBytes.length} bytes`);

    // Verify PDF binary signatures (%PDF-1.4 or %PDF-1.5, etc. are the first 4 bytes)
    const pdfHeader = String.fromCharCode(...pdfBytes.slice(0, 4));
    console.log(`      PDF File Header Signature: "${pdfHeader}"`);

    if (contentType !== 'application/pdf') {
      throw new Error(`Invalid Content-Type returned: ${contentType}`);
    }

    if (!pdfHeader.startsWith('%PDF')) {
      throw new Error(`Invalid file format. Does not start with %PDF: ${pdfHeader}`);
    }

    console.log('   ✅ PDF verified successfully.');

    // 4. Cleanup DB
    console.log('\n4. Cleaning up database records...');
    await mongoose.connect(dbUri);
    await InterviewSession.deleteMany({ userId });
    await User.deleteOne({ _id: userId });
    console.log('   ✅ DB Purged successfully.');
    await mongoose.disconnect();

    console.log('\n=============================================');
    console.log('  SUCCESS: ALL PDF INTEGRATION TESTS PASSED!');
    console.log('=============================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILURE: PDF Test failed:', error.message);
    
    // Attempt cleanup
    try {
      const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-interview-simulator';
      await mongoose.connect(dbUri);
      if (userId) {
        await InterviewSession.deleteMany({ userId });
        await User.deleteOne({ _id: userId });
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
