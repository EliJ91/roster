import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedRoster } from '../firebase/auth-firestore';
import { useUser } from '../context/UserContext';
import { db } from '../firebase/config';
import CONFIG from '../config/constants';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, serverTimestamp, deleteField } from 'firebase/firestore';
// ...existing code...

// PlayerNameSelector component for enhanced player selection
function PlayerNameSelector({ value, onChange, weaponName, entryIndex, getMembersForWeapon, getAvailableMembers, customStyle = {} }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get all available members for dropdown
  const getAllAvailableMembers = () => {
    // Get members who signed up for this specific weapon and are not assigned elsewhere
    const weaponMembers = getMembersForWeapon(weaponName, entryIndex) || [];
    
    // Always include current value if it exists (so user can see their current selection)
    const membersToShow = new Set(weaponMembers);
    if (value && value.trim() !== '') {
      membersToShow.add(value);
    }
    
    return Array.from(membersToShow).sort();
  };

  // Filter members based on search term
  const getFilteredMembers = () => {
    const allMembers = getAllAvailableMembers();
    if (!searchTerm.trim()) return allMembers;
    
    return allMembers.filter(member =>
      member.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    // Don't call onChange here - only update local state
    setIsDropdownOpen(true);
  };

  const handleMemberSelect = (memberName) => {
    setSearchTerm(memberName);
    setIsUpdating(true);
    onChange(memberName); // Update database when user selects from dropdown
    setIsDropdownOpen(false);
    setIsFocused(false);
    // Reset updating flag after a delay
    setTimeout(() => setIsUpdating(false), 500);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setIsDropdownOpen(true);
  };

  const handleBlur = (e) => {
    // Delay to allow for dropdown clicks
    setTimeout(() => {
      setIsFocused(false);
      setIsDropdownOpen(false);
      
      // Normalize the search term (trim whitespace)
      const normalizedSearchTerm = searchTerm.trim();
      const normalizedValue = (value || '').trim();
      
      // Update database when user loses focus and value has changed
      // This includes when the field is cleared (empty string)
      if (normalizedSearchTerm !== normalizedValue) {
        setIsUpdating(true);
        onChange(normalizedSearchTerm); // Pass the normalized (trimmed) value
        // Reset updating flag after a delay
        setTimeout(() => setIsUpdating(false), 500);
      }
    }, 150);
  };

  // Update searchTerm when value prop changes, but only if not currently focused or updating
  useEffect(() => {
    if (!isFocused && !isUpdating) {
      setSearchTerm(value || '');
    }
  }, [value, isFocused, isUpdating]);

  const filteredMembers = getFilteredMembers();

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <textarea
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Select Player"
        style={{
          minWidth: '100px',
          maxWidth: '150px',
          minHeight: '32px',
          height: '32px',
          maxHeight: '60px',
          padding: '4px 20px 4px 6px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: 'transparent',
          boxSizing: 'border-box',
          resize: 'none',
          fontFamily: 'inherit',
          lineHeight: '1.2',
          overflow: 'hidden',
          borderColor: isFocused ? '#007bff' : '#ddd',
          boxShadow: isFocused ? '0 0 0 2px rgba(0,123,255,0.25)' : 'none',
          transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
          ...customStyle
        }}
        rows={1}
      />
      
      {/* Dropdown indicator */}
      <div style={{
        position: 'absolute',
        right: '4px',
        top: '8px',
        fontSize: '10px',
        color: '#999',
        pointerEvents: 'none'
      }}>
        ▼
      </div>

      {/* Dropdown list */}
      {isDropdownOpen && filteredMembers.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          maxHeight: '150px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {filteredMembers.map((memberName) => (
            <div
              key={memberName}
              onClick={() => handleMemberSelect(memberName)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: 'white',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              {memberName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SharedRoster() {
  const { shareId } = useParams();
  const { user } = useUser();
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedWeapons, setSelectedWeapons] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [members, setMembers] = useState([]);
  const [notification, setNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected'
  const [editingRosterName, setEditingRosterName] = useState(false);
  const [rosterNameValue, setRosterNameValue] = useState('');

  // Sync roster name with local state when roster loads
  useEffect(() => {
    if (roster?.name) {
      setRosterNameValue(roster.name);
    }
  }, [roster?.name]);

  // Load stored username from cookie when component mounts
  useEffect(() => {
    const storedUsername = getUsernameCookie();
    if (storedUsername && !selectedMember) {
      setSelectedMember(storedUsername);
      setMemberSearchTerm(storedUsername);
    }
  }, [selectedMember, getUsernameCookie]);

  // Calculate disarray level based on number of signups
  const calculateDisarrayLevel = (signupCount) => {
    // Disarray level mapping table
    const disarrayTable = [
      { level: 1, size: 21 },
      { level: 2, size: 22 },
      { level: 3, size: 23 },
      { level: 4, size: 24 },
      { level: 5, size: 25 },
      { level: 6, size: 26 },
      { level: 7, size: 27 },
      { level: 8, size: 28 },
      { level: 9, size: 29 },
      { level: 10, size: 30 },
      { level: 11, size: 31 },
      { level: 12, size: 32 },
      { level: 13, size: 33 },
      { level: 14, size: 34 },
      { level: 15, size: 36 },
      { level: 16, size: 37 },
      { level: 17, size: 39 },
      { level: 18, size: 41 },
      { level: 19, size: 43 },
      { level: 20, size: 46 },
      { level: 21, size: 48 },
      { level: 22, size: 49 },
      { level: 23, size: 51 },
      { level: 24, size: 54 },
      { level: 25, size: 56 },
      { level: 26, size: 58 },
      { level: 27, size: 61 },
      { level: 28, size: 64 },
      { level: 29, size: 67 },
      { level: 30, size: 70 },
      { level: 31, size: 74 },
      { level: 32, size: 79 },
      { level: 33, size: 83 },
      { level: 34, size: 89 },
      { level: 35, size: 95 },
      { level: 36, size: 99 },
      { level: 37, size: 103 },
      { level: 38, size: 108 },
      { level: 39, size: 114 },
      { level: 40, size: 119 },
      { level: 41, size: 126 },
      { level: 42, size: 133 },
      { level: 43, size: 141 },
      { level: 44, size: 148 },
      { level: 45, size: 154 },
      { level: 46, size: 160 },
      { level: 47, size: 167 },
      { level: 48, size: 175 },
      { level: 49, size: 183 },
      { level: 50, size: 192 },
      { level: 51, size: 200 },
      { level: 52, size: 207 },
      { level: 53, size: 215 },
      { level: 54, size: 223 },
      { level: 55, size: 232 },
      { level: 56, size: 242 },
      { level: 57, size: 252 },
      { level: 58, size: 264 },
      { level: 59, size: 276 },
      { level: 60, size: 290 },
      { level: 61, size: 305 },
      { level: 62, size: 322 },
      { level: 63, size: 341 },
      { level: 64, size: 361 },
      { level: 65, size: 385 },
      { level: 66, size: 412 },
      { level: 67, size: 445 }
    ];

    // If no signups, return level 1
    if (signupCount === 0) return 1;

    // Find the appropriate disarray level
    // Start from the highest level and work down
    for (let i = disarrayTable.length - 1; i >= 0; i--) {
      if (signupCount >= disarrayTable[i].size) {
        return disarrayTable[i].level;
      }
    }

    // If signupCount is less than 21, return level 1
    return 1;
  };

  // Show auto-dismissing notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000); // Auto-dismiss after 3 seconds
  };

  // Get unique weapons from current roster entries
  const getAvailableWeapons = () => {
    if (!roster || !roster.entries) return [];
    
    const weapons = new Set();
    roster.entries.forEach(entry => {
      const weapon = entry.weapon || entry.Weapon || entry.mainHand;
      if (weapon && weapon !== '-') {
        weapons.add(weapon);
      }
    });
    
    return Array.from(weapons).sort();
  };

  // Get weapons grouped by their roles from the actual roster data
  const getWeaponsByRole = () => {
    if (!roster || !roster.entries) return {};
    
    const weaponsByRole = {};
    
    roster.entries.forEach(entry => {
      const weapon = entry.weapon || entry.Weapon || entry.mainHand;
      const role = entry.role || entry.Role || entry.class || entry.Class || 'Other';
      
      if (weapon && weapon !== '-' && role) {
        if (!weaponsByRole[role]) {
          weaponsByRole[role] = new Set();
        }
        weaponsByRole[role].add(weapon);
      }
    });
    
    // Convert Sets to sorted arrays
    const result = {};
    Object.keys(weaponsByRole).forEach(role => {
      result[role] = Array.from(weaponsByRole[role]).sort();
    });
    
    return result;
  };

  // Get members from the same MID as the roster
  const getAvailableMembers = () => {
    // Always show ALL members - don't restrict based on cookies
    // The cookie is only used for pre-filling the default selection
    return members.map(member => member.name || 'Unknown').sort();
  };

  // Get members who signed up for a specific weapon, ordered by signup time
  const getMembersForWeapon = (weaponName, currentEntryIndex = null) => {
    if (!roster?.entries || !weaponName) return [];
    
    // Get all members who signed up for this specific weapon from the signups list
    const weaponSignups = (roster.signups || [])
      .filter(signup => signup.weapons && signup.weapons.includes(weaponName))
      .map(signup => signup.name)
      .filter(name => name);
    
    // If no one signed up for this weapon, return empty array
    if (weaponSignups.length === 0) {
      return [];
    }
    
    // Get all players currently assigned to ANY entry (except the current one being edited)
    const assignedPlayers = new Set();
    roster.entries.forEach((entry, index) => {
      // Skip the current entry we're editing to allow its current selection to remain
      if (index === currentEntryIndex) return;
      
      const playerName = entry.playerName;
      if (playerName && playerName !== '') {
        assignedPlayers.add(playerName);
      }
    });
    
    // Filter to only show members who:
    // 1. Signed up for this specific weapon
    // 2. Are not already assigned to another entry
    const availableMembers = weaponSignups.filter(name => !assignedPlayers.has(name));
    
    return availableMembers;
  };

  // Filter members based on search term
  const getFilteredMembers = () => {
    const availableMembers = getAvailableMembers();
    if (!memberSearchTerm) return availableMembers;
    
    return availableMembers.filter(memberName => 
      memberName.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );
  };

  // Fetch members from database based on roster MID
  const loadMembers = async (rosterMID) => {
    try {
      const membersQuery = query(collection(db, 'members'), where('MID', '==', rosterMID));
      const membersSnapshot = await getDocs(membersQuery);
      const membersList = membersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // Store document ID for updates
          name: data.name || data.Name || data.username || data.playerName || 'Unknown',
          playerId: data.id || data.Id || data.playerId || '',
          role: data.role || 90,
          linked: data.linked || false,
        };
      });
      
      setMembers(membersList);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
    }
  };

  // Update member's linked status in database
  const updateMemberLinked = async (memberName, linked = true) => {
    try {
      const member = members.find(m => m.name === memberName);
      if (member && member.id) {
        const memberRef = doc(db, 'members', member.id);
        await updateDoc(memberRef, { linked });
        
        // Update local state
        setMembers(prevMembers => 
          prevMembers.map(m => 
            m.id === member.id ? { ...m, linked } : m
          )
        );
      }
    } catch (error) {
      console.error('Error updating member linked status:', error);
    }
  };

  // Cookie helper functions for signup cooldown and username storage
  const setCookie = (name, value, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Enhanced username cookie functions with expiration tracking
  const setUsernameCookie = (username) => {
    const cookieData = {
      username: username,
      timestamp: Date.now()
    };
    setCookie('selectedMemberName', JSON.stringify(cookieData), 1/24); // 1 hour
  };

  const getUsernameCookie = () => {
    const cookieValue = getCookie('selectedMemberName');
    if (!cookieValue) return null;

    try {
      const cookieData = JSON.parse(cookieValue);
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      const timeDiff = Date.now() - cookieData.timestamp;

      // Check if cookie has expired (more than 1 hour old)
      if (timeDiff > oneHour) {
        // Remove expired cookie
        document.cookie = `selectedMemberName=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        return null;
      }

      return cookieData.username;
    } catch (error) {
      // If JSON parsing fails, treat as expired and remove
      document.cookie = `selectedMemberName=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      return null;
    }
  };

  // Check if user is on signup cooldown
  const isOnSignupCooldown = () => {
    const lastSignupTime = getCookie('lastSignupTime');
    if (!lastSignupTime) return false;
    
    const timeDiff = Date.now() - parseInt(lastSignupTime);
    const threeMinutes = 3 * 60 * 1000; // 3 minutes in milliseconds
    
    return timeDiff < threeMinutes;
  };

  // Handle signup process with multiple weapons
  const handleSignup = async () => {
    // Check if roster is locked
    if (isRosterLocked()) {
      alert('Denied: This roster is locked. No changes can be made to rosters older than 24 hours.');
      return;
    }

    if (!selectedMember || selectedWeapons.length === 0) {
      alert('Please select a member name and at least one weapon.');
      return;
    }

    // Check signup cooldown
    if (isOnSignupCooldown()) {
      alert('Please wait before making another change.');
      return;
    }

    // Check if member has already signed up
    const existingSignups = roster.signups || [];
    const existingSignup = existingSignups.find(signup => signup.name === selectedMember);
    
    if (existingSignup) {
      alert('Denied: 401');
      return;
    }

    try {
      // Add new signup
      const updatedSignups = [...existingSignups, {
        name: selectedMember,
        weapons: selectedWeapons,
        signedUpAt: new Date()
      }];

      const updatedRoster = {
        ...roster,
        signups: updatedSignups,
        dateModified: serverTimestamp(),
        lastEditedBy: selectedMember
      };

      await updateDoc(doc(db, 'history', shareId), updatedRoster);
      
      await updateMemberLinked(selectedMember, true);
      
      // Set signup cooldown cookie for any roster change
      setCookie('lastSignupTime', Date.now().toString());
      
      // Store the selected member name for future pre-filling (expires in 1 hour)
      setUsernameCookie(selectedMember);
      
      showNotification(`Successfully signed up for ${selectedWeapons.length} weapon(s)!`);
      setShowSignupModal(false);
      
      // Reset form
      setSelectedMember('');
      setSelectedWeapons([]);
      setMemberSearchTerm('');
      setShowMemberDropdown(false);
      
    } catch (error) {
      console.error('Error during signup:', error);
      alert('Error signing up. Please try again.');
    }
  };

  // Check if roster is locked (manually or older than 24 hours)
  const isRosterLocked = () => {
    if (!roster) return false;
    
    // Check manual lock first
    if (roster.locked === true) return true;
    
    // Check if roster is older than 24 hours
    return isRosterAutoLocked();
  };

  // Check if roster is automatically locked due to age (24+ hours)
  const isRosterAutoLocked = () => {
    if (!roster) return false;
    
    if (!roster.dateShared && !roster.dateCreated && !roster.dateModified) return false;
    
    // Use the most recent date available
    const rosterDate = roster.dateShared || roster.dateCreated || roster.dateModified;
    
    let dateToCheck;
    if (rosterDate && rosterDate.toDate) {
      // Firestore timestamp
      dateToCheck = rosterDate.toDate();
    } else if (rosterDate) {
      // Regular date
      dateToCheck = new Date(rosterDate);
    } else {
      return false; // No valid date found
    }
    
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    return dateToCheck.getTime() < twentyFourHoursAgo;
  };

  // Check if user can toggle manual lock
  const canToggleLock = () => {
    if (!user || !roster) {
      console.log('canToggleLock: No user or roster', { user: !!user, roster: !!roster });
      return false;
    }
    
    // Moderator (role 97+) can toggle lock
    if (user && CONFIG.isModerator(user.role)) {
      console.log('canToggleLock: User is moderator/admin', { role: user.role });
      return true;
    }
    
    // Original sharer can toggle lock (compare by username)
    if (roster.sharedByUsername && user.username && roster.sharedByUsername === user.username) {
      console.log('canToggleLock: User is original sharer', { sharedByUsername: roster.sharedByUsername, userUsername: user.username });
      return true;
    }
    
    console.log('canToggleLock: Access denied', { 
      userRole: user.role, 
      userUsername: user.username, 
      rosterSharedByUsername: roster.sharedByUsername 
    });
    return false;
  };

  // Handle manual lock toggle
  const handleLockToggle = async () => {
    const currentlyLocked = isRosterLocked();
    console.log('Lock toggle - Current state:', { currentlyLocked, rosterLocked: roster?.locked, isAutoLocked: isRosterAutoLocked() });
    
    // Check permissions - moderators/sharers can lock/unlock
    if (!canToggleLock()) {
      const action = currentlyLocked ? 'unlock' : 'lock';
      alert(`You do not have permission to ${action} this roster.`);
      return;
    }

    try {
      const newLockedState = !currentlyLocked;
      console.log('Lock toggle - New state will be:', newLockedState);
      
      // Create update object without spreading the entire roster
      const updateData = {
        dateModified: serverTimestamp(),
        lastEditedBy: user?.username || user?.MID || 'Admin'
      };

      // Set the locked property based on the new state
      if (newLockedState) {
        updateData.locked = true;
        console.log('Setting roster to locked');
      } else {
        // When unlocking, use FieldValue.delete() to properly remove the field
        updateData.locked = deleteField();
        console.log('Removing locked field from roster');
      }

      console.log('Update data:', updateData);
      await updateDoc(doc(db, 'history', shareId), updateData);
      console.log('Document updated successfully');
      
      const action = newLockedState ? 'locked' : 'unlocked';
      alert(`Roster has been ${action} successfully.`);
      
    } catch (error) {
      console.error('Error toggling roster lock:', error);
      alert('Error toggling roster lock. Please try again.');
    }
  };

  // Handle opening signup modal
  const openSignupModal = () => {
    // Check if roster is locked
    if (isRosterLocked()) {
      const lockReason = isRosterAutoLocked() ? 'automatically locked (24+ hours old)' : 'manually locked';
      alert(`Denied: This roster is ${lockReason}. No changes can be made.`);
      return;
    }
    setShowSignupModal(true);
  };

  // Check if current user can edit entries
  const canEditEntries = () => {
    if (!user || !roster) {
      console.log('canEditEntries: No user or roster', { user: !!user, roster: !!roster });
      return false;
    }
    
    // If roster is locked, no editing allowed regardless of permissions
    if (isRosterLocked()) {
      console.log('canEditEntries: Roster is locked');
      return false;
    }
    
    // Moderator (role 97+) can edit any shared roster
    if (user && CONFIG.isModerator(user.role)) {
      console.log('canEditEntries: User is moderator/admin', { role: user.role });
      return true;
    }
    
    // Original sharer can edit their shared roster (compare by username)
    if (roster.sharedByUsername && user.username && roster.sharedByUsername === user.username) {
      console.log('canEditEntries: User is original sharer', { sharedByUsername: roster.sharedByUsername, userUsername: user.username });
      return true;
    }
    
    console.log('canEditEntries: Access denied', { 
      userRole: user.role, 
      userUsername: user.username, 
      rosterSharedByUsername: roster.sharedByUsername,
      isLocked: isRosterLocked()
    });
    return false;
  };

  // Check if a player name is still on the signup list
  const isPlayerStillSignedUp = (playerName) => {
    if (!playerName || !roster?.signups) return true; // If no name or no signups, don't highlight
    
    return roster.signups.some(signup => signup.name === playerName);
  };

  // Handle removing a signup from the roster
  const handleRemoveSignup = async () => {
    // Check if roster is locked
    if (isRosterLocked()) {
      alert('Denied: This roster is locked. No changes can be made to rosters older than 24 hours.');
      return;
    }

    if (!selectedMember) {
      alert('Please select a member name to remove.');
      return;
    }

    // Check if user can only remove their own signup
    if (!user) {
      alert('You must be logged in to remove a signup.');
      return;
    }

    // Check if the selected member is actually signed up
    const existingSignups = roster.signups || [];
    const existingSignup = existingSignups.find(signup => signup.name === selectedMember);
    
    if (!existingSignup) {
      alert(`${selectedMember} has not signed up for this roster.`);
      return;
    }

    // Allow users to remove their own signup by checking if the selectedMember matches their display name
    // or if they are an admin/moderator (role 97+)
    const canRemove = (user && CONFIG.isModerator(user.role)) || 
                     selectedMember === user.username || 
                     selectedMember === user.name ||
                     selectedMember === (user.username || user.name);

    if (!canRemove) {
      alert('You can only remove your own signup.');
      return;
    }

    // Check signup cooldown for any roster change
    if (isOnSignupCooldown()) {
      alert('Please wait before making another change.');
      return;
    }

    try {
      // Remove the signup
      const updatedSignups = existingSignups.filter(signup => signup.name !== selectedMember);

      const updatedRoster = {
        ...roster,
        signups: updatedSignups,
        dateModified: serverTimestamp(),
        lastEditedBy: selectedMember
      };

      await updateDoc(doc(db, 'history', shareId), updatedRoster);
      
      // Set signup cooldown cookie for any roster change
      setCookie('lastSignupTime', Date.now().toString());
      
      // Store the selected member name for future pre-filling (expires in 1 hour)
      setUsernameCookie(selectedMember);
      
      showNotification(`${selectedMember} has been removed from the signup list.`);
      setShowSignupModal(false);
      
      // Reset form
      setSelectedMember('');
      setSelectedWeapons([]);
      setMemberSearchTerm('');
      setShowMemberDropdown(false);
      
    } catch (error) {
      console.error('Error removing signup:', error);
      alert('Error removing signup. Please try again.');
    }
  };

  // Handle roster name update
  const handleRosterNameUpdate = async (newName) => {
    if (!canEditEntries()) {
      alert('Denied: This roster is locked. No changes can be made to rosters older than 24 hours.');
      return;
    }

    if (!newName || newName.trim() === '') {
      showNotification('Roster name cannot be empty', 'error');
      return;
    }

    const trimmedName = newName.trim();
    if (trimmedName === roster.name) {
      return; // No change needed
    }

    try {
      const updatedRoster = {
        ...roster,
        name: trimmedName,
        dateModified: serverTimestamp(),
        lastEditedBy: user?.username || user?.MID || 'Admin'
      };

      await updateDoc(doc(db, 'history', shareId), updatedRoster);
      showNotification('Roster name updated successfully');
      
    } catch (error) {
      console.error('Error updating roster name:', error);
      showNotification('Error updating roster name. Please try again.', 'error');
    }
  };

  // Handle direct field update for any roster entry field
  const handleFieldUpdate = async (entryIndex, fieldName, newValue) => {
    if (!canEditEntries()) {
      alert('Denied: This roster is locked. No changes can be made to rosters older than 24 hours.');
      return;
    }

    try {
      const updatedEntries = [...roster.entries];
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        [fieldName]: newValue,
        lastEditedAt: new Date(), // Use regular Date instead of serverTimestamp() in array
        editedBy: user?.username || user?.MID || 'Admin'
      };

      const updatedRoster = {
        ...roster,
        entries: updatedEntries,
        dateModified: serverTimestamp(), // serverTimestamp() is OK at document level
        lastEditedBy: user?.username || user?.MID || 'Admin'
      };

      // Direct Firestore update - real-time listener will handle the UI update
      await updateDoc(doc(db, 'history', shareId), updatedRoster);
      
      showNotification(`${fieldName} updated successfully`, 'success');
      
      // No need to manually update state - real-time listener handles it!
      
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      showNotification(`Error updating ${fieldName}. Please try again.`, 'error');
    }
  };

  // Handle direct player assignment for a roster entry
  const handlePlayerAssignment = async (entryIndex, newPlayerName) => {
    if (!canEditEntries()) {
      alert('Denied: This roster is locked. No changes can be made to rosters older than 24 hours.');
      return;
    }

    try {
      // Normalize the player name (empty string if just whitespace)
      const normalizedPlayerName = (newPlayerName || '').trim();
      
      const updatedEntries = [...roster.entries];
      const currentEntry = updatedEntries[entryIndex];
      
      // Create the updated entry without undefined values
      updatedEntries[entryIndex] = {
        ...currentEntry,
        playerName: normalizedPlayerName, // Use normalized playerName as the standard field
        lastEditedAt: new Date(),
        editedBy: user?.username || user?.MID || 'Admin'
      };
      
      // Remove legacy fields if they exist (don't set to undefined)
      if ('PlayerName' in updatedEntries[entryIndex]) {
        delete updatedEntries[entryIndex].PlayerName;
      }
      if ('assignedPlayer' in updatedEntries[entryIndex]) {
        delete updatedEntries[entryIndex].assignedPlayer;
      }

      const updatedRoster = {
        ...roster,
        entries: updatedEntries,
        dateModified: serverTimestamp(),
        lastEditedBy: user?.username || user?.MID || 'Admin'
      };

      // Single database update instead of three separate ones
      await updateDoc(doc(db, 'history', shareId), updatedRoster);
      
      if (normalizedPlayerName === '') {
        showNotification(`Player removed from roster entry`, 'success');
      } else {
        showNotification(`Player assignment updated successfully`, 'success');
      }
      
    } catch (error) {
      console.error(`Error updating player assignment:`, error);
      showNotification(`Error updating player assignment. Please try again.`, 'error');
    }
  };

  // Real-time listener for shared roster updates
  useEffect(() => {
    if (!shareId) return;

    setLoading(true);
    setError(null);
    setConnectionStatus('connecting');

    // Set up real-time listener for the shared roster document
    const unsubscribe = onSnapshot(
      doc(db, 'history', shareId), // Fixed: using 'history' collection instead of 'sharedRosters'
      async (docSnapshot) => {
        try {
          if (docSnapshot.exists()) {
            const rosterData = docSnapshot.data();
            
            setRoster(rosterData);
            setConnectionStatus('connected');
            
            // Load members for this roster's MID when roster updates
            if (rosterData.MID) {
              await loadMembers(rosterData.MID);
            }
            
            setLoading(false);
            setError(null);
            
          } else {
            setError('Shared roster not found');
            setConnectionStatus('disconnected');
            setLoading(false);
          }
        } catch (error) {
          console.error('Error processing real-time roster update:', error);
          setError('Error loading roster updates');
          setConnectionStatus('disconnected');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error with real-time roster listener:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          shareId: shareId
        });
        setError('Connection error - unable to receive live updates');
        setConnectionStatus('disconnected');
        setLoading(false);
      }
    );

    // Cleanup listener when component unmounts or shareId changes
    return () => {
      setConnectionStatus('disconnected');
      unsubscribe();
    };
  }, [shareId]);

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2>Loading Shared Roster...</h2>
        <p>Please wait while we fetch the roster data.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2>Roster Not Found</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          {error}
        </p>
        <p style={{ color: '#666' }}>
          The shared roster link may be invalid or expired.
        </p>
      </div>
    );
  }

  if (!roster) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2>No Roster Data</h2>
        <p style={{ color: '#666' }}>
          Unable to load roster information.
        </p>
      </div>
    );
  }

  // Debug user information
  console.log('User info for permissions:', {
    user: user,
    hasUser: !!user,
    userRole: user?.role,
    userMID: user?.MID,
    rosterSharedBy: roster?.sharedBy,
    canEdit: canEditEntries(),
    canToggle: canToggleLock()
  });

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '300px',
          transform: 'translateX(0)',
          transition: 'all 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}

      {/* Real-time Connection Status */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '8px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backgroundColor: connectionStatus === 'connected' ? '#d4edda' : 
                        connectionStatus === 'connecting' ? '#fff3cd' : '#f8d7da',
        color: connectionStatus === 'connected' ? '#155724' : 
               connectionStatus === 'connecting' ? '#856404' : '#721c24',
        border: `1px solid ${connectionStatus === 'connected' ? '#c3e6cb' : 
                            connectionStatus === 'connecting' ? '#ffeaa7' : '#f5c6cb'}`
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: connectionStatus === 'connected' ? '#28a745' : 
                          connectionStatus === 'connecting' ? '#ffc107' : '#dc3545'
        }}></div>
        {connectionStatus === 'connected' && 'Live Updates Active'}
        {connectionStatus === 'connecting' && 'Connecting...'}
        {connectionStatus === 'disconnected' && 'Connection Lost'}
      </div>
      
      {/* Roster Header Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {canEditEntries() ? (
            editingRosterName ? (
              <input
                type="text"
                value={rosterNameValue}
                onChange={(e) => setRosterNameValue(e.target.value)}
                onBlur={() => {
                  setEditingRosterName(false);
                  handleRosterNameUpdate(rosterNameValue);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.target.blur();
                  }
                  if (e.key === 'Escape') {
                    setRosterNameValue(roster.name);
                    setEditingRosterName(false);
                  }
                }}
                autoFocus
                style={{
                  fontSize: '28px',
                  fontWeight: 'normal',
                  color: '#333',
                  margin: '0 0 10px 0',
                  padding: '5px 10px',
                  border: '2px solid #007bff',
                  borderRadius: '4px',
                  textAlign: 'center',
                  backgroundColor: 'white',
                  outline: 'none',
                  minWidth: '300px'
                }}
              />
            ) : (
              <h1 
                style={{ 
                  margin: '0 0 10px 0', 
                  color: '#333',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => setEditingRosterName(true)}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                title="Click to edit roster name"
              >
                {roster.name}
              </h1>
            )
          ) : (
            <h1 style={{ 
              margin: '0 0 10px 0', 
              color: '#333',
              fontSize: '28px'
            }}>
              {roster.name}
            </h1>
          )}
          
          {/* Show sharer info for admins/moderators */}
          {user && CONFIG.isModerator(user.role) && roster.sharedByUsername && (
            <p style={{ 
              margin: '5px 0 0 0', 
              color: '#666', 
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Shared by: {roster.sharedByUsername}
            </p>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>Signups</h3>
            <p style={{ color: '#666', margin: '0', fontSize: '18px', fontWeight: 'bold' }}>
              {roster.signups ? roster.signups.length : 0}
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>Total Members</h3>
            <p style={{ color: '#666', margin: '0', fontSize: '18px', fontWeight: 'bold' }}>
              {roster.entries ? roster.entries.length : 0}
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>Disarray Level</h3>
            <p style={{ color: '#666', margin: '0', fontSize: '18px', fontWeight: 'bold' }}>
              {calculateDisarrayLevel(roster.signups ? roster.signups.length : 0)}
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
              {isRosterLocked() ? 'Roster Locked' : 'Join This Roster'}
            </h3>
            {isRosterLocked() ? (
              <button
                disabled
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  opacity: 0.6
                }}
              >
                Locked
              </button>
            ) : (
              <button
                onClick={openSignupModal}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                Sign Up
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Roster Entries Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #dee2e6',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 30px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: '0', color: '#333' }}>Roster Entries</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Lock/Unlock Button - only show if user has lock/unlock permissions */}
              {canToggleLock() && (
                <button
                  onClick={handleLockToggle}
                  style={{
                    backgroundColor: isRosterLocked() ? '#dc3545' : '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={
                    isRosterLocked() 
                      ? (isRosterAutoLocked() ? 'Auto-locked (24+ hours) - Click to manually unlock' : 'Manually locked - Click to unlock')
                      : 'Click to manually lock roster'
                  }
                >
                  {isRosterLocked() ? '🔒 Locked' : '🔓 Unlocked'}
                </button>
              )}
              
              {canEditEntries() && (
                <span style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  Admin View - Edit Mode Available
                </span>
              )}
            </div>
          </div>
        </div>

        {roster.entries && roster.entries.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              tableLayout: 'auto'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{
                    padding: '12px 15px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap'
                  }}>
                    Role
                  </th>
                  <th style={{
                    padding: '12px 15px',
                    textAlign: 'center',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap'
                  }}>
                    Weapon
                  </th>
                  <th style={{
                    padding: '12px 15px',
                    textAlign: 'center',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap'
                  }}>
                    Player Name
                  </th>
                  <th style={{
                    padding: '12px 15px',
                    textAlign: 'center',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap'
                  }}>
                    Head
                  </th>
                  <th style={{
                    padding: '12px 15px',
                    textAlign: 'center',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap'
                  }}>
                    Chest
                  </th>
                  <th style={{
                    padding: '12px 15px',
                    textAlign: 'center',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap'
                  }}>
                    Boots
                  </th>
                  <th style={{
                    padding: '12px 15px',
                    textAlign: 'left',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: 'bold',
                    color: '#333',
                    width: '100%'
                  }}>
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {roster.entries.map((entry, index) => {
                  const isGroupStart = index > 0 && index % 20 === 0;
                  
                  return (
                    <React.Fragment key={entry.id || index}>
                      {/* Add spacing row between groups of 20 */}
                      {isGroupStart && (
                        <tr>
                          <td 
                            colSpan={7}
                            style={{
                              height: '30px',
                              backgroundColor: '#e9ecef',
                              borderTop: '3px solid #dee2e6',
                              borderBottom: '1px solid #dee2e6',
                              textAlign: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              color: '#6c757d',
                              padding: '8px'
                            }}
                          >
                            Party {Math.floor(index / 20) + 1} (Entries {index + 1} - {Math.min(index + 20, roster.entries.length)})
                          </td>
                        </tr>
                      )}
                      <tr 
                        style={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e3f2fd';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                        }}
                      >
                        {/* Role Column */}
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6',
                          fontWeight: 'bold',
                          color: '#333'
                        }}>
                          {canEditEntries() ? (
                            <input
                              type="text"
                              value={entry.role || entry.Role || ''}
                              onChange={(e) => handleFieldUpdate(index, 'role', e.target.value)}
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                boxSizing: 'border-box',
                                minWidth: '60px',
                                maxWidth: '100px'
                              }}
                              placeholder="Role..."
                            />
                          ) : (
                            entry.role || entry.Role || '-'
                          )}
                        </td>
                        
                        {/* Weapon Column */}
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6',
                          color: '#666'
                        }}>
                          {canEditEntries() ? (
                            <input
                              type="text"
                              value={entry.weapon || entry.Weapon || entry.mainHand || ''}
                              onChange={(e) => handleFieldUpdate(index, 'weapon', e.target.value)}
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                textAlign: 'center',
                                boxSizing: 'border-box',
                                minWidth: '80px',
                                maxWidth: '120px'
                              }}
                              placeholder="Weapon..."
                            />
                          ) : (
                            entry.weapon || entry.Weapon || entry.mainHand || '-'
                          )}
                        </td>
                        
                        {/* Player Name Column */}
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6',
                          color: '#666',
                          backgroundColor: (() => {
                            const playerName = entry.playerName || entry.PlayerName || entry.assignedPlayer;
                            const availableMembers = getMembersForWeapon(entry.weapon || entry.Weapon); // Get all members for this weapon (unfiltered)
                            
                            if (playerName && playerName !== '') {
                              return '#d4edda'; // Green - player assigned
                            } else if (availableMembers.length === 0) {
                              return '#f8d7da'; // Red - no members available
                            } else {
                              return '#fff3cd'; // Yellow - members available but none selected
                            }
                          })()
                        }}>
                          {canEditEntries() ? (
                            <PlayerNameSelector
                              value={entry.playerName || ''}
                              onChange={(value) => handlePlayerAssignment(index, value)}
                              weaponName={entry.weapon || entry.Weapon}
                              entryIndex={index}
                              getMembersForWeapon={getMembersForWeapon}
                              getAvailableMembers={getAvailableMembers}
                              customStyle={
                                entry.playerName && !isPlayerStillSignedUp(entry.playerName) 
                                  ? { backgroundColor: '#8B0000', color: '#FF4444' }
                                  : {}
                              }
                            />
                          ) : (
                            <span style={
                              entry.playerName && !isPlayerStillSignedUp(entry.playerName) 
                                ? { backgroundColor: '#8B0000', color: '#FF4444', padding: '4px 8px', borderRadius: '4px' }
                                : {}
                            }>
                              {entry.playerName || ''}
                            </span>
                          )}
                        </td>
                        
                        {/* Head Column */}
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6',
                          color: '#666'
                        }}>
                          {canEditEntries() ? (
                            <input
                              type="text"
                              value={entry.head || entry.Head || entry.helmet || ''}
                              onChange={(e) => handleFieldUpdate(index, 'head', e.target.value)}
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                textAlign: 'center',
                                boxSizing: 'border-box',
                                minWidth: '60px',
                                maxWidth: '100px'
                              }}
                              placeholder="Head..."
                            />
                          ) : (
                            entry.head || entry.Head || entry.helmet || '-'
                          )}
                        </td>
                        
                        {/* Chest Column */}
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6',
                          color: '#666'
                        }}>
                          {canEditEntries() ? (
                            <input
                              type="text"
                              value={entry.chest || entry.Chest || entry.armor || ''}
                              onChange={(e) => handleFieldUpdate(index, 'chest', e.target.value)}
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                textAlign: 'center',
                                boxSizing: 'border-box',
                                minWidth: '60px',
                                maxWidth: '100px'
                              }}
                              placeholder="Chest..."
                            />
                          ) : (
                            entry.chest || entry.Chest || entry.armor || '-'
                          )}
                        </td>
                        
                        {/* Boots Column */}
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6',
                          color: '#666'
                        }}>
                          {canEditEntries() ? (
                            <input
                              type="text"
                              value={entry.boots || entry.Boots || entry.shoes || ''}
                              onChange={(e) => handleFieldUpdate(index, 'boots', e.target.value)}
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                textAlign: 'center',
                                boxSizing: 'border-box',
                                minWidth: '60px',
                                maxWidth: '100px'
                              }}
                              placeholder="Boots..."
                            />
                          ) : (
                            entry.boots || entry.Boots || entry.shoes || '-'
                          )}
                        </td>
                        
                        {/* Notes Column */}
                        <td style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #dee2e6',
                          color: '#666',
                          maxWidth: '200px',
                          verticalAlign: 'top'
                        }}>
                          {canEditEntries() ? (
                            <textarea
                              value={entry.notes || entry.Notes || entry.comment || ''}
                              onChange={(e) => handleFieldUpdate(index, 'notes', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                boxSizing: 'border-box',
                                resize: 'none',
                                fontFamily: 'inherit',
                                lineHeight: '1.3',
                                overflow: 'hidden',
                                minHeight: '36px',
                                height: '36px'
                              }}
                              placeholder="Notes..."
                              rows={2}
                            />
                          ) : (
                            <div style={{
                              height: '36px',
                              overflow: 'hidden',
                              fontSize: '12px',
                              lineHeight: '1.3',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              wordBreak: 'break-word',
                              padding: '2px 0'
                            }}>
                              {entry.notes || entry.Notes || entry.comment || '-'}
                            </div>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666'
          }}>
            <p>No entries found in this roster.</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        color: '#666',
        fontSize: '12px'
      }}>
        <p>
          This is a shared roster view. The data shown reflects the roster at the time it was shared.
        </p>
      </div>

      {/* Signup Modal */}
      {showSignupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '50px',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>
              Sign Up for Roster
              {isRosterLocked() && (
                <span style={{ 
                  color: '#dc3545', 
                  fontSize: '14px', 
                  fontWeight: 'normal', 
                  display: 'block', 
                  marginTop: '5px' 
                }}>
                  🔒 Roster is permanently locked (24+ hours old)
                </span>
              )}
            </h2>
            
            {/* Member Selection */}
            <div style={{ marginBottom: '15px', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' }}>
                Select Your Name:
              </label>
              <input
                type="text"
                value={memberSearchTerm || selectedMember}
                onChange={(e) => {
                  setMemberSearchTerm(e.target.value);
                  setSelectedMember('');
                  setShowMemberDropdown(true);
                }}
                onFocus={() => setShowMemberDropdown(true)}
                onBlur={() => {
                  // Delay hiding to allow click selection
                  setTimeout(() => setShowMemberDropdown(false), 150);
                }}
                placeholder="Type to search for your name..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              {showMemberDropdown && getFilteredMembers().length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {getFilteredMembers().map((memberName) => (
                    <div
                      key={memberName}
                      onClick={() => {
                        setSelectedMember(memberName);
                        setMemberSearchTerm('');
                        setShowMemberDropdown(false);
                      }}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      {memberName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weapon Selection with Checkboxes */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#333' }}>
                Select Weapons: ({selectedWeapons.length} selected)
              </label>
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px'
              }}>
                {Object.keys(getWeaponsByRole()).length > 0 ? (
                  Object.entries(getWeaponsByRole()).map(([role, weapons]) => (
                    <div key={role} style={{ marginBottom: '10px' }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#555', 
                        fontSize: '12px',
                        marginBottom: '4px',
                        borderBottom: '1px solid #eee',
                        paddingBottom: '2px'
                      }}>
                        {role}
                      </div>
                      {weapons.map((weapon) => (
                        <label
                          key={weapon}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            marginBottom: '2px',
                            borderRadius: '3px',
                            backgroundColor: selectedWeapons.includes(weapon) ? '#e3f2fd' : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedWeapons.includes(weapon)) {
                              e.target.style.backgroundColor = '#f5f5f5';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedWeapons.includes(weapon)) {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedWeapons.includes(weapon)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWeapons([...selectedWeapons, weapon]);
                              } else {
                                setSelectedWeapons(selectedWeapons.filter(w => w !== weapon));
                              }
                            }}
                            style={{ marginRight: '8px' }}
                          />
                          {weapon}
                        </label>
                      ))}
                    </div>
                  ))
                ) : (
                  getAvailableWeapons().map((weapon) => (
                    <label
                      key={weapon}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        marginBottom: '2px',
                        borderRadius: '3px',
                        backgroundColor: selectedWeapons.includes(weapon) ? '#e3f2fd' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWeapons.includes(weapon)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedWeapons([...selectedWeapons, weapon]);
                          } else {
                            setSelectedWeapons(selectedWeapons.filter(w => w !== weapon));
                          }
                        }}
                        style={{ marginRight: '8px' }}
                      />
                      {weapon}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Modal Buttons */}
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              marginTop: '20px'
            }}>
              <button
                onClick={() => {
                  setShowSignupModal(false);
                  setSelectedMember('');
                  setSelectedWeapons([]);
                  setMemberSearchTerm('');
                  setShowMemberDropdown(false);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f8f9fa',
                  color: '#333',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveSignup}
                disabled={!selectedMember || isRosterLocked()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: (selectedMember && !isRosterLocked()) ? '#dc3545' : '#6c757d',
                  color: 'white',
                  cursor: (selectedMember && !isRosterLocked()) ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  opacity: (selectedMember && !isRosterLocked()) ? 1 : 0.6
                }}
              >
                {isRosterLocked() ? 'Locked' : 'Remove Signup'}
              </button>
              <button
                onClick={handleSignup}
                disabled={isRosterLocked()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isRosterLocked() ? '#6c757d' : '#28a745',
                  color: 'white',
                  cursor: isRosterLocked() ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: isRosterLocked() ? 0.6 : 1
                }}
              >
                {isRosterLocked() ? 'Locked' : 'Sign Up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer Panel */}
      {/* DevAdminPanel removed: not used in production */}
    </div>
  );
}

export default SharedRoster;
