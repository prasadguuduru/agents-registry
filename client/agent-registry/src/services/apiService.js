// src/services/apiService.js
import { useContext } from 'react';
import { ApiUrlContext } from '../context/ApiUrlContext';

const useApiService = () => {
  const { baseUrl } = useContext(ApiUrlContext);

  // Simplified fetch function that doesn't trigger OPTIONS preflight
  const simpleFetch = async (endpoint, method, body = null) => {
    const url = `${baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    const options = {
      method,
      headers,
      // Using mode: 'same-origin' or 'no-cors' can help with CORS issues
      // but 'no-cors' will limit your ability to read the response
      // This is why a proxy is usually the best solution
      mode: 'cors',
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }
    
    return response.json();
  };

  // For calls that need Authorization header
  const authorizedFetch = async (endpoint, method, token, body = null) => {
    const url = `${baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    const options = {
      method,
      headers,
      mode: 'cors',
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      return false; // For validation endpoint
    }
    
    return response.json();
  };

  // Agent Registration - Working API
  const registerAgent = async (agentData) => {
    try {
      return await simpleFetch('/register', 'POST', agentData);
    } catch (error) {
      throw new Error(`Failed to register agent: ${error.message}`);
    }
  };

  // Access Control - Working APIs
  const requestAccess = async (requestData) => {
    try {
      return await simpleFetch('/request-access', 'POST', requestData);
    } catch (error) {
      throw new Error(`Failed to request access: ${error.message}`);
    }
  };

  const approveAccess = async (approvalData) => {
    try {
      return await simpleFetch('/approve-access', 'POST', approvalData);
    } catch (error) {
      throw new Error(`Failed to approve access: ${error.message}`);
    }
  };

  // Token Management - Working APIs
  const getOAuthToken = async (tokenData) => {
    try {
      return await simpleFetch('/token', 'POST', tokenData);
    } catch (error) {
      throw new Error(`Failed to get token: ${error.message}`);
    }
  };

  const validateToken = async (token) => {
    try {
      const result = await authorizedFetch('/validate', 'GET', token);
      return result !== false;
    } catch (error) {
      return false;
    }
  };

  return {
    registerAgent,
    requestAccess,
    approveAccess,
    getOAuthToken,
    validateToken
  };
};

export default useApiService;