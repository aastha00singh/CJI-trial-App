import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Clipboard, FileText, TrendingUp, Calendar, UserCheck, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/interview?page=1&limit=20');
        const data = await res.json();
        if (res.ok) {
          setSessions(data.sessions || []);
        } else {
          setError(data.message || 'Failed to fetch interview history');
        }
      } catch (err) {
        setError('Connection error. Could not load interview data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Format chronological completed interviews for line chart
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const chartData = completedSessions
    .map(s => ({
      date: new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      Score: s.overallScore,
    }))
    .reverse();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-white min-h-[80vh]">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="mt-4 text-slate-400">Loading interview details...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Your Interview Hub</h1>
            <p className="text-slate-400 mt-2 max-w-lg">
              Practice specialized mock interviews, receive comprehensive feedback metrics, and track your facial emotion signals.
            </p>
          </div>
          <Link
            to="/setup"
            className="mt-6 md:mt-0 flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Practice Session</span>
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sessions.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-16 text-center">
            <Clipboard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">No Interviews Completed Yet</h3>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto">
              Get started by uploading your PDF resume and launching your first AI-evaluated mock interview.
            </p>
            <Link
              to="/setup"
              className="mt-6 inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors cursor-pointer"
            >
              <span>Setup Your First Interview</span>
            </Link>
          </div>
        ) : (
          /* Main Layout with Chart & History */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Middle: Trend Chart & Past List */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Trend Chart (only if we have at least 2 completed sessions) */}
              {chartData.length >= 1 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center space-x-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">Score Performance Trend</h2>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Score"
                          stroke="#6366f1"
                          strokeWidth={3}
                          activeDot={{ r: 6 }}
                          dot={{ strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* History List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h2 className="text-lg font-bold text-white mb-6">Interview History</h2>
                <div className="space-y-4">
                  {sessions.map((s) => (
                    <div
                      key={s._id}
                      className="p-4 bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-white">{s.jobRole}</h4>
                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(s.startedAt).toLocaleDateString()}</span>
                          </span>
                          <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 capitalize">
                            {s.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {s.status === 'completed' ? (
                          <div className="text-right">
                            <span className="block text-2xl font-extrabold text-indigo-400">
                              {s.overallScore}%
                            </span>
                            <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">
                              Overall
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full animate-pulse">
                            In Progress
                          </span>
                        )}

                        <Link
                          to={s.status === 'completed' ? `/results/${s._id}` : `/room/${s._id}`}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                            s.status === 'completed'
                              ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Side: Quick Stats Column */}
            <div className="space-y-8">
              
              {/* Profile Resume Status Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <h3 className="font-bold text-white mb-4">Resume Profiling</h3>
                
                {completedSessions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center space-x-3">
                      <UserCheck className="w-5 h-5 text-indigo-400" />
                      <div>
                        <span className="block text-xs text-slate-400">Interviews Completed</span>
                        <span className="text-sm font-bold text-white">{completedSessions.length} sessions</span>
                      </div>
                    </div>

                    <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl flex items-center space-x-3">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      <div>
                        <span className="block text-xs text-slate-400">Peak Performance</span>
                        <span className="text-sm font-bold text-white">
                          {Math.max(...completedSessions.map(s => s.overallScore))}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400">Complete an interview to view metric insights.</p>
                  </div>
                )}
              </div>

              {/* Tips Box */}
              <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-900/30 rounded-2xl p-6 shadow-lg">
                <h4 className="font-bold text-indigo-300 mb-2">Interviewer Tip</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  During your simulated interview, remember to keep steady eye contact directly with the camera. The AI measures facial gaze alignment to compute confidence scores!
                </p>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
