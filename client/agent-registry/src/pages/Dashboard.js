// src/pages/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { 
  Group, VpnKey, Security, Assessment, 
  TrendingUp, TrendingDown
} from '@mui/icons-material';
import StatusCard from '../components/StatusCard';
import DataTable from '../components/DataTable';
import { AuthContext } from '../context/AuthContext';
import useApiService from '../services/apiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const api = useApiService();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeTokens: 0,
    pendingRequests: 0,
    totalTokenUsage: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  // Sample data for the chart - in production this would come from your API
  const [chartData, setChartData] = useState([
    { name: 'Jan', tokens: 400, requests: 240 },
    { name: 'Feb', tokens: 300, requests: 139 },
    { name: 'Mar', tokens: 200, requests: 980 },
    { name: 'Apr', tokens: 278, requests: 390 },
    { name: 'May', tokens: 189, requests: 480 },
    { name: 'Jun', tokens: 239, requests: 380 },
    { name: 'Jul', tokens: 349, requests: 430 },
  ]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all required data in parallel
        const [agents, acl, tokenUsage, auditTrail] = await Promise.all([
          api.listAgents(),
          api.listACL(),
          api.getTokenUsageCount(),
          api.getAuditTrail(),
        ]);

        // Process the data for the dashboard
        setStats({
          totalAgents: agents.agents?.length || 0,
          activeTokens: 15, // This would need to be calculated from actual token data
          pendingRequests: acl?.filter(req => req.status === 'pending')?.length || 0,
          totalTokenUsage: tokenUsage?.totalUsage || 0,
        });

        // Process recent activity from audit trail
        if (auditTrail?.events?.length > 0) {
          const recent = auditTrail.events
            .slice(0, 5)
            .map(event => ({
              id: event.id,
              action: event.action,
              agent: event.agentId,
              timestamp: new Date(event.timestamp).toLocaleString(),
              status: event.status,
            }));
          setRecentActivity(recent);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set some mock data for demonstration
        setStats({
          totalAgents: 24,
          activeTokens: 15,
          pendingRequests: 7,
          totalTokenUsage: 362,
        });

        setRecentActivity([
          { id: 1, action: 'Token Request', agent: 'shopping-agent', timestamp: '2023-04-15 09:23:45', status: 'approved' },
          { id: 2, action: 'New Registration', agent: 'weather-agent', timestamp: '2023-04-14 14:11:32', status: 'completed' },
          { id: 3, action: 'Access Request', agent: 'news-agent', timestamp: '2023-04-14 10:45:18', status: 'pending' },
          { id: 4, action: 'Token Revoked', agent: 'finance-agent', timestamp: '2023-04-13 16:32:09', status: 'revoked' },
          { id: 5, action: 'Access Approved', agent: 'translation-agent', timestamp: '2023-04-13 11:27:54', status: 'approved' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const activityColumns = [
    { id: 'timestamp', label: 'Time' },
    { id: 'action', label: 'Action' },
    { id: 'agent', label: 'Agent' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => {
        const statusColors = {
          approved: '#4caf50',
          completed: '#2196f3',
          pending: '#ff9800',
          revoked: '#f44336',
        };
        return (
          <Box 
            sx={{ 
              backgroundColor: statusColors[row.status] || '#9e9e9e',
              color: '#fff',
              borderRadius: '4px',
              padding: '3px 8px',
              display: 'inline-block',
              textTransform: 'capitalize',
            }}
          >
            {row.status}
          </Box>
        );
      } 
    },
  ];

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {user && (
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          Welcome back, {user.name || 'User'}!
        </Typography>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard 
            title="Total Agents" 
            value={stats.totalAgents}
            icon={<Group />} 
            loading={loading}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard 
            title="Active Tokens" 
            value={stats.activeTokens} 
            icon={<VpnKey />} 
            loading={loading}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard 
            title="Pending Requests" 
            value={stats.pendingRequests} 
            icon={<Security />} 
            loading={loading}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatusCard 
            title="Token Usage" 
            value={stats.totalTokenUsage} 
            icon={<Assessment />} 
            loading={loading}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Activity Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="tokens" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#82ca9d" 
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#4caf50',
                  mr: 1,
                }}
              />
              <Typography variant="body1">API: Operational</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#4caf50',
                  mr: 1,
                }}
              />
              <Typography variant="body1">Token Service: Operational</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#4caf50',
                  mr: 1,
                }}
              />
              <Typography variant="body1">Database: Operational</Typography>
            </Box>
            
            <Box sx={{ mt: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Token Success Rate
                </Typography>
                <Typography variant="body2" color="primary">
                  98.2%
                </Typography>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  backgroundColor: '#e0e0e0',
                  borderRadius: 1,
                  height: 8,
                }}
              >
                <Box
                  sx={{
                    width: '98.2%',
                    backgroundColor: '#4caf50',
                    borderRadius: 1,
                    height: 8,
                  }}
                />
              </Box>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  System Load
                </Typography>
                <Typography variant="body2" color="primary">
                  42%
                </Typography>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  backgroundColor: '#e0e0e0',
                  borderRadius: 1,
                  height: 8,
                }}
              >
                <Box
                  sx={{
                    width: '42%',
                    backgroundColor: '#2196f3',
                    borderRadius: 1,
                    height: 8,
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <DataTable
            title="Recent Activity"
            columns={activityColumns}
            data={recentActivity}
          />
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;