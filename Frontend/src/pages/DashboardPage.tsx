import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Candidate, Position } from '../types';

interface DashboardStats {
  totalCandidates: number;
  activeCandidates: number;
  hiredCandidates: number;
  totalPositions: number;
  openPositions: number;
  closedPositions: number;
  onHoldPositions: number;
  recentCandidates: Candidate[];
  recentPositions: Position[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [candidates, positions] = await Promise.all([
          api.getCandidates() as Promise<Candidate[]>,
          api.getPositions() as Promise<Position[]>,
        ]);

        setStats({
          totalCandidates: candidates.length,
          activeCandidates: candidates.filter(c => c.status === 'active').length,
          hiredCandidates: candidates.filter(c => c.status === 'hired').length,
          totalPositions: positions.length,
          openPositions: positions.filter(p => p.status === 'open').length,
          closedPositions: positions.filter(p => p.status === 'closed').length,
          onHoldPositions: positions.filter(p => p.status === 'on_hold').length,
          recentCandidates: candidates.slice(0, 5),
          recentPositions: positions.slice(0, 5),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading dashboard...</div>
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

  if (!stats) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Overview of your recruitment pipeline
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Total Candidates */}
        <Link
          to="/candidates"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500">Candidates</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCandidates}</p>
          <div className="mt-2 flex gap-3 text-xs">
            <span className="text-green-600">{stats.activeCandidates} active</span>
            <span className="text-purple-600">{stats.hiredCandidates} hired</span>
          </div>
        </Link>

        {/* Open Positions */}
        <Link
          to="/positions?status=open"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500">Open Positions</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.openPositions}</p>
          <div className="mt-2 text-xs text-gray-500">
            of {stats.totalPositions} total
          </div>
        </Link>

        {/* Closed Positions */}
        <Link
          to="/positions?status=closed"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500">Closed</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.closedPositions}</p>
          <div className="mt-2 text-xs text-gray-500">
            positions filled
          </div>
        </Link>

        {/* On Hold */}
        <Link
          to="/positions?status=on_hold"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500">On Hold</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.onHoldPositions}</p>
          <div className="mt-2 text-xs text-gray-500">
            paused hiring
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Candidates */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Candidates</h2>
            <Link
              to="/candidates"
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              View all →
            </Link>
          </div>
          {stats.recentCandidates.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No candidates yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                      {candidate.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{candidate.name}</p>
                      <p className="text-xs text-gray-500">{candidate.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    candidate.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : candidate.status === 'hired'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {candidate.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Positions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Positions</h2>
            <Link
              to="/positions"
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              View all →
            </Link>
          </div>
          {stats.recentPositions.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No positions yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentPositions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{position.title}</p>
                    <p className="text-xs text-gray-500">{position.company}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    position.status === 'open'
                      ? 'bg-emerald-100 text-emerald-700'
                      : position.status === 'closed'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {position.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Documents
          </Link>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Ask Questions
          </Link>
          <Link
            to="/candidates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Candidates
          </Link>
        </div>
      </div>
    </div>
  );
}
