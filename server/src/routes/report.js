import express from 'express';
import puppeteer from 'puppeteer';
import InterviewSession from '../models/InterviewSession.js';
import User from '../models/User.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// @desc    Generate and stream PDF report using Puppeteer
// @route   GET /api/report/:sessionId/pdf
// @access  Private
router.get('/:sessionId/pdf', protect, async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // 1. Fetch completed interview session
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId: req.user.userId,
      status: 'completed',
    });

    if (!session) {
      return res.status(404).json({ message: 'Completed interview session not found' });
    }

    // 2. Fetch user details
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate overall average scores per dimension for progress bars
    const dimensionAverages = { grammar: 0, confidence: 0, technicalKnowledge: 0, communication: 0 };
    const validQs = session.questions.filter((q) => q.transcript);
    const count = validQs.length || 1;

    validQs.forEach((q) => {
      dimensionAverages.grammar += q.scores.grammar;
      dimensionAverages.confidence += q.scores.confidence;
      dimensionAverages.technicalKnowledge += q.scores.technicalKnowledge;
      dimensionAverages.communication += q.scores.communication;
    });

    const scores = {
      grammar: Math.round(dimensionAverages.grammar / count),
      confidence: Math.round(dimensionAverages.confidence / count),
      technicalKnowledge: Math.round(dimensionAverages.technicalKnowledge / count),
      communication: Math.round(dimensionAverages.communication / count),
    };

    const { finalReport } = session;

    // 3. Compile beautiful, print-friendly HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Interview Report - ${session.jobRole}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 24px;
            margin-bottom: 28px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
          }
          .header p {
            color: #64748b;
            margin: 0;
            font-size: 14px;
            font-weight: 600;
          }
          .badge {
            background-color: #6366f1;
            color: #ffffff;
            padding: 6px 14px;
            font-size: 12px;
            font-weight: 800;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            display: inline-block;
          }
          .verdict-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .verdict-info h2 {
            margin: 0 0 6px 0;
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
          }
          .verdict-info p {
            margin: 0;
            color: #475569;
            font-size: 13px;
          }
          .score-pill {
            background-color: #e0e7ff;
            color: #4f46e5;
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 20px;
            font-weight: 800;
            text-align: center;
          }
          .section {
            margin-bottom: 28px;
          }
          .section h3 {
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin: 0 0 16px 0;
          }
          .dim-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .dim-card {
            background-color: #ffffff;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          }
          .dim-label {
            font-size: 12px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
          }
          .progress-bar-bg {
            background-color: #f1f5f9;
            height: 10px;
            border-radius: 9999px;
            overflow: hidden;
          }
          .progress-bar-fill {
            background-color: #6366f1;
            height: 100%;
            border-radius: 9999px;
          }
          .list-bullets {
            padding-left: 18px;
            margin: 0;
          }
          .list-bullets li {
            margin-bottom: 8px;
            font-size: 13.5px;
            color: #334155;
          }
          .q-card {
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .q-header {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 800;
            color: #64748b;
            margin-bottom: 8px;
          }
          .q-text {
            font-weight: 700;
            font-size: 14px;
            color: #0f172a;
            margin-bottom: 8px;
          }
          .q-ans {
            font-size: 13px;
            color: #475569;
            font-style: italic;
            background-color: #ffffff;
            border-left: 3px solid #cbd5e1;
            padding: 8px 12px;
            margin-bottom: 12px;
          }
          .q-scores {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 800;
            color: #475569;
            background-color: #f1f5f9;
            padding: 6px 12px;
            border-radius: 6px;
          }
          .q-feedback {
            font-size: 12px;
            color: #475569;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <div class="header">
            <div>
              <div class="badge">Interview Assessment</div>
              <h1>${session.jobRole}</h1>
              <p>Candidate: ${user.name} &bull; Date: ${new Date(session.startedAt).toLocaleDateString()}</p>
            </div>
            <div class="score-pill">
              ${session.overallScore}%
            </div>
          </div>

          <div class="verdict-box">
            <div class="verdict-info">
              <h2>Evaluation Verdict: ${finalReport.verdict}</h2>
              <p>${finalReport.summary}</p>
            </div>
          </div>

          <div class="section">
            <h3>Key Assessment Metrics</h3>
            <div class="dim-grid">
              <div class="dim-card">
                <div class="dim-label">
                  <span>Technical Knowledge</span>
                  <span>${scores.technicalKnowledge}%</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${scores.technicalKnowledge}%"></div>
                </div>
              </div>
              <div class="dim-card">
                <div class="dim-label">
                  <span>Communication</span>
                  <span>${scores.communication}%</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${scores.communication}%"></div>
                </div>
              </div>
              <div class="dim-card">
                <div class="dim-label">
                  <span>Grammar & Vocabulary</span>
                  <span>${scores.grammar}%</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${scores.grammar}%"></div>
                </div>
              </div>
              <div class="dim-card">
                <div class="dim-label">
                  <span>Speech Confidence</span>
                  <span>${scores.confidence}%</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${scores.confidence}%"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="section" style="margin-top: 30px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px;">
              <div>
                <h3>Key Strengths</h3>
                <ul class="list-bullets">
                  ${finalReport.topStrengths.map((item) => `<li>${item}</li>`).join('')}
                </ul>
              </div>
              <div>
                <h3>Recommended Steps</h3>
                <ul class="list-bullets">
                  ${finalReport.recommendedNextSteps.map((item) => `<li>${item}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>

          <div class="section" style="margin-top: 30px;">
            <h3>Non-Verbal Analysis Notes</h3>
            <p style="font-size: 13px; color: #475569; font-style: italic; background-color: #f8fafc; padding: 14px; border-radius: 8px; border: 1px dashed #cbd5e1; margin: 0;">
              "${finalReport.nonVerbalNotes}"
            </p>
          </div>

          <div class="section" style="margin-top: 40px; page-break-before: always;">
            <h3>Question Breakdown & Performance</h3>
            ${validQs
              .map(
                (q, idx) => `
              <div class="q-card">
                <div class="q-header">
                  <span>Topic: ${q.topic}</span>
                  <span>Question ${idx + 1}</span>
                </div>
                <div class="q-text">"${q.questionText}"</div>
                <div class="q-ans">"${q.transcript}"</div>
                <div class="q-scores">
                  <span>Technical: ${q.scores.technicalKnowledge}%</span>
                  <span>Comm: ${q.scores.communication}%</span>
                  <span>Grammar: ${q.scores.grammar}%</span>
                  <span>Confidence: ${q.scores.confidence}%</span>
                </div>
                <div class="q-feedback">
                  <strong>AI Review:</strong> ${q.feedback}
                </div>
              </div>
            `
              )
              .join('')}
          </div>

        </div>
      </body>
      </html>
    `;

    // 4. Launch Puppeteer and render PDF
    console.log('[Puppeteer] Launching headless browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    console.log('[Puppeteer] Rendering PDF binary buffer...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });

    await browser.close();
    console.log('[Puppeteer] PDF rendered successfully.');

    // 5. Stream PDF binary response
    res.contentType('application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Interview-Report-${sessionId}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
