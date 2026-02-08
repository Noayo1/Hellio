import { createPortal } from 'react-dom';
import type { Candidate, Position } from '../types';

interface CandidateModalProps {
  candidate: Candidate;
  positions: Position[];
  onClose: () => void;
  onAssignPosition: (candidateId: string, positionId: string, assign: boolean) => void;
}

export default function CandidateModal({
  candidate,
  positions,
  onClose,
  onAssignPosition,
}: CandidateModalProps) {
  const handlePositionToggle = (positionId: string) => {
    const isAssigned = candidate.positionIds.includes(positionId);
    onAssignPosition(candidate.id, positionId, !isAssigned);
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
                  {candidate.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
                    {candidate.name}
                  </h2>
                  {candidate.experience[0] && (
                    <p className="text-lg text-gray-600 mt-0.5">{candidate.experience[0].title}</p>
                  )}
                </div>
              </div>

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
              </div>

              <div className="flex gap-3 mt-5">
                {candidate.linkedIn && (
                  <ExternalLink href={`https://${candidate.linkedIn}`} icon="linkedin">
                    LinkedIn
                  </ExternalLink>
                )}
                {candidate.github && (
                  <ExternalLink href={`https://${candidate.github}`} icon="github">
                    GitHub
                  </ExternalLink>
                )}
                <a
                  href={candidate.cvFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary px-5 py-2.5 text-sm font-medium text-white rounded-xl flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download CV
                </a>
              </div>
            </div>

            {/* Summary */}
            <Section title="Summary" icon="document">
              <p className="text-gray-700 leading-relaxed">{candidate.summary}</p>
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
