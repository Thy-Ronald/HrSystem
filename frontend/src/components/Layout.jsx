import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Container,
  Tab,
  Tabs,
  Badge
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  ArrowDropDown as ArrowDropDownIcon,
  AccountCircle
} from '@mui/icons-material';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';

import logo from '../assets/logo.png';

const Layout = ({ children, currentPath, onNavigate }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { notifications, loading, count, markAsRead, isRead } = useNotifications();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const navItems = [
    { label: 'Dashboard', path: 'dashboard' },
    { label: 'Employees', path: 'contract-form', adminOnly: true },
    { label: 'Github Analytics', path: 'github-analytics' },
    { label: 'Ranking', path: 'staff-ranking' },
    { label: 'Monitoring', path: 'monitoring' },
  ].filter(item => !item.adminOnly || isAdmin);

  // Map our currentPath to the tab index
  const tabValue = navItems.findIndex(item => item.path === currentPath);
  const effectiveTabValue = tabValue === -1 ? 0 : tabValue;

  const handleTabChange = (event, newValue) => {
    const targetPath = navItems[newValue].path;
    // Only navigate to implemented pages
    if (['dashboard', 'contract-form', 'staff-ranking', 'monitoring'].includes(targetPath)) {
      onNavigate(targetPath);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f7f9' }}>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #e0e0e0',
          px: 2
        }}
      >
        <Toolbar variant="dense" sx={{ justifyContent: 'space-between', minHeight: 48 }}>
          {/* Logo */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', mr: 2, cursor: 'pointer' }}
            onClick={() => onNavigate('dashboard')}
          >
            <Box
              component="img"
              src={logo}
              alt="THY Logo"
              sx={{ height: 28, width: 'auto', mr: 1 }}
            />
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 'bold',
                color: '#333',
                letterSpacing: 1,
              }}
            >
              THY
            </Typography>
          </Box>

          {/* Navigation Tabs */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <Tabs
              value={effectiveTabValue}
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  minWidth: 0,
                  mx: 1,
                  fontSize: '0.85rem',
                  fontWeight: 400,
                  color: '#666',
                  '&.Mui-selected': {
                    color: '#333',
                    fontWeight: 500,
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 2,
                  bottom: 8
                }
              }}
            >
              {navItems.map((item, index) => (
                <Tab key={index} label={item.label} />
              ))}
            </Tabs>
          </Box>

          {/* User Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setNotificationOpen(!notificationOpen)}
              sx={{ color: '#5f6368' }}
            >
              <Badge badgeContent={count} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', ml: 1 }} onClick={handleMenu}>
              <Typography variant="body2" sx={{ color: '#333', fontWeight: 500, mr: 0.5 }}>
                {user?.name || 'User'}
              </Typography>
              <ArrowDropDownIcon fontSize="small" sx={{ color: '#666' }} />
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={handleClose} disabled>Profile</MenuItem>
              <MenuItem onClick={() => { handleClose(); logout(); }}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {notificationOpen && (
          <NotificationDropdown
            open={notificationOpen}
            onClose={() => setNotificationOpen(false)}
            notifications={notifications}
            loading={loading}
            onNotificationClick={markAsRead}
            isRead={isRead}
            onNavigate={onNavigate}
          />
        )}
        <Container maxWidth={false} sx={{ py: 3, height: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{
            bgcolor: 'white',
            borderRadius: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            minHeight: 'calc(100vh - 120px)',
            width: '100%'
          }}>
            {children}
          </Box>
        </Container>
      </Box>

    </Box>
  );
};

export default Layout;

