/**
 * Examify History Page
 * Shows all past quiz sessions and scores.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trophy, BookOpen, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { listSessions } from '../utils/api';

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'var(--accent-green)' : score >= 60 ? 'var(--accent-gold)' : 'var(--accent-red)';
  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: '1.1rem', color,
    }}>
      {score?.toFixed(1) ?? '—'}%
    </span>
  );
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSessions()
      .then(res => setSessions(res.sessions || []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const avgScore = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length
    : 0;

  const bestScore = sessions.length > 0
    ? Math.max(...sessions.map(s => s.score || 0))
    : 0;

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (secs) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-meta">Performance Tracking</div>
        <h1>Score History</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Review your past quiz attempts and track your progress.
        </p>
      </div>

      {/* Summary stats */}
      {sessions.length > 0 && (
        <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
          {[
            { icon: BookOpen, label: 'Total Quizzes', value: sessions.length, color: 'var(--accent-blue)' },
            { icon: TrendingUp, label: 'Average Score', value: `${avgScore.toFixed(1)}%`, color: 'var(--accent-gold)' },
            { icon: Trophy, label: 'Best Score', value: `${bestScore.toFixed(1)}%`, color: 'var(--accent-green)' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card" style={{ textAlign: 'center' }}>
              <Icon size={22} color={color} style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{value}</div>
              <div className="text-xs text-muted" style={{ marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        [1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }} />
        ))
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <Clock size={40} className="empty-state-icon" />
          <h3 style={{ marginBottom: '0.5rem' }}>No Quiz History</h3>
          <p className="text-muted text-sm">Complete a quiz to see your scores here.</p>
          <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>Take a Quiz</Link>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Sessions</h2>
          {sessions.map((session) => (
            <div key={session.id} className="card card-hover fade-in" style={{ marginBottom: '0.75rem' }}>
              <div className="flex items-center justify-between">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-3" style={{ marginBottom: '4px' }}>
                    <ScoreBadge score={session.score} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {session.correct_count}/{session.total_answered} correct
                    </span>
                    {session.time_taken_seconds && (
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock size={11} />
                        {formatTime(session.time_taken_seconds)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {formatDate(session.completed_at || session.started_at)}
                    {' · '}Session #{session.id}
                  </p>
                </div>
                <Link
                  to={`/results/${session.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  View Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
