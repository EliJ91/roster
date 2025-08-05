import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';
import { changeUserPassword } from '../firebase/auth-firestore';

function AdminDashboard() {
  const { user } = useUser();
  
  // State for change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const getRoleDisplay = (roleLevel) => {
    if (roleLevel >= 99) return 'Creator';
    if (roleLevel >= 98) return 'Admin';
    if (roleLevel >= 97) return 'Moderator';
    return 'User';
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Unknown';
    
    // Handle Firestore timestamp
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    
    // Handle regular Date object or string
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);

    try {
      const result = await changeUserPassword(user.username, passwordForm.currentPassword, passwordForm.newPassword);
      
      if (result.success) {
        // Success - close modal and reset form
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        alert('Password changed successfully!');
      } else {
        setPasswordError(result.error);
      }
    } catch (error) {
      setPasswordError('An unexpected error occurred');
    }

    setChangingPassword(false);
  };

  // Close modal and reset form
  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  // Debug: Log user object to see its structure
  console.log('Admin Dashboard - User object:', user);
  console.log('Admin Dashboard - User createdAt:', user.createdAt);
  console.log('Admin Dashboard - User role:', user.role);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Admin Dashboard</h2>
      
      <div style={{ 
        background: '#e8f5e8', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '2px solid #27ae60'
      }}>
        <h3>👑 Administrator Panel</h3>
        <p>Welcome to the admin dashboard, <strong>{user.username}</strong>!</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        marginTop: '20px'
      }}>
        
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', position: 'relative' }}>
          <h3>User Information</h3>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Permissions:</strong> {getRoleDisplay(user.role)}</p>
          <p><strong>Account Created:</strong> {formatDate(user.createdAt)}</p>
          <p><strong>Last Login:</strong> {formatDate(user.lastLogin)}</p>
          
          <button
            onClick={() => setShowPasswordModal(true)}
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Change Password
          </button>
        </div>

        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3>🗂️ Roster Management</h3>
          <p>Manage your rosters and teams</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <Link 
              to={`/${user.MID}/admin/create-roster`}
              style={{
                background: '#3498db',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Create New Roster
            </Link>
            <Link 
              to={`/${user.MID}/admin/manage-rosters`}
              style={{
                background: '#e67e22',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Manage Rosters
            </Link>
          </div>
        </div>

        {/* User Management - Only for roles 97 and above */}
        {user.role >= 97 && (
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
            <h3>👥 User Management</h3>
            <p>Manage user accounts and permissions</p>
            <Link 
              to={`/${user.MID}/admin/usermanagement`}
              style={{
                background: '#27ae60',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-block',
                marginTop: '10px'
              }}
            >
              Manage Users
            </Link>
          </div>
        )}

        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3>⚙️ Settings</h3>
          <p>Configure application settings</p>
          <button style={{
            background: '#8e44ad',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}>
            App Settings
          </button>
        </div>

      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Change Password</h3>
            
            {passwordError && (
              <div style={{
                background: '#f8d7da',
                color: '#721c24',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                border: '1px solid #f5c6cb'
              }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  style={{
                    width: 'calc(100% - 22px)',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  style={{
                    width: 'calc(100% - 22px)',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  style={{
                    width: 'calc(100% - 22px)',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  style={{
                    background: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  style={{
                    background: changingPassword ? '#95a5a6' : '#e74c3c',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    cursor: changingPassword ? 'not-allowed' : 'pointer'
                  }}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
