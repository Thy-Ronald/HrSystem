import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return (savedTheme && savedTheme !== 'system') ? savedTheme : 'light';
    });

    const [activeMode, setActiveMode] = useState(theme);

    useEffect(() => {
        const root = window.document.documentElement;

        const updateTheme = () => {
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
            setActiveMode(theme);
            localStorage.setItem('theme', theme);
        };

        updateTheme();
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
