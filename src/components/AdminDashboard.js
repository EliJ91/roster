import React from 'react';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';

function AdminDashboard() {
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
        
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3>User Information</h3>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Permissions:</strong> {getRoleDisplay(user.role)}</p>
          <p><strong>Account Created:</strong> {formatDate(user.createdAt)}</p>
          <p><strong>Last Login:</strong> {formatDate(user.lastLogin)}</p>
        </div>

        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3>🗂️ Roster Management</h3>
          <p>Manage your rosters and teams</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <Link 
              to={`/${user.MID}/admin/createroster`}
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
            <button style={{
              background: '#e67e22',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Manage Rosters
            </button>
          </div>
        </div>

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
    </div>
  );
}

export default AdminDashboard;
