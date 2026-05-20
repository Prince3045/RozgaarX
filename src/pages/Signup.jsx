import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Wrench, ArrowRight } from 'lucide-react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

const Signup = () => {
  const { login } = useContext(AuthContext);
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER' or 'WORKER'
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    
    const payload = {
      name: e.target.name.value,
      phone: e.target.phone.value,
      email: e.target.email.value,
      password: e.target.password.value,
      role: role
    };

    try {
      await api.post('/auth/register', payload);
      
      if (role === 'WORKER') {
         // Auto-login to drop them immediately into the registration flow
         const loginRes = await api.post('/auth/login', { username: payload.phone || payload.email, password: payload.password });
         login(loginRes.data);
         navigate('/register-worker');
      } else {
         alert('Registered successfully!');
         navigate('/login');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
        <div>
           <div className="flex justify-center">
             <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-50">
               <Wrench className="h-8 w-8 text-primary-500" />
             </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create an account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join Rozgaarx today
          </p>
        </div>
        
        <div className="flex p-1 space-x-1 bg-gray-100 rounded-xl">
          <button
            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${role === 'CUSTOMER' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setRole('CUSTOMER')}
          >
            Customer
          </button>
          <button
            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${role === 'WORKER' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setRole('WORKER')}
          >
            Worker
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
             <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input id="name" name="name" type="text" required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Enter your full name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input id="email" name="email" type="email" required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Enter email address" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Mobile Number (with +91)</label>
              <input id="phone" name="phone" type="text" required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="+91 00000 00000" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} required
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors pr-10"
                  placeholder="Create a strong password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button type="submit" className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors items-center">
              {role === 'WORKER' ? 'Register as Worker' : 'Create Account'}
              {role === 'WORKER' && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          </div>
        </form>


        <div className="mt-6 text-center text-sm">
           <span className="text-gray-600">Already have an account? </span>
           <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
