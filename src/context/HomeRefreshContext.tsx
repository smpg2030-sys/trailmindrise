import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HomeRefreshContextType {
    refreshTrigger: number;
    triggerRefresh: () => void;
}

const HomeRefreshContext = createContext<HomeRefreshContextType | undefined>(undefined);

export function HomeRefreshProvider({ children }: { children: ReactNode }) {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <HomeRefreshContext.Provider value={{ refreshTrigger, triggerRefresh }}>
            {children}
        </HomeRefreshContext.Provider>
    );
}

export function useHomeRefresh() {
    const context = useContext(HomeRefreshContext);
    if (context === undefined) {
        throw new Error('useHomeRefresh must be used within a HomeRefreshProvider');
    }
    return context;
}
