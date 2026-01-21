import { useState } from 'react';
import { testDirectEmail, submitContract } from '../services/api';

/**
 * Test panel for notification and email features
 */
export function TestNotificationPanel({ onNotificationRefresh }) {
  const [testingEmail, setTestingEmail] = useState(false);
  const [creatingDummy, setCreatingDummy] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [dummyResult, setDummyResult] = useState(null);

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailResult(null);
    try {
      const result = await testDirectEmail();
      setEmailResult({
        success: result.success !== false,
        message: result.success
          ? 'Test email sent successfully! Check your inbox.'
          : 'Failed to send email. Check backend logs for details.',
        data: result,
      });
    } catch (error) {
      setEmailResult({
        success: false,
        message: error.message || 'Failed to test email',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleCreateDummyContract = async () => {
    setCreatingDummy(true);
    setDummyResult(null);
    try {
      // Calculate dates: assessment date is today, expiration is in 5 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const expirationDate = new Date(today);
      expirationDate.setDate(today.getDate() + 5); // Expires in 5 days
      
      // Calculate term months (approximately)
      const termMonths = Math.ceil(5 / 30); // At least 1 month
      
      const dummyContract = {
        name: `Test Employee ${Date.now()}`,
        position: 'Test Position',
        assessmentDate: today.toISOString().split('T')[0],
        basicSalary: 50000,
        allowance: 5000,
        termMonths: termMonths,
        expirationDate: expirationDate.toISOString().split('T')[0],
        attendanceBonusPercent: 5,
        perfectAttendancePercent: 10,
      };

      const result = await submitContract(dummyContract);
      setDummyResult({
        success: true,
        message: `Dummy contract created successfully! Expires in 5 days.`,
        data: result,
      });
      
      // Refresh notifications after a short delay to allow backend processing
      setTimeout(() => {
        if (onNotificationRefresh) {
          onNotificationRefresh();
        }
      }, 1000);
    } catch (error) {
      setDummyResult({
        success: false,
        message: error.message || 'Failed to create dummy contract',
      });
    } finally {
      setCreatingDummy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#202124] mb-4">Test Features</h2>
      
      <div className="space-y-4">
        {/* Email Test */}
        <div className="border border-[#dadce0] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-medium text-[#202124]">Email Service</h3>
              <p className="text-sm text-[#5f6368] mt-1">
                Test sending a contract expiration email
              </p>
            </div>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {testingEmail ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Sending...
                </span>
              ) : (
                'Test Email'
              )}
            </button>
          </div>
          
          {emailResult && (
            <div
              className={`mt-3 p-3 rounded-lg ${
                emailResult.success
                  ? 'bg-[#e6f4ea] border border-[#1e8e3e]'
                  : 'bg-[#fce8e6] border border-[#c5221f]'
              }`}
            >
              <div className="flex items-start gap-2">
                {emailResult.success ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e8e3e" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c5221f" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                <p
                  className={`text-sm font-medium ${
                    emailResult.success ? 'text-[#1e8e3e]' : 'text-[#c5221f]'
                  }`}
                >
                  {emailResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dummy Contract Test */}
        <div className="border border-[#dadce0] rounded-lg p-4 bg-[#fef7e0] border-[#ea8600]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-medium text-[#202124]">Create Dummy Contract</h3>
              <p className="text-sm text-[#5f6368] mt-1">
                Create a test contract that expires in 5 days to trigger notifications
              </p>
            </div>
            <button
              onClick={handleCreateDummyContract}
              disabled={creatingDummy}
              className="px-4 py-2 bg-[#ea8600] text-white rounded-lg hover:bg-[#d97706] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {creatingDummy ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Creating...
                </span>
              ) : (
                'Create Dummy Contract'
              )}
            </button>
          </div>
          
          {dummyResult && (
            <div
              className={`mt-3 p-3 rounded-lg ${
                dummyResult.success
                  ? 'bg-[#e6f4ea] border border-[#1e8e3e]'
                  : 'bg-[#fce8e6] border border-[#c5221f]'
              }`}
            >
              <div className="flex items-start gap-2">
                {dummyResult.success ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e8e3e" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c5221f" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      dummyResult.success ? 'text-[#1e8e3e]' : 'text-[#c5221f]'
                    }`}
                  >
                    {dummyResult.message}
                  </p>
                  {dummyResult.success && (
                    <p className="text-xs text-[#5f6368] mt-1">
                      Check the notification icon in the header - it should show a badge count!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
