import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ExtractionLog, ExtractionLogDetail } from '../types';

type UploadType = 'cv' | 'job';

interface FileStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

// Status badge configuration
const LOG_STATUS_CONFIG = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  failed: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

// Format duration in seconds
function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// Format relative time
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Upload Box Component
function UploadBox({
  type,
  title,
  description,
  icon,
  accentColor,
  onUploadComplete,
}: {
  type: UploadType;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  onUploadComplete: () => void;
}) {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles: FileStatus[] = Array.from(selectedFiles).map((file) => ({
        file,
        status: 'pending' as const,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' as const } : f))
      );

      try {
        const result = await api.uploadDocument(files[i].file, type);
        if (result.success) {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: 'success' as const } : f))
          );
        } else {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? { ...f, status: 'error' as const, error: result.errors?.join(', ') || 'Upload failed' }
                : f
            )
          );
        }
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    setUploading(false);
    onUploadComplete();
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  const inputId = `file-input-${type}`;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${accentColor} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors mb-4 flex-shrink-0 ${
        uploading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-purple-400'
      }`}>
        <input
          id={inputId}
          type="file"
          accept=".pdf,.docx"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <label
          htmlFor={inputId}
          className={`cursor-pointer flex flex-col items-center ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg
            className="w-10 h-10 text-gray-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-gray-600 text-sm">Click to select files</span>
          <span className="text-gray-400 text-xs mt-1">PDF or DOCX</span>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mb-4 flex-1 min-h-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">{files.length} file{files.length > 1 ? 's' : ''}</span>
            {successCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-purple-600 hover:text-purple-800"
              >
                Clear completed
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {files.map((fileStatus, index) => (
              <div
                key={`${fileStatus.file.name}-${index}`}
                className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                  fileStatus.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : fileStatus.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : fileStatus.status === 'uploading'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {fileStatus.status === 'uploading' ? (
                    <svg className="animate-spin w-4 h-4 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : fileStatus.status === 'success' ? (
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : fileStatus.status === 'error' ? (
                    <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span className="truncate text-gray-700">{fileStatus.file.name}</span>
                </div>
                {fileStatus.status === 'pending' && !uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {(successCount > 0 || errorCount > 0) && !uploading && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
          <p className="text-gray-600">
            {successCount > 0 && <span className="text-green-600">{successCount} succeeded</span>}
            {successCount > 0 && errorCount > 0 && ' • '}
            {errorCount > 0 && <span className="text-red-600">{errorCount} failed</span>}
          </p>
          {successCount > 0 && (
            <Link
              to={type === 'cv' ? '/candidates' : '/positions'}
              className="text-purple-600 hover:text-purple-800 text-xs mt-1 inline-block"
            >
              View {type === 'cv' ? 'Candidates' : 'Positions'} →
            </Link>
          )}
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={pendingCount === 0 || uploading}
        className="btn-primary w-full px-4 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
      >
        {uploading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Uploading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload {pendingCount > 0 ? `(${pendingCount})` : ''}
          </>
        )}
      </button>
    </div>
  );
}

export default function UploadPage() {
  // Logs state
  const [logs, setLogs] = useState<ExtractionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logDetail, setLogDetail] = useState<ExtractionLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { logs: fetchedLogs } = await api.getExtractionLogs({
        limit: 10,
        status: statusFilter || undefined,
      });
      setLogs(fetchedLogs as ExtractionLog[]);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [statusFilter]);

  // Fetch logs on mount and when filter changes
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Fetch log detail when expanded
  const handleToggleExpand = async (logId: string) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
      setLogDetail(null);
      return;
    }

    setExpandedLogId(logId);
    setDetailLoading(true);
    try {
      const detail = await api.getExtractionLogDetail(logId);
      setLogDetail(detail as ExtractionLogDetail);
    } catch (err) {
      console.error('Failed to fetch log detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
            Upload Documents
          </h1>
          <p className="text-gray-600 mt-2">
            Upload CVs or job positions to add them to the system.
          </p>
        </div>

        {/* Two Upload Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* CV Upload Box */}
          <UploadBox
            type="cv"
            title="Upload CVs"
            description="Add candidate resumes"
            accentColor="bg-blue-100"
            icon={
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            onUploadComplete={fetchLogs}
          />

          {/* Position Upload Box */}
          <UploadBox
            type="job"
            title="Upload Positions"
            description="Add job descriptions"
            accentColor="bg-purple-100"
            icon={
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            onUploadComplete={fetchLogs}
          />
        </div>

        {/* Recent Uploads (Extraction Logs) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Uploads</h2>
            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              {/* Refresh Button */}
              <button
                onClick={fetchLogs}
                disabled={logsLoading}
                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh logs"
              >
                <svg
                  className={`w-5 h-5 ${logsLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Logs List */}
          {logsLoading && logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No uploads yet</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const statusConfig = LOG_STATUS_CONFIG[log.status] || LOG_STATUS_CONFIG.pending;
                const fileName = log.source_file_path.split('/').pop() || log.source_file_path;
                const isExpanded = expandedLogId === log.id;

                return (
                  <div key={log.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Log Row */}
                    <button
                      onClick={() => handleToggleExpand(log.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Status Icon */}
                        {log.status === 'success' ? (
                          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : log.status === 'failed' ? (
                          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {/* File Name */}
                        <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
                        {/* Type Badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 uppercase ${
                          log.source_type === 'cv'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {log.source_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {/* Status Badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                          {log.status}
                        </span>
                        {/* Duration */}
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {formatDuration(log.total_duration_ms)}
                        </span>
                        {/* Time Ago */}
                        <span className="text-xs text-gray-400 w-20 text-right">
                          {formatTimeAgo(log.created_at)}
                        </span>
                        {/* Expand Arrow */}
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        {detailLoading ? (
                          <div className="text-sm text-gray-500">Loading details...</div>
                        ) : logDetail ? (
                          <div className="space-y-3 text-sm">
                            {/* Error Message */}
                            {logDetail.error_message && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="font-medium text-red-700">Error:</p>
                                <p className="text-red-600 mt-1">{logDetail.error_message}</p>
                              </div>
                            )}

                            {/* Validation Errors */}
                            {logDetail.validation_errors && logDetail.validation_errors.length > 0 && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="font-medium text-amber-700">Validation Issues:</p>
                                <ul className="list-disc list-inside text-amber-600 mt-1">
                                  {logDetail.validation_errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Regex Results */}
                            {logDetail.regex_results && (
                              <div>
                                <p className="font-medium text-gray-700 mb-2">Extracted Fields (Regex):</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Email:</span>
                                    <span className={logDetail.regex_results.email ? 'text-gray-900' : 'text-gray-400'}>
                                      {logDetail.regex_results.email || 'Not found'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Phone:</span>
                                    <span className={logDetail.regex_results.phone ? 'text-gray-900' : 'text-gray-400'}>
                                      {logDetail.regex_results.phone || 'Not found'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">LinkedIn:</span>
                                    <span className={logDetail.regex_results.linkedin ? 'text-gray-900' : 'text-gray-400'}>
                                      {logDetail.regex_results.linkedin || 'Not found'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">GitHub:</span>
                                    <span className={logDetail.regex_results.github ? 'text-gray-900' : 'text-gray-400'}>
                                      {logDetail.regex_results.github || 'Not found'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Link to Candidate/Position */}
                            {log.status === 'success' && (
                              <div className="pt-2 border-t border-gray-200">
                                <Link
                                  to={log.source_type === 'cv' ? '/candidates' : '/positions'}
                                  className="text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  View {log.source_type === 'cv' ? 'Candidate' : 'Position'} →
                                </Link>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Failed to load details</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            to="/candidates"
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            Back to Candidates
          </Link>
        </div>
      </div>
    </div>
  );
}
