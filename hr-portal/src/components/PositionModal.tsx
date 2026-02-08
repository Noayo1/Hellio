import type { Position, Candidate } from '../types';

interface PositionModalProps {
  position: Position;
  candidates: Candidate[];
  onClose: () => void;
}

export default function PositionModal({ position, candidates, onClose }: PositionModalProps) {
  const mustHave = position.requirements.filter((r) => r.required);
  const niceToHave = position.requirements.filter((r) => !r.required);

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
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{position.title}</h2>
                  <p className="text-lg text-gray-600 mt-1">{position.company}</p>
                </div>
                <StatusBadge status={position.status} />
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                <span>{position.location}</span>
                <WorkTypeBadge type={position.workType} />
                <span>{position.experienceYears}+ years experience</span>
              </div>

              {position.salary && (
                <p className="mt-3 text-sm font-medium text-gray-700">{position.salary}</p>
              )}
            </div>

            {/* Description */}
            <Section title="Description">
              <p className="text-gray-700 leading-relaxed">{position.description}</p>
            </Section>

            {/* Must Have Requirements */}
            {mustHave.length > 0 && (
              <Section title="Must Have">
                <ul className="space-y-3">
                  {mustHave.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700">
                      <span className="text-green-500 mt-0.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
              <Section title="Nice to Have">
                <ul className="space-y-3">
                  {niceToHave.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-600">
                      <span className="text-purple-400 mt-0.5">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
            <Section title="Required Skills">
              <div className="flex flex-wrap gap-2">
                {position.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-md text-sm border border-purple-100"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>

            {/* Contact */}
            <Section title="Hiring Contact">
              <p className="font-medium text-gray-900">{position.contactName}</p>
              <a
                href={`mailto:${position.contactEmail}`}
                className="text-sm text-purple-600 hover:underline"
              >
                {position.contactEmail}
              </a>
            </Section>

            {/* Assigned Candidates */}
            <Section title={`Assigned Candidates (${candidates.length})`}>
              {candidates.length === 0 ? (
                <p className="text-gray-500 text-sm">No candidates assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{candidate.name}</p>
                        <p className="text-sm text-gray-500">
                          {candidate.experience[0]?.title} • {candidate.location}
                        </p>
                      </div>
                      <a
                        href={candidate.cvFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:underline"
                      >
                        View CV
                      </a>
                    </div>
                  ))}
                </div>
              )}
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

function StatusBadge({ status }: { status: Position['status'] }) {
  const colors = {
    open: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
    on_hold: 'bg-amber-100 text-amber-700',
  };

  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${colors[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function WorkTypeBadge({ type }: { type: Position['workType'] }) {
  const colors = {
    remote: 'bg-purple-50 text-purple-700 border border-purple-100',
    hybrid: 'bg-purple-50 text-purple-700 border border-purple-100',
    onsite: 'bg-purple-50 text-purple-700 border border-purple-100',
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${colors[type]}`}>
      {type}
    </span>
  );
}
