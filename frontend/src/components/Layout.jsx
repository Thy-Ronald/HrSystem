import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Container,
  Tab,
  Tabs,
  Badge,
  Avatar
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from './ConfirmDialog';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';


const Layout = ({ children, currentPath, onNavigate }) => {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const bellRef = React.useRef(null);
  const {
    notifications,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    count,
    markAsRead,
    isRead,
    clearAll
  } = useNotifications();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navItems = [

    { label: 'Employees', path: 'employee-dropdown', adminOnly: true },
    { label: 'Github Analytics', path: 'github-analytics' },
    { label: 'Ranking', path: 'staff-ranking' },
    { label: 'Monitoring', path: 'monitoring' },
    { label: 'Settings', path: 'settings' },
  ].filter(item => !item.adminOnly || isAdmin);

  // Map our currentPath to the tab index
  const tabValue = navItems.findIndex(item => {
    if (item.path === 'employee-dropdown') {
      return currentPath === 'contract-form' || currentPath === 'information';
    }
    return item.path === currentPath;
  });
  const effectiveTabValue = tabValue === -1 ? 0 : tabValue;

  const handleTabChange = (event, newValue) => {
    const item = navItems[newValue];

    // Only navigate to implemented pages
    if (['staff-ranking', 'monitoring', 'github-analytics', 'settings'].includes(item.path)) {
      onNavigate(item.path);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 2
        }}
      >
        <Toolbar variant="dense" sx={{ justifyContent: 'space-between', minHeight: 48 }}>
          {/* Logo */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', mr: 2, cursor: 'pointer' }}
            onClick={() => onNavigate('staff-ranking')}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary',
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
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    color: 'text.primary',
                    fontWeight: 500,
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 2,
                  bottom: 8
                }
              }}
            >
              {navItems.map((item, index) => {
                const isEmployeeDropdown = item.path === 'employee-dropdown';

                const tabContent = (
                  <Tab
                    key={index}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {item.label}
                        {isEmployeeDropdown && (
                          <ArrowDropDownIcon sx={{ fontSize: '1.2rem', mt: 0.2 }} />
                        )}
                      </Box>
                    }
                  />
                );

                if (isEmployeeDropdown) {
                  return (
                    <DropdownMenu key={index}>
                      <DropdownMenuTrigger asChild>
                        {tabContent}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1">
                        <DropdownMenuItem
                          className="text-slate-700 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer py-2 px-3 rounded-md text-sm transition-colors"
                          onClick={() => onNavigate('contract-form')}
                        >
                          Contract
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-slate-700 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer py-2 px-3 rounded-md text-sm transition-colors"
                          onClick={() => onNavigate('information')}
                        >
                          Information
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return tabContent;
              })}
            </Tabs>

          </Box>

          {/* User Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
            {isAdmin && (
              <>
                <Button
                  ref={bellRef}
                  variant="ghost"
                  size="icon"
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative"
                >
                  <Badge badgeContent={count} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}>
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </Button>

                {notificationOpen && (
                  <NotificationDropdown
                    open={notificationOpen}
                    onClose={() => setNotificationOpen(false)}
                    notifications={notifications}
                    loading={loading}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                    loadMore={loadMore}
                    onNotificationClick={markAsRead}
                    isRead={isRead}
                    onNavigate={onNavigate}
                    clearAll={clearAll}
                    toggleRef={bellRef}
                  />
                )}
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', ml: 1 }}>
                  {user?.avatar_url && (
                    <Avatar
                      src={user.avatar_url}
                      sx={{ width: 28, height: 28, mr: 1, border: '1px solid', borderColor: 'divider' }}
                    />
                  )}
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, mr: 0.5 }}>
                    {user?.name || 'User'}
                  </Typography>
                  <ArrowDropDownIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </Box>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1">
                <DropdownMenuItem className="text-slate-400 dark:text-slate-500 focus:bg-transparent cursor-default py-2 px-3 text-sm opacity-50">
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 cursor-pointer py-2 px-3 rounded-md text-sm transition-colors"
                  onClick={() => setLogoutConfirmOpen(true)}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        <Container maxWidth={false} sx={{ py: 3, height: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1,
            border: '1px solid',
            borderColor: 'divider',
            minHeight: 'calc(100vh - 120px)',
            width: '100%'
          }}>
            {children}
          </Box>
        </Container>
      </Box>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Confirm Logout"
        description="Are you sure you want to end your session?"
        confirmText="Logout"
        confirmVariant="destructive"
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          logout();
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />

    </Box>
  );
};

export default Layout;

