// src/pages/AuditTrail.js
import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Chip, 
  Button, 
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import { 
  Refresh, 
  FilterList, 
  FileDownload,
  MoreVert
} from '@mui/icons-material';
import useApiService from '../services/apiService';
import DataTable from '../components/DataTable';

const AuditTrail = () => {
  const api = useApiService();
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    agentId: '',
    action: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  // Define action types and statuses for filtering
  const actionTypes = [
    'Token Request', 
    'Token Validation', 
    'Agent Registration', 
    'Access Request', 
    'Access Approval', 
    'Token Revocation'
  ];
  
  const statusTypes = [
    'success', 
    'failure', 
    'pending', 
    'revoked'
  ];

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const response = await api.getAuditTrail();
      
      // If the API doesn't return any data, use mock data for demonstration
      let events = response?.events || [];
      
      if (events.length === 0) {
        events = [
          { id: 1, timestamp: '2023-04-15T09:23:45Z', agentId: 'shopping-agent', action: 'Token Request', targetAgentId: 'weather-agent', status: 'success', details: 'Token generated successfully' },
          { id: 2, timestamp: '2023-04-14T14:11:32Z', agentId: 'news-agent', action: 'Access Request', targetAgentId: 'finance-agent', status: 'pending', details: 'Access request submitted' },
          { id: 3, timestamp: '2023-04-14T10:45:18Z', agentId: 'calendar-agent', action: 'Agent Registration', targetAgentId: null, status: 'success', details: 'Agent registered successfully' },
          { id: 4, timestamp: '2023-04-13T16:32:09Z', agentId: 'finance-agent', action: 'Token Validation', targetAgentId: 'news-agent', status: 'failure', details: 'Token expired' },
          { id: 5, timestamp: '2023-04-13T11:27:54Z', agentId: 'translation-agent', action: 'Access Approval', targetAgentId: 'analytics-agent', status: 'success', details: 'Access granted' },
          { id: 6, timestamp: '2023-04-12T15:49:22Z', agentId: 'music-agent', action: 'Token Revocation', targetAgentId: 'shopping-agent', status: 'success', details: 'Token revoked manually' },
          { id: 7, timestamp: '2023-04-11T08:17:36Z', agentId: 'weather-agent', action: 'Token Request', targetAgentId: 'calendar-agent', status: 'success', details: 'Token generated successfully' },
          { id: 8, timestamp: '2023-04-10T13:52:41Z', agentId: 'analytics-agent', action: 'Token Validation', targetAgentId: 'music-agent', status: 'success', details: 'Token valid' }
        ];
      }
      
      setAuditData(events);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      setSnackbar({
        open: true,
        message: `Failed to fetch audit trail: ${error.message}`,
        severity: 'error',
      });
      
      // Set mock data for demonstration
      setAuditData([
        { id: 1, timestamp: '2023-04-15T09:23:45Z', agentId: 'shopping-agent', action: 'Token Request', targetAgentId: 'weather-agent', status: 'success', details: 'Token generated successfully' },
        { id: 2, timestamp: '2023-04-14T14:11:32Z', agentId: 'news-agent', action: 'Access Request', targetAgentId: 'finance-agent', status: 'pending', details: 'Access request submitted' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const clearFilters = () => {
    setFilters({
      agentId: '',
      action: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['ID', 'Timestamp', 'Agent ID', 'Action', 'Target Agent', 'Status', 'Details'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.id,
        row.timestamp,
        row.agentId,
        row.action,
        row.targetAgentId || '',
        row.status,
        `"${row.details?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit-trail-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSnackbar({
      open: true,
      message: 'Audit trail exported successfully',
      severity: 'success',
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      success: { color: 'success' },
      failure: { color: 'error' },
      pending: { color: 'warning' },
      revoked: { color: 'default' },
    };
    
    const config = statusConfig[status] || { color: 'default' };
    
    return (
      <Chip 
        label={status} 
        color={config.color} 
        size="small" 
      />
    );
  };

  // Apply filters to data
  const filteredData = auditData.filter(item => {
    // Agent ID filter
    if (filters.agentId && !item.agentId.toLowerCase().includes(filters.agentId.toLowerCase())) {
      return false;
    }
    
    // Action filter
    if (filters.action && item.action !== filters.action) {
      return false;
    }
    
    // Status filter
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    
    // Date from filter
    if (filters.dateFrom) {
      const itemDate = new Date(item.timestamp);
      const fromDate = new Date(filters.dateFrom);
      if (itemDate < fromDate) {
        return false;
      }
    }
    
    // Date to filter
    if (filters.dateTo) {
      const itemDate = new Date(item.timestamp);
      const toDate = new Date(filters.dateTo);
      // Add one day to include the end date fully
      toDate.setDate(toDate.getDate() + 1);
      if (itemDate >= toDate) {
        return false;
      }
    }
    
    return true;
  });

  const columns = [
    { id: 'id', label: 'ID' },
    { 
      id: 'timestamp', 
      label: 'Timestamp', 
      render: (row) => formatDate(row.timestamp)
    },
    { id: 'agentId', label: 'Agent ID' },
    { id: 'action', label: 'Action' },
    { id: 'targetAgentId', label: 'Target Agent', render: (row) => row.targetAgentId || '-' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => getStatusChip(row.status)
    },
    { id: 'details', label: 'Details', render: (row) => row.details || '-' },
  ];

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Audit Trail
        </Typography>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={toggleFilters}
            sx={{ mr: 1 }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExport}
            disabled={loading || filteredData.length === 0}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAuditTrail}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Agent ID"
                name="agentId"
                value={filters.agentId}
                onChange={handleFilterChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="action-filter-label">Action</InputLabel>
                <Select
                  labelId="action-filter-label"
                  name="action"
                  value={filters.action}
                  onChange={handleFilterChange}
                  label="Action"
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {actionTypes.map((action) => (
                    <MenuItem key={action} value={action}>{action}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {statusTypes.map((status) => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="From Date"
                name="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="To Date"
                name="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                color="secondary"
                onClick={clearFilters}
                sx={{ mt: 1 }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <div>
            <DataTable
              columns={columns}
              data={filteredData}
              title={`Audit Events (${filteredData.length})`}
            />
            
            {filteredData.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1">
                  No audit events found matching your criteria.
                </Typography>
              </Box>
            )}
          </div>
        )}
      </Paper>
      
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

export default AuditTrail;