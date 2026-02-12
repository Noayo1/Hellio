import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChatWidget from './ChatWidget';

function Logo() {
  return (
    <div className="relative group">
      <svg viewBox="0 0 40 40" className="w-11 h-11 transition-transform duration-300 group-hover:scale-110">
        <defs>
          <linearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#7E22CE" />
          </linearGradient>
          <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E9D5FF" />
            <stop offset="100%" stopColor="#D8B4FE" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="14" cy="12" r="6" fill="url(#logoGrad1)" filter="url(#glow)" className="origin-center transition-all duration-300 group-hover:scale-110" />
        <circle cx="26" cy="12" r="6" fill="url(#logoGrad2)" className="origin-center transition-all duration-300 group-hover:scale-110" />
        <ellipse cx="14" cy="30" rx="8" ry="6" fill="url(#logoGrad1)" filter="url(#glow)" className="origin-center transition-all duration-300 group-hover:scale-105" />
        <ellipse cx="26" cy="30" rx="8" ry="6" fill="url(#logoGrad2)" className="origin-center transition-all duration-300 group-hover:scale-105" />
      </svg>
      <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen gradient-mesh relative">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-12">
              <Link to="/" className="flex items-center gap-4 group">
                <Logo />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 bg-clip-text text-transparent">
                    Hellio HR
                  </h1>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-purple-500/70 font-medium">
                    Talent Platform
                  </p>
                </div>
              </Link>
              <nav className="flex gap-2">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `nav-link px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
                    }`
                  }
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </span>
                </NavLink>
                <NavLink
                  to="/candidates"
                  className={({ isActive }) =>
                    `nav-link px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
                    }`
                  }
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Candidates
                  </span>
                </NavLink>
                <NavLink
                  to="/positions"
                  className={({ isActive }) =>
                    `nav-link px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
                    }`
                  }
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Positions
                  </span>
                </NavLink>
                <NavLink
                  to="/upload"
                  className={({ isActive }) =>
                    `nav-link px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
                    }`
                  }
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload
                  </span>
                </NavLink>
                </nav>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50/50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10 relative z-10">
        <Outlet />
      </main>

      <ChatWidget />
    </div>
  );
}
