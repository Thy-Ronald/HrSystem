import React, { useState } from 'react';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications } from '../hooks/useNotifications';

const Layout = ({ children, currentPath, onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { notifications, loading, count, markAsRead, isRead } = useNotifications();

  return (
    <div className="flex flex-col h-screen bg-[#f6f8fc]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#f6f8fc]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 hover:bg-[#eaebef] rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-[#ea4335] p-1.5 rounded-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </div>
            <span className="text-xl text-[#5f6368] font-medium tracking-tight">HR System</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center px-8">
          <div className="gmail-search-bar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" className="mr-3">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input 
              type="text" 
              placeholder="Search in HR..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-base placeholder:text-[#5f6368]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="p-2 hover:bg-[#eaebef] rounded-full transition-colors text-[#5f6368] relative"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {count > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-[#e41e3f] text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
          <NotificationDropdown
            open={notificationOpen}
            onClose={() => setNotificationOpen(false)}
            notifications={notifications}
            loading={loading}
            onNotificationClick={markAsRead}
            isRead={isRead}
            onNavigate={onNavigate}
          />
        </div>

      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } flex flex-col pt-2 transition-all duration-300 ease-in-out overflow-hidden`}
        >
          <nav className={`flex-1 ${sidebarOpen ? 'pr-4' : ''}`}>
            <div 
              onClick={() => onNavigate('dashboard')}
              className={`${
                sidebarOpen 
                  ? `gmail-sidebar-item ${currentPath === 'dashboard' ? 'active' : ''}`
                  : `flex items-center justify-center w-14 h-11 mx-auto mb-1 rounded-r-full cursor-pointer transition-colors ${
                      currentPath === 'dashboard' ? 'bg-[#d3e3fd] text-[#041e49] font-medium' : 'hover:bg-[#eaebef]'
                    }`
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {sidebarOpen && <span>Dashboard</span>}
            </div>
            
            <div 
              onClick={() => onNavigate('contract-form')}
              className={`${
                sidebarOpen 
                  ? `gmail-sidebar-item ${currentPath === 'contract-form' ? 'active' : ''}`
                  : `flex items-center justify-center w-14 h-11 mx-auto mb-1 rounded-r-full cursor-pointer transition-colors ${
                      currentPath === 'contract-form' ? 'bg-[#d3e3fd] text-[#041e49] font-medium' : 'hover:bg-[#eaebef]'
                    }`
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {sidebarOpen && <span>Contracts</span>}
            </div>

            <div 
              className={`${
                sidebarOpen 
                  ? 'gmail-sidebar-item'
                  : 'flex items-center justify-center w-14 h-11 mx-auto mb-1 rounded-r-full cursor-pointer transition-colors hover:bg-[#eaebef]'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {sidebarOpen && <span>Employees</span>}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-white rounded-3xl mr-4 mb-4 shadow-sm border border-[#eaf1fb] transition-all duration-300">
          {React.isValidElement(children) ? React.cloneElement(children, { searchQuery }) : children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
