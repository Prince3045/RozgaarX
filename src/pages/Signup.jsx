import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Wrench, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

const Signup = () => {
  const { user, loading: authLoading, login } = useContext(AuthContext);
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER' or 'WORKER'
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.role === 'ROLE_ADMIN') {
        navigate('/admin-dashboard', { replace: true });
      } else if (user.role === 'ROLE_CUSTOMER') {
        navigate('/customer-dashboard', { replace: true });
      } else {
        navigate('/worker-dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  const handleSendOtp = async () => {
    if (!email || email.trim() === '' || !email.includes('@')) {
      alert('Please enter a valid email address first.');
      return;
    }
    setOtpLoading(true);
    try {
      await api.post('/auth/otp/send', { recipient: email });
      setOtpSent(true);
      alert('OTP sent successfully! Please check your email inbox or backend console logs.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send OTP. Make sure backend server is running.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      alert('Please enter a valid 6-digit OTP code.');
      return;
    }
    setOtpLoading(true);
    try {
      await api.post('/auth/otp/verify', { recipient: email, code: otpCode });
      setOtpVerified(true);
      alert('Email verified successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      alert('Please verify your email address with OTP first.');
      return;
    }
    
    setLoading(true);
    const payload = {
      name: e.target.name.value,
      phone: phone,
      email: email,
      password: e.target.password.value,
      role: role
    };

    try {
      await api.post('/auth/register', payload);
      
      if (role === 'WORKER') {
         // Auto-login to drop them immediately into the registration flow
         const loginRes = await api.post('/auth/login', { username: payload.phone || payload.email, password: payload.password });
         login(loginRes.data);
         navigate('/register-worker', { replace: true });
      } else {
         alert('Registered successfully!');
         navigate('/login');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
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
            Create an account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Join Rozgaarx today
          </p>
        </div>
        
        <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl transition-colors">
          <button
            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${role === 'CUSTOMER' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setRole('CUSTOMER')}
          >
            Customer
          </button>
          <button
            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${role === 'WORKER' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setRole('WORKER')}
          >
            Worker
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4">
             <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <input id="name" name="name" type="text" required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Enter your full name" />
            </div>
            
            {/* Email Address with OTP Verification */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <div className="mt-1 flex space-x-2">
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required
                  disabled={otpSent}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                  placeholder="Enter email address" 
                />
                {!otpVerified && (
                  <button
                    type="button"
                    disabled={otpLoading || !email}
                    onClick={handleSendOtp}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-all shrink-0 flex items-center justify-center min-w-[90px]"
                  >
                    {otpLoading ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                )}
                {otpVerified && (
                  <span className="flex items-center space-x-1 px-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium border border-green-200 dark:border-green-900/30">
                    <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            </div>
            
            {/* OTP Code Input */}
            {otpSent && !otpVerified && (
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-150 dark:border-gray-700 space-y-3 transition-all duration-300">
                <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Enter 6-Digit OTP</label>
                <div className="flex space-x-2">
                  <input 
                    id="otpCode" 
                    name="otpCode" 
                    type="text" 
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm text-center tracking-widest font-semibold"
                    placeholder="123456" 
                  />
                  <button
                    type="button"
                    disabled={otpLoading || otpCode.length !== 6}
                    onClick={handleVerifyOtp}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all shrink-0"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Check your email inbox or backend console log for the generated OTP code!
                </p>
              </div>
            )}

            {/* Mobile Number - Standard Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number (with +91)</label>
              <input 
                id="phone" 
                name="phone" 
                type="text" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="+91 98765 43210" 
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="mt-1 relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} required
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors pr-10"
                  placeholder="Create a strong password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading || !otpVerified}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white dark:text-gray-900 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-white transition-colors items-center"
            >
              {loading ? 'Processing...' : role === 'WORKER' ? 'Register as Worker' : 'Create Account'}
              {!loading && role === 'WORKER' && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
           <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
           <Link to="/login" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
