'use client';

import React, { useState } from 'react';
import { analyzeContentForDwellTime, validateViralContent, getViralContentTips } from '@/lib/viralContentStrategies';

interface ViralAnalysisResult {
  score: number;
  suggestions: string[];
  issues: string[];
  isValid: boolean;
  feedback: string[];
}

interface ViralContentAnalyzerProps {
  onAnalysisComplete?: (result: ViralAnalysisResult) => void;
  className?: string;
}

export default function ViralContentAnalyzer({ onAnalysisComplete, className = '' }: ViralContentAnalyzerProps) {
  const [content, setContent] = useState('');
  const [analysis, setAnalysis] = useState<ViralAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const handleAnalyze = () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const analysisResult = analyzeContentForDwellTime(content);
      const validationResult = validateViralContent(content);
      
      const result: ViralAnalysisResult = {
        score: analysisResult.score,
        suggestions: analysisResult.suggestions,
        issues: analysisResult.issues,
        isValid: validationResult.isValid,
        feedback: validationResult.feedback
      };
      
      setAnalysis(result);
      setIsAnalyzing(false);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    }, 1000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 8) return '🚀';
    if (score >= 6) return '⚠️';
    return '💀';
  };

  const tips = getViralContentTips();

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Viral Content Analyzer
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Analyze your content for viral potential using dwell time optimization principles
        </p>
        
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowTips(!showTips)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {showTips ? 'Hide' : 'Show'} Viral Tips
          </button>
        </div>

        {showTips && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">Viral Content Principles:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {tips.slice(0, 5).map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Content to Analyze
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your content here to analyze its viral potential..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!content.trim() || isAnalyzing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Viral Potential'}
        </button>

        {analysis && (
          <div className="mt-6 space-y-4">
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Analysis Results</h4>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl ${getScoreColor(analysis.score)}`}>
                    {getScoreEmoji(analysis.score)}
                  </span>
                  <span className={`text-xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}/10
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Issues Found:</h5>
                  {analysis.issues.length > 0 ? (
                    <ul className="space-y-1">
                      {analysis.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                          <span className="mt-1">⚠️</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600">No major issues detected! 🎉</p>
                  )}
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Suggestions:</h5>
                  {analysis.suggestions.length > 0 ? (
                    <ul className="space-y-1">
                      {analysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                          <span className="mt-1">💡</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No suggestions needed!</p>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-gray-50">
                <h5 className="font-medium text-gray-900 mb-2">Viral Potential:</h5>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${analysis.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {analysis.isValid ? '✅ High Viral Potential' : '❌ Needs Improvement'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {analysis.isValid 
                    ? 'Your content has strong viral potential with good dwell time optimization!'
                    : 'Your content needs improvements to maximize viral potential and dwell time.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 