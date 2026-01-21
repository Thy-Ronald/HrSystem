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
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-brand-600">HR System</p>
            <h1 className="text-3xl font-bold text-slate-900">Employee Console</h1>
            <p className="text-sm text-slate-600">
              Manage agreements and review GitHub signal in one workspace.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-slate-200">
            <span className="size-2 rounded-full bg-emerald-500" />
            Backend on <code>http://localhost:4000</code>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard
            title="Employee Contract"
            description="Capture essential employment details with quick validation."
            action={
              contractState.status === 'success' && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Saved
                </span>
              )
            }
          >
            <form className="grid grid-cols-1 gap-4" onSubmit={submitContractForm}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-700">Full name</span>
                  <input
                    required
                    value={contractForm.fullName}
                    onChange={(e) => handleContractChange('fullName', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="Alex Johnson"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-700">Role / Title</span>
                  <input
                    required
                    value={contractForm.role}
                    onChange={(e) => handleContractChange('role', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="Senior Engineer"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-700">Start date</span>
                  <input
                    type="date"
                    required
                    value={contractForm.startDate}
                    onChange={(e) => handleContractChange('startDate', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-700">Employment type</span>
                  <select
                    value={contractForm.employmentType}
                    onChange={(e) => handleContractChange('employmentType', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    {EmploymentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-700">Annual salary (USD)</span>
                  <input
                    type="number"
                    min="0"
                    value={contractForm.salary}
                    onChange={(e) => handleContractChange('salary', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="140000"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Notes / Clauses</span>
                <textarea
                  rows="3"
                  value={contractForm.notes}
                  onChange={(e) => handleContractChange('notes', e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="Include probation period, equipment details, and onboarding notes."
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  disabled={contractState.status === 'loading'}
                >
                  {contractState.status === 'loading' ? 'Saving...' : 'Save Contract'}
                </button>
                {contractState.status !== 'idle' && (
                  <span
                    className={`text-sm ${
                      contractState.status === 'error' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {contractState.message}
                  </span>
                )}
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="GitHub Statistics"
            description="Validate engineering signal with public GitHub data."
            action={
              <div className="flex items-center gap-2">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="octocat"
                  className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Fetch'}
                </button>
              </div>
            }
          >
            {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

            {!data && !error && (
              <p className="text-sm text-slate-600">
                Enter a GitHub username to see profile, repos, and language distribution.
              </p>
            )}

            {data && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={data.profile.avatarUrl}
                      alt={data.profile.login}
                      className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                    />
                    <div>
                      <p className="text-sm text-slate-500">{data.profile.login}</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {data.profile.name || 'No name provided'}
                      </p>
                      <p className="text-sm text-slate-600">{data.profile.bio}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <StatTile label="Repos" value={data.profile.publicRepos} />
                    <StatTile label="Followers" value={data.profile.followers} />
                    <StatTile label="Following" value={data.profile.following} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Top Languages</p>
                    <div className="space-y-3">
                      {topLanguages.length === 0 && (
                        <p className="text-sm text-slate-500">No language data available.</p>
                      )}
                      {topLanguages.map(([lang, count]) => (
                        <LanguageBar key={lang} language={lang} count={count} max={topLanguages[0][1]} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Recent Repositories</p>
                    <div className="space-y-3">
                      {data.repos.slice(0, 5).map((repo) => (
                        <a
                          key={repo.id}
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 hover:border-brand-200 hover:bg-white"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-900">{repo.name}</p>
                            {repo.language && (
                              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                                {repo.language}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{repo.description}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                            <span>★ {repo.stars}</span>
                            <span>⎇ {repo.forks}</span>
                            <span>Updated {formatDate(repo.updatedAt)}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
