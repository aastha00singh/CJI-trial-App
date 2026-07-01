import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, BarChart3, PlusCircle } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Link to="/" className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
          Crack Job Interviews
        </Link>
      </div>

      <div className="flex items-center space-x-6">
        <Link
          to="/"
          className="flex items-center space-x-1.5 text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/setup"
          className="flex items-center space-x-1.5 text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Session</span>
        </Link>

        <div className="h-4 w-px bg-slate-800"></div>

        <div className="flex items-center space-x-3 text-slate-300">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-sm font-semibold max-w-[120px] truncate">{user.name}</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 text-sm font-medium text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
