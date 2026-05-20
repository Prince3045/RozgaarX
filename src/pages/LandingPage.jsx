import React, { useContext, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Clock, Star, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'ROLE_CUSTOMER') {
        navigate('/customer-dashboard');
      } else {
        navigate('/worker-dashboard');
      }
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col flex-grow">
      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-20">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Smart work.</span>{' '}
                  <span className="block text-primary-500 xl:inline">Stable income.</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Rozgaarx connects reliable informal workers with customers looking for quality service. Fast, secure, and professional.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <button onClick={() => navigate('/customer-dashboard')} className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 md:py-4 md:text-lg md:px-10 transition-colors">
                      Find a Worker
                    </button>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <button onClick={() => navigate('/signup')} className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-gray-900 bg-primary-100 hover:bg-primary-200 md:py-4 md:text-lg md:px-10 transition-colors">
                      Join as Worker
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full bg-gray-100 flex items-center justify-center relative overflow-hidden">
            {/* Visual aesthetic instead of image dependency */}
             <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-brandblue-500/20 mix-blend-multiply"></div>
             <div className="grid grid-cols-2 gap-4 p-8 w-full max-w-lg transform rotate-3 scale-105">
                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-2 transform -translate-y-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mb-2"><Wrench className="w-5 h-5 text-primary-600" /></div>
                  <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                  <div className="h-2 w-3/4 bg-gray-100 rounded"></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-2 translate-y-8">
                  <div className="w-10 h-10 rounded-full bg-brandblue-100 flex items-center justify-center mb-2"><Star className="w-5 h-5 text-brandblue-600" /></div>
                  <div className="h-2 w-2/3 bg-gray-200 rounded"></div>
                  <div className="h-2 w-full bg-gray-100 rounded"></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-2">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mb-2"><ShieldCheck className="w-5 h-5 text-yellow-600" /></div>
                  <div className="h-2 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-2 w-1/2 bg-gray-100 rounded"></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-2 transform translate-y-12">
                   <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2"><Clock className="w-5 h-5 text-purple-600" /></div>
                   <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                   <div className="h-2 w-2/3 bg-gray-100 rounded"></div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">How it works</h2>
            <p className="mt-4 text-lg text-gray-500">Getting a professional at your doorstep is as easy as 1-2-3</p>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white shadow-md text-primary-500 mb-6 border border-gray-100 transform transition-transform hover:scale-110">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1. Request Service</h3>
              <p className="text-gray-500">Enter your location and select the service you need right now.</p>
            </div>
            <div className="flex flex-col items-center text-center relative">
              <div className="hidden md:block absolute top-8 left-0 -ml-[50%] w-full border-t-2 border-dashed border-gray-300 z-0"></div>
              <div className="relative z-10 flex items-center justify-center h-16 w-16 rounded-full bg-white shadow-md text-primary-500 mb-6 border border-gray-100 transform transition-transform hover:scale-110">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">2. Get Matched</h3>
              <p className="text-gray-500">We notify nearby verified professionals and connect you instantly.</p>
            </div>
             <div className="flex flex-col items-center text-center relative">
              <div className="hidden md:block absolute top-8 left-0 -ml-[50%] w-full border-t-2 border-dashed border-gray-300 z-0"></div>
              <div className="relative z-10 flex items-center justify-center h-16 w-16 rounded-full bg-white shadow-md text-primary-500 mb-6 border border-gray-100 transform transition-transform hover:scale-110">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. Job Done</h3>
              <p className="text-gray-500">Service is delivered securely. Pay the professional and rate your experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Why choose Rozgaarx?</h2>
              <p className="mt-4 text-lg text-gray-500">
                We're committed to bringing trust, transparency, and high quality to the informal workforce sector.
              </p>
              <dl className="mt-10 space-y-8">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-50 text-primary-600">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <dt className="text-lg leading-6 font-medium text-gray-900">Verified Professionals</dt>
                    <dd className="mt-2 text-base text-gray-500">Every worker undergoes a strict identity and background check to ensure your safety.</dd>
                  </div>
                </div>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-50 text-brandblue-600">
                      <Star className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <dt className="text-lg leading-6 font-medium text-gray-900">Transparent Ratings</dt>
                    <dd className="mt-2 text-base text-gray-500">Honest reviews from your neighborhood help you pick the best worker for your job.</dd>
                  </div>
                </div>
              </dl>
            </div>
            <div className="mt-10 lg:mt-0">
               <div className="bg-gray-50 rounded-2xl p-8 relative overflow-hidden border border-gray-100 shadow-sm">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary-100 opacity-50"></div>
                  <h3 className="text-xl font-bold text-gray-900 relative z-10 mb-6">Are you a skilled worker?</h3>
                  <p className="text-gray-600 mb-8 relative z-10">Join our platform to get stable job opportunities, manage your bookings easily, and earn up to 40% more.</p>
                  <button onClick={() => navigate('/signup')} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gray-900 hover:bg-gray-800 transition-colors relative z-10">
                    Apply as Worker <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Need this temporary import hack to make the hero visual work since Wrench is not imported at top
function Wrench(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
}

export default LandingPage;
