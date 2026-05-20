import React, { useState, useContext } from 'react';
import { Upload, CheckCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

const WorkerRegistration = () => {
  const [step, setStep] = useState(1); // 1 for form, 2 for pending verification
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('skill', e.target.skill.value);
    formData.append('experience', e.target.experience.value);
    formData.append('location', e.target.location.value);
    const file = e.target['file-upload'].files[0];
    if (!file) {
      alert('Please upload your ID proof to continue.');
      setLoading(false);
      return;
    }
    
    formData.append('idProof', file);

    try {
      await api.post('/workers/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStep(2);
    } catch (err) {
      alert('Registration failed. Make sure you are logged in as a worker.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-center">
             <div className="flex items-center justify-center h-20 w-20 rounded-full bg-yellow-50 text-yellow-500">
               <ShieldAlert className="h-10 w-10" />
             </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Verification Pending</h2>
          <p className="text-gray-500">
            Your application and ID proof have been received. Our team will verify your details within 2-4 days. You will be able to access your dashboard once approved.
          </p>
          <div className="pt-6">
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <button 
        onClick={() => navigate('/signup')} 
        className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </button>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Worker Profile Registration</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Please fill in your authentic details to get verified and start receiving jobs.
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="skill" className="block text-sm font-medium text-gray-700">Primary Skill Category</label>
                <select id="skill" name="skill" required
                  className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
                >
                  <option value="">Select a category</option>
                  <option value="electrician">Electrician</option>
                  <option value="plumber">Plumber</option>
                  <option value="carpenter">Carpenter</option>
                  <option value="cleaning">Home Cleaning</option>
                  <option value="appliance">Appliance Repair</option>
                  <option value="painter">Painter</option>
                </select>
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700">Years of Experience</label>
                <input type="number" name="experience" id="experience" min="0" required
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-3 px-3 border"
                  placeholder="e.g. 5" />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Service Location / City</label>
                <input type="text" name="location" id="location" required
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-3 px-3 border"
                  placeholder="e.g. Mumbai, Maharashtra" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">ID Proof (Aadhaar / Voter ID / PAN)</label>
                <div className="mt-2 flex justify-center px-6 py-8 border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                        <span>Upload a file</span>
                        <input 
                           id="file-upload" 
                           name="file-upload" 
                           type="file" 
                           className="sr-only" 
                           onChange={(e) => setFileName(e.target.files[0]?.name || '')}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, PDF up to 10MB
                    </p>
                    {fileName && (
                       <p className="mt-2 text-sm text-green-600 font-semibold bg-green-50 py-1 px-2 rounded inline-block">
                         Selected: {fileName}
                       </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkerRegistration;
