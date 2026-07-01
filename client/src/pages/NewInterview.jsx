import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, CheckCircle, FileText, Settings, Play, Briefcase, RefreshCw, AlertCircle } from 'lucide-react';

const NewInterview = () => {
  const { user, updateUserState } = useAuth();
  const navigate = useNavigate();

  // Resume state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Form state
  const [jobRole, setJobRole] = useState('Frontend Developer');
  const [interviewType, setInterviewType] = useState('Technical');
  const [difficulty, setDifficulty] = useState('Mid');
  const [questionCount, setQuestionCount] = useState(5);
  
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  // Handle Resume Upload
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError('');
    }
  };

  const handleUploadResume = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post('/resume/upload', formData);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload resume');
      }

      // Update auth context state to reflect resume details
      updateUserState({
        resumeUrl: data.resumeUrl,
        resumeParsedData: data.resumeParsedData,
      });
      setFile(null);
    } catch (err) {
      setUploadError(err.message || 'Error uploading resume. Make sure it is a valid PDF under 5MB.');
    } finally {
      setUploading(false);
    }
  };

  // Start Session
  const handleStartSession = async (e) => {
    e.preventDefault();
    setStarting(true);
    setStartError('');

    try {
      const res = await api.post('/interview/start', {
        jobRole,
        interviewType,
        difficulty,
        questionCount,
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to initialize session');
      }

      // Route directly into the Interview Room page
      navigate(`/room/${data.sessionId}`);
    } catch (err) {
      setStartError(err.message || 'Error starting interview. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-8 h-8 text-indigo-400" />
          <div>
            <h1 className="text-3xl font-extrabold text-white">Configure Your Session</h1>
            <p className="text-sm text-slate-400">Upload your credentials and tailor the AI questions to your background</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* LEFT: Resume Upload Card (2 Cols) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4">Resume Parsing</h2>
              
              {user?.resumeUrl ? (
                /* Resume Loaded View */
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        Resume Loaded
                      </span>
                      <a
                        href={user.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-300 hover:text-white underline truncate block"
                      >
                        View uploaded PDF
                      </a>
                    </div>
                  </div>

                  {user.resumeParsedData && (
                    <div className="space-y-4">
                      <div>
                        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Experience Level
                        </span>
                        <span className="text-sm font-bold text-indigo-400 capitalize">
                          {user.resumeParsedData.experienceLevel || 'Not Specified'}
                        </span>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Identified Skills
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {user.resumeParsedData.skills?.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-400 rounded">
                              {s}
                            </span>
                          )) || <span className="text-xs text-slate-500">None parsed</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-850 pt-4">
                    <p className="text-[11px] text-slate-400 mb-3">Want to update your resume details?</p>
                    <label className="block w-full text-center py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                      <span>Choose Different PDF</span>
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                /* Resume Upload Dropzone */
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-850 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                    <UploadCloud className="w-10 h-10 text-slate-500 mb-2" />
                    <span className="block text-sm font-semibold text-slate-300">Choose resume file</span>
                    <span className="block text-xs text-slate-500 mt-1">PDF format under 5MB</span>
                    <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="pdf-input" />
                    <label htmlFor="pdf-input" className="mt-4 px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-xs font-bold rounded-lg cursor-pointer transition-colors">
                      Select File
                    </label>
                  </div>
                  
                  {file && (
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs text-slate-300 truncate">{file.name}</span>
                      </div>
                      <button
                        onClick={handleUploadResume}
                        disabled={uploading}
                        className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-xs font-bold rounded-md disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {uploading ? 'Parsing...' : 'Upload'}
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* RIGHT: Interview Config Form (3 Cols) */}
          <div className="md:col-span-3">
            <form onSubmit={handleStartSession} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <span>Job & Difficulty Specs</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Target Job Role
                  </label>
                  <input
                    type="text"
                    required
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="e.g. Node Backend Engineer"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Interview Type
                  </label>
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  >
                    <option value="Technical">Technical (Algorithm/Coding/Architecture)</option>
                    <option value="Behavioral">Behavioral (STAR/Situational)</option>
                    <option value="Mixed">Mixed (Core Technical + Behavioral)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Experience Level / Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  >
                    <option value="Entry-Level">Entry-Level / Junior</option>
                    <option value="Mid">Mid-Level Developer</option>
                    <option value="Senior">Senior Developer / Tech Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Number of Questions ({questionCount})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-4"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-bold">
                    <span>1 Q</span>
                    <span>5 Qs</span>
                    <span>10 Qs</span>
                  </div>
                </div>
              </div>

              {startError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{startError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={starting}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-750 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
              >
                {starting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Analyzing Setup & Launching Room...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Enter Interview Room</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default NewInterview;
