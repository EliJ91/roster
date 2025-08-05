import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { useUser } from '../context/UserContext';

function DevAdminPanel() {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Roster creation state
  const [jsonData, setJsonData] = useState('');
  const [rosterName, setRosterName] = useState('');
  const [rosterAuthor, setRosterAuthor] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState('');

  // Only show in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest('.dev-panel-content')) return; // Don't drag when clicking on content
    
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Generate unique roster ID
  const generateRosterId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `roster_${timestamp}_${random}`;
  };

  // Create roster from JSON data
  const createRosterFromData = async () => {
    if (!user || !user.MID) {
      setCreateStatus('❌ Error: No user logged in or missing MID');
      return;
    }

    if (!jsonData.trim() || !rosterName.trim() || !rosterAuthor.trim()) {
      setCreateStatus('Please fill in all fields (JSON data, name, and author)');
      return;
    }

    setIsCreating(true);
    setCreateStatus('Creating roster...');

    try {
      // Parse JSON data
      const parsedData = JSON.parse(jsonData);
      
      if (!Array.isArray(parsedData)) {
        throw new Error('JSON data must be an array');
      }

      // Generate roster ID
      const rosterId = generateRosterId();
      
      // Convert JSON data to roster entries
      const rosterEntries = parsedData.map((item, index) => ({
        Role: item.Role || '',
        Weapon: item.Weapon || '',
        Player: item.Player || '',
        Head: item.Head || '',
        Chest: item.Chest || '',
        Boots: item.Boots || '',
        Notes: item.Notes || '',
        order: index,
        entryId: `entry_${Date.now()}_${index}`
      }));

      // Create roster data structure
      const rosterData = {
        rosterId: rosterId,
        name: rosterName,
        MID: user.MID || '', // Use current user's MID
        author: rosterAuthor,
        createdBy: rosterAuthor,
        createdByUserId: user.MID || '', // Use current user's MID
        dateCreated: serverTimestamp(),
        dateModified: serverTimestamp(),
        optionData: {
          sections: [
            { id: 1, label: 'Role', options: '', categoryType: 'category1', subLabel: 'Role', isTextArea: false },
            { id: 2, label: 'Weapon', options: '', categoryType: 'category2', subLabel: 'Weapon', isTextArea: false },
            { id: 3, label: 'Player', options: '', categoryType: 'category3', subLabel: 'Player', isTextArea: false },
            { id: 4, label: 'Head', options: '', categoryType: 'none', subLabel: 'Head', isTextArea: false },
            { id: 5, label: 'Chest', options: '', categoryType: 'none', subLabel: 'Chest', isTextArea: false },
            { id: 6, label: 'Boots', options: '', categoryType: 'none', subLabel: 'Boots', isTextArea: false },
            { id: 7, label: 'Notes', options: '', categoryType: 'none', subLabel: 'Notes', isTextArea: true }
          ],
          categoryNames: {
            category1: 'Role',
            category2: 'Weapon',
            category3: 'Player'
          },
          entryFields: [
            { type: 'dropdown', label: 'Role', options: [], id: 'role', category: 'category1' },
            { type: 'dropdown', label: 'Weapon', options: [], id: 'weapon', category: 'category2' },
            { type: 'dropdown', label: 'Player', options: [], id: 'player', category: 'category3' },
            { type: 'dropdown', label: 'Head', options: [], id: 'head', category: 'none' },
            { type: 'dropdown', label: 'Chest', options: [], id: 'chest', category: 'none' },
            { type: 'dropdown', label: 'Boots', options: [], id: 'boots', category: 'none' },
            { type: 'textarea', label: 'Notes', id: 'notes', category: 'none' }
          ]
        },
        entries: rosterEntries,
        entryCount: rosterEntries.length,
        version: 'created',
        lastEditedBy: rosterAuthor,
        isActive: true,
        tags: [],
        description: ''
      };

      // Save to Firestore
      await setDoc(doc(db, 'rosters', rosterId), rosterData);
      
      setCreateStatus(`✅ Roster "${rosterName}" created successfully! ID: ${rosterId}`);
      
      // Clear form
      setJsonData('');
      setRosterName('');
      setRosterAuthor('');
      
    } catch (error) {
      console.error('Error creating roster:', error);
      setCreateStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Cookie management functions
  const getAllCookies = () => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name) acc[name] = value || '';
      return acc;
    }, {});
    return cookies;
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    forceUpdate();
  };

  const deleteAllCookies = () => {
    const cookies = getAllCookies();
    Object.keys(cookies).forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    forceUpdate();
  };

  // Force component re-render to update cookie list
  const [, forceUpdate] = useState({});
  const triggerUpdate = () => forceUpdate({});

  // Local storage management
  const clearLocalStorage = () => {
    localStorage.clear();
    alert('Local storage cleared!');
  };

  const clearSessionStorage = () => {
    sessionStorage.clear();
    alert('Session storage cleared!');
  };

  // Don't render in production
  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  const cookies = getAllCookies();

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '300px',
        backgroundColor: '#2c3e50',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        border: '2px solid #34495e'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#34495e',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #4a5f7a'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>🛠️ DEV PANEL</span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: '#e74c3c',
            border: 'none',
            color: 'white',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isCollapsed ? '+' : '×'}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="dev-panel-content" style={{ padding: '12px' }}>
        
        {/* Cookie Management */}
        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ecf0f1' }}>
            🍪 Cookies ({Object.keys(cookies).length})
          </h4>
          
          {Object.keys(cookies).length === 0 ? (
            <p style={{ margin: '0', fontSize: '12px', color: '#bdc3c7' }}>No cookies found</p>
          ) : (
            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
              {Object.entries(cookies).map(([name, value]) => (
                <div key={name} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 6px',
                  backgroundColor: '#34495e',
                  marginBottom: '2px',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong>{name}:</strong> {value}
                  </span>
                  <button
                    onClick={() => deleteCookie(name)}
                    style={{
                      background: '#e74c3c',
                      border: 'none',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      marginLeft: '8px'
                    }}
                  >
                    Del
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
            <button
              onClick={deleteAllCookies}
              style={{
                background: '#e74c3c',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                flex: 1
              }}
            >
              Clear All Cookies
            </button>
            <button
              onClick={triggerUpdate}
              style={{
                background: '#3498db',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              🔄
            </button>
          </div>
        </div>

        {/* Storage Management */}
        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ecf0f1' }}>
            💾 Storage
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={clearLocalStorage}
              style={{
                background: '#f39c12',
                border: 'none',
                color: 'white',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Clear Local Storage
            </button>
            <button
              onClick={clearSessionStorage}
              style={{
                background: '#9b59b6',
                border: 'none',
                color: 'white',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Clear Session Storage
            </button>
          </div>
        </div>

        {/* Roster Creator */}
        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ecf0f1' }}>
            📋 Roster Creator
          </h4>
          
          {/* User Info */}
          {user && (
            <div style={{
              padding: '4px 6px',
              backgroundColor: '#34495e',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#bdc3c7',
              marginBottom: '6px'
            }}>
              Current Alliance: {user.MID || 'Unknown'}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Roster Name Input */}
            <input
              type="text"
              placeholder="Roster Name (e.g., Walk In)"
              value={rosterName}
              onChange={(e) => setRosterName(e.target.value)}
              style={{
                padding: '4px 6px',
                borderRadius: '4px',
                border: '1px solid #34495e',
                backgroundColor: '#2c3e50',
                color: 'white',
                fontSize: '11px',
                outline: 'none'
              }}
            />
            
            {/* Author Input */}
            <input
              type="text"
              placeholder="Author Name (e.g., Elijxh)"
              value={rosterAuthor}
              onChange={(e) => setRosterAuthor(e.target.value)}
              style={{
                padding: '4px 6px',
                borderRadius: '4px',
                border: '1px solid #34495e',
                backgroundColor: '#2c3e50',
                color: 'white',
                fontSize: '11px',
                outline: 'none'
              }}
            />
            
            {/* JSON Data Textarea */}
            <textarea
              placeholder="Paste JSON data here..."
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              style={{
                padding: '4px 6px',
                borderRadius: '4px',
                border: '1px solid #34495e',
                backgroundColor: '#2c3e50',
                color: 'white',
                fontSize: '10px',
                outline: 'none',
                minHeight: '80px',
                maxHeight: '120px',
                resize: 'vertical',
                fontFamily: 'monospace'
              }}
            />
            
            {/* Create Button */}
            <button
              onClick={createRosterFromData}
              disabled={isCreating || !user || !jsonData.trim() || !rosterName.trim() || !rosterAuthor.trim()}
              style={{
                background: isCreating ? '#7f8c8d' : '#27ae60',
                border: 'none',
                color: 'white',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: isCreating || !user ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                opacity: (!user || !jsonData.trim() || !rosterName.trim() || !rosterAuthor.trim()) ? 0.6 : 1
              }}
            >
              {isCreating ? '⏳ Creating...' : !user ? '👤 No User' : '🚀 Create Roster'}
            </button>
            
            {/* Status Message */}
            {createStatus && (
              <div style={{
                padding: '4px 6px',
                backgroundColor: '#34495e',
                borderRadius: '4px',
                fontSize: '10px',
                color: createStatus.includes('✅') ? '#2ecc71' : createStatus.includes('❌') ? '#e74c3c' : '#f39c12',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}>
                {createStatus}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ecf0f1' }}>
            ⚡ Quick Actions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#16a085',
                border: 'none',
                color: 'white',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🔄 Reload Page
            </button>
            <button
              onClick={() => {
                console.clear();
                console.log('🛠️ Dev Panel: Console cleared');
              }}
              style={{
                background: '#8e44ad',
                border: 'none',
                color: 'white',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🧹 Clear Console
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ 
          marginTop: '12px', 
          padding: '6px', 
          backgroundColor: '#34495e', 
          borderRadius: '4px',
          fontSize: '10px',
          color: '#bdc3c7',
          textAlign: 'center'
        }}>
          Development Mode Only
        </div>
        </div>
      )}
    </div>
  );
}

export default DevAdminPanel;
