import React from 'react';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';

function AdminDashboard() {
  const { user } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

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
          <p><strong>Account Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
          <p><strong>Last Login:</strong> {new Date(user.lastLogin).toLocaleDateString()}</p>
        </div>

        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <h3>🗂️ Roster Management</h3>
          <p>Manage your rosters and teams</p>
          <button style={{
            background: '#3498db',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}>
            Create New Roster
          </button>
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
