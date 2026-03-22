/**
 * Examify Questions Page
 * Browse, filter, and review all generated questions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play, Shuffle, Eye, EyeOff, ChevronLeft, ChevronRight,
  Filter, RefreshCw, AlertCircle, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import QuestionCard from '../components/QuestionCard';
import { getQuestionSet, getQuestions, getQuestionSetStatus, generateQuestions, listFiles } from '../utils/api';
import { useQuestionSetStatus } from '../hooks/useExamify';

const PER_PAGE = 10;

export default function QuestionsPage() {
  const { setId } = useParams();
  const navigate = useNavigate();

  const [questionSet, setQuestionSet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAnswers, setShowAnswers] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Poll if still generating
  const qsStatus = useQuestionSetStatus(
    isGenerating ? parseInt(setId) : null,
    useCallback(() => {
      setIsGenerating(false);
      loadData(1);
    }, [])
  );

  const loadData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const [setRes, qRes] = await Promise.all([
        getQuestionSet(parseInt(setId)),
        getQuestions(parseInt(setId), {
          page: pageNum,
          per_page: PER_PAGE,
          type: filterType || undefined,
          difficulty: filterDifficulty || undefined,
        }),
      ]);
      setQuestionSet(setRes.question_set);
      setQuestions(qRes.questions);
      setPagination(qRes.pagination);
      setPage(pageNum);

      if (setRes.question_set.total_questions === 0) {
        setIsGenerating(true);
      }
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [setId, filterType, filterDifficulty]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleRegenerate = async () => {
    if (!questionSet) return;
    if (!window.confirm('Regenerate will create a new set of questions. Continue?')) return;
    setRegenerating(true);
    try {
      const res = await generateQuestions(questionSet.file_id, 70, 30);
      toast.success('Regeneration started!');
      navigate(`/questions/${res.question_set.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            Generating Questions...
          </h2>
          <p className="text-muted text-sm">
            AI is crafting your exam questions. This takes 1–3 minutes.
          </p>
          {qsStatus && qsStatus.total_questions > 0 && (
            <p style={{ marginTop: '1rem', color: 'var(--accent-gold)' }}>
              {qsStatus.total_questions} questions ready...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem', paddingLeft: 0 }}>
          ← Back to Dashboard
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="page-header-meta">Question Bank</div>
            <h1 style={{ fontSize: '1.6rem' }}>
              {questionSet?.title || 'Questions'}
            </h1>
            {questionSet && (
              <div className="flex items-center gap-3 mt-2">
                <span className="badge badge-mcq">{questionSet.mcq_count} MCQ</span>
                <span className="badge badge-fitb">{questionSet.fitb_count} Fill-in</span>
                <span className="text-xs text-muted">{questionSet.total_questions} total</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAnswers(s => !s)}
            >
              {showAnswers ? <EyeOff size={14} /> : <Eye size={14} />}
              {showAnswers ? 'Hide Answers' : 'Show Answers'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? <Loader size={14} /> : <RefreshCw size={14} />}
              Regenerate
            </button>
            <Link to={`/quiz/${setId}`} className="btn btn-primary btn-sm">
              <Play size={14} />
              Start Quiz
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Filter size={15} color="var(--text-muted)" />
        <select
          className="form-select"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', width: 'auto' }}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="fitb">Fill-in-the-Blank</option>
        </select>
        <select
          className="form-select"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', width: 'auto' }}
          value={filterDifficulty}
          onChange={e => setFilterDifficulty(e.target.value)}
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        {(filterType || filterDifficulty) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterType(''); setFilterDifficulty(''); }}>
            Clear filters
          </button>
        )}
        {pagination && (
          <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
            Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, pagination.total)} of {pagination.total}
          </span>
        )}
      </div>

      {/* Questions list */}
      {loading ? (
        [1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }} />
        ))
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={40} className="empty-state-icon" />
          <p>No questions match your filters.</p>
        </div>
      ) : (
        questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={(page - 1) * PER_PAGE + i}
            showAnswers={showAnswers}
          />
        ))
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3" style={{ marginTop: '2rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => loadData(page - 1)}
            disabled={!pagination.has_prev || loading}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-sm text-muted">
            Page {page} of {pagination.pages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => loadData(page + 1)}
            disabled={!pagination.has_next || loading}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
