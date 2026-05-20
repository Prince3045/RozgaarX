import React, { useState, useEffect, useContext } from 'react';
import { UserCircle2, Wallet, Star, MapPin, Check, X, Clock, Settings, ArrowRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import webSocketService from '../api/webSocketService';
import api from '../api/axiosConfig';

import { useNavigate } from 'react-router-dom';

const WorkerDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    // Fetch worker profile to get current availability
    // Fetch worker profile to get current availability and details
    const fetchProfile = async () => {
      try {
        const res = await api.get('/workers/profile');
        setProfile(res.data);
        setIsOnline(res.data.isActive || false);
        
        // Fetch average rating
        const ratingRes = await api.get(`/api/reviews/worker/${res.data.user.id}/average`);
        setAverageRating(ratingRes.data);
        
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        if (err.response && err.response.status === 404) {
           navigate('/register-worker');
        } else {
           setIsLoading(false);
        }
      }
    };
    fetchProfile();

    // Subscribe to job requests
    const subscription = webSocketService.subscribe(`/queue/worker/${user?.id}`, (message) => {
      const job = JSON.parse(message.body);
      
      if (job.status === 'TAKEN') {
        setRequests(prev => prev.filter(r => r.id !== job.id));
      } else {
        setRequests(prev => {
          // Prevent duplicates
          if (prev.find(r => r.id === job.id)) return prev;
          return [...prev, {
            id: job.id,
            customer: job.customer.name,
            service: job.description,
            location: job.location,
            time: 'Just now',
            price: job.price ? `₹${job.price} Offered` : 'Price Negotiable'
          }];
        });
      }
    });

    return () => {
      if (subscription) webSocketService.unsubscribe(`/queue/worker/${user?.id}`);
    };
  }, [user]);

  const toggleOnline = async () => {
    try {
      await api.put('/workers/availability', { isActive: !isOnline });
      setIsOnline(!isOnline);
    } catch (err) {
      console.error('Failed to update availability:', err);
    }
  };

  const handleAccept = (req) => {
    webSocketService.acceptJob(req.id, user.id);
    setRequests(requests.filter(r => r.id !== req.id));
    setActiveJobs([...activeJobs, {
      id: req.id,
      customer: req.customer,
      service: req.service,
      status: 'Accepted',
      address: req.location,
      price: req.price
    }]);
  };

  const handleReject = (reqId) => {
    webSocketService.declineJob(reqId, user.id);
    setRequests(requests.filter(r => r.id !== reqId));
  };

  const advanceJobStatus = (jobId, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === 'Accepted') nextStatus = 'In Progress';
    else if (currentStatus === 'In Progress') nextStatus = 'Completed';
    else return;

    setActiveJobs(activeJobs.map(job => 
      job.id === jobId ? { ...job, status: nextStatus } : job
    ).filter(job => job.status !== 'Completed'));
    
    // In a real app, if Completed, it goes to history and updates earnings
  };

  if (isLoading) {
    return <div className="flex-grow flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>;
  }

  if (profile && profile.verificationStatus === 'PENDING') {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
           <div className="flex items-center justify-center h-20 w-20 rounded-full bg-yellow-50 text-yellow-500 mx-auto">
             <Settings className="h-10 w-10 animate-spin-slow" />
           </div>
           <h2 className="text-2xl font-extrabold text-gray-900">Account Under Review</h2>
           <p className="text-gray-500">
             Your application is currently being reviewed by our administrative team. Please wait a maximum of 2-4 days for approval. You will gain access to your dashboard once approved.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex-grow py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Profile & Earnings Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <UserCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 capitalize">{user?.name || 'Worker'}</h1>
                <p className="text-sm text-gray-500 capitalize">{profile?.skill ? `${profile.skill} Professional` : 'Service Professional'} • <span className="text-yellow-500 font-medium whitespace-nowrap"><Star className="inline w-3 h-3 mb-0.5" /> {averageRating > 0 ? averageRating : 'New'} Rating</span></p>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-primary-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-700">{isOnline ? 'Online - Receiving Jobs' : 'Offline'}</span>
              <button 
                onClick={toggleOnline}
                className={`ml-2 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${isOnline ? 'bg-primary-500' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${isOnline ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-md p-6 text-white flex flex-col justify-center">
             <div className="flex justify-between items-center mb-2">
               <span className="text-gray-300 text-sm font-medium uppercase tracking-wider">Today's Earnings</span>
               <Wallet className="w-5 h-5 text-gray-300" />
             </div>
             <div className="text-3xl font-extrabold">₹1,250</div>
             <p className="text-sm text-primary-400 mt-2 font-medium">+15% from yesterday</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Section: Incoming Requests */}
           <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                 Incoming Requests 
                 {requests.length > 0 && <span className="ml-2 bg-primary-100 text-primary-800 py-0.5 px-2.5 rounded-full text-xs font-semibold">{requests.length} new</span>}
              </h2>
              {requests.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                   <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                   <p>No new requests at the moment.</p>
                   {!isOnline && <p className="text-sm mt-2 text-primary-600">Go online to receive jobs.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(req => (
                    <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                             <h3 className="font-bold text-gray-900 text-lg">{req.service}</h3>
                             <p className="text-sm text-gray-500 font-medium">{req.customer}</p>
                           </div>
                           <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">{req.time}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4 mr-1.5 text-gray-400" /> {req.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-6">
                          <Wallet className="w-4 h-4 mr-1.5 text-gray-400" /> {req.price}
                        </div>
                        
                        <div className="flex space-x-3">
                           <button onClick={() => handleReject(req.id)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                             Decline
                           </button>
                           <button onClick={() => handleAccept(req)} className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors">
                             Accept Job
                           </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>

           {/* Section: Active Jobs */}
           <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Active & Ongoing Jobs</h2>
              {activeJobs.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                   <Settings className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                   <p>You don't have any active jobs right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map(job => (
                    <div key={job.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                       <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                             job.status === 'Accepted' ? 'bg-blue-100 text-blue-800' : 
                             job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                          }`}>
                            {job.status}
                          </span>
                          <span className="text-sm font-medium text-gray-500">ID: #{job.id}</span>
                       </div>
                       <div className="p-5">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{job.service}</h3>
                          <p className="text-sm text-gray-600 mb-4"><span className="font-medium text-gray-900">Customer:</span> {job.customer}</p>
                          <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg mb-2">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" /> <span className="truncate">{job.address}</span>
                          </div>
                          <div className="flex items-center font-bold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg mb-5">
                            <Wallet className="w-4 h-4 mr-2 text-gray-400 shrink-0" /> <span className="truncate">{job.price}</span>
                          </div>
                          
                          <button 
                             onClick={() => advanceJobStatus(job.id, job.status)}
                             className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                             {job.status === 'Accepted' && 'Mark as In Progress'}
                             {job.status === 'In Progress' && 'Mark as Completed'}
                             <ArrowRight className="ml-2 w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default WorkerDashboard;
