import { useState } from 'react';
import SectionCard from '../components/SectionCard';
import StatTile from '../components/StatTile';
import LanguageBar from '../components/LanguageBar';
import { useGithub } from '../hooks/useGithub';
import { submitContract } from '../services/api';
import { EmploymentTypes } from '../types';
import { formatDate } from '../utils/format';

function Dashboard() {
  const [contractForm, setContractForm] = useState({
    fullName: '',
    role: '',
    startDate: '',
    employmentType: EmploymentTypes[0],
    salary: '',
    notes: '',
  });
  const [contractState, setContractState] = useState({ status: 'idle', message: '' });

  const { username, setUsername, loading, data, error, topLanguages, fetchProfile } = useGithub();

  const handleContractChange = (field, value) => {
    setContractForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitContractForm = async (event) => {
    event.preventDefault();
    setContractState({ status: 'loading', message: '' });
    try {
      await submitContract(contractForm);
      setContractState({ status: 'success', message: 'Contract saved' });
    } catch (err) {
      setContractState({ status: 'error', message: err.message || 'Request failed' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl text-[#202124] font-normal">Employee Dashboard</h1>
            <p className="text-[#5f6368]">Review metrics and signals from the HR ecosystem</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-6 border border-[#dadce0] rounded-2xl hover:bg-[#f8f9fa] transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[#e8f0fe] rounded-lg text-[#1a73e8]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <h3 className="text-[#202124] font-medium mb-1">Active Staff</h3>
                <p className="text-2xl font-bold text-[#1a73e8]">42</p>
             </div>

             <div className="p-6 border border-[#dadce0] rounded-2xl hover:bg-[#f8f9fa] transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[#e6f4ea] rounded-lg text-[#1e8e3e]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <h3 className="text-[#202124] font-medium mb-1">Total Payroll</h3>
                <p className="text-2xl font-bold text-[#1e8e3e]">$1.2M</p>
             </div>

             <div className="p-6 border border-[#dadce0] rounded-2xl hover:bg-[#f8f9fa] transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[#fef7e0] rounded-lg text-[#f9ab00]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <h3 className="text-[#202124] font-medium mb-1">Pending Reviews</h3>
                <p className="text-2xl font-bold text-[#f9ab00]">8</p>
             </div>
          </div>

          {/* GitHub Section */}
          <div className="border border-[#dadce0] rounded-2xl overflow-hidden">
             <div className="p-6 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center justify-between">
                <div>
                  <h2 className="text-xl text-[#202124]">GitHub Intelligence</h2>
                  <p className="text-sm text-[#5f6368]">Validate engineering signals via public data</p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-[#dadce0] rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#1a73e8] focus-within:border-transparent transition-all">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="GitHub username"
                    className="outline-none text-sm w-32"
                  />
                  <button 
                    onClick={fetchProfile}
                    className="text-[#1a73e8] font-medium text-sm hover:underline"
                  >
                    Fetch
                  </button>
                </div>
             </div>
             
             <div className="p-8">
                {loading && <div className="text-center text-[#5f6368]">Analyzing profile...</div>}
                {error && <div className="text-center text-rose-600">{error}</div>}
                {!data && !loading && !error && (
                  <div className="text-center py-12 text-[#5f6368]">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-20">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    <p>Enter a username above to pull real-time engineering signal</p>
                  </div>
                )}

                {data && (
                  <div className="space-y-8">
                    <div className="flex items-start gap-6">
                      <img src={data.profile.avatarUrl} alt="" className="w-24 h-24 rounded-full border border-[#dadce0]" />
                      <div className="flex-1">
                        <h3 className="text-2xl text-[#202124]">{data.profile.name || data.profile.login}</h3>
                        <p className="text-[#5f6368] mb-4">@{data.profile.login} • {data.profile.bio}</p>
                        <div className="flex gap-4">
                          <div className="text-center px-4 py-2 bg-[#f8f9fa] rounded-lg">
                            <p className="text-sm text-[#5f6368]">Repos</p>
                            <p className="font-bold">{data.profile.publicRepos}</p>
                          </div>
                          <div className="text-center px-4 py-2 bg-[#f8f9fa] rounded-lg">
                            <p className="text-sm text-[#5f6368]">Followers</p>
                            <p className="font-bold">{data.profile.followers}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-bold text-[#202124] uppercase tracking-wider mb-4">Top Languages</h4>
                        <div className="space-y-3">
                          {topLanguages.map(([lang, count]) => (
                            <div key={lang} className="space-y-1">
                              <div className="flex justify-between text-xs text-[#5f6368]">
                                <span>{lang}</span>
                                <span>{Math.round((count / topLanguages[0][1]) * 100)}%</span>
                              </div>
                              <div className="h-1.5 bg-[#e8f0fe] rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#1a73e8] rounded-full" 
                                  style={{ width: `${(count / topLanguages[0][1]) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-[#202124] uppercase tracking-wider mb-4">Latest Projects</h4>
                        <div className="space-y-2">
                          {data.repos.slice(0, 3).map(repo => (
                            <a key={repo.id} href={repo.htmlUrl} target="_blank" className="block p-3 border border-[#dadce0] rounded-lg hover:bg-[#f8f9fa] transition-colors">
                              <div className="flex justify-between items-start">
                                <span className="text-[#1a73e8] font-medium">{repo.name}</span>
                                <span className="text-[10px] bg-[#e8f0fe] text-[#1a73e8] px-2 py-0.5 rounded-full uppercase font-bold">
                                  {repo.language || 'Text'}
                                </span>
                              </div>
                              <p className="text-xs text-[#5f6368] mt-1 line-clamp-1">{repo.description}</p>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
