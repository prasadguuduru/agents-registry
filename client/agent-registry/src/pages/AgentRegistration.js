// src/pages/AgentRegistration.js
import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Box,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import useApiService from '../services/apiService';

const AgentRegistration = () => {
  const api = useApiService();
  
  const [formData, setFormData] = useState({
    agentId: '',
    type: 'service',
  });
  
  const [registrationResult, setRegistrationResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.agentId) {
      newErrors.agentId = 'Agent ID is required';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.agentId)) {
      newErrors.agentId = 'Agent ID must contain only letters and numbers';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await api.registerAgent({
        agentId: formData.agentId,
        type: formData.type,
      });
      
      setRegistrationResult(response);
      setSnackbar({
        open: true,
        message: 'Agent registered successfully!',
        severity: 'success',
      });
      
      // Reset form except for the result
      setFormData({
        agentId: '',
        type: 'service',
      });
      
    } catch (error) {
      console.error('Error registering agent:', error);
      setSnackbar({
        open: true,
        message: `Registration failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: 'Copied to clipboard!',
      severity: 'info',
    });
  };
  
  // Function to copy the entire JSON object
  const copyCredentialsAsJSON = () => {
    if (registrationResult) {
      const jsonString = JSON.stringify(registrationResult, null, 2);
      navigator.clipboard.writeText(jsonString);
      setSnackbar({
        open: true,
        message: 'JSON credentials copied to clipboard!',
        severity: 'info',
      });
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
        Agent Registration
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={registrationResult ? 6 : 12}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Agent ID"
                    name="agentId"
                    value={formData.agentId}
                    onChange={handleChange}
                    error={!!errors.agentId}
                    helperText={errors.agentId || 'Use a unique identifier for your agent (letters and numbers)'}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Agent Type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    disabled // Since only 'service' is supported for now
                    helperText="Currently only 'service' type is supported"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={loading}
                    sx={{ mr: 1 }}
                  >
                    {loading ? 'Registering...' : 'Register Agent'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => setFormData({
                      agentId: '',
                      type: 'service',
                    })}
                    disabled={loading}
                  >
                    Clear Form
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
        
        {registrationResult && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Registration Successful
                </Typography>
              </Box>
              
              <Alert severity="warning" sx={{ mb: 3 }}>
                Save these credentials securely! The client secret will not be shown again.
              </Alert>
              
              {/* JSON Display */}
              <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Credentials (JSON)
                    </Typography>
                    <Tooltip title="Copy JSON">
                      <IconButton 
                        size="small" 
                        onClick={copyCredentialsAsJSON}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-all',
                      fontFamily: 'monospace'
                    }}
                  >
                    {JSON.stringify(registrationResult, null, 2)}
                  </Typography>
                </CardContent>
              </Card>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Agent ID"
                    value={registrationResult.agentId || ''}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Copy to clipboard">
                            <IconButton 
                              edge="end" 
                              onClick={() => copyToClipboard(registrationResult.agentId)}
                            >
                              <ContentCopy />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Client Secret"
                    value={registrationResult.clientSecret || ''}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Copy to clipboard">
                            <IconButton 
                              edge="end" 
                              onClick={() => copyToClipboard(registrationResult.clientSecret)}
                            >
                              <ContentCopy />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                    Use these credentials to generate OAuth tokens for accessing other agents.
                    Keep your client secret secure, as it cannot be recovered if lost.
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setRegistrationResult(null)}
                    sx={{ mt: 2 }}
                  >
                    Register Another Agent
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
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

export default AgentRegistration;