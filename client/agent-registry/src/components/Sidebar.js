// src/components/Sidebar.js
import React, { useContext } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Box } from '@mui/material';
import { Dashboard, PersonAdd, Group, Security, VpnKey, Assessment } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const drawerWidth = 240;

const Sidebar = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole, isAuthenticated } = useContext(AuthContext);

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Register Agent', icon: <PersonAdd />, path: '/register' },
    { text: 'Agents List', icon: <Group />, path: '/agents' },
    { text: 'Access Control', icon: <Security />, path: '/access-control' },
    { text: 'Token Management', icon: <VpnKey />, path: '/tokens' },
    { text: 'Audit Trail', icon: <Assessment />, path: '/audit', role: 'admin' },
  ];

  if (!isAuthenticated()) return null;

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          mt: 8,
        },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => {
            // Skip items that require a specific role
            if (item.role && !hasRole(item.role)) {
              return null;
            }

            return (
              <ListItem
                button
                key={item.text}
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            );
          })}
        </List>
        <Divider />
      </Box>
    </Drawer>
  );
};

export default Sidebar;