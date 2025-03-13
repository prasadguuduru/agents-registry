// src/pages/AgentsList.js
import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Chip, 
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { 
  Search, 
  Refresh, 
  VpnKey, 
  Security, 
  Info, 
  ViewModule, 
  ViewList
} from '@mui/icons-material';
import useApiService from '../services/apiService';
import DataTable from '../components/DataTable';

const AgentsList = () => {
  const api = useApiService();
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestAccessData, setRequestAccessData] = useState({
    requesterId: '',
    targetAgentId: '',
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAgents(agents);
    } else {
      const filtered = agents.filter(agent => 
        agent.agentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agent.name && agent.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredAgents(filtered);
    }
  }, [searchTerm, agents]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.listAgents();
      
      // Add some mock data for demonstration if the API doesn't return enough
      let agentsList = response.agents || [];
      
      if (agentsList.length === 0) {
        agentsList = [
          { agentId: 'shopping-agent', type: 'assistant', name: 'Shopping Assistant', description: 'Helps users find products and make purchases', capabilities: 'product search, price comparison, checkout' },
          { agentId: 'weather-agent', type: 'data-processor', name: 'Weather Service', description: 'Provides weather forecasts and alerts', capabilities: 'weather forecasting, radar data, alerts' },
          { agentId: 'news-agent', type: 'content-generator', name: 'News Aggregator', description: 'Collects and summarizes news articles', capabilities: 'news collection, summarization, trending topics' },
          { agentId: 'finance-agent', type: 'service', name: 'Financial Advisor', description: 'Offers financial advice and portfolio management', capabilities: 'portfolio analysis, investment recommendations, market data' },
          { agentId: 'translation-agent', type: 'service', name: 'Translation Service', description: 'Translates text between languages', capabilities: 'text translation, language detection, terminology management' },
          { agentId: 'calendar-agent', type: 'assistant', name: 'Calendar Assistant', description: 'Manages calendar events and appointments', capabilities: 'event scheduling, reminders, availability checking' },
          { agentId: 'analytics-agent', type: 'data-processor', name: 'Analytics Tool', description: 'Processes and visualizes data', capabilities: 'data analysis, visualization, reporting' },
          { agentId: 'music-agent', type: 'content-generator', name: 'Music Recommendation', description: 'Suggests music based on preferences', capabilities: 'music recommendations, playlist generation, trend analysis' },
        ];
      }
      
      setAgents(agentsList);
      setFilteredAgents(agentsList);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setSnackbar({
        open: true,
        message: `Failed to fetch agents: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    
    if (searchTerm.trim() === '') {
      fetchAgents();
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.searchAgents(searchTerm);
      setAgents(response.agents || []);
      setFilteredAgents(response.agents || []);
    } catch (error) {
      console.error('Error searching agents:', error);
      setSnackbar({
        open: true,
        message: `Search failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = (agent) => {
    setSelectedAgent(agent);
    setRequestAccessData({
      requesterId: '',
      targetAgentId: agent.agentId,
    });
    setDialogOpen(true);
  };

  const submitAccessRequest = async () => {
    try {
      await api.requestAccess(requestAccessData);
      setDialogOpen(false);
      setSnackbar({
        open: true,
        message: `Access request to ${selectedAgent.agentId} submitted successfully`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error requesting access:', error);
      setSnackbar({
        open: true,
        message: `Failed to request access: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleRequestorIdChange = (e) => {
    setRequestAccessData({
      ...requestAccessData,
      requesterId: e.target.value,
    });
  };

  const getTypeColor = (type) => {
    const colors = {
      'assistant': 'primary',
      'data-processor': 'success',
      'connector': 'warning',
      'service': 'info',
      'content-generator': 'secondary',
    };
    return colors[type] || 'default';
  };

  const tableColumns = [
    { id: 'agentId', label: 'Agent ID' },
    { id: 'type', label: 'Type', render: (row) => (
      <Chip label={row.type} color={getTypeColor(row.type)} size="small" />
    )},
    { id: 'name', label: 'Name' },
    { id: 'description', label: 'Description' },
    { id: 'actions', label: 'Actions', render: (row) => (
      <Box>
        <IconButton color="primary" onClick={() => handleRequestAccess(row)} title="Request Access">
          <Security fontSize="small" />
        </IconButton>
        <IconButton color="secondary" title="View Details">
          <Info fontSize="small" />
        </IconButton>
      </Box>
    )},
  ];

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Agents Directory
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="grid" aria-label="grid view">
              <ViewModule />
            </ToggleButton>
            <ToggleButton value="table" aria-label="table view">
              <ViewList />
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAgents}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      <form onSubmit={handleSearchSubmit}>
        <TextField
          fullWidth
          label="Search Agents"
          variant="outlined"
          value={searchTerm}
          onChange={handleSearch}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button type="submit" variant="contained" disabled={loading}>
                  Search
                </Button>
              </InputAdornment>
            ),
          }}
        />
      </form>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={tableColumns}
          data={filteredAgents}
        />
      ) : (
        <Grid container spacing={3}>
          {filteredAgents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={agent.agentId}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div" sx={{ wordBreak: 'break-word' }}>
                      {agent.name || agent.agentId}
                    </Typography>
                    <Chip 
                      label={agent.type} 
                      color={getTypeColor(agent.type)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    ID: {agent.agentId}
                  </Typography>
                  
                  {agent.description && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {agent.description}
                    </Typography>
                  )}
                  
                  {agent.capabilities && (
                    <Box sx={{ mt: 'auto' }}>
                      <Typography variant="caption" color="text.secondary">
                        Capabilities:
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {agent.capabilities.split(',').map((capability, idx) => (
                          <Chip 
                            key={idx}
                            label={capability.trim()}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<Security />}
                    onClick={() => handleRequestAccess(agent)}
                  >
                    Request Access
                  </Button>
                  <Button size="small" startIcon={<Info />}>
                    Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          
          {filteredAgents.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1">
                  No agents found matching your search criteria.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
      
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Request Access</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            You are requesting access to <strong>{selectedAgent?.agentId}</strong>.
            Please provide your agent ID to submit this request.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Your Agent ID"
            fullWidth
            variant="outlined"
            value={requestAccessData.requesterId}
            onChange={handleRequestorIdChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={submitAccessRequest} 
            color="primary"
            disabled={!requestAccessData.requesterId}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default AgentsList;