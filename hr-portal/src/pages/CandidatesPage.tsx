import { useState, useMemo } from 'react';
import type { Candidate, Position } from '../types';
import CandidateCard from '../components/CandidateCard';
import CandidateModal from '../components/CandidateModal';
import CompareModal from '../components/CompareModal';
import candidatesData from '../data/candidates.json';
import positionsData from '../data/positions.json';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(candidatesData as Candidate[]);
  const positions = positionsData as Position[];

  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Get all unique skills for filter dropdown
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    candidates.forEach((c) => c.skills.forEach((s) => skills.add(s.name)));
    return Array.from(skills).sort();
  }, [candidates]);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (positionFilter && !c.positionIds.includes(positionFilter)) return false;
      if (skillFilter && !c.skills.some((s) => s.name === skillFilter)) return false;
      return true;
    });
  }, [candidates, searchTerm, positionFilter, skillFilter, statusFilter]);

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAssignPosition = (candidateId: string, positionId: string, assign: boolean) => {
    setCandidates((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== candidateId) return c;
        const positionIds = assign
          ? [...c.positionIds, positionId]
          : c.positionIds.filter((id) => id !== positionId);
        return { ...c, positionIds };
      });

      // Sync activeCandidate with updated data
      if (activeCandidate?.id === candidateId) {
        const updatedCandidate = updated.find(c => c.id === candidateId);
        if (updatedCandidate) setActiveCandidate(updatedCandidate);
      }

      return updated;
    });
  };

  const selectedCandidates = candidates.filter((c) => selectedIds.includes(c.id));

  return (
    <div>
      {/* Header with search and filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Candidates</h2>
          {selectedIds.length >= 2 && (
            <button
              onClick={() => setShowCompare(true)}
              className="px-5 py-2.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors shadow-sm"
            >
              Compare Selected ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
          />
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 bg-white"
          >
            <option value="">All Positions</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 bg-white"
          >
            <option value="">All Skills</option>
            {allSkills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 bg-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="hired">Hired</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-6">
        Showing {filteredCandidates.length} of {candidates.length} candidates
      </p>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCandidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            selected={selectedIds.includes(candidate.id)}
            onSelect={handleSelect}
            onClick={() => setActiveCandidate(candidate)}
            positionsCount={candidate.positionIds.length}
          />
        ))}
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No candidates found matching your criteria.
        </div>
      )}

      {/* Candidate Modal */}
      {activeCandidate && (
        <CandidateModal
          candidate={activeCandidate}
          positions={positions}
          onClose={() => setActiveCandidate(null)}
          onAssignPosition={handleAssignPosition}
        />
      )}

      {/* Compare Modal */}
      {showCompare && selectedCandidates.length >= 2 && (
        <CompareModal
          candidates={[selectedCandidates[0], selectedCandidates[1]]}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
