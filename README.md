# AI Interview Simulator with Emotion & Speech Analysis

This is a full-stack, state-of-the-art AI Mock Interview Simulator built using React, Express, and MongoDB. The system parses resumes, generates customized interview questions, tracks candidate speech in real-time, analyzes webcam-based facial cues (smile, eye-contact, head stability) using MediaPipe, and generates comprehensive PDF evaluations using Puppeteer.

---

## Technical Stack

- **Frontend**: React (Vite) + Tailwind CSS v4 + Recharts
- **Backend**: Node.js + Express + Mongoose
- **Database**: MongoDB (Mongoose ODM)
- **AI Engine**: OpenAI API (`gpt-4o-mini` default model)
- **Speech-to-Text**: Web Speech API (`webkitSpeechRecognition` - browser native)
- **Speech Synthesis**: SpeechSynthesis API (`window.speechSynthesis` - browser native)
- **Facial Analysis**: MediaPipe Face Landmarker WebAssembly (browser-side)
- **PDF Generation**: Puppeteer (server-side headless HTML-to-PDF rendering)

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Local instance or MongoDB Atlas URI)

### 1. Installation
Run `npm install` at the root directory to install all dependencies for both the frontend and backend workspaces:
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the `/server` directory:
```bash
cp server/.env.example server/.env
```
Open `server/.env` and update the parameters:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/ai-interview-simulator
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_12345!
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_67890!
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
FRONTEND_URL=http://localhost:5173
```

> [!TIP]
> **Mock Mode Fallback**: If the `OPENAI_API_KEY` is not provided, is blank, or is set to the placeholder `mock_key_or_replace_with_actual`, the server automatically enters a Mock Fallback mode. This allows running and testing all features (resume parsing, question loop, evaluation, report compiling, PDF generation) without requiring a paid OpenAI account.

### 3. Run the Application
Start both the backend API server and frontend Vite development server concurrently:
```bash
npm run dev
```
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)

---

## Running the Integration Test Suite

The project includes separate, end-to-end integration tests to verify the core endpoints. Ensure the backend server is active (`npm run dev`) before running them:

1. **Authentication Tests** (Verifies registration, login, protected routes, and refresh cookies):
   ```bash
   npm run test:auth --workspace=server
   ```

2. **Resume & Interview Loop Tests** (Generates a valid PDF with Puppeteer, uploads it, transcribes answers, steps through the Q&A loop, and reviews final reports):
   ```bash
   npm run test:interview --workspace=server
   ```

3. **PDF Generation Tests** (Saves a mock completed session in MongoDB, calls Puppeteer to render the A4 progress layout, and verifies streamed PDF headers):
   ```bash
   npm run test:pdf --workspace=server
   ```

---

## Deployment Guidelines

### Backend (Render)
1. In Render, select **Web Service**.
2. Connect your GitHub repository.
3. Configure the following parameters:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
4. In **Environment Variables**, define your MongoDB Atlas URI, JWT Secrets, and OpenAI API Key.

### Frontend (Vercel)
1. In Vercel, select **Import Project**.
2. Choose your repository.
3. Configure the following parameters:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. The client is pre-configured with a `client/vercel.json` file to support clean React client-side routing on page refreshes.
"# CJI-trial-App" 
