import { NavLink, Outlet } from 'react-router-dom';

function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10">
      <circle cx="14" cy="12" r="6" fill="#A855F7" />
      <circle cx="26" cy="12" r="6" fill="#E9D5FF" />
      <ellipse cx="14" cy="30" rx="8" ry="6" fill="#A855F7" />
      <ellipse cx="26" cy="30" rx="8" ry="6" fill="#E9D5FF" />
    </svg>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-purple-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <Logo />
                <h1 className="text-xl font-bold text-gray-900">Hellio HR</h1>
              </div>
              <nav className="flex gap-1">
                <NavLink
                  to="/candidates"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                    }`
                  }
                >
                  Candidates
                </NavLink>
                <NavLink
                  to="/positions"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                    }`
                  }
                >
                  Positions
                </NavLink>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <Outlet />
      </main>
    </div>
  );
}
