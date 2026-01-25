import React, { createContext, useState, useContext } from 'react';

const ContributeContext = createContext();

export const ContributeProvider = ({ children }) => {
    // Mode: 'contribute' or 'verify'
    const [mode, setMode] = useState('contribute');

    return (
        <ContributeContext.Provider value={{ mode, setMode }}>
            {children}
        </ContributeContext.Provider>
    );
};

export const useContribute = () => {
    const context = useContext(ContributeContext);
    if (!context) {
        throw new Error("useContribute must be used within a ContributeProvider");
    }
    return context;
};
