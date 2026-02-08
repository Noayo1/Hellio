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

  return (
    <div
      className={`bg-white rounded-lg border p-5 cursor-pointer transition-all hover:shadow-md ${
        selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(candidate.id);
          }}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div className="flex-1 min-w-0" onClick={onClick}>
          <h3 className="font-semibold text-gray-900 truncate">{candidate.name}</h3>
          {currentJob && (
            <p className="text-sm text-gray-600 truncate">{currentJob.title}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">{candidate.location}</p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {topSkills.map((skill) => (
              <span
                key={skill.name}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
              >
                {skill.name}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span>{yearsOfExp} years exp</span>
            <span>{positionsCount} position{positionsCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateYearsOfExperience(experience: Candidate['experience']): number {
  let totalMonths = 0;
  const now = new Date();

  for (const exp of experience) {
    const start = parseDate(exp.startDate);
    const end = exp.endDate ? parseDate(exp.endDate) : now;
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
  }

  return Math.round(totalMonths / 12);
}

function parseDate(dateStr: string): Date {
  const [year, month] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1);
}
