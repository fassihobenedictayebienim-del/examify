/**
 * Examify Dashboard Page
 * Shows overview of uploaded files and recent activity.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, BookOpen, ChevronRight, Trash2, Play, FileText, Clock, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { listFiles, deleteFile, listQuestionSets, generateQuestions } from '../utils/api';
import { useFileStatus } from '../hooks/useExamify';

function FileCard({ file, onDelete, onGenerate, onViewQuestions }) {
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Poll if extracting
  const polledStatus = useFileStatus(
    file.status === 'processing' || file.status === 'uploaded' ? file.id : null,
    () => onGenerate(file, true) // auto-trigger generation when ready
  );

  const currentStatus = polledStatus?.status || file.status;

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${file.original_filename}" and all its questions?`)) return;
    setDeleting(true);
    try {
      await deleteFile(file.id);
      toast.success('File deleted');
      onDelete(file.id);
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  };

  const statusBadge = {
    uploaded: { label: 'Uploaded', color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
    processing: { label: 'Extracting text...', color: 'var(--accent-gold)', bg: 'rgba(201,151,58,0.1)' },
    ready: { label: 'Ready', color: 'var(--accent-green)', bg: 'rgba(45,106,79,0.1)' },
    questions_ready: { label: 'Questions ready', color: 'var(--accent-blue)', bg: 'rgba(44,95,138,0.1)' },
    error: { label: 'Error', color: 'var(--accent-red)', bg: 'rgba(193,64,74,0.1)' },
  }[currentStatus] || { label: currentStatus, color: 'var(--text-muted)', bg: 'var(--bg-secondary)' };

  return (
    <div className="card card-hover fade-in">
      <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <FileText size={20} color="var(--accent-gold)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="truncate" style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '2px' }}>
            {file.original_filename}
          </p>
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px',
                borderRadius: 999, background: statusBadge.bg, color: statusBadge.color,
              }}
            >
              {currentStatus === 'processing' && <span style={{ marginRight: 4 }}>⟳</span>}
              {statusBadge.label}
            </span>
            <span className="text-xs text-muted">
              {(file.file_size / 1024).toFixed(0)} KB
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(currentStatus === 'ready') && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onGenerate(file)}
            disabled={generating}
          >
            <Zap size={13} />
            {generating ? 'Generating...' : 'Generate Questions'}
          </button>
        )}
        {(currentStatus === 'questions_ready') && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onViewQuestions(file)}
          >
            <BookOpen size={13} />
            View Questions
          </button>
        )}
        {(currentStatus === 'questions_ready') && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onGenerate(file)}
          >
            <RefreshCw size={13} />
            Regenerate
          </button>
        )}
        {currentStatus === 'error' && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-red)' }}>
            <AlertCircle size={12} />
            {file.error_message || 'Processing failed'}
          </div>
        )}
        <button
          className="btn btn-icon btn-ghost btn-sm"
          onClick={handleDelete}
          disabled={deleting}
          style={{ marginLeft: 'auto', color: 'var(--accent-red)' }}
          title="Delete file"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [recentSets, setRecentSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState(null);

  const loadData = async () => {
    try {
      const [filesRes, setsRes] = await Promise.all([listFiles(), listQuestionSets()]);
      setFiles(filesRes.files || []);
      setRecentSets((setsRes.question_sets || []).slice(0, 5));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = (fileId) => {
    setFiles(f => f.filter(x => x.id !== fileId));
  };

  const handleGenerate = async (file, auto = false) => {
    if (generatingFor === file.id) return;
    setGeneratingFor(file.id);
    try {
      const res = await generateQuestions(file.id, 70, 30);
      toast.success(auto ? 'Generating questions automatically...' : 'Question generation started!');
      navigate(`/questions/${res.question_set.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleViewQuestions = async (file) => {
    try {
      const res = await listQuestionSets(file.id);
      const sets = res.question_sets || [];
      if (sets.length > 0) {
        navigate(`/questions/${sets[0].id}`);
      }
    } catch (err) {
      toast.error('Could not load question sets');
    }
  };

  const stats = {
    totalFiles: files.length,
    readyFiles: files.filter(f => f.status === 'questions_ready').length,
    totalSets: recentSets.length,
    totalQuestions: recentSets.reduce((sum, s) => sum + (s.total_questions || 0), 0),
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-meta">Welcome back</div>
        <h1>Your Study Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Upload lecture slides and generate practice exam questions powered by AI.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
        {[
          { label: 'Files Uploaded', value: stats.totalFiles, icon: Upload, color: 'var(--accent-gold)' },
          { label: 'Ready to Quiz', value: stats.readyFiles, icon: BookOpen, color: 'var(--accent-green)' },
          { label: 'Question Sets', value: stats.totalSets, icon: Zap, color: 'var(--accent-blue)' },
          { label: 'Total Questions', value: stats.totalQuestions, icon: FileText, color: '#8b3fc0' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ textAlign: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: `${color}18`, margin: '0 auto 0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={20} color={color} />
            </div>
            <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              {loading ? <div className="skeleton" style={{ height: 32, width: 40, margin: '0 auto' }} /> : value}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Files section */}
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Your Files</h2>
            <Link to="/upload" className="btn btn-primary btn-sm">
              <Upload size={13} />
              Upload New
            </Link>
          </div>

          {loading ? (
            [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }} />)
          ) : files.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <Upload size={32} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p className="text-muted text-sm">No files uploaded yet</p>
              <Link to="/upload" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                Upload your first file
              </Link>
            </div>
          ) : (
            files.map(file => (
              <FileCard
                key={file.id}
                file={file}
                onDelete={handleDelete}
                onGenerate={handleGenerate}
                onViewQuestions={handleViewQuestions}
              />
            ))
          )}
        </div>

        {/* Recent question sets */}
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Recent Question Sets</h2>
          </div>

          {loading ? (
            [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }} />)
          ) : recentSets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <BookOpen size={32} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p className="text-muted text-sm">No question sets generated yet</p>
            </div>
          ) : (
            recentSets.map(set => (
              <div key={set.id} className="card card-hover fade-in" style={{ marginBottom: '0.75rem' }}>
                <div className="flex items-center justify-between">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="truncate" style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                      {set.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{set.total_questions} questions</span>
                      <span className="text-xs text-muted">·</span>
                      <span className="badge badge-mcq" style={{ fontSize: '0.65rem' }}>{set.mcq_count} MCQ</span>
                      <span className="badge badge-fitb" style={{ fontSize: '0.65rem' }}>{set.fitb_count} FITB</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" style={{ marginLeft: '1rem', flexShrink: 0 }}>
                    <Link to={`/quiz/${set.id}`} className="btn btn-primary btn-sm">
                      <Play size={12} />
                      Quiz
                    </Link>
                    <Link to={`/questions/${set.id}`} className="btn btn-ghost btn-sm btn-icon">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
