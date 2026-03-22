/**
 * Examify Layout Component
 * Persistent sidebar + topbar shell for all pages.
 */

import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, BookOpen, Clock, Moon, Sun, GraduationCap
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/upload', icon: Upload, label: 'Upload Slides' },
  { to: '/history', icon: Clock, label: 'Score History' },
];

export default function Layout() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/upload') return 'Upload Lecture Slides';
    if (location.pathname.startsWith('/questions/')) return 'Question Bank';
    if (location.pathname.startsWith('/quiz/')) return 'Quiz Mode';
    if (location.pathname.startsWith('/results/')) return 'Results';
    if (location.pathname === '/history') return 'Score History';
    return 'Examify';
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="flex items-center gap-2">
            <GraduationCap size={22} color="var(--accent-gold)" />
            <div>
              <div className="sidebar-logo-text">Examify</div>
              <div className="sidebar-logo-tagline">Smart Exam Prep</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-link w-full"
            onClick={toggleTheme}
            style={{ justifyContent: 'flex-start' }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <BookOpen size={18} color="var(--text-muted)" />
            <span className="topbar-title">{getPageTitle()}</span>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-icon btn-ghost" onClick={toggleTheme} title="Toggle theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
