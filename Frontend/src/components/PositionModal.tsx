import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import type { Position, Candidate } from '../types';

interface PositionModalProps {
  position: Position;
  candidates: Candidate[];
  onClose: () => void;
  onUpdate?: (position: Position) => Promise<void>;
  onDelete?: (id: string) => void;
}

export default function PositionModal({ position, candidates, onClose, onUpdate, onDelete }: PositionModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPosition, setEditedPosition] = useState<Position>(position);
  const [saving, setSaving] = useState(false);

  const mustHave = position.requirements.filter((r) => r.required);
  const niceToHave = position.requirements.filter((r) => !r.required);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
          setEditedPosition(position);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isEditing, position]);

  // Update editedPosition when position changes
  useEffect(() => {
    setEditedPosition(position);
  }, [position]);

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(editedPosition);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPosition(position);
    setIsEditing(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 modal-backdrop animate-fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-2.5 rounded-xl bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all z-10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8 relative">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedPosition.title}
                        onChange={(e) => setEditedPosition({ ...editedPosition, title: e.target.value })}
                        className="text-2xl font-bold border-b-2 border-purple-300 focus:border-purple-500 outline-none bg-transparent"
                      />
                    ) : (
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
                        {position.title}
                      </h2>
                    )}
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedPosition.company}
                        onChange={(e) => setEditedPosition({ ...editedPosition, company: e.target.value })}
                        className="text-lg text-gray-600 mt-0.5 border-b border-gray-300 focus:border-purple-500 outline-none bg-transparent"
                      />
                    ) : (
                      <p className="text-lg text-gray-600 mt-0.5">{position.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mr-12">
                  {isEditing ? (
                    <>
                      <select
                        value={editedPosition.status}
                        onChange={(e) => setEditedPosition({ ...editedPosition, status: e.target.value as Position['status'] })}
                        className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 focus:border-purple-500 outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="on_hold">On Hold</option>
                      </select>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <StatusBadge status={position.status} />
                      {onUpdate && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                          title="Edit Position"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-5 text-sm text-gray-500">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editedPosition.location}
                      onChange={(e) => setEditedPosition({ ...editedPosition, location: e.target.value })}
                      placeholder="Location"
                      className="px-3 py-1.5 rounded-lg border border-gray-300 focus:border-purple-500 outline-none text-sm"
                    />
                    <select
                      value={editedPosition.workType}
                      onChange={(e) => setEditedPosition({ ...editedPosition, workType: e.target.value as Position['workType'] })}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 focus:border-purple-500 outline-none text-sm"
                    >
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                    </select>
                    <input
                      type="number"
                      value={editedPosition.experienceYears}
                      onChange={(e) => setEditedPosition({ ...editedPosition, experienceYears: parseInt(e.target.value) || 0 })}
                      placeholder="Years exp"
                      className="px-3 py-1.5 rounded-lg border border-gray-300 focus:border-purple-500 outline-none text-sm w-24"
                    />
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {position.location}
                    </span>
                    {position.workType && <WorkTypeBadge type={position.workType} />}
                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {position.experienceYears}+ years
                    </span>
                  </>
                )}
              </div>

              {isEditing ? (
                <input
                  type="text"
                  value={editedPosition.salary || ''}
                  onChange={(e) => setEditedPosition({ ...editedPosition, salary: e.target.value || undefined })}
                  placeholder="Salary (optional)"
                  className="mt-4 px-4 py-2 rounded-xl border border-gray-300 focus:border-purple-500 outline-none text-sm"
                />
              ) : position.salary ? (
                <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {position.salary}
                </p>
              ) : null}

            </div>

            {/* Description */}
            <Section title="Description" icon="document">
              {isEditing ? (
                <textarea
                  value={editedPosition.description}
                  onChange={(e) => setEditedPosition({ ...editedPosition, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 outline-none text-gray-700 leading-relaxed min-h-[100px]"
                />
              ) : (
                <p className="text-gray-700 leading-relaxed">{position.description}</p>
              )}
            </Section>

            {/* Must Have Requirements */}
            {mustHave.length > 0 && (
              <Section title="Must Have" icon="check">
                <ul className="space-y-3">
                  {mustHave.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      {req.text}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Nice to Have Requirements */}
            {niceToHave.length > 0 && (
              <Section title="Nice to Have" icon="plus">
                <ul className="space-y-3">
                  {niceToHave.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-600 p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                      <span className="text-purple-400 mt-0.5 flex-shrink-0">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                      </span>
                      {req.text}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Required Skills */}
            <Section title="Required Skills" icon="chip">
              <div className="flex flex-wrap gap-2">
                {position.skills.map((skill) => (
                  <span
                    key={skill}
                    className="skill-tag px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 rounded-lg text-sm border border-purple-100/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>

            {/* Contact */}
            <Section title="Hiring Contact" icon="user">
              <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {position.contactName}
                </p>
                <a
                  href={`mailto:${position.contactEmail}`}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-2 mt-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {position.contactEmail}
                </a>
              </div>
            </Section>

            {/* Assigned Candidates */}
            <Section title={`Assigned Candidates (${candidates.length})`} icon="users">
              {candidates.length === 0 ? (
                <div className="text-center py-8 rounded-xl bg-gray-50/80 border border-gray-100">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500 text-sm">No candidates assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                          {candidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{candidate.name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            {candidate.experience[0]?.title}
                            <span className="text-purple-300">•</span>
                            {candidate.location}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Delete Button (Admin only) */}
            {onDelete && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete the position "${position.title}"? This action cannot be undone.`)) {
                      onDelete(position.id);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Position
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const ICONS = {
  document: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  ),
  check: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  plus: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  chip: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  ),
  user: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  ),
  users: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  ),
};

function Section({ title, icon, children }: { title: string; icon: keyof typeof ICONS; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {ICONS[icon]}
        </svg>
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: Position['status'] }) {
  const config = {
    open: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
    on_hold: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
  };
  const { bg, text, dot } = config[status];

  return (
    <span className={`relative px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'open' ? 'animate-pulse' : ''}`} />
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </span>
  );
}

function WorkTypeBadge({ type }: { type: Position['workType'] }) {
  const icons = {
    remote: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    hybrid: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    onsite: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  };

  return (
    <span className="skill-tag inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 border border-purple-100/50">
      {icons[type]}
      <span className="capitalize">{type}</span>
    </span>
  );
}
