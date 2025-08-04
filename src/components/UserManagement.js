import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';
import { getAllUsers, createUserAccount, updateUserRole, deleteUser } from '../firebase/auth-firestore';

function UserManagement() {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', confirmPassword: '', role: 90 });
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState(90);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const result = await getAllUsers();
    if (result.success) {
      // Filter out level 99 users and sort by role
      const filteredUsers = result.users
        .filter(u => u.role < 99)
        .sort((a, b) => b.role - a.role);
      setUsers(filteredUsers);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Check if user has permission to create users
    if (user.role < 98) {
      setError('Only Super Admin and Admin can create new users');
      return;
    }
    
    // Validation
    if (!newUser.username || !newUser.password || !newUser.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newUser.username.includes(' ')) {
      setError('Username cannot contain spaces');
      return;
    }

    if (newUser.role >= user.role) {
      setError('Cannot create user with equal or higher privilege level');
      return;
    }

    setCreating(true);
    setError('');

    const result = await createUserAccount(newUser.username, newUser.password, newUser.role, user.MID);
    if (result.success) {
      // Reset form and refresh users
      setNewUser({ username: '', password: '', confirmPassword: '', role: 90 });
      setShowCreateForm(false);
      fetchUsers();
      console.log('User created successfully with role:', newUser.role, 'for alliance entity:', user.MID);
    } else {
      setError(result.error);
    }
    setCreating(false);
  };

  const handleEditRole = (userData) => {
    setEditingUser(userData.id);
    setEditRole(userData.role);
  };

  const handleSaveRole = async (userId) => {
    if (editRole >= user.role) {
      setError('Cannot assign equal or higher privilege level');
      return;
    }

    const result = await updateUserRole(userId, editRole);
    if (result.success) {
      setEditingUser(null);
      fetchUsers(); // Refresh the list
    } else {
      setError(result.error);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditRole(90);
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      const result = await deleteUser(userId);
      if (result.success) {
        fetchUsers(); // Refresh the list
      } else {
        setError(result.error);
      }
    }
  };

  const canEditUser = (targetUser) => {
    // Can't edit yourself (check by username since MIDs are shared in alliance)
    if (targetUser.username === user.username) return false;
    // Can only edit users with lower privilege levels
    return user.role > targetUser.role;
  };

  const getRoleDisplay = (roleLevel) => {
    if (roleLevel >= 99) return 'Super Admin';
    if (roleLevel >= 98) return 'Admin';
    if (roleLevel >= 97) return 'Moderator';
    return 'User';
  };

  const getRoleColor = (roleLevel) => {
    if (roleLevel >= 99) return '#e74c3c';
    if (roleLevel >= 98) return '#f39c12';
    if (roleLevel >= 97) return '#3498db';
    return '#95a5a6';
  };

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
      
      {/* Create User Section - Only for roles 99 and 98 */}
      {user.role >= 98 && (
        <div style={{ background: '#e8f5e8', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>➕ Create New User</h3>
          {!showCreateForm ? (
            <button 
              onClick={() => setShowCreateForm(true)}
              style={{
                background: '#27ae60',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Create New User
            </button>
          ) : (
          <form onSubmit={handleCreateUser} style={{ marginTop: '15px' }}>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Username (no spaces)"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                required
                style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
                style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})}
                required
                style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: parseInt(e.target.value)})}
                style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                {user.role > 98 && <option value={98}>Admin</option>}
                {user.role > 97 && <option value={97}>Moderator</option>}
                <option value={90}>User</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={creating}
              style={{
                background: '#27ae60',
                color: 'white',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '4px',
                cursor: creating ? 'not-allowed' : 'pointer',
                marginRight: '10px'
              }}
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
            <button 
              type="button"
              onClick={() => setShowCreateForm(false)}
              style={{
                background: '#95a5a6',
                color: 'white',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
      )}

      {/* Users List */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>👥 Alliance Users</h3>
        
        {loading ? (
          <p>Loading users...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>Error: {error}</p>
        ) : (
          <div>
            <p>{users.length} users found</p>
            
            <div style={{ marginTop: '20px' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <thead style={{ backgroundColor: '#e9ecef' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Username</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Role</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Last Login</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userData) => {
                    const isCurrentUser = userData.username === user.username;
                    const canEdit = canEditUser(userData);
                    
                    return (
                      <tr 
                        key={userData.id} 
                        style={{ 
                          borderBottom: '1px solid #dee2e6',
                          opacity: isCurrentUser ? 0.6 : 1,
                          backgroundColor: isCurrentUser ? '#f8f9fa' : 'white'
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          {userData.username}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {editingUser === userData.id ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(parseInt(e.target.value))}
                              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                              {user.role > 98 && <option value={98}>Admin</option>}
                              {user.role > 97 && <option value={97}>Moderator</option>}
                              <option value={90}>User</option>
                            </select>
                          ) : (
                            <span style={{
                              backgroundColor: getRoleColor(userData.role),
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.8rem'
                            }}>
                              {getRoleDisplay(userData.role)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {new Date(userData.createdAt.seconds * 1000).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {new Date(userData.lastLogin.seconds * 1000).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {canEdit ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {editingUser === userData.id ? (
                                <>
                                  <button 
                                    onClick={() => handleSaveRole(userData.id)}
                                    style={{
                                      background: '#27ae60',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={handleCancelEdit}
                                    style={{
                                      background: '#95a5a6',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleEditRole(userData)}
                                    style={{
                                      background: '#3498db',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    Edit Role
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUser(userData.id, userData.username)}
                                    style={{
                                      background: '#e74c3c',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#bdc3c7', fontSize: '0.8rem' }}>
                              {isCurrentUser ? 'Cannot edit self' : 'Higher privilege'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={fetchUsers}
            style={{
              background: '#3498db',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Users
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
