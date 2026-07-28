import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Wrench } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';

const Login = () => {
  const { user, loading, login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (user.role === 'ROLE_ADMIN') {
        navigate('/admin-dashboard', { replace: true });
      } else if (user.role === 'ROLE_CUSTOMER') {
        navigate('/customer-dashboard', { replace: true });
      } else {
        navigate('/worker-dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        username: e.target.identifier.value,
        password: e.target.password.value
      };
      const res = await api.post('/auth/login', payload);
      login(res.data);
      if (res.data.role === 'ROLE_ADMIN') {
        navigate('/admin-dashboard', { replace: true });
      } else if (res.data.role === 'ROLE_CUSTOMER') {
        navigate('/customer-dashboard', { replace: true });
      } else {
        navigate('/worker-dashboard', { replace: true });
      }
    } catch (err) {
      alert('Login failed. Please check credentials.');
    }
  };
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 transition-colors">
        <div>
           <div className="flex justify-center">
             <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-50 dark:bg-primary-950/30">
               <Wrench className="h-8 w-8 text-primary-500" />
             </div>
           </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Please enter your details to sign in
          </p>
        </div>
        
        {/* Role Toggle removed, backend handles role check */}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email or Mobile Number</label>
              <input id="identifier" name="identifier" type="text" required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Enter email or mobile" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="mt-1 relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} required
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors pr-10"
                  placeholder="Enter password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 rounded cursor-pointer bg-white dark:bg-gray-800" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer">Remember me</label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors">Forgot your password?</a>
            </div>
          </div>

          <div>
            <button type="submit" className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white dark:text-gray-900 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-white transition-colors">
              Sign in
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
           <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
           <Link to="/signup" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors">Sign up here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
