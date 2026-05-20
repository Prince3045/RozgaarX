import React, { useState, useContext } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Wrench, Menu, X, UserCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Layout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
              <Wrench className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-2xl font-bold text-gray-900 tracking-tight">Rozgaar<span className="text-primary-500">x</span></span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden sm:flex sm:items-center sm:space-x-8">
              {(!user || user.role === 'ROLE_CUSTOMER' || user.role === 'ROLE_WORKER') && (
                <Link to="/customer-dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors">Find Services</Link>
              )}
              {user && user.role === 'ROLE_ADMIN' && (
                <Link to="/admin-dashboard" className="text-red-600 hover:text-red-800 px-3 py-2 text-sm font-bold transition-colors">Admin Portal</Link>
              )}
              {user ? (
                <>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <UserCircle className="w-5 h-5 text-primary-500" />
                    <span className="font-semibold">{user.name}</span>
                  </div>
                  <button onClick={() => { logout(); navigate('/'); }} className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors">Log out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors">Log in</Link>
                  <Link to="/signup" className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-full text-sm font-medium transition-colors">Sign up</Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="sm:hidden absolute w-full bg-white border-b border-gray-100 shadow-md">
            <div className="pt-2 pb-3 space-y-1">
              {user && user.role === 'ROLE_ADMIN' ? (
                 <Link to="/admin-dashboard" onClick={() => setIsMenuOpen(false)} className="block pl-3 pr-4 py-2 text-base font-bold text-red-600 hover:bg-red-50">Admin Portal</Link>
              ) : (
                 <Link to="/customer-dashboard" onClick={() => setIsMenuOpen(false)} className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Find Services</Link>
              )}
              {user ? (
                <>
                  <div className="block pl-3 pr-4 py-2 text-base font-medium text-primary-600">Hi, {user.name}</div>
                  <button onClick={() => { logout(); setIsMenuOpen(false); navigate('/'); }} className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-red-600 hover:bg-gray-50">Log out</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Log in</Link>
                  <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="block pl-3 pr-4 py-2 text-base font-medium text-primary-600 hover:text-primary-800 hover:bg-gray-50">Sign up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow flex flex-col">
        <Outlet />
      </main>

      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center">
                <Wrench className="h-6 w-6 text-primary-500" />
                <span className="ml-2 text-xl font-bold text-white">Rozgaar<span className="text-primary-500">x</span></span>
              </div>
              <p className="mt-4 text-gray-400 text-sm">
                Smart work. Stable income. Connecting skilled workers with reliable opportunities in your neighborhood.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Company</h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-base text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-base text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-gray-400 hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-base text-gray-400 hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-700 pt-8 flex justify-between items-center">
            <p className="text-base text-gray-400">&copy; 2026 Rozgaarx Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
