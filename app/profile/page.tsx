'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileTab from '../components/ProfileTab';
import QBOIntegrationTab from '../components/QBOIntegrationTab';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect to login
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'qbo', label: 'QBO Integration' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'qbo':
        return <QBOIntegrationTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push("/")}
            className="mb-3 sm:mb-4 text-sm text-black dark:text-white opacity-70 hover:opacity-100 flex items-center gap-2 transition-opacity"
          >
            ← Back
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white">Profile Settings</h1>
          <p className="text-sm sm:text-base text-black dark:text-white opacity-70 mt-2">
            Manage your profile and QuickBooks Online integration settings
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-gray-200 dark:border-[#2A2D31]">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-black dark:border-white text-black dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}

