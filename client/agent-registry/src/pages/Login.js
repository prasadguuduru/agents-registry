// src/pages/Login.js
import React, { useState, useContext } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Link,
  Divider,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { LockOutlined, Login as LoginIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'rememberMe' ? checked : value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // For demonstration, simulate API call and use hardcoded credentials
      // In production, this would call your authentication API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (formData.username === 'admin' && formData.password === 'password') {
        // Create a mock token for demonstration
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjE2NDAxNjAwLCJleHAiOjE2MTY0ODgwMDB9.8e2F4HiIwQcjdKUVA3b2nXwMmMuXZzdtdDfhR2I1Vj8';
        
        // Login with the AuthContext
        login({
          id: '123456',
          name: 'Administrator',
          username: formData.username,
          role: 'admin'
        }, token);
        
        // Redirect to the dashboard or the page user tried to access
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else if (formData.username === 'user' && formData.password === 'password') {
        // Regular user login
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3ODkwMTIiLCJ1c2VybmFtZSI6InVzZXIiLCJyb2xlIjoidXNlciIsImlhdCI6MTYxNjQwMTYwMCwiZXhwIjoxNjE2NDg4MDAwfQ.xvwZjGw7ptF2pTgmWJj5rtpeB_krEwHPJqUwIMP2YM4';
        
        login({
          id: '789012',
          name: 'Regular User',
          username: formData.username,
          role: 'user'
        }, token);
        
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box sx={{ 
            backgroundColor: 'primary.main', 
            p: 2, 
            borderRadius: '50%', 
            color: 'white',
            mb: 2
          }}>
            <LockOutlined />
          </Box>
          
          <Typography component="h1" variant="h5" gutterBottom>
            Agent Registry Login
          </Typography>
          
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
            Sign in to manage your agents and tokens
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  name="rememberMe" 
                  color="primary" 
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
              }
              label="Remember me"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <Grid container>
              <Grid item xs>
                <Link href="#" variant="body2">
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                <Link href="#" variant="body2">
                  {"Don't have an account? Contact admin"}
                </Link>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ width: '100%', mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="textSecondary" align="center">
              Demo Credentials:
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Admin: username: <strong>admin</strong>, password: <strong>password</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                User: username: <strong>user</strong>, password: <strong>password</strong>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;