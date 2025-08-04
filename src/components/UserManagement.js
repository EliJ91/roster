import React from 'react';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';

function UserManagement() {
  const { user } = useUser();

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link 
          to={`/${user.MID}/admin`}
          style={{ color: '#3498db', textDecoration: 'none' }}
        >
          ← Back to Admin Dashboard
        </Link>
      </div>
      
      <h2>User Management</h2>
      
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
        <h3>👥 Manage Users</h3>
        <p>View and manage user accounts (Level 98+ access)</p>
        
        <div style={{ marginTop: '20px' }}>
          <button style={{
            background: '#27ae60',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}>
            View All Users
          </button>
          
          <button style={{
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Manage Permissions
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
