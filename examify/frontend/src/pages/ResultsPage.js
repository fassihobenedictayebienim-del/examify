/**
 * Examify Results Page
 * Shows scored quiz results with per-question feedback.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Trophy, Clock, CheckCircle, XCircle, BookOpen, RotateCcw, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import QuestionCard from '../components/QuestionCard';
import { getSession } from '../utils/api';

function ScoreCircle({ score }) {
  const color = score >= 80 ? 'var(--accent-green)' : score >= 60 ? 'var(--accent-gold)' : 'var(--accent-red)';
  const message = score >= 80 ? 'Excellent!' : score >= 60 ? 'Good Job!' : score >= 40 ? 'Keep Studying' : 'Needs Work';

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{
        width: 140, height: 140, borderRadius: '50%',
        border: `6px solid ${color}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1rem',
        background: `${color}12`,
        boxShadow: `0 0 30px ${color}30`,
      }}>
        <span style={{
          fontSize: '2.2rem', fontFamily: 'var(--font-display)',
          fontWeight: 700, color,
        }}>
          {score.toFixed(0)}%
        </span>
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600 }}>
        {message}
      </p>
    </div>
  );
}

export default function ResultsPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [results, setResults] = useState(location.state?.results || null);
  const [loading, setLoading] = useState(!results);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState('all'); // all | correct | wrong

  useEffect(() => {
    if (!results) {
      getSession(parseInt(sessionId))
        .then(res => setResults(res.session))
        .catch(() => toast.error('Failed to load results'))
        .finally(() => setLoading(false));
    }
  }, [sessionId, results]);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '5rem' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>Results not found.</p>
          <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>Home</Link>
        </div>
      </div>
    );
  }

  const { score, correct_count, total_answered, time_taken_seconds, results: questionResults = [], breakdown = {} } = results;

  const filteredResults = (questionResults || []).filter(r => {
    if (filter === 'correct') return r.is_correct;
    if (filter === 'wrong') return !r.is_correct;
    return true;
  });

  const displayedResults = showAll ? filteredResults : filteredResults.slice(0, 10);

  const formatTime = (secs) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-meta">Quiz Complete</div>
        <h1>Your Results</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Score card */}
        <div className="card">
          <ScoreCircle score={score || 0} />
          <div className="divider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: CheckCircle, label: 'Correct', value: correct_count, color: 'var(--accent-green)' },
              { icon: XCircle, label: 'Wrong', value: total_answered - correct_count, color: 'var(--accent-red)' },
              { icon: BookOpen, label: 'Total', value: total_answered, color: 'var(--accent-blue)' },
              { icon: Clock, label: 'Time Taken', value: formatTime(time_taken_seconds), color: 'var(--text-muted)' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={14} color={color} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </div>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <div>
          {/* Difficulty breakdown */}
          {breakdown.by_difficulty && Object.keys(breakdown.by_difficulty).length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={16} color="var(--accent-gold)" />
                By Difficulty
              </h3>
              {Object.entries(breakdown.by_difficulty).map(([diff, data]) => {
                const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                return (
                  <div key={diff} style={{ marginBottom: '0.75rem' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                      <span className={`badge badge-${diff.toLowerCase()}`}>{diff}</span>
                      <span className="text-xs text-muted">{data.correct}/{data.total} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Topic breakdown */}
          {breakdown.by_topic && Object.keys(breakdown.by_topic).length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>By Topic</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
                {Object.entries(breakdown.by_topic)
                  .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total))
                  .map(([topic, data]) => {
                    const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                    const color = pct >= 80 ? 'var(--accent-green)' : pct >= 60 ? 'var(--accent-gold)' : 'var(--accent-red)';
                    return (
                      <div key={topic} className="flex items-center justify-between">
                        <span className="text-sm truncate" style={{ flex: 1, marginRight: '1rem' }}>{topic}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color, flexShrink: 0 }}>
                          {data.correct}/{data.total}
                        </span>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3" style={{ marginBottom: '2rem' }}>
        <Link to={`/quiz/${results.question_set_id || ''}`} className="btn btn-primary">
          <RotateCcw size={15} />
          Retake Quiz
        </Link>
        <Link to="/" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      {/* Question-by-question review */}
      {questionResults && questionResults.length > 0 && (
        <>
          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem' }}>Question Review</h2>
            <div className="flex items-center gap-2">
              {['all', 'correct', 'wrong'].map(f => (
                <button
                  key={f}
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? `All (${questionResults.length})` : f === 'correct' ? `✓ Correct (${questionResults.filter(r => r.is_correct).length})` : `✗ Wrong (${questionResults.filter(r => !r.is_correct).length})`}
                </button>
              ))}
            </div>
          </div>

          {displayedResults.map((r, i) => (
            <QuestionCard
              key={r.question_id}
              question={{
                id: r.question_id,
                question_text: r.question_text,
                question_type: r.question_type,
                options: r.options,
                correct_answer: r.correct_answer,
                explanation: r.explanation,
                topic: r.topic,
                difficulty: r.difficulty,
              }}
              index={i}
              resultsMode={true}
              isCorrect={r.is_correct}
              correctAnswer={r.correct_answer}
              userAnswer={r.user_answer}
            />
          ))}

          {filteredResults.length > 10 && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAll(s => !s)}>
                {showAll ? 'Show Less' : `Show All ${filteredResults.length} Questions`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
