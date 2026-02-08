import type { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: () => void;
  positionsCount: number;
}

export default function CandidateCard({
  candidate,
  selected,
  onSelect,
  onClick,
  positionsCount,
}: CandidateCardProps) {
  const currentJob = candidate.experience[0];
  const yearsOfExp = calculateYearsOfExperience(candidate.experience);
  const topSkills = candidate.skills.slice(0, 3);

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    hired: 'bg-purple-100 text-purple-700',
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-md p-7 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:border-purple-200 border border-transparent ${
        selected ? 'ring-2 ring-purple-400' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(candidate.id);
          }}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-500 focus:ring-purple-400"
        />
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900 truncate text-base">{candidate.name}</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[candidate.status]}`}>
              {candidate.status}
            </span>
          </div>
          {currentJob && (
            <p className="text-sm text-gray-600 truncate mt-1">{currentJob.title}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">{candidate.location}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {topSkills.map((skill) => (
              <span
                key={skill.name}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"
              >
                {skill.name}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span>{yearsOfExp} years exp</span>
            <span>{positionsCount} position{positionsCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateYearsOfExperience(experience: Candidate['experience']): number {
  if (experience.length === 0) return 0;

  const now = new Date();

  // Convert experiences to date ranges
  const ranges = experience.map((exp) => ({
    start: parseDate(exp.startDate),
    end: exp.endDate ? parseDate(exp.endDate) : now,
  }));

  // Sort by start date
  ranges.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping ranges
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

  // Calculate total months from merged ranges
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
