/**
 * Examify FileUpload Component
 * Supports drag-and-drop upload of MULTIPLE PDF/PPT/PPTX files at once.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

const MAX_SIZE_MB = 50;

function FileRow({ file, progress, status, error }) {
  const color = status === 'done' ? 'var(--accent-green)'
    : status === 'error' ? 'var(--accent-red)'
    : 'var(--accent-gold)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0.7rem 1rem',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      marginBottom: '0.5rem',
    }}>
      <FileText size={18} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 2 }}
           className="truncate">{file.name}</p>
        {status === 'uploading' && (
          <div className="progress-bar" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        {status === 'done' && (
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-green)' }}>
            ✓ Uploaded — extracting text...
          </p>
        )}
        {status === 'error' && (
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-red)' }}>{error}</p>
        )}
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
        {(file.size / 1024).toFixed(0)} KB
      </span>
    </div>
  );
}

export default function FileUpload({ onUploadSuccess }) {
  const [fileStates, setFileStates] = useState([]); // [{file, progress, status, error}]
  const [uploading, setUploading] = useState(false);

  const updateFile = (index, patch) => {
    setFileStates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error(`${rejectedFiles.length} file(s) rejected — check type or size.`);
    }
    if (!acceptedFiles.length) return;

    // Add all files to state immediately
    const initialStates = acceptedFiles.map(f => ({
      file: f, progress: 0, status: 'uploading', error: null
    }));
    setFileStates(initialStates);
    setUploading(true);

    const BASE_URL = process.env.REACT_APP_API_URL || '/api';

    // Upload each file individually so we get per-file progress
    const promises = acceptedFiles.map((file, i) => {
      const formData = new FormData();
      formData.append('file', file);

      return axios.post(`${BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            updateFile(i, { progress: Math.round((e.loaded * 100) / e.total) });
          }
        },
      })
      .then(res => {
        const fileRecord = res.data.files?.[0] || res.data.file;
        updateFile(i, { status: 'done', progress: 100 });
        if (onUploadSuccess && fileRecord) onUploadSuccess(fileRecord);
        return fileRecord;
      })
      .catch(err => {
        const msg = err.response?.data?.error || err.message || 'Upload failed';
        updateFile(i, { status: 'error', error: msg });
        return null;
      });
    });

    await Promise.all(promises);
    setUploading(false);

    const doneCount = fileStates.filter ? 0 : 0; // recount after update
    toast.success(`${acceptedFiles.length} file(s) uploaded!`);
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: true,          // ← allow multiple files
    disabled: uploading,
  });

  const reset = () => setFileStates([]);
  const hasFiles = fileStates.length > 0;
  const allDone = hasFiles && fileStates.every(f => f.status === 'done' || f.status === 'error');

  return (
    <div>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--accent-gold)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-lg)',
          background: isDragActive ? 'rgba(201,151,58,0.05)' : 'var(--bg-secondary)',
          padding: hasFiles ? '1.5rem 2rem' : '3rem 2rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 200ms ease',
          outline: 'none',
        }}
      >
        <input {...getInputProps()} />

        {!hasFiles && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-md)',
              background: isDragActive ? 'rgba(201,151,58,0.15)' : 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', transition: 'all 200ms',
            }}>
              <Upload size={24} color={isDragActive ? 'var(--accent-gold)' : 'var(--text-muted)'} />
            </div>
            <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
              {isDragActive ? 'Drop your files here' : 'Upload Lecture Slides'}
            </h3>
            <p className="text-muted text-sm" style={{ marginBottom: '1.25rem' }}>
              Drag & drop one or <strong>multiple files</strong> at once, or click to browse
            </p>
            <div className="flex items-center justify-center gap-3">
              {['PDF', 'PPT', 'PPTX'].map(ext => (
                <span key={ext} className="badge badge-neutral">
                  <FileText size={10} /> {ext}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted mt-4">Max {MAX_SIZE_MB}MB per file</p>
          </>
        )}

        {hasFiles && (
          <div style={{ textAlign: 'left' }}>
            <p style={{
              fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem'
            }}>
              {fileStates.length} file{fileStates.length > 1 ? 's' : ''}
            </p>
            {fileStates.map((fs, i) => (
              <FileRow
                key={i}
                file={fs.file}
                progress={fs.progress}
                status={fs.status}
                error={fs.error}
              />
            ))}
          </div>
        )}
      </div>

      {allDone && (
        <div className="flex justify-center mt-4">
          <button className="btn btn-ghost btn-sm" onClick={reset}>
            Upload More Files
          </button>
        </div>
      )}
    </div>
  );
}
