import React from 'react';
import { useUser } from '../context/UserContext';

function UserDashboard() {
  const { user } = useUser();

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

  if (!user) {
    return <div>Loading...</div>;
  }

  // Debug: Log user object to see its structure
  console.log('User object:', user);
  console.log('User createdAt:', user.createdAt);
  console.log('User lastLogin:', user.lastLogin);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Dashboard</h2>
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h3>User Information</h3>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Master ID:</strong> {user.MID}</p>
        <p><strong>Permissions:</strong> {getRoleDisplay(user.role)}</p>
        <p><strong>Account Created:</strong> {formatDate(user.createdAt)}</p>
        <p><strong>Last Login:</strong> {formatDate(user.lastLogin)}</p>
      </div>
    </div>
  );
}

export default UserDashboard;
