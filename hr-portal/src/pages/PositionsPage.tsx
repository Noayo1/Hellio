import { useState, useMemo } from 'react';
import type { Candidate, Position } from '../types';
import PositionCard from '../components/PositionCard';
import PositionModal from '../components/PositionModal';
import candidatesData from '../data/candidates.json';
import positionsData from '../data/positions.json';

export default function PositionsPage() {
  const candidates = candidatesData as Candidate[];
  const [positions] = useState<Position[]>(positionsData as Position[]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [activePosition, setActivePosition] = useState<Position | null>(null);

  // Filter positions
  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !p.company.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [positions, searchTerm, statusFilter]);

  // Count candidates for each position
  const getCandidateCount = (positionId: string) => {
    return candidates.filter((c) => c.positionIds.includes(positionId)).length;
  };

  // Get candidates for a position
  const getCandidatesForPosition = (positionId: string) => {
    return candidates.filter((c) => c.positionIds.includes(positionId));
  };

  return (
    <div>
      {/* Header with search and filters */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Positions</h2>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by title or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        Showing {filteredPositions.length} position{filteredPositions.length !== 1 ? 's' : ''}
      </p>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPositions.map((position) => (
          <PositionCard
            key={position.id}
            position={position}
            onClick={() => setActivePosition(position)}
            candidatesCount={getCandidateCount(position.id)}
          />
        ))}
      </div>

      {filteredPositions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No positions found matching your criteria.
        </div>
      )}

      {/* Position Modal */}
      {activePosition && (
        <PositionModal
          position={activePosition}
          candidates={getCandidatesForPosition(activePosition.id)}
          onClose={() => setActivePosition(null)}
        />
      )}
    </div>
  );
}
