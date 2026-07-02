import React, { useState, useEffect, useContext, useRef } from 'react';
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingPriceJobId, setEditingPriceJobId] = useState(null);
  const [newPrice, setNewPrice] = useState('');

  const simulationIntervals = useRef({});

  const getCityCoordinates = (addressString) => {
    const addr = (addressString || '').toLowerCase();
    if (addr.includes('varanasi') || addr.includes('banaras')) return { lat: 25.3176, lng: 82.9739 };
    if (addr.includes('delhi')) return { lat: 28.6139, lng: 77.2090 };
    if (addr.includes('noida')) return { lat: 28.5355, lng: 77.3910 };
    if (addr.includes('mumbai') || addr.includes('bandra')) return { lat: 19.0596, lng: 72.8295 };
    if (addr.includes('bhopal')) return { lat: 23.2599, lng: 77.4126 };
    if (addr.includes('jaipur')) return { lat: 26.9124, lng: 75.7873 };
    if (addr.includes('gurgaon') || addr.includes('gurugram')) return { lat: 28.4595, lng: 77.0266 };
    if (addr.includes('bangalore') || addr.includes('bengaluru')) return { lat: 12.9716, lng: 77.5946 };
    
    // Default fallback (Varanasi center point)
    return { lat: 25.3176, lng: 82.9739 };
  };

  const simulateMovement = (jobId, address) => {
    if (simulationIntervals.current[jobId]) return;

    const cityCoords = getCityCoordinates(address);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Simulator starts exactly where the worker's laptop physically is!
          console.log("[GPS] Simulator starting at worker's actual browser GPS:", latitude, longitude);
          startSimulation(jobId, latitude, longitude);
        },
        (error) => {
          console.warn("[GPS] Geolocation blocked/failed, falling back to job city:", cityCoords, error);
          startSimulation(jobId, cityCoords.lat, cityCoords.lng);
        }
      );
    } else {
      startSimulation(jobId, cityCoords.lat, cityCoords.lng);
    }
  };

  const startSimulation = (jobId, baseLat, baseLng) => {
    if (simulationIntervals.current[jobId]) return;

    // Start offset slightly (about 300-500 meters away)
    let currentLat = baseLat + (Math.random() - 0.5) * 0.005;
    let currentLng = baseLng + (Math.random() - 0.5) * 0.005;
    
    const destLat = baseLat;
    const destLng = baseLng;

    const steps = 15;
    let stepCount = 0;

    const intervalId = setInterval(() => {
      if (stepCount >= steps) {
        clearInterval(intervalId);
        delete simulationIntervals.current[jobId];
        return;
      }

      currentLat += (destLat - currentLat) / (steps - stepCount);
      currentLng += (destLng - currentLng) / (steps - stepCount);
      stepCount++;

      // Send simulated position over WebSocket
      webSocketService.send('/app/job/location', {
        jobId,
        lat: currentLat,
        lng: currentLng
      });
      console.log(`[Simulator] Job ${jobId} location sent: ${currentLat}, ${currentLng}`);
    }, 4000);

    simulationIntervals.current[jobId] = intervalId;
  };

  useEffect(() => {
    let watchId = null;
    const ongoingJob = activeJobs.find(j => {
      const status = (j.status || '').toLowerCase();
      return status === 'accepted' || status === 'in progress' || status === 'in_progress';
    });

    if (ongoingJob) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            webSocketService.send('/app/job/location', {
              jobId: ongoingJob.id,
              lat: latitude,
              lng: longitude
            });
            console.log(`[GPS] Job ${ongoingJob.id} location sent: ${latitude}, ${longitude}`);
          },
          (error) => {
            console.warn("GPS access denied or timed out, running simulator fallback.", error);
            simulateMovement(ongoingJob.id, ongoingJob.address);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
      } else {
        simulateMovement(ongoingJob.id, ongoingJob.address);
      }
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      // Clean up simulated movement if job is done
      activeJobs.forEach(job => {
        const status = (job.status || '').toLowerCase();
        if (status === 'completed' || !activeJobs.find(j => j.id === job.id)) {
          if (simulationIntervals.current[job.id]) {
            clearInterval(simulationIntervals.current[job.id]);
            delete simulationIntervals.current[job.id];
          }
        }
      });
    };
  }, [activeJobs]);

  useEffect(() => {
    return () => {
      // Clear all active simulations on unmount
      Object.keys(simulationIntervals.current).forEach(id => {
        clearInterval(simulationIntervals.current[id]);
      });
    };
  }, []);

  useEffect(() => {
    // Fetch worker profile to get current availability
    // Fetch worker profile to get current availability and details
    const fetchProfile = async () => {
      try {
        const res = await api.get('/workers/profile');
        setProfile(res.data);
        setIsOnline(res.data.isActive || false);
        
        // Fetch average rating
        const ratingRes = await api.get(`/reviews/worker/${res.data.user.id}/average`);
        setAverageRating(ratingRes.data);

        // Fetch active jobs for worker to persist across refresh
        try {
          const activeJobsRes = await api.get('/jobs/worker');
          const mappedActiveJobs = activeJobsRes.data
            .filter(job => job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS')
            .map(job => ({
              id: job.id,
              customer: job.customer.name,
              service: job.description,
              status: job.status === 'ACCEPTED' ? 'Accepted' : 'In Progress',
              address: job.location,
              price: job.price ? `₹${job.price}` : 'Price Negotiable',
              rawPrice: job.price,
              proposedPrice: job.proposedPrice,
              paymentStatus: job.paymentStatus
            }));
          setActiveJobs(mappedActiveJobs);
        } catch (jobErr) {
          console.error("Failed to load worker jobs:", jobErr);
        }

        // Fetch pending requests for worker to persist across refresh
        try {
          const pendingRes = await api.get('/jobs/pending');
          const mappedPending = pendingRes.data.map(job => ({
            id: job.id,
            customer: job.customer.name,
            service: job.description,
            location: job.location,
            time: 'Pending',
            price: job.price ? `₹${job.price} Offered` : 'Price Negotiable'
          }));
          setRequests(mappedPending);
        } catch (pendingErr) {
          console.error("Failed to load pending requests:", pendingErr);
        }
        
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
      
      if (job.status === 'RATING_UPDATED') {
        setAverageRating(job.averageRating);
      } else if (job.status === 'TAKEN' || job.status === 'CANCELLED') {
        const targetId = job.id || job.jobId;
        setRequests(prev => prev.filter(r => r.id !== targetId));
        if (job.status === 'CANCELLED') {
          setRefreshTrigger(prev => prev + 1);
        }
      } else if (job.status === 'PAYMENT_SUBMITTED' || job.status === 'PAYMENT_APPROVED' || job.status === 'PRICE_APPROVED' || job.status === 'PRICE_REJECTED') {
        setRefreshTrigger(prev => prev + 1);
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
  }, [user, refreshTrigger]);

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
      price: req.price,
      rawPrice: req.price ? parseInt(req.price.replace(/\D/g, '')) : null
    }]);
  };

  const handleReject = (reqId) => {
    webSocketService.declineJob(reqId, user.id);
    setRequests(requests.filter(r => r.id !== reqId));
  };

  const advanceJobStatus = async (jobId, currentStatus) => {
    let nextStatus = '';
    let dbStatus = '';
    if (currentStatus === 'Accepted') {
      nextStatus = 'In Progress';
      dbStatus = 'IN_PROGRESS';
    } else if (currentStatus === 'In Progress') {
      nextStatus = 'Completed';
      dbStatus = 'COMPLETED';
    } else return;

    try {
      // Put to backend to persist the status update in database
      await api.put(`/jobs/${jobId}/status`, { status: dbStatus });

      setActiveJobs(activeJobs.map(job => 
        job.id === jobId ? { ...job, status: nextStatus } : job
      ).filter(job => job.status !== 'Completed'));
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleUpdatePrice = async (jobId) => {
    if (!newPrice || isNaN(newPrice) || parseInt(newPrice) <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    try {
      const res = await api.put(`/jobs/${jobId}/price`, { price: parseInt(newPrice) });
      // Update state
      setActiveJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, proposedPrice: res.data.proposedPrice } : job
      ));
      setEditingPriceJobId(null);
      setNewPrice('');
      alert("Price proposal submitted for customer approval!");
    } catch (err) {
      alert("Failed to update price: " + (err.response?.data?.message || err.message));
    }
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
           <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Account Under Review</h2>
           <p className="text-gray-500 dark:text-gray-400">
             Your application is currently being reviewed by our administrative team. Please wait a maximum of 2-4 days for approval. You will gain access to your dashboard once approved.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 flex-grow py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Profile & Earnings Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-colors">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <UserCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{user?.name || 'Worker'}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{profile?.skill ? `${profile.skill} Professional` : 'Service Professional'} • <span className="text-yellow-500 font-medium whitespace-nowrap"><Star className="inline w-3 h-3 mb-0.5" /> {averageRating > 0 ? averageRating : 'New'} Rating</span></p>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center space-x-3 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 transition-colors">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-primary-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{isOnline ? 'Online - Receiving Jobs' : 'Offline'}</span>
              <button 
                onClick={toggleOnline}
                className={`ml-2 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${isOnline ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${isOnline ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-md p-6 text-white flex flex-col justify-center">
             <div className="flex justify-between items-center mb-2">
               <span className="text-gray-300 text-sm font-medium uppercase tracking-wider">Wallet Balance</span>
               <Wallet className="w-5 h-5 text-gray-300" />
             </div>
             <div className="text-3xl font-extrabold">₹{profile?.walletBalance !== null && profile?.walletBalance !== undefined ? profile.walletBalance.toLocaleString() : '0'}</div>
             <p className="text-sm text-primary-400 mt-2 font-medium">Platform Payout Balance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Section: Incoming Requests */}
           <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                 Incoming Requests 
                 {requests.length > 0 && <span className="ml-2 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-400 py-0.5 px-2.5 rounded-full text-xs font-semibold">{requests.length} new</span>}
              </h2>
              {requests.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400 transition-colors">
                   <Clock className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                   <p>No new requests at the moment.</p>
                   {!isOnline && <p className="text-sm mt-2 text-primary-600 dark:text-primary-400">Go online to receive jobs.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative transition-colors">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                             <h3 className="font-bold text-gray-900 dark:text-white text-lg">{req.service}</h3>
                             <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{req.customer}</p>
                           </div>
                           <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{req.time}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                           <MapPin className="w-4 h-4 mr-1.5 text-gray-400 dark:text-gray-500" /> {req.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-6">
                           <Wallet className="w-4 h-4 mr-1.5 text-gray-400 dark:text-gray-500" /> {req.price}
                        </div>
                        
                        <div className="flex space-x-3">
                           <button onClick={() => handleReject(req.id)} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                             Decline
                           </button>
                           <button onClick={() => handleAccept(req)} className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors">
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active & Ongoing Jobs</h2>
              {activeJobs.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400 transition-colors">
                   <Settings className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                   <p>You don't have any active jobs right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map(job => (
                    <div key={job.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center transition-colors">
                           <div className="flex items-center">
                             <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                job.status === 'Accepted' ? 'bg-blue-100 text-blue-800' : 
                                job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                             }`}>
                               {job.status}
                             </span>
                             {job.paymentStatus === 'SUBMITTED' && (
                               <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                                 Verifying Payment
                               </span>
                             )}
                           </div>
                           <span className="text-sm font-medium text-gray-500 dark:text-gray-400">ID: #{job.id}</span>
                        </div>
                        <div className="p-5">
                           <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{job.service}</h3>
                           <p className="text-sm text-gray-600 dark:text-gray-400 mb-4"><span className="font-medium text-gray-900 dark:text-white">Customer:</span> {job.customer}</p>
                           <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg mb-2 transition-colors">
                             <MapPin className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500 shrink-0" /> <span className="truncate">{job.address}</span>
                           </div>
                            {editingPriceJobId === job.id ? (
                              <div className="flex items-center space-x-2 mb-5">
                                <div className="relative rounded-lg shadow-sm flex-1">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">₹</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value.replace(/\D/g, ''))}
                                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-7 pr-3 py-2 sm:text-sm border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border"
                                    placeholder="Price"
                                  />
                                </div>
                                <button 
                                  onClick={() => handleUpdatePrice(job.id)} 
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => { setEditingPriceJobId(null); setNewPrice(''); }} 
                                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col mb-5">
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-850 px-3 py-2 rounded-lg transition-colors border border-gray-100 dark:border-gray-800">
                                  <div className="flex items-center font-bold text-gray-800 dark:text-white">
                                    <Wallet className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500 shrink-0" />
                                    <span>{job.price}</span>
                                  </div>
                                  {job.paymentStatus !== 'SUBMITTED' && (
                                    <button
                                      onClick={() => {
                                        setEditingPriceJobId(job.id);
                                        setNewPrice(job.proposedPrice || job.rawPrice || (job.price ? job.price.replace(/\D/g, '') : ''));
                                      }}
                                      className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                                    >
                                      {job.proposedPrice ? 'Change Proposal' : 'Edit Price'}
                                    </button>
                                  )}
                                </div>
                                {job.proposedPrice && (
                                  <div className="mt-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 px-3 py-2 rounded-lg text-left">
                                    ⏳ Proposed: ₹{job.proposedPrice} (Awaiting Approval)
                                  </div>
                                )}
                              </div>
                            )/* end price section */}
                           
                           {job.paymentStatus === 'SUBMITTED' ? (
                             <div className="w-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-xs font-semibold py-3 px-4 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center font-medium">
                               ⏳ Payment Submitted by Customer. Verification pending by Admin.
                             </div>
                           ) : (
                             <button 
                                onClick={() => advanceJobStatus(job.id, job.status)}
                                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                             >
                                {job.status === 'Accepted' && 'Mark as In Progress'}
                                {job.status === 'In Progress' && 'Mark as Completed'}
                                <ArrowRight className="ml-2 w-4 h-4" />
                             </button>
                           )}
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
