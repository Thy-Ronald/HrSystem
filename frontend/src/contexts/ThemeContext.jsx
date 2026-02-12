import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'system';
    });

    const [activeMode, setActiveMode] = useState(() => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    });

    useEffect(() => {
        const root = window.document.documentElement;

        const updateTheme = () => {
            root.classList.remove('light', 'dark');
            let mode = theme;

            if (theme === 'system') {
                mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            root.classList.add(mode);
            setActiveMode(mode);
            localStorage.setItem('theme', theme);
        };

        updateTheme();

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', updateTheme);
            return () => mediaQuery.removeEventListener('change', updateTheme);
        }
    }, [theme]);

    const muiTheme = useMemo(() => {
        return createTheme({
            palette: {
                mode: activeMode,
                primary: {
                    main: '#1a73e8',
                },
                background: {
                    default: activeMode === 'dark' ? '#020617' : '#f8fafc',
                    paper: activeMode === 'dark' ? '#0f172a' : '#ffffff',
                },
            },
            typography: {
                fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
            },
            shape: {
                borderRadius: 8,
            },
        });
    }, [activeMode]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, activeMode }}>
            <MUIThemeProvider theme={muiTheme}>
                {children}
            </MUIThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
