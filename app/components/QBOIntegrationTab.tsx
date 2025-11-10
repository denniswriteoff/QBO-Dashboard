'use client';

import { useState, useEffect } from 'react';

interface QBOStatus {
  connected: boolean;
  realmId?: string;
  companyName?: string;
}

export default function QBOIntegrationTab() {
  const [status, setStatus] = useState<QBOStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qbo/status');
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch QBO status' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch QBO status' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setActionLoading('connect');
      // Redirect to QBO OAuth flow
      window.location.href = '/api/qbo/connect';
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to initiate QBO connection' });
      setActionLoading(null);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to disconnect from QuickBooks Online? This will revoke all access tokens.')) {
      return;
    }

    try {
      setActionLoading('revoke');
      const response = await fetch('/api/qbo/revoke', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'QBO connection revoked successfully' });
        await fetchStatus(); // Refresh the status
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to revoke connection' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke connection' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white dark:bg-[#1E2023] rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-[#2A2D31]">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-[#2A2D31] rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-[#2A2D31] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#1E2023] rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-[#2A2D31]">
        <div className="mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-black dark:text-white">
            QuickBooks Online Integration
          </h2>
          <p className="text-sm text-black dark:text-gray-400 mt-1">
            Connect your QuickBooks Online account to access financial data
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-md text-sm ${
            message.type === 'success' 
              ? 'bg-white text-black dark:bg-[#2A2D31] dark:text-white border border-gray-200 dark:border-[#3A3D41]'
              : 'bg-black text-white dark:bg-[#3A3D41] dark:text-white border border-gray-800 dark:border-[#4A4D51]'
          }`}>
            {message.text}
          </div>
        )}

        {!status?.connected ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 bg-black dark:bg-[#2A2D31] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-black dark:text-white mb-2">
              Connect to QuickBooks Online
            </h3>
            <p className="text-sm text-black dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Connect your QuickBooks Online account to enable accounting integrations and financial data access
            </p>
            <button
              onClick={handleConnect}
              disabled={actionLoading === 'connect'}
              className="px-6 py-2 bg-black text-white dark:bg-[#2A2D31] dark:text-white rounded-md hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-opacity shadow-sm"
            >
              {actionLoading === 'connect' ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Connect to QuickBooks Online'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-black dark:text-white">
                  Connected Company
                </h3>
                <p className="text-sm text-black dark:text-gray-400">
                  {status.companyName || 'Unknown Company'}
                </p>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-[#2A2D31] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-black dark:bg-white"></div>
                    <div>
                      <div className="font-medium text-black dark:text-white text-sm">
                        Company ID: {status.realmId?.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-black dark:text-gray-400">
                    <div>Status: Connected</div>
                  </div>
                </div>
                
                <div className="flex items-center ml-4">
                  <button
                    onClick={handleRevoke}
                    disabled={actionLoading === 'revoke'}
                    className="px-3 py-1 bg-black text-white dark:bg-[#3A3D41] dark:text-white rounded text-xs font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
                  >
                    {actionLoading === 'revoke' ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

