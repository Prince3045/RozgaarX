import React, { useState, useEffect, useContext } from 'react';
import { ShieldCheck, Check, Search, MapPin, Briefcase, FileImage } from 'lucide-react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'ROLE_ADMIN') {
       navigate('/');
       return;
    }

    const fetchPending = async () => {
      try {
        const res = await api.get('/admin/workers/pending');
        setPendingWorkers(res.data);
      } catch (err) {
        console.error('Failed to fetch pending workers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, [user, navigate]);

  const handleApprove = async (id) => {
    try {
      await api.put(`/admin/workers/${id}/approve`);
      setPendingWorkers(pendingWorkers.filter(w => w.id !== id));
      alert('Worker approved successfully!');
    } catch (err) {
      alert('Failed to approve worker');
    }
  };

  if (loading) {
    return <div className="flex-grow flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>;
  }

  return (
    <div className="bg-gray-50 flex-grow py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Control Panel</h1>
                <p className="text-sm text-gray-500">Manage platform users and approve incoming workers</p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3 bg-red-50 px-4 py-2 rounded-full border border-red-100">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm font-medium text-red-700">Administrator Access</span>
            </div>
        </div>

        <div>
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
                              <a href={worker.idProofUrl.startsWith('uploads') ? `http://localhost:8081/${worker.idProofUrl}` : `http://localhost:8081/uploads/${worker.idProofUrl}`} target="_blank" rel="noreferrer" className="text-primary-600 font-medium hover:underline">View File</a>
                           </div>
                        </div>
                     </div>
                     <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <button 
                           onClick={() => handleApprove(worker.id)}
                           className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                           <Check className="w-4 h-4 mr-2" /> Approve & Activate
                        </button>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
