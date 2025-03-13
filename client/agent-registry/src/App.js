import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, IconButton, Container } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';

// Pages
import AgentRegistration from './pages/AgentRegistration';
import AccessControl from './pages/AccessControl';
import TokenManagement from './pages/TokenManagement';
import AuthLogs from './pages/AuthLogs'; //

// Context
import { ApiUrlProvider } from './context/ApiUrlContext';

function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
  };

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });

  return (
    <ApiUrlProvider baseUrl="https://dvuwd91m1ghd.cloudfront.net/prod">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
              <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  Agent Registry
                </Typography>
                <IconButton color="inherit" onClick={toggleDarkMode}>
                  {darkMode ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
              </Toolbar>
            </AppBar>
            
            <Container component="main" sx={{ mt: 4, flexGrow: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Typography 
                  component="a" 
                  href="/" 
                  sx={{ 
                    color: 'primary.main', 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Register Agent
                </Typography>
                <Typography 
                  component="a" 
                  href="/access-control" 
                  sx={{ 
                    color: 'primary.main', 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Access Control
                </Typography>
                <Typography 
                  component="a" 
                  href="/tokens" 
                  sx={{ 
                    color: 'primary.main', 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Token Management
                </Typography>
                <Typography 
                  component="a" 
                  href="/agent-interactions" 
                  sx={{ 
                    color: 'primary.main', 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Agent Interactions
                </Typography>
              </Box>
              
              <Routes>
                <Route path="/" element={<AgentRegistration />} />
                <Route path="/access-control" element={<AccessControl />} />
                <Route path="/tokens" element={<TokenManagement />} />
                <Route path="/agent-interactions" element={<AuthLogs />} />
              </Routes>
            </Container>
            
            <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: 'background.paper' }}>
              <Typography variant="body2" color="text.secondary" align="center">
                Agent Registry © {new Date().getFullYear()}
              </Typography>
            </Box>
          </Box>
        </Router>
      </ThemeProvider>
    </ApiUrlProvider>
  );
}

export default App;
