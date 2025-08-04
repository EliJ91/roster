import React from 'react';
import { useUser } from '../context/UserContext';
import { Link } from 'react-router-dom';

function LiveRoster() {
  const { user } = useUser();
  
  // TODO: Later we'll check for a selected live roster
  const hasLiveRoster = false; // This will be dynamic later

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {hasLiveRoster ? (
        // When there's a live roster selected
        <div>
          <h2>Live Roster</h2>
          {/* TODO: Display the selected roster here */}
          <p>Live roster content will go here...</p>
        </div>
      ) : (
        // When no live roster is selected
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2 style={{ color: '#7f8c8d', fontSize: '2rem', marginBottom: '20px' }}>
            No Roster Selected
          </h2>
          <p style={{ color: '#95a5a6', fontSize: '1.1rem', marginBottom: '30px' }}>
            You haven't selected a live roster yet.
          </p>
          
          {user.role >= 99 && (
            <div>
              <Link 
                to={`/${user.MID}/admin`}
                style={{
                  background: '#3498db',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Go to Admin Dashboard
              </Link>
              <p style={{ marginTop: '15px', color: '#7f8c8d' }}>
                Create and manage rosters from the admin panel
              </p>
            </div>
          )}
        </div>
      )}
      
    </div>
  );
}

export default LiveRoster;
