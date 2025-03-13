// src/context/ApiUrlContext.js
import React, { createContext } from 'react';

export const ApiUrlContext = createContext();

export const ApiUrlProvider = ({ baseUrl, children }) => {
  return (
    <ApiUrlContext.Provider value={{ baseUrl }}>
      {children}
    </ApiUrlContext.Provider>
  );
};