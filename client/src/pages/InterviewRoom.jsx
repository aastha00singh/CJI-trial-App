import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useFaceTracking from '../hooks/useFaceTracking';
import { Mic, MicOff, Video, Eye, ShieldAlert, CheckCircle, Volume2, Sparkles, Loader } from 'lucide-react';

const InterviewRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Media Stream
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Custom Hooks
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition();
  
  const {
    isReady: isFaceTrackerReady,
    error: faceTrackerError,
    startTracking,
    stopTracking,
    runningAverages,
  } = useFaceTracking(videoRef);

  // Session State
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stage, setStage] = useState('loading'); // loading, asking, listening, evaluating, completing
  const [error, setError] = useState('');

  // 1. Mount: Fetch initial session and request media permissions
  useEffect(() => {
    const initRoom = async () => {
      try {
        // Fetch session status
        const res = await api.get(`/interview/${sessionId}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch interview details');
        }

        setSession(data.session);

        // Find current unanswered question
        const questions = data.session.questions || [];
        const unansweredIdx = questions.findIndex(q => !q.transcript);
        const activeIdx = unansweredIdx !== -1 ? unansweredIdx : 0;
        
        setQuestionIndex(activeIdx);
        setCurrentQuestion(questions[activeIdx]);

        // Request camera and microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setStage('ready');
      } catch (err) {
        console.error('[Room Mount Error]:', err.message);
        setError(err.message || 'Media permissions (camera & mic) are required to proceed.');
      }
    };

    initRoom();

    return () => {
      // Cleanup media stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sessionId]);

  // 2. Play Text-to-Speech (TTS) for the active question
  const speakQuestion = (text) => {
    setStage('asking');
    
    // Stop recording and tracking if any
    try {
      stopListening();
      stopTracking();
    } catch (e) {}

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop active speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95; // Slightly slower for clarity
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
        // Automatically start listening once AI finishes speaking
        handleStartListening();
      };
      
      utterance.onerror = (e) => {
        console.warn('Speech synthesis error, falling back to instant answer stage:', e);
        handleStartListening();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback if browser does not support TTS
      handleStartListening();
    }
  };

  // Helper trigger to begin TTS question speak
  const handleTriggerSpeak = () => {
    if (currentQuestion) {
      speakQuestion(currentQuestion.questionText);
    }
  };

  // 3. Start transcribing speech and face tracking
  const handleStartListening = () => {
    setStage('listening');
    startListening();
    if (isFaceTrackerReady) {
      startTracking();
    }
  };

  // 4. Submit transcript and emotion metrics to backend
  const handleSubmitAnswer = async () => {
    setStage('evaluating');
    
    // Stop feeds and extract final metrics
    stopListening();
    const finalEmotions = stopTracking();

    try {
      const res = await api.post(`/interview/${sessionId}/answer`, {
        transcript: transcript || '[No audible speech detected]',
        emotionData: {
          avgEyeContact: finalEmotions.avgEyeContact,
          avgSmileScore: finalEmotions.avgSmileScore,
          headMovementScore: finalEmotions.headMovementScore,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Answer submission failed.');
      }

      if (data.isCompleted) {
        // All questions completed, call finalize session
        handleFinalizeSession();
      } else {
        // Advance to next question
        const nextQ = data.nextQuestion;
        setCurrentQuestion(nextQ);
        setQuestionIndex(nextQ.questionIndex);
        
        // Speak the next question automatically
        speakQuestion(nextQ.questionText);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit answer. Click retry to submit again.');
      setStage('listening'); // Let them retry
    }
  };

  // 5. Finalize the interview, compile report, and navigate to results
  const handleFinalizeSession = async () => {
    setStage('completing');
    try {
      const res = await api.post(`/interview/${sessionId}/complete`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to finalize interview report');
      }

      navigate(`/results/${sessionId}`);
    } catch (err) {
      setError(err.message || 'Failed to generate summary report. Try completing again.');
    }
  };

  if (error) {
    return (
      <div className="flex-1 bg-slate-950 text-white flex flex-col items-center justify-center p-8 min-h-[80vh]">
        <div className="p-6 max-w-md bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">Interview Room Error</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl font-semibold transition-colors cursor-pointer text-sm text-slate-300 hover:text-white"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 text-slate-200 min-h-screen p-6 flex flex-col">
      <div className="max-w-6xl mx-auto flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch my-auto">
        
        {/* LEFT COLUMN: Webcam & Real-time Landmarks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -ml-10 -mt-10"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Webcam Monitor</h2>
            </div>
            
            {isFaceTrackerReady ? (
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-widest">
                MediaPipe Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-widest animate-pulse">
                Loading Vision Model...
              </span>
            )}
          </div>

          {/* Webcam view element */}
          <div className="relative aspect-video bg-slate-950 rounded-xl border border-slate-850 overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]" // mirror display
            />
            {stage === 'loading' && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
                <Loader className="w-10 h-10 text-indigo-500 animate-spin mb-2" />
                <span className="text-xs text-slate-400">Requesting media streams...</span>
              </div>
            )}
          </div>

          {/* Running averages visualization cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-center">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Eye Gaze
              </span>
              <span className="text-lg font-extrabold text-indigo-400">
                {isListening ? `${runningAverages.avgEyeContact}%` : '--'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-center">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Smile Score
              </span>
              <span className="text-lg font-extrabold text-indigo-400">
                {isListening ? `${runningAverages.avgSmileScore}%` : '--'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-center">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Head Jitter
              </span>
              <span className="text-lg font-extrabold text-indigo-400">
                {isListening ? `${runningAverages.headMovementScore}%` : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive QA Terminal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl flex flex-col justify-between">
          
          {/* Question Index and Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                Active Simulation
              </span>
              <h3 className="font-extrabold text-white mt-0.5">
                {session ? `${session.jobRole} (${session.difficulty})` : 'Software Interview'}
              </h3>
            </div>
            
            <div className="text-right">
              <span className="block text-xs font-bold text-slate-400">
                Question {questionIndex + 1} of {session?.maxQuestions || 5}
              </span>
            </div>
          </div>

          {/* Question Flow States */}
          <div className="my-8 flex-1 flex flex-col justify-center">
            
            {stage === 'ready' && (
              <div className="text-center py-8">
                <Volume2 className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">Ready to Start?</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
                  Ensure you are in a quiet room with good lighting. The AI will speak the question out loud.
                </p>
                <button
                  onClick={handleTriggerSpeak}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  Start Simulation
                </button>
              </div>
            )}

            {stage === 'asking' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto animate-pulse">
                  <Volume2 className="w-8 h-8 text-indigo-400 animate-bounce" />
                </div>
                <h4 className="text-base font-bold text-slate-300">AI is speaking question...</h4>
                <p className="text-sm font-semibold text-white px-4 leading-relaxed max-w-md mx-auto italic">
                  "{currentQuestion?.questionText}"
                </p>
              </div>
            )}

            {stage === 'listening' && (
              <div className="space-y-6">
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                      Recording Answer...
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Speech Transcription (Real-time)
                  </span>
                  <div className="w-full min-h-[140px] max-h-[180px] overflow-y-auto p-4 bg-slate-950 border border-slate-850 rounded-xl text-sm leading-relaxed text-slate-300 italic">
                    {transcript || 'Start speaking into your mic to see the transcript...'}
                  </div>
                </div>
              </div>
            )}

            {(stage === 'evaluating' || stage === 'completing') && (
              <div className="text-center space-y-4 py-8">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                </div>
                <h4 className="text-base font-bold text-white">
                  {stage === 'evaluating' ? 'AI is evaluating your answer...' : 'Generating complete final report...'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Analyzing verbal vocabulary, grammar accuracy, stack knowledge, and facial cues. This takes a few seconds.
                </p>
              </div>
            )}

          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-4 border-t border-slate-800">
            {stage === 'listening' && (
              <button
                onClick={handleSubmitAnswer}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-650 hover:to-teal-750 text-white font-bold rounded-xl shadow-lg cursor-pointer transition-transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Submit & Next Question</span>
              </button>
            )}

            {stage === 'asking' && (
              <button
                onClick={handleStartListening}
                className="w-full py-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white font-semibold rounded-xl cursor-pointer transition-colors text-sm"
              >
                Skip TTS / Answer Now
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default InterviewRoom;
