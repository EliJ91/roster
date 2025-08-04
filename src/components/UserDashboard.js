import React from 'react';
import { useUser } from '../context/UserContext';

function UserDashboard() {
  const { user } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Dashboard</h2>
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h3>User Information</h3>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Master ID:</strong> {user.MID}</p>
        <p><strong>Account Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
        <p><strong>Last Login:</strong> {new Date(user.lastLogin).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

export default UserDashboard;
