import React, { useState, useContext } from 'react';
import { Search, MapPin, ShieldCheck, Zap, Droplets, Hammer, Sparkles, FileText, CalendarClock } from 'lucide-react';
import { CATEGORIES } from '../data/mockData';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import webSocketService from '../api/webSocketService';

const CustomerDashboard = () => {
  const { user } = useContext(AuthContext);
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

  const handleSubmitReview = async () => {
    try {
      await api.post('/api/reviews', {
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

  return (
    <div className="bg-gray-50 flex-grow py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Needs Form Header */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">Describe Your Need</h1>
          <p className="text-gray-500 mb-6">Fill in the details below and we will find the closest available professional for you instantly.</p>
          
          <div className="space-y-6">
            
            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">1. Select a Service</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedCategory === cat.id ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200'}`}
                  >
                     <span className="mb-2 text-current opacity-70">{getCategoryIcon(cat.id)}</span>
                     <span className="font-medium text-sm text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">2. Your Location</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-12 py-4 sm:text-base border-gray-300 rounded-xl bg-gray-50 border"
                  placeholder="e.g. Bandra West, Mumbai"
                />
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">3. Describe the Problem</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute top-4 left-4 pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-12 py-4 sm:text-base border-gray-300 rounded-xl bg-gray-50 border"
                  placeholder="e.g. My ceiling fan is making a grinding noise and needs repair."
                ></textarea>
              </div>
            </div>

            {/* Price Offered */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">4. Your Budget / Offered Price</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-bold text-gray-500">
                  ₹
                </div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 py-4 sm:text-base border-gray-300 rounded-xl bg-gray-50 border"
                  placeholder="e.g. 500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                onClick={handleBroadcast}
                disabled={!selectedCategory || !location || !description || bookingStatus === 'searching'}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium py-4 px-6 rounded-xl transition-colors text-center shadow-lg text-lg flex items-center justify-center"
              >
                <Search className="w-5 h-5 mr-2" />
                {bookingStatus === 'searching' ? 'Broadcasting...' : 'Find Available Professionals'}
              </button>
            </div>
            
          </div>
        </div>

        {/* My Bookings Section */}
        {customerJobs.length > 0 && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">My Bookings</h2>
            <div className="space-y-4">
              {customerJobs.map(job => (
                <div key={job.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center">
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
                      <div className="text-xs text-gray-500 font-medium ml-3 flex items-center">
                        <CalendarClock className="w-3.5 h-3.5 mr-1" />
                        {new Date(job.createdAt).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mt-3 text-lg">{job.description}</h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" /> {job.location} 
                      <span className="mx-2 text-gray-300">|</span> 
                      ₹{job.price || 'Negotiable'}
                    </p>
                  </div>
                  <div className="sm:text-right w-full sm:w-auto">
                    {job.worker ? (
                      <div className="space-y-2">
                        <div className="bg-white px-4 py-3 border border-gray-200 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Assigned Worker</p>
                          <p className="font-bold text-gray-900 capitalize">{job.worker.name}</p>
                          <p className="text-sm text-primary-600 font-mono mt-1 w-max">📞 {job.worker.phone}</p>
                        </div>
                        {job.status === 'ACCEPTED' && (
                          <button 
                            onClick={() => handleCompleteJob(job)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                          >
                            Complete & Rate
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-white p-3 rounded-lg border border-gray-100">Waiting for a worker...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Rate the Service</h3>
            <p className="text-gray-500 mb-6 text-sm">How was your experience with {reviewJob?.worker?.name}?</p>
            
            <div className="flex justify-center space-x-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:ring-primary-500 focus:border-primary-500 mb-6"
              placeholder="Any comments about the work? (Optional)"
              rows="3"
            ></textarea>

            <div className="flex space-x-3">
              <button 
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
              <button 
                onClick={handleSubmitReview}
                className="flex-2 bg-gray-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-gray-800 transition-colors"
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
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl transform transition-all">
            {bookingStatus === 'searching' ? (
               <div className="py-8">
                 <div className="relative w-24 h-24 mx-auto mb-8">
                   <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center"><Zap className="w-8 h-8 text-primary-500 animate-pulse" /></div>
                 </div>
                 <h3 className="text-2xl font-black text-gray-900">Finding Professionals...</h3>
                 <p className="text-gray-500 mt-3 font-medium">Broadcasting your request to trusted workers near {location}</p>
                 <button 
                   onClick={() => setBookingStatus(null)}
                   className="mt-8 px-6 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                 >
                   Cancel Request
                 </button>
               </div>
            ) : bookingStatus === 'assigned' ? (
               <div className="py-8">
                 <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-6 drop-shadow-md">
                    <ShieldCheck className="h-12 w-12 text-primary-600" />
                 </div>
                 <h3 className="text-3xl font-black text-gray-900">Worker Confirmed!</h3>
                 <p className="text-gray-500 mt-2 mb-6 text-lg">A professional has accepted your request and will contact you shortly.</p>
                 
                 <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-left mb-8">
                    <div className="font-medium text-sm text-gray-500 mb-1 uppercase tracking-wider">Assigned To</div>
                    <div className="font-bold text-xl text-gray-900 capitalize">{assignedWorkerDetails?.workerName}</div>
                    <div className="flex items-center space-x-2">
                      <div className="text-primary-600 font-medium">{assignedWorkerDetails?.workerSkill}</div>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center text-yellow-500 font-bold text-sm">
                        ★ {assignedWorkerDetails?.rating || 'New'}
                      </div>
                    </div>
                    <div className="mt-3 text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-lg font-mono text-sm inline-block">
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
                   className="w-full bg-gray-900 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-gray-800 transition-all hover:scale-[1.02]"
                 >
                   Done
                 </button>
               </div>
            ) : bookingStatus === 'cancelled' ? (
                <div className="py-8">
                  <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 mb-6 drop-shadow-md">
                     <span className="text-4xl">❌</span>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900">Request Declined</h3>
                  <p className="text-gray-500 mt-2 mb-6 text-lg">The professional is currently unavailable to take this request.</p>
                  
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
    </div>
  );
};

export default CustomerDashboard;
