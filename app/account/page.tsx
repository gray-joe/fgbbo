'use client'

import React, { useState, useEffect } from 'react'
import AppLayout from "../components/AppLayout";
import { useAuth } from "../../lib/hooks/useAuth";
import { updateUserProfile, updatePassword } from "../../lib/auth";

export default function AccountPage() {
  const { user, profile, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || ''
  });

  // Update form data when profile changes
  useEffect(() => {
    setFormData({
      display_name: profile?.display_name || ''
    });
  }, [profile]);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Handle profile form changes
  const handleProfileChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle password form changes
  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  // Update profile
  const handleUpdateProfile = async () => {
    try {
      const { error } = await updateUserProfile({
        id: user?.id || '',
        display_name: formData.display_name
      });
      if (error) {
        setError(`Failed to update profile: ${error.message}`);
      } else {
        setMessage('Profile updated successfully!');
        setIsEditing(false);
        setError('');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      const { error } = await updatePassword(passwordData.newPassword);
      if (error) {
        setError(`Failed to change password: ${error.message}`);
      } else {
        setMessage('Password changed successfully!');
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setError('');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pastel-blue mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg">Loading your account...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Access Denied</h1>
            <p className="text-gray-700 text-lg">Please sign in to view your account settings.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Account Settings
            </h1>
            <p className="text-gray-700 text-lg">
              Manage your profile and preferences
            </p>
          </div>

          {/* Success/Error Messages */}
          {message && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Profile Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-pastel-blue hover:text-pastel-blue-dark font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => handleProfileChange('display_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                      placeholder="Enter your display name (shown in leagues)"
                      required
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      This name will be displayed in leagues instead of your email
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleUpdateProfile}
                      className="flex-1 bg-pastel-blue text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-pastel-blue-dark transition-all duration-200"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          display_name: profile?.display_name || ''
                        });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Display Name
                    </label>
                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                      {profile?.display_name || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Email Address
                    </label>
                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Account Type
                    </label>
                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                      {profile?.is_admin ? 'Administrator' : 'Regular User'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Member Since
                    </label>
                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                      {new Date(profile?.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Account Settings */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Account Settings</h2>
                {!isChangingPassword && (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="text-pastel-pink hover:text-pastel-pink-dark font-medium"
                  >
                    Change Password
                  </button>
                )}
              </div>
              
              {isChangingPassword ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-pink focus:border-transparent transition-all bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-pink focus:border-transparent transition-all bg-white text-gray-800"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleChangePassword}
                      className="flex-1 bg-pastel-pink text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-pastel-pink-dark transition-all duration-200"
                    >
                      Update Password
                    </button>
                    <button
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Password Status
                    </label>
                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                      Password is set • Last updated when account was created
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Account Security
                    </label>
                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                      Your account is protected with a strong password
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
