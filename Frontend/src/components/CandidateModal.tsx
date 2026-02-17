import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import type { Candidate, Position, CandidateFile, PositionSuggestion } from '../types';
import { calculateYearsOfExperience } from '../utils/date';
import { api } from '../api/client';

interface CandidateModalProps {
  candidate: Candidate;
  positions: Position[];
  onClose: () => void;
  onAssignPosition: (candidateId: string, positionId: string, assign: boolean) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (candidate: Candidate) => void;
  isAdmin?: boolean;
  onSelectPosition?: (positionId: string) => void;
}

export default function CandidateModal({
  candidate,
  positions,
  onClose,
  onAssignPosition,
  onDelete,
  onUpdate,
  isAdmin,
  onSelectPosition,
}: CandidateModalProps) {
  const [files, setFiles] = useState<CandidateFile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone || '',
    location: candidate.location,
    status: candidate.status,
    summary: candidate.summary,
    linkedIn: candidate.linkedIn || '',
    github: candidate.github || '',
  });
  const [saving, setSaving] = useState(false);
  const [suggestedPositions, setSuggestedPositions] = useState<PositionSuggestion[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [noRelevantPositions, setNoRelevantPositions] = useState(false);

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await api.updateCandidate(candidate.id, editForm);
      onUpdate({ ...candidate, ...editForm } as Candidate);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update candidate:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePositionToggle = (positionId: string) => {
    const isAssigned = candidate.positionIds.includes(positionId);
    onAssignPosition(candidate.id, positionId, !isAssigned);
  };

  // Fetch candidate files
  useEffect(() => {
    api.getCandidateFiles(candidate.id).then((data) => {
      setFiles(data as CandidateFile[]);
    });
  }, [candidate.id]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Fetch suggested positions with explanations
  useEffect(() => {
    setLoadingPositions(true);
    api
      .getSuggestedPositions(candidate.id, true)
      .then((data) => {
        setSuggestedPositions(data.suggestions);
        setNoRelevantPositions(data.suggestions.length === 0);
      })
      .catch((err) => console.error('Failed to load position suggestions:', err))
      .finally(() => setLoadingPositions(false));
  }, [candidate.id]);

  const formatUrl = (url: string, type: 'linkedin' | 'github'): string => {
    const cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (type === 'linkedin') {
      return `https://www.${cleaned}`;
    }
    return `https://${cleaned}`;
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
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-200">
                  {(isEditing ? editForm.name : candidate.name).charAt(0)}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-2xl font-bold text-gray-900 border-b-2 border-purple-300 focus:border-purple-500 outline-none w-full bg-transparent"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
                      {candidate.name}
                    </h2>
                  )}
                  {candidate.experience[0] && (
                    <p className="text-lg text-gray-600 mt-0.5">{candidate.experience[0].title}</p>
                  )}
                </div>
                {/* Edit/Save buttons for admin */}
                {isAdmin && (
                  <div className="flex items-center gap-2 mr-12">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:bg-gray-300"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                        title="Edit Candidate"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' | 'hired' })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="hired">Hired</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">LinkedIn</label>
                      <input
                        type="text"
                        value={editForm.linkedIn}
                        onChange={(e) => setEditForm({ ...editForm, linkedIn: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="linkedin.com/in/username"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">GitHub</label>
                      <input
                        type="text"
                        value={editForm.github}
                        onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="github.com/username"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 mt-5 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {candidate.location}
                  </span>
                  <a
                    href={`mailto:${candidate.email}`}
                    className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {candidate.email}
                  </a>
                  {candidate.phone && (
                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {candidate.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg font-medium">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {candidate.yearsOfExperience ?? calculateYearsOfExperience(candidate.experience)} years experience
                  </span>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                {candidate.linkedIn && (
                  <ExternalLink href={formatUrl(candidate.linkedIn, 'linkedin')} icon="linkedin">
                    LinkedIn
                  </ExternalLink>
                )}
                {candidate.github && (
                  <ExternalLink href={formatUrl(candidate.github, 'github')} icon="github">
                    GitHub
                  </ExternalLink>
                )}
                {files.length > 0 && (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        const currentFile = files.find(f => f.isCurrent) || files[0];
                        api.downloadFile(currentFile.id, currentFile.fileName);
                      }}
                      className="btn-primary px-5 py-2.5 text-sm font-medium text-white rounded-xl flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CV
                      {files.length > 1 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                          v{files.find(f => f.isCurrent)?.versionNumber || files[0].versionNumber}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <Section title="Summary" icon="document">
              {isEditing ? (
                <textarea
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              ) : (
                <p className="text-gray-700 leading-relaxed">{candidate.summary}</p>
              )}
            </Section>

            {/* Skills */}
            <Section title="Skills" icon="chip">
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="skill-tag inline-flex items-center px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 border border-purple-100/50"
                  >
                    {skill.name}
                    {skill.level && (
                      <span className="ml-1.5 text-xs text-purple-400">({skill.level})</span>
                    )}
                  </span>
                ))}
              </div>
            </Section>

            {/* Experience */}
            <Section title="Experience" icon="briefcase">
              <div className="space-y-5 relative">
                <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-500 via-purple-200 to-transparent" />
                {candidate.experience.map((exp, idx) => (
                  <div key={idx} className="relative pl-8">
                    <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow-sm" />
                    <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                    <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-2">
                      <span>{exp.company}</span>
                      {exp.location && (
                        <>
                          <span className="text-purple-300">•</span>
                          <span>{exp.location}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-purple-500 font-medium mt-1">
                      {exp.startDate} — {exp.endDate || 'Present'}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {exp.highlights.map((h, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>

            {/* Education */}
            <Section title="Education" icon="academic">
              <div className="space-y-4">
                {candidate.education.map((edu, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                    <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                    <p className="text-sm text-gray-600">{edu.institution}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      {edu.startDate} — {edu.endDate || 'Present'}
                      {edu.status === 'in_progress' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs font-medium">
                          In Progress
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Certifications */}
            {candidate.certifications.length > 0 && (
              <Section title="Certifications" icon="badge">
                <div className="space-y-2">
                  {candidate.certifications.map((cert, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-gray-50/80 border border-gray-100">
                      <span className="text-gray-700 flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        {cert.name}
                      </span>
                      <span className="text-sm text-purple-500 font-medium">{cert.year}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Languages */}
            <Section title="Languages" icon="globe">
              <div className="flex flex-wrap gap-2">
                {candidate.languages.map((lang) => (
                  <span
                    key={lang}
                    className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium border border-gray-100"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </Section>

            {/* CV History */}
            {files.length > 1 && (
              <Section title={`CV History (${files.length} versions)`} icon="document">
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${
                        file.isCurrent
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-gray-50/80 border-gray-100 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {file.isCurrent && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                            Current
                          </span>
                        )}
                        <span className="text-gray-700 text-sm">
                          Version {file.versionNumber}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => api.downloadFile(file.id, file.fileName)}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Suggested Positions */}
            <Section title="Suggested Positions" icon="lightbulb">
              {loadingPositions ? (
                <div className="text-center py-6 text-gray-500">
                  <svg className="animate-spin h-5 w-5 mx-auto mb-2 text-emerald-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Finding relevant positions...
                </div>
              ) : noRelevantPositions ? (
                <div className="text-center py-6 text-gray-400">
                  No highly relevant positions found for this candidate.
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedPositions.map((pos) => {
                    const isAlreadyAssigned = candidate.positionIds.includes(pos.id);
                    return (
                      <div
                        key={pos.id}
                        className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            onClick={() => onSelectPosition?.(pos.id)}
                            className={onSelectPosition ? 'cursor-pointer hover:opacity-80' : ''}
                          >
                            <p className="font-medium text-gray-900">{pos.title}</p>
                            <p className="text-sm text-gray-500">{pos.company}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-emerald-600 font-medium">
                              {Math.round(pos.similarity * 100)}% match
                            </span>
                            {isAlreadyAssigned ? (
                              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                Assigned
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssignPosition(candidate.id, pos.id, true);
                                }}
                                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        </div>
                        {pos.explanation && (
                          <p className="text-sm text-gray-600 mt-2 italic border-l-2 border-emerald-200 pl-3">
                            {pos.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Position Assignment */}
            <Section title="Assigned Positions" icon="clipboard">
              <div className="space-y-3">
                {positions.filter((p) => p.status === 'open').map((position) => {
                  const isAssigned = candidate.positionIds.includes(position.id);
                  return (
                    <label
                      key={position.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        isAssigned
                          ? 'bg-purple-50 border-purple-200 shadow-sm shadow-purple-100'
                          : 'bg-white/50 border-gray-200 hover:bg-purple-50/50 hover:border-purple-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handlePositionToggle(position.id)}
                        className="checkbox-custom"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{position.title}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          {position.company}
                          <span className="text-purple-300">•</span>
                          {position.location}
                        </p>
                      </div>
                      {isAssigned && (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
                          Assigned
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </Section>

            {/* Delete Button (Admin only) */}
            {onDelete && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete ${candidate.name}? This action cannot be undone.`)) {
                      onDelete(candidate.id);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Candidate
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
  lightbulb: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  ),
  document: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  ),
  chip: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  ),
  briefcase: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  ),
  academic: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
  ),
  badge: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  ),
  globe: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  clipboard: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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

function ExternalLink({ href, icon, children }: { href: string; icon: 'linkedin' | 'github'; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="skill-tag inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors"
    >
      {icon === 'linkedin' ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )}
      {children}
    </a>
  );
}
