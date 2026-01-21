import { TestNotificationPanel } from '../components/TestNotificationPanel';
import { useNotifications } from '../hooks/useNotifications';

function Dashboard({ searchQuery }) {
  const { refresh } = useNotifications();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl text-[#202124] font-normal">Dashboard</h1>
            <p className="text-[#5f6368]">System overview and testing</p>
          </div>
          
          <TestNotificationPanel onNotificationRefresh={refresh} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
