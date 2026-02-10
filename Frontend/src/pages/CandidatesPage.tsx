import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Candidate, Position } from '../types';
import CandidateCard from '../components/CandidateCard';
import CandidateModal from '../components/CandidateModal';
import CompareModal from '../components/CompareModal';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function CandidatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [titleFilter, setTitleFilter] = useState<string>('');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Fetch data from API
  useEffect(() => {
    async function fetchData() {
      try {
        const [candidatesData, positionsData] = await Promise.all([
          api.getCandidates(),
          api.getPositions(),
        ]);
        setCandidates(candidatesData as Candidate[]);
        setPositions(positionsData as Position[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Get all unique skills for filter dropdown
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    candidates.forEach((c) => c.skills.forEach((s) => skills.add(s.name)));
    return Array.from(skills).sort();
  }, [candidates]);

  // Get all unique job titles from candidates' current experience
  const allTitles = useMemo(() => {
    const titles = new Set<string>();
    candidates.forEach((c) => {
      if (c.experience.length > 0) {
        titles.add(c.experience[0].title);
      }
    });
    return Array.from(titles).sort();
  }, [candidates]);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (titleFilter && (c.experience.length === 0 || c.experience[0].title !== titleFilter)) return false;
      if (skillFilter && !c.skills.some((s) => s.name === skillFilter)) return false;
      return true;
    });
  }, [candidates, searchTerm, titleFilter, skillFilter, statusFilter]);

  const MAX_SELECTIONS = 2 as const;

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const isAlreadySelected = prev.includes(id);
      if (isAlreadySelected) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= MAX_SELECTIONS) {
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const handleAssignPosition = useCallback(async (candidateId: string, positionId: string, assign: boolean) => {
    try {
      const updatedCandidate = assign
        ? await api.assignPosition(candidateId, positionId)
        : await api.unassignPosition(candidateId, positionId);

      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? (updatedCandidate as Candidate) : c))
      );

      // Sync activeCandidate with updated data
      setActiveCandidate((currentActive) => {
        if (currentActive?.id === candidateId) {
          return updatedCandidate as Candidate;
        }
        return currentActive;
      });
    } catch (err) {
      console.error('Failed to update position assignment:', err);
    }
  }, []);

  const handleDeleteCandidate = useCallback(async (id: string) => {
    try {
      await api.deleteCandidate(id);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setActiveCandidate(null);
    } catch (err) {
      console.error('Failed to delete candidate:', err);
    }
  }, []);

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => selectedIds.includes(c.id)),
    [candidates, selectedIds]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading candidates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with search and filters */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 bg-clip-text text-transparent">
              Candidates
            </h2>
            <p className="text-sm text-gray-500 mt-1">Find and compare your best talent</p>
          </div>
          {selectedIds.length === MAX_SELECTIONS && (
            <button
              onClick={() => setShowCompare(true)}
              className="btn-primary px-6 py-3 text-white rounded-xl text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare Selected
              </span>
            </button>
          )}
          {selectedIds.length === 1 && (
            <span className="text-sm text-purple-600 bg-purple-50 px-4 py-2 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Select one more to compare
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              className="px-4 py-3 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:border-purple-400 min-w-[180px]"
            >
              <option value="">All Professional Types</option>
              {allTitles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="px-4 py-3 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:border-purple-400 min-w-[140px]"
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
              className="px-4 py-3 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:border-purple-400 min-w-[130px]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="hired">Hired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCandidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            selected={selectedIds.includes(candidate.id)}
            disabled={selectedIds.length >= MAX_SELECTIONS}
            onSelect={handleSelect}
            onClick={() => setActiveCandidate(candidate)}
            positionsCount={candidate.positionIds.length}
          />
        ))}
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Candidate Modal */}
      {activeCandidate && (
        <CandidateModal
          candidate={activeCandidate}
          positions={positions}
          onClose={() => setActiveCandidate(null)}
          onAssignPosition={handleAssignPosition}
          onDelete={isAdmin ? handleDeleteCandidate : undefined}
        />
      )}

      {/* Compare Modal */}
      {showCompare && selectedCandidates.length >= MAX_SELECTIONS && (
        <CompareModal
          candidates={[selectedCandidates[0], selectedCandidates[1]]}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
