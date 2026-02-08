import type { Position } from '../types';

interface PositionCardProps {
  position: Position;
  onClick: () => void;
  candidatesCount: number;
}

export default function PositionCard({ position, onClick, candidatesCount }: PositionCardProps) {
  const statusColors = {
    open: 'bg-green-50 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
    on_hold: 'bg-amber-50 text-amber-700',
  };

  const workTypeColors = {
    remote: 'bg-purple-50 text-purple-700',
    hybrid: 'bg-blue-50 text-blue-700',
    onsite: 'bg-orange-50 text-orange-700',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-5 cursor-pointer transition-all hover:shadow-md hover:border-gray-300"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900">{position.title}</h3>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColors[position.status]}`}
        >
          {position.status.replace('_', ' ')}
        </span>
      </div>

      <p className="text-sm text-gray-600">{position.company}</p>
      <p className="text-sm text-gray-500 mt-1">{position.location}</p>

      <div className="flex items-center gap-2 mt-3">
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${workTypeColors[position.workType]}`}
        >
          {position.workType}
        </span>
        <span className="text-xs text-gray-500">
          {position.experienceYears}+ years
        </span>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>{candidatesCount} candidate{candidatesCount !== 1 ? 's' : ''}</span>
        {position.salary && <span>{position.salary}</span>}
      </div>
    </div>
  );
}
