
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getGithubTimeline, fetchRepositories } from '../services/api';

const GithubContext = createContext();

export const useGithub = () => {
    const context = useContext(GithubContext);
    if (!context) {
        throw new Error('useGithub must be used within a GithubProvider');
    }
    return context;
};

export const GithubProvider = ({ children }) => {
    const [timelineData, setTimelineData] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [repos, setRepos] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [loading, setLoading] = useState(false);

    // Track if we've done the initial fetch to avoid refetching on nav
    const [initialFetchDone, setInitialFetchDone] = useState(false);

    // Fetch repositories on mount
    useEffect(() => {
        async function loadRepos() {
            if (repos.length > 0) return; // Already loaded

            try {
                const repoList = await fetchRepositories();
                setRepos(repoList);
                if (repoList.length > 0 && !selectedRepo) {
                    const defaultRepo = repoList.find(r => r.name === 'sacsys009') || repoList[0];
                    setSelectedRepo(defaultRepo.fullName);
                }
            } catch (err) {
                console.error("Failed to load repos", err);
            }
        }
        loadRepos();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch timeline data
    const fetchData = useCallback(async (force = false) => {
        if (!selectedRepo) return;

        // If we have data and parameters haven't changed (and not forced), skip
        // Note: For now we just implement simple caching. In a real app we might want 
        // to track which repo/date the current data belongs to more explicitly if 
        // we supported multi-tab caching, but for this simple nav persistence, 
        // the state variables act as our "current" view source.

        setLoading(true);
        try {
            const data = await getGithubTimeline(selectedRepo, null, { date: selectedDate });
            setTimelineData(data || []);
            setInitialFetchDone(true);
        } catch (err) {
            console.error("Failed to fetch timeline", err);
        } finally {
            setLoading(false);
        }
    }, [selectedRepo, selectedDate]);

    // Expose value
    const value = {
        timelineData,
        selectedRepo,
        setSelectedRepo,
        repos,
        selectedDate,
        setSelectedDate,
        loading,
        fetchData,
        initialFetchDone
    };

    return (
        <GithubContext.Provider value={value}>
            {children}
        </GithubContext.Provider>
    );
};
