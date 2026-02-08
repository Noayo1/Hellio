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
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 bg-clip-text text-transparent">
              Positions
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage your open roles and hiring pipeline</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:border-purple-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:border-purple-400 min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="text-center py-20 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No positions found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
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
