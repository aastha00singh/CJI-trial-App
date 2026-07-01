import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { protect } from '../middlewares/auth.js';
import { aiRateLimiter } from '../middlewares/rateLimiter.js';
import { parseResumeText } from '../services/aiService.js';
import User from '../models/User.js';

const router = express.Router();

// Multer Local Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // Generate unique name: resume-<userId>-<timestamp>.pdf
    cb(null, `resume-${req.user.userId}-${Date.now()}${ext}`);
  },
});

// File filter to restrict uploads strictly to PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF resumes are supported!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// @desc    Upload resume PDF and parse it using AI
// @route   POST /api/resume/upload
// @access  Private
router.post('/upload', protect, aiRateLimiter, (req, res, next) => {
  // Use multer upload wrapper to handle file-type limit errors cleanly
  upload.single('resume')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded. Please upload a PDF resume.' });
      }

      // 1. Read PDF file into buffer
      const fileBuffer = fs.readFileSync(req.file.path);
      
      // 2. Parse text from PDF
      let pdfData;
      try {
        pdfData = await pdfParse(fileBuffer);
      } catch (pdfErr) {
        throw new Error(`Failed to extract text from PDF file: ${pdfErr.message}`);
      }

      const extractedText = pdfData.text;
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({
          message: 'Could not extract text from the PDF file. Make sure it is not empty or a scanned image.',
        });
      }

      // 3. Call AI Service to parse skills, experience, and summary
      const parsedResumeData = await parseResumeText(extractedText);

      // 4. Update the user document in database
      const host = req.get('host');
      const protocol = req.protocol;
      const resumeUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        {
          resumeUrl,
          resumeParsedData: parsedResumeData,
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        message: 'Resume uploaded and parsed successfully',
        resumeUrl,
        resumeParsedData: updatedUser.resumeParsedData,
      });
    } catch (error) {
      // Clean up uploaded file if process failed
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Failed to delete failed upload file:', unlinkErr.message);
        }
      }
      next(error);
    }
  });
});

export default router;
