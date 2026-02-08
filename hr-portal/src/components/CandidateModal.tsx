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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">{candidate.name}</h2>
              {candidate.experience[0] && (
                <p className="text-lg text-gray-600 mt-1">{candidate.experience[0].title}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                <span>{candidate.location}</span>
                <a href={`mailto:${candidate.email}`} className="text-purple-600 hover:underline">
                  {candidate.email}
                </a>
                {candidate.phone && <span>{candidate.phone}</span>}
              </div>

              <div className="flex gap-3 mt-4">
                {candidate.linkedIn && (
                  <a
                    href={`https://${candidate.linkedIn}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    LinkedIn
                  </a>
                )}
                {candidate.github && (
                  <a
                    href={`https://${candidate.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    GitHub
                  </a>
                )}
                <a
                  href={candidate.cvFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Download CV
                </a>
              </div>
            </div>

            {/* Summary */}
            <Section title="Summary">
              <p className="text-gray-700 leading-relaxed">{candidate.summary}</p>
            </Section>

            {/* Skills */}
            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-sm bg-purple-50 text-purple-700 border border-purple-100"
                  >
                    {skill.name}
                    {skill.level && (
                      <span className="ml-1.5 text-xs text-purple-500">({skill.level})</span>
                    )}
                  </span>
                ))}
              </div>
            </Section>

            {/* Experience */}
            <Section title="Experience">
              <div className="space-y-5">
                {candidate.experience.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-purple-200 pl-5">
                    <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {exp.company} {exp.location && `• ${exp.location}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {exp.startDate} - {exp.endDate || 'Present'}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {exp.highlights.map((h, i) => (
                        <li key={i} className="text-sm text-gray-700 flex">
                          <span className="mr-2 text-purple-400">•</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>

            {/* Education */}
            <Section title="Education">
              <div className="space-y-4">
                {candidate.education.map((edu, idx) => (
                  <div key={idx}>
                    <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                    <p className="text-sm text-gray-600">{edu.institution}</p>
                    <p className="text-sm text-gray-500">
                      {edu.startDate} - {edu.endDate || 'Present'}
                      {edu.status === 'in_progress' && (
                        <span className="ml-2 text-amber-600">(In Progress)</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Certifications */}
            {candidate.certifications.length > 0 && (
              <Section title="Certifications">
                <div className="space-y-2">
                  {candidate.certifications.map((cert, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-gray-700">{cert.name}</span>
                      <span className="text-sm text-gray-500">{cert.year}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Languages */}
            <Section title="Languages">
              <div className="flex flex-wrap gap-2">
                {candidate.languages.map((lang) => (
                  <span
                    key={lang}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </Section>

            {/* Position Assignment */}
            <Section title="Assigned Positions">
              <div className="space-y-3">
                {positions.filter((p) => p.status === 'open').map((position) => {
                  const isAssigned = candidate.positionIds.includes(position.id);
                  return (
                    <label
                      key={position.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handlePositionToggle(position.id)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-500 focus:ring-purple-400"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{position.title}</p>
                        <p className="text-sm text-gray-500">{position.company} • {position.location}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}
