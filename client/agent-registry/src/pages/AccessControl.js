// src/pages/AccessControl.js
import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import useApiService from '../services/apiService';

const AccessControl = () => {
  const api = useApiService();
  
  const [requestForm, setRequestForm] = useState({
    requesterId: '',
    targetAgentId: '',
  });
  
  const [approveForm, setApproveForm] = useState({
    approverId: '',
    requesterId: '',
  });
  
  const [requestLoading, setRequestLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleRequestFormChange = (e) => {
    const { name, value } = e.target;
    setRequestForm({
      ...requestForm,
      [name]: value,
    });
  };

  const handleApproveFormChange = (e) => {
    const { name, value } = e.target;
    setApproveForm({
      ...approveForm,
      [name]: value,
    });
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    
    if (!requestForm.requesterId || !requestForm.targetAgentId) {
      setSnackbar({
        open: true,
        message: 'Please fill all required fields',
        severity: 'warning',
      });
      return;
    }
    
    try {
      setRequestLoading(true);
      
      const response = await api.requestAccess(requestForm);
      
      setSnackbar({
        open: true,
        message: response.message || 'Access request submitted successfully!',
        severity: 'success',
      });
      
      // Clear form
      setRequestForm({
        requesterId: '',
        targetAgentId: '',
      });
      
    } catch (error) {
      console.error('Error requesting access:', error);
      setSnackbar({
        open: true,
        message: `Request failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setRequestLoading(false);
    }
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    
    if (!approveForm.approverId || !approveForm.requesterId) {
      setSnackbar({
        open: true,
        message: 'Please fill all required fields',
        severity: 'warning',
      });
      return;
    }
    
    try {
      setApproveLoading(true);
      
      const response = await api.approveAccess(approveForm);
      
      setSnackbar({
        open: true,
        message: response.message || 'Access approved successfully!',
        severity: 'success',
      });
      
      // Clear form
      setApproveForm({
        approverId: '',
        requesterId: '',
      });
      
    } catch (error) {
      console.error('Error approving access:', error);
      setSnackbar({
        open: true,
        message: `Approval failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setApproveLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Access Control
      </Typography>
      
      <Grid container spacing={3}>
        {/* Request Access Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Request Access
            </Typography>
            
            <form onSubmit={handleRequestSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Requester ID"
                    name="requesterId"
                    value={requestForm.requesterId}
                    onChange={handleRequestFormChange}
                    required
                    helperText="The ID of the agent requesting access"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Target Agent ID"
                    name="targetAgentId"
                    value={requestForm.targetAgentId}
                    onChange={handleRequestFormChange}
                    required
                    helperText="The ID of the agent to access"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    type="submit"
                    disabled={requestLoading}
                    fullWidth
                  >
                    {requestLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Request Access'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
        
        {/* Approve Access Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Approve Access
            </Typography>
            
            <form onSubmit={handleApproveSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Approver ID"
                    name="approverId"
                    value={approveForm.approverId}
                    onChange={handleApproveFormChange}
                    required
                    helperText="The ID of the agent approving access (target agent)"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Requester ID"
                    name="requesterId"
                    value={approveForm.requesterId}
                    onChange={handleApproveFormChange}
                    required
                    helperText="The ID of the agent that requested access"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    type="submit"
                    disabled={approveLoading}
                    fullWidth
                  >
                    {approveLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Approve Access'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AccessControl;