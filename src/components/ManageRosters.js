import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  setDoc 
} from 'firebase/firestore';

function ManageRosters() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRosters, setFilteredRosters] = useState([]);

  // Load rosters when component mounts
  useEffect(() => {
    if (user?.MID) {
      loadRosters();
    }
  }, [user?.MID]);

  // Filter rosters based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRosters(rosters);
    } else {
      const filtered = rosters.filter(roster => {
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = roster.name?.toLowerCase().includes(searchLower);
        const authorMatch = roster.author?.toLowerCase().includes(searchLower);
        return titleMatch || authorMatch;
      });
      setFilteredRosters(filtered);
    }
  }, [searchTerm, rosters]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const loadRosters = async () => {
    try {
      setLoading(true);
      
      // Query rosters for this MID
      const q = query(collection(db, 'rosters'), where('MID', '==', user.MID));
      const querySnapshot = await getDocs(q);
      
      const rosterList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        rosterList.push({
          id: doc.id, // Keep Firestore doc ID for internal reference
          rosterId: data.rosterId, // The actual unique roster identifier
          ...data
        });
      });
      
      // Sort by last modified date (newest first)
      rosterList.sort((a, b) => {
        const dateA = a.dateModified?.toDate() || new Date(0);
        const dateB = b.dateModified?.toDate() || new Date(0);
        return dateB - dateA;
      });
      
      setRosters(rosterList);
      setFilteredRosters(rosterList); // Initialize filtered list
      setLoading(false);
    } catch (error) {
      console.error('Error loading rosters:', error);
      alert('Error loading rosters. Please try again.');
      setLoading(false);
    }
  };

  // Simple permission checks
  const isAuthor = (roster) => {
    // Check if current user created this roster
    return roster.createdBy === user.username || roster.author === user.username;
  };

  const canEdit = (roster) => {
    // Author can always edit their own roster
    if (isAuthor(roster)) return true;
    
    // Only Admins (98+) can edit other users' rosters
    return user.role >= 98;
  };

  const canDelete = (roster) => {
    // Author can always delete their own roster
    if (isAuthor(roster)) return true;
    
    // Only Admins (98+) can delete other users' rosters
    return user.role >= 98;
  };

  const canCopy = () => {
    // Everyone can copy
    return true;
  };

  // Handle edit button
  const handleEdit = (roster) => {
    // Navigate to CreateRoster with the roster data
    navigate(`/${user.MID}/admin/create-roster`, { 
      state: { editRoster: roster } 
    });
  };

  // Handle delete button
  const handleDelete = async (roster) => {
    if (!canDelete(roster)) {
      alert('You do not have permission to delete this roster.');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${roster.name}"? This cannot be undone.`
    );
    
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, 'rosters', roster.rosterId));
        alert('Roster deleted successfully!');
        loadRosters(); // Reload the list
      } catch (error) {
        console.error('Error deleting roster:', error);
        alert('Error deleting roster. Please try again.');
      }
    }
  };

  // Handle copy button
  const handleCopy = async (roster) => {
    try {
      // Generate new ID for the copy
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const newRosterId = `roster_${timestamp}_${random}`;
      
      // Create copy with new data - copying user becomes the new author
      const copiedRoster = {
        ...roster,
        rosterId: newRosterId,
        name: `${roster.name} (Copy)`,
        dateCreated: new Date(),
        dateModified: new Date(),
        // Set copying user as the new author and creator
        author: user.username || user.MID || 'Unknown',
        createdBy: user.username || user.MID || 'Unknown',
        createdByUserId: user.id || user.uid || user.MID || 'unknown',
        lastEditedBy: user.username || user.MID || 'Unknown',
        // Update MID to the copying user's MID
        MID: user.MID || '',
        version: 'created'
      };
      
      // Remove the old document ID from the copy
      delete copiedRoster.id;
      
      // Save the copy using the new rosterId as the document ID
      await setDoc(doc(db, 'rosters', newRosterId), copiedRoster);
      alert('Roster copied successfully!');
      loadRosters(); // Reload the list
    } catch (error) {
      console.error('Error copying roster:', error);
      alert('Error copying roster. Please try again.');
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/${user.MID}/admin`} style={{ color: '#3498db', textDecoration: 'none' }}>
          ← Back to Admin Dashboard
        </Link>
      </div>

      {/* Page Title */}
      <h2>Manage Rosters</h2>
      
      {/* Search Box */}
      <div style={{ marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="Search rosters by title or author..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #dee2e6',
            borderRadius: '8px',
            backgroundColor: '#fff',
            color: '#333',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#007bff'}
          onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
        />
        <div style={{ 
          height: '22px',
          marginTop: '8px',
          marginBottom: '0'
        }}>
          {searchTerm && (
            <p style={{ 
              color: '#666', 
              fontSize: '14px', 
              margin: '0'
            }}>
              Showing {filteredRosters.length} of {rosters.length} rosters
            </p>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading rosters...</p>
        </div>
      )}

      {/* No Rosters State */}
      {!loading && filteredRosters.length === 0 && rosters.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>No Rosters Found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            No rosters have been created yet for this alliance.
          </p>
          <Link 
            to={`/${user.MID}/admin/create-roster`}
            style={{
              display: 'inline-block',
              background: '#007bff',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '4px',
              textDecoration: 'none'
            }}
          >
            Create First Roster
          </Link>
        </div>
      )}

      {/* No Search Results State */}
      {!loading && filteredRosters.length === 0 && rosters.length > 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>No Rosters Found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            No rosters match your search for "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Rosters Grid */}
      {!loading && filteredRosters.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {filteredRosters.map((roster) => (
            <div
              key={roster.rosterId || roster.id} // Use rosterId as primary key, fallback to Firestore ID
              style={{
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              {/* Roster Name */}
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#333',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {roster.name}
              </h3>

              {/* Roster Info */}
              <div style={{ marginBottom: '15px' }}>
                <p style={{ 
                  margin: '5px 0', 
                  fontSize: '14px', 
                  color: '#666' 
                }}>
                  <strong>Author:</strong> {roster.author || 'Unknown'}
                </p>
                <p style={{ 
                  margin: '5px 0', 
                  fontSize: '14px', 
                  color: '#666' 
                }}>
                  <strong>Last Updated:</strong> {formatDate(roster.dateModified)}
                </p>
                <p style={{ 
                  margin: '5px 0', 
                  fontSize: '14px', 
                  color: '#666' 
                }}>
                  <strong>Entries:</strong> {roster.entryCount || 0}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between'
              }}>
                {/* Edit Button */}
                <button
                  onClick={() => handleEdit(roster)}
                  disabled={!canEdit(roster)}
                  style={{
                    flex: 1,
                    background: canEdit(roster) ? '#007bff' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: canEdit(roster) ? 'pointer' : 'not-allowed',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  Edit
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(roster)}
                  disabled={!canDelete(roster)}
                  style={{
                    flex: 1,
                    background: canDelete(roster) ? '#dc3545' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: canDelete(roster) ? 'pointer' : 'not-allowed',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  Delete
                </button>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(roster)}
                  style={{
                    flex: 1,
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManageRosters;
