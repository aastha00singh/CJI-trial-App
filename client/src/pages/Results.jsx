import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { FileText, ArrowLeft, CheckCircle, AlertTriangle, TrendingUp, HelpCircle, Award, Target, MessageSquare } from 'lucide-react';

const Results = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get(`/interview/${sessionId}`);
        const data = await res.json();
        if (res.ok) {
          setSession(data.session);
        } else {
          setError(data.message || 'Failed to retrieve results details');
        }
      } catch (err) {
        setError('Error establishing connection to backend.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Handle Secure PDF Download (via blob)
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/report/${sessionId}/pdf`);
      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Interview-Report-${session.jobRole.replace(/\s+/g, '-')}-${new Date(session.startedAt).toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Error generating PDF report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-white min-h-[80vh]">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="mt-4 text-slate-400">Compiling report statistics...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex-1 bg-slate-950 text-white flex flex-col items-center justify-center p-8 min-h-[80vh]">
        <div className="p-6 max-w-md bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">Results Loading Error</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{error || 'Session details not found'}</p>
          <Link
            to="/"
            className="block w-full py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl font-semibold text-center transition-colors text-sm text-slate-300 hover:text-white"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { jobRole, difficulty, overallScore, finalReport, questions } = session;

  // 1. Calculate Average Scores across the 4 Dimensions
  const dimensionAverages = { grammar: 0, confidence: 0, technicalKnowledge: 0, communication: 0 };
  const validQs = questions.filter(q => q.transcript);
  const count = validQs.length || 1;

  validQs.forEach(q => {
    dimensionAverages.grammar += q.scores.grammar;
    dimensionAverages.confidence += q.scores.confidence;
    dimensionAverages.technicalKnowledge += q.scores.technicalKnowledge;
    dimensionAverages.communication += q.scores.communication;
  });

  const radarData = [
    { subject: 'Technical Knowledge', value: Math.round(dimensionAverages.technicalKnowledge / count), fullMark: 100 },
    { subject: 'Communication', value: Math.round(dimensionAverages.communication / count), fullMark: 100 },
    { subject: 'Grammar & Vocab', value: Math.round(dimensionAverages.grammar / count), fullMark: 100 },
    { subject: 'Speech Confidence', value: Math.round(dimensionAverages.confidence / count), fullMark: 100 },
  ];

  return (
    <div className="flex-1 bg-slate-950 text-slate-200 min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation back and Download buttons */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-1"></div>
                <span>Exporting Report...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Download PDF Report</span>
              </>
            )}
          </button>
        </div>

        {/* TOP LAYOUT: Score Circle and Radar Chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Verdict and Overall Score */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                Aggregated Result
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1 leading-tight">{jobRole}</h2>
              <span className="inline-block mt-2 px-3 py-1 bg-slate-950 border border-slate-850 rounded-full text-xs text-slate-400 font-bold capitalize">
                {difficulty} Spec
              </span>
            </div>

            <div className="my-8 relative flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-8 border-indigo-500/20 flex flex-col items-center justify-center bg-slate-950/50 shadow-inner">
                <span className="text-4xl font-black text-white leading-none">{overallScore}%</span>
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mt-1.5">
                  Overall Score
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                AI Verdict
              </span>
              <span className={`text-lg font-black tracking-wide ${
                finalReport.verdict === 'Strongly Recommend'
                  ? 'text-emerald-400'
                  : finalReport.verdict === 'Recommend'
                  ? 'text-indigo-400'
                  : 'text-amber-400'
              }`}>
                {finalReport.verdict}
              </span>
            </div>
          </div>

          {/* Performance Dimension Radar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl md:col-span-2 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Target className="w-4 h-4 text-indigo-400" />
              <span>Assessment Dimensions</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" radius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                  <Radar name="Candidate" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* MIDDLE LAYOUT: Executive Summary & Non-verbal Cues */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800 pb-3">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Executive Summary Report</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              {finalReport.summary}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800 pb-3">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Non-Verbal & Emotion Review</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
              "{finalReport.nonVerbalNotes}"
            </p>
          </div>
        </div>

        {/* BOTTOM LAYOUT: Strengths & Next Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Strengths */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800 pb-3">
              <CheckCircle className="w-4 h-4" />
              <span>Top Strengths</span>
            </h3>
            <ul className="space-y-3.5">
              {finalReport.topStrengths?.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span>{item}</span>
                </li>
              )) || <p className="text-xs text-slate-500">None logged</p>}
            </ul>
          </div>

          {/* Improvements and Next steps */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800 pb-3">
              <TrendingUp className="w-4 h-4" />
              <span>Recommended Next Steps</span>
            </h3>
            <ul className="space-y-3.5">
              {finalReport.recommendedNextSteps?.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0"></span>
                  <span>{item}</span>
                </li>
              )) || <p className="text-xs text-slate-500">None logged</p>}
            </ul>
          </div>
        </div>

        {/* QUESTION-BY-QUESTION HISTORICAL TRANSCRIPTS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800 pb-4">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Question Breakdown & Feedback</span>
          </h3>

          <div className="space-y-6">
            {validQs.map((q, idx) => (
              <div key={q._id} className="p-5 bg-slate-950 border border-slate-850 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs font-semibold text-slate-400">
                    Topic: {q.topic}
                  </span>
                  <span className="text-xs font-bold text-indigo-400">
                    Q {idx + 1}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Question Asked
                  </span>
                  <p className="text-sm font-bold text-white">"{q.questionText}"</p>
                </div>

                <div className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Your Response
                  </span>
                  <p className="text-xs text-slate-300 italic">"{q.transcript}"</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-slate-900/50 border border-slate-850/50 rounded-lg">
                  <div className="text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-semibold">Technical</span>
                    <span className="text-sm font-extrabold text-white">{q.scores.technicalKnowledge}%</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-semibold">Communication</span>
                    <span className="text-sm font-extrabold text-white">{q.scores.communication}%</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-semibold">Grammar</span>
                    <span className="text-sm font-extrabold text-white">{q.scores.grammar}%</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-semibold">Confidence</span>
                    <span className="text-sm font-extrabold text-white">{q.scores.confidence}%</span>
                  </div>
                </div>

                <div className="space-y-1 border-t border-slate-900 pt-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    AI feedback
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">{q.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Results;
