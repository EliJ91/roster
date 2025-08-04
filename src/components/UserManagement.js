import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';
import { getAllUsers, createUserAccount, updateUserRole, deleteUser } from '../firebase/auth-firestore';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc,
  deleteDoc 
} from 'firebase/firestore';

function UserManagement() {
  const { user } = useUser();
  
  // Helper function to format numbers with abbreviations
  const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    
    const number = parseInt(num);
    
    if (number >= 1000000000) {
      return (number / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    } else if (number >= 1000000) {
      return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
      return number.toString();
    }
  };

  // Helper function to handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted and filtered members
  const getFilteredAndSortedMembers = () => {
    let filtered = members.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.guildName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'killFame' || sortField === 'pveTotal') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', confirmPassword: '', role: 90 });
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState(90);
  
  // Guild management state
  const [guildId, setGuildId] = useState('');
  const [guilds, setGuilds] = useState([]);
  const [members, setMembers] = useState([]);
  const [addingGuild, setAddingGuild] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    fetchUsers();
    if (user?.MID) {
      loadGuilds();
      loadMembers();
    }
  }, [user?.MID]);

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
    if (roleLevel >= 99) return 'Creator';
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

  // Guild management functions
  const loadGuilds = async () => {
    try {
      const q = query(collection(db, 'guilds'), where('MID', '==', user.MID));
      const querySnapshot = await getDocs(q);
      const guildList = [];
      querySnapshot.forEach((doc) => {
        guildList.push({ id: doc.id, ...doc.data() });
      });
      setGuilds(guildList);
    } catch (error) {
      console.error('Error loading guilds:', error);
    }
  };

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const q = query(collection(db, 'members'), where('MID', '==', user.MID));
      const querySnapshot = await getDocs(q);
      const membersList = [];
      querySnapshot.forEach((doc) => {
        membersList.push({ id: doc.id, ...doc.data() });
      });
      setMembers(membersList);
      setLoadingMembers(false);
    } catch (error) {
      console.error('Error loading members:', error);
      setLoadingMembers(false);
    }
  };

  const handleAddGuild = async () => {
    // Check if user has permission to add guilds
    if (user.role < 98) {
      setError('Only Admin and higher can add guilds');
      return;
    }

    if (!guildId.trim()) {
      setError('Please enter a Guild ID');
      return;
    }

    setAddingGuild(true);
    setError('');

    try {
      // Use CORS proxy to fetch guild members from Albion Online API
      const proxyUrl = 'https://corsproxy.io/?';
      const targetUrl = `https://gameinfo.albiononline.com/api/gameinfo/guilds/${guildId}/members`;
      const response = await fetch(`${proxyUrl}${encodeURIComponent(targetUrl)}`);
      
      if (!response.ok) {
        throw new Error('Invalid Guild ID or API error');
      }

      const guildMembers = await response.json();
      
      if (!guildMembers || guildMembers.length === 0) {
        throw new Error('No members found for this guild');
      }

      // Get guild name from first member
      const guildName = guildMembers[0].GuildName;

      // Store guild info
      const guildDocId = `${user.MID}_${guildId}`;
      await setDoc(doc(db, 'guilds', guildDocId), {
        guildId: guildId,
        guildName: guildName,
        MID: user.MID,
        addedAt: new Date(),
        addedBy: user.username
      });

      // Process and store members
      const membersToStore = guildMembers.map(member => ({
        id: member.Id,
        name: member.Name,
        guildName: member.GuildName,
        allianceName: member.AllianceName || '',
        killFame: member.KillFame || 0,
        pveTotal: member.LifetimeStatistics?.PvE?.Total || 0,
        MID: user.MID,
        guildId: guildId,
        lastUpdated: new Date()
      }));

      // Store each member
      for (const member of membersToStore) {
        const memberDocId = `${user.MID}_${member.id}`;
        await setDoc(doc(db, 'members', memberDocId), member);
      }

      // Refresh data
      loadGuilds();
      loadMembers();
      setGuildId('');
      
      console.log(`Added guild "${guildName}" with ${membersToStore.length} members`);
      
    } catch (error) {
      console.error('Error adding guild:', error);
      setError(error.message || 'Failed to add guild');
    }

    setAddingGuild(false);
  };

  const handleDeleteGuild = async (guildToDelete) => {
    // Check if user has permission to delete guilds
    if (user.role < 98) {
      setError('Only Admin and higher can delete guilds');
      return;
    }

    if (!guildToDelete) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete guild "${guildToDelete.guildName}" and all its members? This cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      // Delete guild document
      await deleteDoc(doc(db, 'guilds', guildToDelete.id));

      // Delete all members from this guild
      const membersQuery = query(
        collection(db, 'members'), 
        where('MID', '==', user.MID),
        where('guildId', '==', guildToDelete.guildId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      const deletePromises = [];
      membersSnapshot.forEach((memberDoc) => {
        deletePromises.push(deleteDoc(doc(db, 'members', memberDoc.id)));
      });

      await Promise.all(deletePromises);

      // Refresh data
      loadGuilds();
      loadMembers();
      
      console.log(`Deleted guild "${guildToDelete.guildName}" and its members`);
      
    } catch (error) {
      console.error('Error deleting guild:', error);
      setError('Failed to delete guild');
    }
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
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}
      
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
        <h3>👥 Roster Users</h3>
        
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

      {/* Members Section */}
      <div style={{ background: '#f0f8ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>🏛️ Members</h3>
        
        {/* Guild Management Controls - Only for roles 98 and above */}
        {user.role >= 98 && (
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            marginBottom: '20px',
            alignItems: 'flex-start'
          }}>
            {/* Delete Guild Section */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                Delete Guild
              </label>
              <select
                onChange={(e) => {
                  const selectedGuild = guilds.find(g => g.id === e.target.value);
                  if (selectedGuild) handleDeleteGuild(selectedGuild);
                }}
                value=""
                style={{
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  width: 'auto',
                  minWidth: '200px'
                }}
              >
                <option value="">Select guild to delete...</option>
                {guilds.map((guild) => (
                  <option key={guild.id} value={guild.id}>
                    {guild.guildName}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Guild Section */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                Add Guild
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter Guild ID"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  style={{
                    width: '150px',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={handleAddGuild}
                  disabled={addingGuild}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: addingGuild ? '#95a5a6' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: addingGuild ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {addingGuild ? 'Adding...' : 'Add Guild'}
                </button>
              </div>
            </div>
          </div>
        )}

        <p style={{ color: '#666', marginBottom: '15px' }}>
          Guild members from added guilds will be displayed here.
        </p>
        
        {/* Members Table */}
        {loadingMembers ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px dashed #dee2e6',
            textAlign: 'center',
            color: '#666'
          }}>
            <p>No guild members found</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Add a guild using the Guild ID to see members here.
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e9ecef', 
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h4 style={{ margin: 0 }}>Members ({getFilteredAndSortedMembers().length})</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search members or guilds..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    width: '200px'
                  }}
                />
                <button
                  onClick={loadMembers}
                  style={{
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse'
              }}>
                <thead style={{ 
                  backgroundColor: '#f8f9fa',
                  position: 'sticky',
                  top: 0
                }}>
                  <tr>
                    <th 
                      style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: sortField === 'name' ? '#e9ecef' : '#f8f9fa'
                      }}
                      onClick={() => handleSort('name')}
                    >
                      Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: sortField === 'guildName' ? '#e9ecef' : '#f8f9fa'
                      }}
                      onClick={() => handleSort('guildName')}
                    >
                      Guild {sortField === 'guildName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: sortField === 'killFame' ? '#e9ecef' : '#f8f9fa'
                      }}
                      onClick={() => handleSort('killFame')}
                    >
                      Kill Fame {sortField === 'killFame' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: sortField === 'pveTotal' ? '#e9ecef' : '#f8f9fa'
                      }}
                      onClick={() => handleSort('pveTotal')}
                    >
                      PvE Total {sortField === 'pveTotal' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedMembers().map((member) => (
                    <tr 
                      key={member.id}
                      style={{ 
                        borderBottom: '1px solid #dee2e6',
                        '&:hover': { backgroundColor: '#f8f9fa' }
                      }}
                    >
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <strong>{member.name}</strong>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {member.guildName}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {formatNumber(member.killFame)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {formatNumber(member.pveTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
