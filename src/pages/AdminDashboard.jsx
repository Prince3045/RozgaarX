import React, { useState, useEffect, useContext } from 'react';
import { ShieldCheck, Check, Search, MapPin, Briefcase, FileImage } from 'lucide-react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' or 'payments'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'ROLE_ADMIN') {
       navigate('/');
       return;
    }

    const fetchData = async () => {
      try {
        const workersRes = await api.get('/admin/workers/pending');
        setPendingWorkers(workersRes.data);
        
        const paymentsRes = await api.get('/admin/payments/pending');
        setPendingPayments(paymentsRes.data);
      } catch (err) {
        console.error('Failed to fetch admin data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);

  const handleApproveWorker = async (id) => {
    try {
      await api.put(`/admin/workers/${id}/approve`);
      setPendingWorkers(pendingWorkers.filter(w => w.id !== id));
      alert('Worker approved successfully!');
    } catch (err) {
      alert('Failed to approve worker');
    }
  };

  const handleApprovePayment = async (jobId) => {
    try {
      await api.put(`/jobs/${jobId}/approve-payment`);
      setPendingPayments(pendingPayments.filter(p => p.id !== jobId));
      alert('Payment approved successfully! Customer and worker notified.');
    } catch (err) {
      alert('Failed to approve payment: ' + (err.response?.data?.message || err.message));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-500 font-medium">Loading session...</div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex-grow flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>;
  }

  return (
    <div className="bg-gray-50 flex-grow py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Strip */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Control Panel</h1>
                <p className="text-sm text-gray-500">Manage platform users, approve incoming workers, and verify payments</p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3 bg-red-50 px-4 py-2 rounded-full border border-red-100">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm font-medium text-red-700">Administrator Access</span>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 bg-gray-150 p-1.5 rounded-2xl w-max border border-gray-200">
          <button
            onClick={() => setActiveTab('workers')}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'workers' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Worker Verifications ({pendingWorkers.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'payments' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Verify UPI Payments ({pendingPayments.length})
          </button>
        </div>

        {/* Tab Content */}
        <div>
           {activeTab === 'workers' ? (
             <>
               <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  Pending Worker Verifications 
                  {pendingWorkers.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2.5 rounded-full text-xs font-semibold">{pendingWorkers.length} waiting</span>}
               </h2>
               
               {pendingWorkers.length === 0 ? (
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                   <ShieldCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                   <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                   <p className="mt-1">There are no pending worker verifications at the moment.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingWorkers.map(worker => (
                      <div key={worker.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col">
                         <div className="absolute top-0 right-0 p-4">
                           <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-bold tracking-wider">PENDING REVIEW</span>
                         </div>
                         <div className="p-6 flex-grow">
                            <div className="mb-4 pt-2">
                               <h3 className="font-bold text-gray-900 text-xl capitalize">{worker.user.name}</h3>
                               <p className="text-sm text-primary-600 font-medium capitalize">{worker.skill} Professional</p>
                               <p className="text-sm text-gray-500">User ID: #{worker.user.id}</p>
                            </div>
                            <div className="space-y-3 mb-6">
                               <div className="flex items-center text-sm text-gray-700">
                                  <Briefcase className="w-4 h-4 mr-2 text-gray-400" /> {worker.experience} Years Experience
                               </div>
                               <div className="flex items-center text-sm text-gray-700">
                                  <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {worker.location}
                               </div>
                               <div className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <div className="flex items-center">
                                    <FileImage className="w-4 h-4 mr-2 text-primary-500" /> ID Proof Uploaded
                                  </div>
                                  <a href={worker.idProofUrl.startsWith('uploads') ? `${apiBase}/${worker.idProofUrl}` : `${apiBase}/uploads/${worker.idProofUrl}`} target="_blank" rel="noreferrer" className="text-primary-600 font-medium hover:underline">View File</a>
                               </div>
                            </div>
                         </div>
                         <div className="border-t border-gray-100 bg-gray-50 p-4">
                            <button 
                               onClick={() => handleApproveWorker(worker.id)}
                               className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                               <Check className="w-4 h-4 mr-2" /> Approve & Activate
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
             </>
           ) : (
             <>
               <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  Pending UPI Payments 
                  {pendingPayments.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2.5 rounded-full text-xs font-semibold">{pendingPayments.length} waiting</span>}
               </h2>
               
               {pendingPayments.length === 0 ? (
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                   <ShieldCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                   <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                   <p className="mt-1">There are no pending UPI payments to verify at the moment.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingPayments.map(job => (
                      <div key={job.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col">
                         <div className="absolute top-0 right-0 p-4">
                           <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-full font-bold tracking-wider">PENDING VERIFICATION</span>
                         </div>
                         <div className="p-6 flex-grow">
                            <div className="mb-4 pt-2">
                               <h3 className="font-bold text-gray-900 text-lg capitalize line-clamp-1">{job.description}</h3>
                               <p className="text-sm text-primary-600 font-bold mt-1">Amount: ₹{job.price}</p>
                               <p className="text-xs text-gray-500 mt-0.5">Job ID: #{job.id}</p>
                            </div>
                            <div className="space-y-3 mb-6 border-t border-gray-100 pt-3">
                               <div className="text-sm text-gray-700">
                                  <span className="font-bold text-gray-500 text-xs uppercase tracking-wider block mb-0.5">Customer</span> 
                                  <span className="capitalize">{job.customer.name}</span>
                               </div>
                               <div className="text-sm text-gray-700">
                                  <span className="font-bold text-gray-500 text-xs uppercase tracking-wider block mb-0.5">Worker to Receive Payout</span>
                                  <span className="capitalize">{job.worker ? job.worker.name : 'N/A'}</span>
                               </div>
                               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-150 mt-4 text-center">
                                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Submitted UTR Reference No.</div>
                                  <div className="text-lg font-mono font-bold text-gray-900 dark:text-white tracking-wider bg-white dark:bg-gray-700 py-1 px-3 border rounded border-gray-200 dark:border-gray-600 select-all">{job.upiTxnId}</div>
                               </div>
                            </div>
                         </div>
                         <div className="border-t border-gray-100 bg-gray-50 p-4">
                            <button 
                               onClick={() => handleApprovePayment(job.id)}
                               className="w-full flex items-center justify-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors font-semibold"
                            >
                               <Check className="w-4 h-4 mr-2" /> Confirm & Approve
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
