import type { Candidate } from '../types';

const STATUS_CONFIG = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  hired: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
} as const;

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onClick: () => void;
  positionsCount: number;
}

export default function CandidateCard({
  candidate,
  selected,
  disabled = false,
  onSelect,
  onClick,
  positionsCount,
}: CandidateCardProps) {
  const currentJob = candidate.experience[0];
  const yearsOfExp = calculateYearsOfExperience(candidate.experience);
  const topSkills = candidate.skills.slice(0, 3);
  const isCheckboxDisabled = disabled && !selected;
  const status = STATUS_CONFIG[candidate.status];

  return (
    <div
      className={`glass-card card-shine rounded-2xl p-6 cursor-pointer relative overflow-hidden border-purple-200 ${
        selected ? 'selection-ring selected' : ''
      }`}
    >
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-100/50 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex items-start gap-4 relative">
        <input
          type="checkbox"
          checked={selected}
          disabled={isCheckboxDisabled}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(candidate.id);
          }}
          className="checkbox-custom mt-1 flex-shrink-0"
        />
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900 truncate text-base group-hover:text-purple-700 transition-colors">
              {candidate.name}
            </h3>
            <span
              className={`relative px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${status.bg} ${status.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${candidate.status === 'active' ? 'animate-pulse' : ''}`} />
              <span className="capitalize">{candidate.status}</span>
            </span>
          </div>

          {currentJob && (
            <p className="text-sm text-gray-600 truncate mt-1.5 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {currentJob.title}
            </p>
          )}

          <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {candidate.location}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {topSkills.map((skill) => (
              <span
                key={skill.name}
                className="skill-tag inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 border border-purple-100/50"
              >
                {skill.name}
              </span>
            ))}
            {candidate.skills.length > 3 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 border border-gray-100">
                +{candidate.skills.length - 3}
              </span>
            )}
          </div>

          <div className="divider-gradient mt-5 mb-4" />

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-gray-600">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{yearsOfExp}</span> years
              </span>
              <span className="flex items-center gap-1.5 text-gray-600">
                <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium">{positionsCount}</span> position{positionsCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateYearsOfExperience(experience: Candidate['experience']): number {
  if (experience.length === 0) return 0;

  const now = new Date();

  const ranges = experience.map((exp) => ({
    start: parseDate(exp.startDate),
    end: exp.endDate ? parseDate(exp.endDate) : now,
  }));

  ranges.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const range of ranges) {
    if (merged.length === 0 || range.start > merged[merged.length - 1].end) {
      merged.push({ ...range });
    } else {
      merged[merged.length - 1].end = new Date(
        Math.max(merged[merged.length - 1].end.getTime(), range.end.getTime())
      );
    }
  }

  let totalMonths = 0;
  for (const range of merged) {
    const months =
      (range.end.getFullYear() - range.start.getFullYear()) * 12 +
      (range.end.getMonth() - range.start.getMonth());
    totalMonths += Math.max(0, months);
  }

  return Math.round(totalMonths / 12);
}

function parseDate(dateStr: string): Date {
  const [year, month] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1);
}
