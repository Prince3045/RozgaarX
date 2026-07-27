import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ShieldCheck, Zap, Droplets, Hammer, Sparkles, FileText, CalendarClock, Navigation } from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import webSocketService from '../api/webSocketService';

const CustomerDashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ROLE_CUSTOMER') {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [bookingStatus, setBookingStatus] = useState(null); // null, 'searching', 'assigned'
  const [assignedWorkerDetails, setAssignedWorkerDetails] = useState(null);
  const [customerJobs, setCustomerJobs] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewJob, setReviewJob] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentJob, setPaymentJob] = useState(null);
  const [upiTxnId, setUpiTxnId] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [adminUpiId, setAdminUpiId] = useState('DEVELOPER_TEST');

  const [trackingJobId, setTrackingJobId] = useState(null);
  const [workerLocation, setWorkerLocation] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Subscribe to live location updates via WebSocket
  useEffect(() => {
    if (!trackingJobId) return;

    console.log(`Subscribing to live location updates for job ${trackingJobId}`);
    const subscription = webSocketService.subscribe(`/topic/job/${trackingJobId}/location`, (message) => {
      const coords = JSON.parse(message.body);
      console.log("Received live coordinates:", coords);
      setWorkerLocation({ lat: coords.lat, lng: coords.lng });
    });

    return () => {
      if (subscription) {
        webSocketService.unsubscribe(`/topic/job/${trackingJobId}/location`);
      }
    };
  }, [trackingJobId]);

  // Handle Leaflet Map Initialization and updates
  useEffect(() => {
    if (!trackingJobId || !mapRef.current) {
      // Destroy map instance when not tracking
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const initialLat = workerLocation?.lat || 19.0596;
    const initialLng = workerLocation?.lng || 72.8295;

    if (!mapInstanceRef.current && window.L) {
      console.log("Initializing Leaflet Map...");
      
      // Initialize Leaflet Map with street level zoom 16
      mapInstanceRef.current = window.L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([initialLat, initialLng], 16);
      
      // Set OpenStreetMap Tile Layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Create Custom Pin Icon for Worker
      const workerIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #10b981; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; transform: scale(1.15);">👷</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      // Place Marker
      markerRef.current = window.L.marker([initialLat, initialLng], { icon: workerIcon }).addTo(mapInstanceRef.current);

      // CRITICAL FIX: Leaflet needs to recalculate sizing once the collapsed parent container has completed rendering.
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    } else if (mapInstanceRef.current && workerLocation) {
      // Update Marker location smoothly and center on street-level
      const newLatLng = new window.L.LatLng(workerLocation.lat, workerLocation.lng);
      markerRef.current.setLatLng(newLatLng);
      mapInstanceRef.current.setView(newLatLng, 16); // High zoom street level view center
      
      // Periodic size calculation correction
      mapInstanceRef.current.invalidateSize();
    }
  }, [trackingJobId, workerLocation]);

  // Fetch Admin UPI ID
  useEffect(() => {
    const fetchAdminUpi = async () => {
      try {
        const res = await api.get('/jobs/admin-upi');
        setAdminUpiId(res.data.adminUpiId || 'DEVELOPER_TEST');
      } catch (err) {
        console.error('Failed to fetch Admin UPI ID:', err);
      }
    };
    fetchAdminUpi();
  }, []);

  // Global websocket listener for completed status / approved payments
  useEffect(() => {
    if (!user) return;

    console.log(`Subscribing to customer topic: /topic/customer/${user.id}`);
    const subscription = webSocketService.subscribe(`/topic/customer/${user.id}`, (message) => {
      const update = JSON.parse(message.body);
      console.log("WebSocket Customer Update received:", update);
      
      if (update.status === 'COMPLETED' && update.paymentStatus === 'APPROVED') {
        setShowPaymentModal(false);
        setPaymentJob(null);
        setPaymentSubmitted(false);
        setUpiTxnId('');
        
        // Update local jobs list and show review modal
        setCustomerJobs(prevJobs => {
          const completed = prevJobs.find(j => j.id === update.jobId);
          if (completed) {
            setReviewJob(completed);
            setShowReviewModal(true);
          }
          return prevJobs.map(j => j.id === update.jobId ? { ...j, status: 'COMPLETED', paymentStatus: 'APPROVED' } : j);
        });
      } else if (update.status === 'PRICE_PROPOSED') {
        setCustomerJobs(prevJobs => 
          prevJobs.map(j => j.id === update.jobId ? { ...j, proposedPrice: update.proposedPrice } : j)
        );
      } else if (update.status === 'PRICE_APPROVED') {
        setCustomerJobs(prevJobs => 
          prevJobs.map(j => j.id === update.jobId ? { ...j, price: update.price, proposedPrice: null } : j)
        );
        setPaymentJob(prev => prev && prev.id === update.jobId ? { ...prev, price: update.price, proposedPrice: null } : prev);
      } else if (update.status === 'PRICE_REJECTED') {
        setCustomerJobs(prevJobs => 
          prevJobs.map(j => j.id === update.jobId ? { ...j, proposedPrice: null } : j)
        );
      }
    });

    return () => {
      if (subscription) {
        webSocketService.unsubscribe(`/topic/customer/${user.id}`);
      }
    };
  }, [user]);

  const handleApprovePrice = async (jobId) => {
    try {
      await api.put(`/jobs/${jobId}/price/approve`);
      alert("Proposed price approved successfully!");
      fetchJobs();
    } catch (err) {
      alert("Failed to approve price: " + (err.response?.data?.message || err.message));
    }
  };

  const handleRejectPrice = async (jobId) => {
    try {
      await api.put(`/jobs/${jobId}/price/reject`);
      alert("Proposed price rejected.");
      fetchJobs();
    } catch (err) {
      alert("Failed to reject price: " + (err.response?.data?.message || err.message));
    }
  };

  const handlePaymentSubmit = async () => {
    if (!upiTxnId || upiTxnId.trim().length !== 12 || isNaN(upiTxnId)) {
      alert("Please enter a valid 12-digit UPI Transaction UTR Number.");
      return;
    }

    setPaymentLoading(true);
    try {
      await api.put(`/jobs/${paymentJob.id}/submit-payment`, { upiTxnId });
      setPaymentSubmitted(true);
      fetchJobs();
      alert("Payment proof submitted! Waiting for Admin verification.");
    } catch (err) {
      alert("Failed to submit payment proof: " + (err.response?.data?.message || err.message));
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs/customer');
      // Sort to show newest first
      setCustomerJobs(res.data.sort((a, b) => b.id - a.id));
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  React.useEffect(() => {
    fetchJobs();
  }, []);

  const handleCompleteJob = async (job) => {
    try {
      await api.put(`/jobs/${job.id}/status`, { status: 'COMPLETED' });
      setReviewJob(job);
      setShowReviewModal(true);
      fetchJobs();
    } catch (err) {
      alert('Failed to complete job');
    }
  };

  const handleCancelRequest = async (jobId) => {
    if (!window.confirm("Are you sure you want to cancel this booking request?")) return;
    try {
      await api.put(`/jobs/${jobId}/status`, { status: 'CANCELLED' });
      alert("Booking request cancelled successfully.");
      fetchJobs();
    } catch (err) {
      alert("Failed to cancel request: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmitReview = async () => {
    try {
      await api.post('/reviews', {
        jobId: reviewJob.id,
        rating,
        comment
      });
      alert('Thank you for your feedback!');
      setShowReviewModal(false);
      setReviewJob(null);
      setRating(5);
      setComment('');
    } catch (err) {
      alert('Failed to submit review');
    }
  };

  const handleBroadcast = async () => {
    if (!selectedCategory || !location || !description || !price) {
      alert('Please fill out all fields including your offered price');
      return;
    }

    setBookingStatus('searching');
    try {
      const categoryLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;
      const fullDescription = `[${categoryLabel}] - ${description}`;

      const response = await api.post('/jobs', {
        description: fullDescription,
        category: selectedCategory,
        location: location,
        price: price
      });

      // Subscribe to job updates
      const subscription = webSocketService.subscribe(`/topic/customer/${user?.id}`, (message) => {
        const update = JSON.parse(message.body);
        if (update.jobId === response.data.id) {
          if (update.status === 'ACCEPTED') {
            setAssignedWorkerDetails(update);
            setBookingStatus('assigned');
            subscription.unsubscribe();
          } else if (update.status === 'CANCELLED') {
            setBookingStatus('cancelled');
            subscription.unsubscribe();
          }
        }
      });
    } catch (err) {
      alert('Failed to broadcast request: ' + (err.response?.data?.message || err.message));
      setBookingStatus(null);
    }
  };

  const getCategoryIcon = (id) => {
    switch(id) {
      case 'electrician': return <Zap className="w-6 h-6" />;
      case 'plumber': return <Droplets className="w-6 h-6" />;
      case 'carpenter': return <Hammer className="w-6 h-6" />;
      case 'cleaning': return <Sparkles className="w-6 h-6" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-500 font-medium">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 flex-grow py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Needs Form Header */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-6">Describe Your Need</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Fill in the details below and we will find the closest available professional for you instantly.</p>
          
          <div className="space-y-6">
            
            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">1. Select a Service</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedCategory === cat.id ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-500 text-primary-700 dark:text-primary-400 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                     <span className="mb-2 text-current opacity-70">{getCategoryIcon(cat.id)}</span>
                     <span className="font-medium text-sm text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. Your Location</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-12 py-4 sm:text-base border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border transition-colors"
                  placeholder="e.g. Bandra West, Mumbai"
                />
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">3. Describe the Problem</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute top-4 left-4 pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <textarea
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-12 py-4 sm:text-base border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border transition-colors"
                  placeholder="e.g. My ceiling fan is making a grinding noise and needs repair."
                ></textarea>
              </div>
            </div>

            {/* Price Offered */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">4. Your Budget / Offered Price</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-bold text-gray-500 dark:text-gray-400">
                  ₹
                </div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 py-4 sm:text-base border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border transition-colors"
                  placeholder="e.g. 500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                onClick={handleBroadcast}
                disabled={!selectedCategory || !location || !description || bookingStatus === 'searching'}
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 disabled:cursor-not-allowed font-semibold py-4 px-6 rounded-xl transition-colors text-center shadow-lg text-lg flex items-center justify-center"
              >
                <Search className="w-5 h-5 mr-2" />
                {bookingStatus === 'searching' ? 'Broadcasting...' : 'Find Available Professionals'}
              </button>
            </div>
            
          </div>
        </div>

        {/* My Bookings Section */}
        {customerJobs.length > 0 && (
          <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">My Bookings</h2>
            <div className="space-y-4">
              {customerJobs.map(job => (
                <React.Fragment key={job.id}>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 flex flex-col transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div className="mb-4 sm:mb-0">
                        <div className="flex items-center">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            job.status === 'REQUESTED' ? 'bg-yellow-100 text-yellow-800' :
                            job.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' : 
                            job.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {job.status}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-3 flex items-center">
                            <CalendarClock className="w-3.5 h-3.5 mr-1" />
                            {new Date(job.createdAt).toLocaleString(undefined, { 
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mt-3 text-lg">{job.description}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <MapPin className="w-4 h-4 mr-1 text-gray-400" /> {job.location} 
                          <span className="mx-2 text-gray-300">|</span> 
                          ₹{job.price || 'Negotiable'}
                        </p>
                      </div>
                      <div className="sm:text-right w-full sm:w-auto">
                        {job.worker ? (
                          <div className="space-y-2">
                            {job.status === 'COMPLETED' ? (
                              <div className="bg-green-50/50 dark:bg-green-950/10 px-4 py-3 border border-green-100 dark:border-green-900/30 rounded-lg shadow-sm transition-colors text-center sm:text-right w-full sm:w-48">
                                <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold">✓ Job Completed</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">Worker contact details hidden for privacy.</p>
                              </div>
                            ) : (
                              <div className="bg-white dark:bg-gray-800 px-4 py-3 border border-gray-250 dark:border-gray-700 rounded-lg shadow-sm transition-colors">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Assigned Worker</p>
                                <p className="font-bold text-gray-900 dark:text-white capitalize">{job.worker.name}</p>
                                <p className="text-sm text-primary-600 dark:text-primary-400 font-mono mt-1 w-max">📞 {job.worker.phone}</p>
                              </div>
                            )}
                            {(job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS') && (
                              <button 
                                onClick={() => {
                                  setTrackingJobId(trackingJobId === job.id ? null : job.id);
                                  setWorkerLocation(null);
                                }}
                                className={`w-full text-xs font-bold py-2 rounded-lg transition-colors mb-1.5 flex items-center justify-center ${
                                  trackingJobId === job.id 
                                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                                }`}
                              >
                                <Navigation className="w-3.5 h-3.5 mr-1 animate-pulse" />
                                {trackingJobId === job.id ? 'Close Map' : 'Track Live Worker'}
                              </button>
                            )}
                            {(job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS' || (job.status === 'COMPLETED' && job.paymentStatus !== 'APPROVED')) && (
                              <button 
                                disabled={!!job.proposedPrice}
                                onClick={() => {
                                  setPaymentJob(job);
                                  setPaymentSubmitted(job.paymentStatus === 'SUBMITTED');
                                  setUpiTxnId(job.upiTxnId || '');
                                  setShowPaymentModal(true);
                                }}
                                className={`w-full text-white text-xs font-bold py-2 rounded-lg transition-colors ${
                                  job.proposedPrice 
                                    ? 'bg-gray-300 dark:bg-gray-750 text-gray-500 cursor-not-allowed'
                                    : job.paymentStatus === 'SUBMITTED' 
                                      ? 'bg-amber-500 hover:bg-amber-600' 
                                      : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {job.proposedPrice 
                                  ? 'Price Update Pending' 
                                  : job.paymentStatus === 'SUBMITTED' 
                                    ? 'Verifying Payment...' 
                                    : 'Pay & Complete'}
                              </button>
                            )}
                            {job.status === 'ACCEPTED' && (
                              <button 
                                onClick={() => handleCancelRequest(job.id)}
                                className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold py-2 rounded-lg transition-colors border border-red-100 dark:border-red-900/30 shadow-sm mt-1.5"
                              >
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2 w-full sm:w-48">
                            <p className="text-sm text-gray-400 italic bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-150 dark:border-gray-700 transition-colors text-center">Waiting for a worker...</p>
                            {job.status === 'REQUESTED' && (
                              <button 
                                onClick={() => handleCancelRequest(job.id)}
                                className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold py-2 rounded-lg transition-colors border border-red-100 dark:border-red-900/30 shadow-sm"
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {job.proposedPrice && (
                      <div className="mt-4 border-t border-gray-150 dark:border-gray-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn transition-colors">
                        <div className="flex items-start space-x-3">
                          <span className="text-xl shrink-0">⚠️</span>
                          <div className="text-left">
                            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-400">Proposed Price Update</p>
                            <p className="text-xs text-yellow-750 dark:text-yellow-350 mt-0.5">
                              Worker has proposed a new price of <span className="font-extrabold text-sm text-yellow-950 dark:text-yellow-100">₹{job.proposedPrice}</span> for this service (Original: ₹{job.price || 'Negotiable'}).
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleRejectPrice(job.id)}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-750 dark:text-red-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprovePrice(job.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {trackingJobId === job.id && (job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS') && (
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 animate-fadeIn">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {workerLocation ? 'Live GPS Tracking Active' : 'Connecting to Worker GPS...'}
                          </p>
                        </div>
                        {workerLocation && (
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            Coordinates: {workerLocation.lat.toFixed(4)}, {workerLocation.lng.toFixed(4)}
                          </span>
                        )}
                      </div>
                      <div 
                        ref={mapRef} 
                        className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner z-10"
                        style={{ minHeight: '250px' }}
                      ></div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center font-medium">
                        Worker location is synced in real-time. Please stay near your phone for quick coordination.
                      </p>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border dark:border-gray-800 transition-colors">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Rate the Service</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">How was your experience with {reviewJob?.worker?.name}?</p>
            
            <div className="flex justify-center space-x-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-700'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl p-4 text-sm focus:ring-primary-500 focus:border-primary-500 mb-6 transition-colors"
              placeholder="Any comments about the work? (Optional)"
              rows="3"
            ></textarea>

            <div className="flex space-x-3">
              <button 
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Skip
              </button>
              <button 
                onClick={handleSubmitReview}
                className="flex-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 px-8 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal Overlay */}
      {bookingStatus && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border dark:border-gray-800 transform transition-all transition-colors">
            {bookingStatus === 'searching' ? (
               <div className="py-8">
                 <div className="relative w-24 h-24 mx-auto mb-8">
                   <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center"><Zap className="w-8 h-8 text-primary-500 animate-pulse" /></div>
                 </div>
                 <h3 className="text-2xl font-black text-gray-900 dark:text-white">Finding Professionals...</h3>
                 <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium">Broadcasting your request to trusted workers near {location}</p>
                 <button 
                   onClick={() => setBookingStatus(null)}
                   className="mt-8 px-6 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                 >
                   Cancel Request
                 </button>
               </div>
            ) : bookingStatus === 'assigned' ? (
               <div className="py-8">
                 <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 dark:bg-green-950/30 mb-6 drop-shadow-md">
                    <ShieldCheck className="h-12 w-12 text-primary-600 dark:text-primary-400" />
                 </div>
                 <h3 className="text-3xl font-black text-gray-900 dark:text-white">Worker Confirmed!</h3>
                 <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6 text-lg">A professional has accepted your request and will contact you shortly.</p>
                 
                 <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 text-left mb-8 transition-colors">
                    <div className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Assigned To</div>
                    <div className="font-bold text-xl text-gray-900 dark:text-white capitalize">{assignedWorkerDetails?.workerName}</div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <div className="text-primary-600 dark:text-primary-400 font-medium">{assignedWorkerDetails?.workerSkill}</div>
                      <span className="text-gray-300 dark:text-gray-500">|</span>
                      <div className="flex items-center text-yellow-500 font-bold text-sm">
                        ★ {assignedWorkerDetails?.rating || 'New'}
                      </div>
                    </div>
                    <div className="mt-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg font-mono text-sm inline-block transition-colors">
                      📞 {assignedWorkerDetails?.workerPhone}
                    </div>
                 </div>
                 
                 <button 
                   onClick={() => {
                     setBookingStatus(null);
                     setSelectedCategory('');
                     setDescription('');
                     setPrice('');
                     fetchJobs(); // Refresh the list
                   }}
                   className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all hover:scale-[1.02]"
                 >
                   Done
                 </button>
               </div>
            ) : bookingStatus === 'cancelled' ? (
                <div className="py-8">
                  <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 dark:bg-red-950/30 mb-6 drop-shadow-md">
                     <span className="text-4xl">❌</span>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">Request Declined</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6 text-lg">The professional is currently unavailable to take this request.</p>
                  
                  <button 
                    onClick={() => {
                      setBookingStatus(null);
                    }}
                    className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-red-700 transition-all hover:scale-[1.02]"
                  >
                    Close
                  </button>
                </div>
            ) : null}
          </div>
        </div>
      )}

      {/* UPI Payment Modal */}
      {showPaymentModal && paymentJob && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border dark:border-gray-800 transition-colors max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Pay Worker (UPI)</h3>
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentJob(null);
                  setPaymentSubmitted(false);
                  setUpiTxnId('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-205 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {!paymentSubmitted ? (
              <div className="space-y-6 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-left">
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Amount to Pay</div>
                  <div className="text-3xl font-black text-emerald-950 dark:text-emerald-100">₹{paymentJob.price}</div>
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2 font-medium">Recipient: RozgaarX Platform Admin</div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-705 dark:text-gray-300 mb-3">Scan this QR Code with GPay, PhonePe, or Paytm</p>
                  
                  {/* Dynamic UPI QR Code */}
                  <div className="bg-white p-3 rounded-2xl border border-gray-150 inline-block shadow-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        `upi://pay?pa=${adminUpiId}&pn=RozgaarX&am=${paymentJob.price}&tn=Job-${paymentJob.id}&cu=INR`
                      )}`}
                      alt="UPI QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 py-1.5 px-3 rounded-lg inline-block font-mono">
                    UPI ID: {adminUpiId}
                  </div>
                </div>

                <div className="border-t border-gray-150 dark:border-gray-800 pt-4 text-left">
                  <label htmlFor="upiTxnId" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Enter 12-Digit Transaction UTR Ref No.
                  </label>
                  <input
                    type="text"
                    id="upiTxnId"
                    value={upiTxnId}
                    maxLength={12}
                    onChange={(e) => setUpiTxnId(e.target.value.replace(/\D/g, ''))}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full px-4 py-3 sm:text-base border-gray-300 dark:border-gray-750 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border transition-colors text-center tracking-widest font-mono font-bold"
                    placeholder="e.g. 304561284917"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Get UTR ref no. from transaction receipt in Google Pay/PhonePe.
                  </p>
                </div>

                <button
                  onClick={handlePaymentSubmit}
                  disabled={paymentLoading || upiTxnId.length !== 12}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 font-bold py-4 px-6 rounded-xl shadow-lg transition-colors flex items-center justify-center"
                >
                  {paymentLoading ? 'Submitting...' : 'Submit Payment Proof'}
                </button>
              </div>
            ) : (
              <div className="py-8 text-center space-y-6">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">⏳</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verifying Payment...</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium px-4">
                  We are verifying your transaction ID **{upiTxnId}**. 
                  This modal will automatically close once the platform admin approves the payment.
                </p>
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl font-medium">
                  Note: Do not close this browser or reload. Verification is automatic.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
