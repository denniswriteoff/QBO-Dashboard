'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

interface ProfileForm {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfileTab() {
  const { data: session } = useSession();
  const [profileForm, setProfileForm] = useState<ProfileForm>({ 
    name: session?.user?.name || '', 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const updateProfile = async () => {
    setIsUpdatingProfile(true);
    setProfileMessage('');
    
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });

      if (response.ok) {
        setProfileMessage('Profile updated successfully!');
        setProfileForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        // Reload the page to update the session
        window.location.reload();
        setTimeout(() => setProfileMessage(''), 3000);
      } else {
        const error = await response.json();
        setProfileMessage(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileMessage('Error updating profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* User Info */}
      <div className="bg-white dark:bg-[#1E2023] rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-[#2A2D31]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="h-12 w-12 rounded-full bg-black text-white dark:bg-[#2A2D31] dark:text-white flex items-center justify-center text-lg font-medium flex-shrink-0">
            {(session?.user?.name?.[0] ?? 'U')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-medium text-black dark:text-white truncate">
              {session?.user?.name ?? 'User'}
            </div>
            <div className="text-sm text-black dark:text-gray-400 truncate">
              {session?.user?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Update Form */}
      <div className="bg-white dark:bg-[#1E2023] rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-[#2A2D31]">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-black dark:text-white">Update Profile</h2>
          <p className="text-sm text-black dark:text-gray-400">Change your username and password</p>
        </div>

        {profileMessage && (
          <div className={`mb-4 sm:mb-6 p-3 rounded-md text-sm ${
            profileMessage.includes('successfully') 
              ? 'bg-white text-black dark:bg-[#2A2D31] dark:text-white' 
              : 'bg-black text-white dark:bg-[#3A3D41] dark:text-white'
          }`}>
            {profileMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profileName" className="block text-sm font-medium text-black dark:text-white mb-2">
              Username
            </label>
            <input
              type="text"
              id="profileName"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#2A2D31] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm border border-gray-200 dark:border-[#3A3D41]"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-black dark:text-white mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={profileForm.currentPassword}
              onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#2A2D31] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm border border-gray-200 dark:border-[#3A3D41]"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-black dark:text-white mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={profileForm.newPassword}
              onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#2A2D31] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm border border-gray-200 dark:border-[#3A3D41]"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-black dark:text-white mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={profileForm.confirmPassword}
              onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-[#2A2D31] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm border border-gray-200 dark:border-[#3A3D41]"
              placeholder="Confirm new password"
            />
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="text-xs text-black dark:text-gray-400 order-2 sm:order-1">
            Leave password fields empty if you only want to change your username
          </div>
          <button
            onClick={updateProfile}
            disabled={isUpdatingProfile || (!profileForm.name && !profileForm.newPassword)}
            className="px-4 py-2 bg-black text-white dark:bg-[#2A2D31] dark:text-white rounded-md hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-opacity shadow-sm order-1 sm:order-2 w-full sm:w-auto"
          >
            {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

