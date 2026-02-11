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

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<UploadType>('cv');
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles: FileStatus[] = Array.from(selectedFiles).map((file) => ({
        file,
        status: 'pending' as const,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset input so same file can be selected again
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

      // Mark as uploading
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' as const } : f))
      );

      try {
        const result = await api.uploadDocument(files[i].file, uploadType);
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
    // Refresh logs after uploads complete
    fetchLogs();
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
            Upload Documents
          </h1>
          <p className="text-gray-600 mt-2">
            Upload CVs or job position files to add them to the system.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {/* Document Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Document Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="uploadType"
                  value="cv"
                  checked={uploadType === 'cv'}
                  onChange={() => setUploadType('cv')}
                  disabled={uploading}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-gray-700">CV / Resume</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="uploadType"
                  value="job"
                  checked={uploadType === 'job'}
                  onChange={() => setUploadType('job')}
                  disabled={uploading}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-gray-700">Job Position</span>
              </label>
            </div>
          </div>

          {/* File Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Files
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors">
              <input
                id="file-input"
                type="file"
                accept=".pdf,.docx"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              <label
                htmlFor="file-input"
                className={`cursor-pointer flex flex-col items-center ${uploading ? 'opacity-50' : ''}`}
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-3"
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
                <span className="text-gray-600">Click to select files</span>
                <span className="text-gray-400 text-sm mt-1">PDF or DOCX (multiple allowed)</span>
              </label>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Selected Files ({files.length})
                </label>
                {successCount > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    Clear completed
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((fileStatus, index) => (
                  <div
                    key={`${fileStatus.file.name}-${index}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      fileStatus.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : fileStatus.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : fileStatus.status === 'uploading'
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Status Icon */}
                      {fileStatus.status === 'uploading' ? (
                        <svg className="animate-spin w-5 h-5 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : fileStatus.status === 'success' ? (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : fileStatus.status === 'error' ? (
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {fileStatus.file.name}
                        </p>
                        {fileStatus.error && (
                          <p className="text-xs text-red-600 truncate">{fileStatus.error}</p>
                        )}
                      </div>
                    </div>
                    {/* Remove button - only for pending files */}
                    {fileStatus.status === 'pending' && !uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <p className="font-medium text-gray-700">Upload Summary</p>
              <p className="mt-1 text-gray-600">
                {successCount > 0 && (
                  <span className="text-green-600">{successCount} succeeded</span>
                )}
                {successCount > 0 && errorCount > 0 && ' • '}
                {errorCount > 0 && (
                  <span className="text-red-600">{errorCount} failed</span>
                )}
              </p>
              {successCount > 0 && (
                <p className="mt-2">
                  <Link
                    to={uploadType === 'cv' ? '/candidates' : '/positions'}
                    className="text-purple-600 hover:text-purple-800 underline"
                  >
                    View {uploadType === 'cv' ? 'Candidates' : 'Positions'}
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={pendingCount === 0 || uploading}
            className="btn-primary w-full px-6 py-3 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload {pendingCount > 0 ? `(${pendingCount} file${pendingCount > 1 ? 's' : ''})` : ''}
              </>
            )}
          </button>
        </div>

        {/* Recent Uploads (Extraction Logs) */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
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
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0 uppercase">
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

                            {/* Link to Candidate */}
                            {log.status === 'success' && log.candidate_id && (
                              <div className="pt-2 border-t border-gray-200">
                                <Link
                                  to={`/candidates`}
                                  className="text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  View Candidate →
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
