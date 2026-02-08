import type { Position } from '../types';

interface PositionCardProps {
  position: Position;
  onClick: () => void;
  candidatesCount: number;
}

export default function PositionCard({ position, onClick, candidatesCount }: PositionCardProps) {
  const statusColors = {
    open: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
    on_hold: 'bg-amber-100 text-amber-700',
  };

  const workTypeColors = {
    remote: 'bg-purple-50 text-purple-700 border border-purple-100',
    hybrid: 'bg-purple-50 text-purple-700 border border-purple-100',
    onsite: 'bg-purple-50 text-purple-700 border border-purple-100',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md p-7 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:border-purple-200 border border-transparent"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-gray-900 text-base">{position.title}</h3>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[position.status]}`}
        >
          {position.status.replace('_', ' ')}
        </span>
      </div>

      <p className="text-sm text-gray-600">{position.company}</p>
      <p className="text-sm text-gray-500 mt-2">{position.location}</p>

      <div className="flex items-center gap-3 mt-4">
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${workTypeColors[position.workType]}`}
        >
          {position.workType}
        </span>
        <span className="text-xs text-gray-500">
          {position.experienceYears}+ years
        </span>
      </div>

      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <span>{candidatesCount} candidate{candidatesCount !== 1 ? 's' : ''}</span>
        {position.salary && <span>{position.salary}</span>}
      </div>
    </div>
  );
}
