// src/pages/TokenManagement.js
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
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import { ContentCopy, CheckCircle } from '@mui/icons-material';
import useApiService from '../services/apiService';

const TokenManagement = () => {
  const api = useApiService();
  const [tokenForm, setTokenForm] = useState({
    clientId: '',
    clientSecret: '',
    targetAgentId: '',
  });
  
  const [validationForm, setValidationForm] = useState({
    token: '',
  });
  
  const [generatedToken, setGeneratedToken] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [validateLoading, setValidateLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleTokenFormChange = (e) => {
    const { name, value } = e.target;
    setTokenForm({
      ...tokenForm,
      [name]: value,
    });
  };

  const handleValidationFormChange = (e) => {
    const { name, value } = e.target;
    setValidationForm({
      ...validationForm,
      [name]: value,
    });
  };

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    
    if (!tokenForm.clientId || !tokenForm.clientSecret || !tokenForm.targetAgentId) {
      setSnackbar({
        open: true,
        message: 'Please fill all required fields',
        severity: 'warning',
      });
      return;
    }
    
    try {
      setTokenLoading(true);
      
      const response = await api.getOAuthToken(tokenForm);
      
      setGeneratedToken(response);
      
      setSnackbar({
        open: true,
        message: 'Token generated successfully!',
        severity: 'success',
      });
      
    } catch (error) {
      console.error('Error generating token:', error);
      setSnackbar({
        open: true,
        message: `Failed to generate token: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setTokenLoading(false);
    }
  };

  const handleValidateToken = async (e) => {
    e.preventDefault();
    
    if (!validationForm.token) {
      setSnackbar({
        open: true,
        message: 'Please enter a token to validate',
        severity: 'warning',
      });
      return;
    }
    
    try {
      setValidateLoading(true);
      
      const isValid = await api.validateToken(validationForm.token);
      
      setValidationResult({
        isValid,
        timestamp: new Date().toISOString(),
      });
      
      setSnackbar({
        open: true,
        message: isValid ? 'Token is valid' : 'Token is invalid or expired',
        severity: isValid ? 'success' : 'error',
      });
      
    } catch (error) {
      console.error('Error validating token:', error);
      setValidationResult({
        isValid: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
      
      setSnackbar({
        open: true,
        message: `Validation failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setValidateLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: 'Copied to clipboard',
      severity: 'info',
    });
  };
  
  // Function to copy the entire JSON object
  const copyTokenAsJSON = () => {
    if (generatedToken) {
      const jsonString = JSON.stringify(generatedToken, null, 2);
      navigator.clipboard.writeText(jsonString);
      setSnackbar({
        open: true,
        message: 'JSON token data copied to clipboard!',
        severity: 'info',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Token Management
      </Typography>
      
      <Grid container spacing={3}>
        {/* Token Generation Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Generate Token
            </Typography>
            
            <form onSubmit={handleGenerateToken}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Client ID"
                    name="clientId"
                    value={tokenForm.clientId}
                    onChange={handleTokenFormChange}
                    required
                    helperText="The ID of the agent requesting access"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Client Secret"
                    name="clientSecret"
                    type="password"
                    value={tokenForm.clientSecret}
                    onChange={handleTokenFormChange}
                    required
                    helperText="The secret key obtained during agent registration"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Target Agent ID"
                    name="targetAgentId"
                    value={tokenForm.targetAgentId}
                    onChange={handleTokenFormChange}
                    required
                    helperText="The ID of the agent to access"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    type="submit"
                    disabled={tokenLoading}
                    fullWidth
                  >
                    {tokenLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Generate OAuth Token'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </form>
            
            {generatedToken && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  Token Generated Successfully
                </Typography>
                
                {/* JSON Display */}
                <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Token Data (JSON)
                      </Typography>
                      <Tooltip title="Copy JSON">
                        <IconButton 
                          size="small" 
                          onClick={copyTokenAsJSON}
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
                      {JSON.stringify(generatedToken, null, 2)}
                    </Typography>
                  </CardContent>
                </Card>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Access Token"
                      value={generatedToken.accessToken || ''}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Copy to clipboard">
                              <IconButton 
                                edge="end" 
                                onClick={() => copyToClipboard(generatedToken.accessToken)}
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
                      label="Expires In"
                      value={`${generatedToken.expiresIn / 60} minutes`}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
                
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  This token will expire in {generatedToken.expiresIn / 60} minutes. Make sure to store it securely.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Token Validation Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Validate Token
            </Typography>
            
            <form onSubmit={handleValidateToken}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Access Token"
                    name="token"
                    value={validationForm.token}
                    onChange={handleValidationFormChange}
                    required
                    helperText="Enter the OAuth token you want to validate"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    type="submit"
                    disabled={validateLoading}
                    fullWidth
                  >
                    {validateLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Validate Token'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </form>
            
            {validationResult && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                
                <Alert 
                  severity={validationResult.isValid ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                >
                  {validationResult.isValid 
                    ? 'Token is valid and active'
                    : `Token is invalid or expired${validationResult.error ? ': ' + validationResult.error : ''}`
                  }
                </Alert>
                
                <Typography variant="body2" color="textSecondary">
                  Checked at: {formatDateTime(validationResult.timestamp)}
                </Typography>
              </Box>
            )}
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

export default TokenManagement;