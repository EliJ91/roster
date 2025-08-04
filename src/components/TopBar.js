import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import SignInModal from './SignInModal';
import { useUser } from '../context/UserContext';
import './TopBar.css';

function TopBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, logout, isLoggedIn } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're on the landing page (/) or in admin areas
  const isLandingPage = location.pathname === '/';
  const isAdminArea = location.pathname.includes('/admin');

  const handleSignIn = () => {
    setIsModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <nav className="topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1 className="app-title">Roster</h1>
            </Link>
          </div>
          <div className="topbar-right">
            {isLandingPage ? (
              // Landing page: full sign-in controls
              isLoggedIn ? (
                <>
                  <span className="username-display">Welcome, {user.username}</span>
                  <Link 
                    to={`/${user.MID}/admin`}
                    style={{
                      color: '#3498db',
                      textDecoration: 'none',
                      marginLeft: '15px',
                      marginRight: '15px',
                      fontWeight: 'bold'
                    }}
                  >
                    Admin
                  </Link>
                  <button className="logout-button" onClick={handleLogout}>
                    Log Out
                  </button>
                </>
              ) : (
                <button className="signin-button" onClick={handleSignIn}>
                  Sign In
                </button>
              )
            ) : isAdminArea && isLoggedIn ? (
              // Admin areas: show logout for logged in users
              <>
                <span className="username-display">Welcome, {user.username}</span>
                <button className="logout-button" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              // Regular alliance entity pages: show admin link and logout for logged in users
              isLoggedIn ? (
                <>
                  <span className="username-display">Welcome, {user.username}</span>
                  <Link 
                    to={`/${user.MID}/admin`}
                    style={{
                      color: '#3498db',
                      textDecoration: 'none',
                      marginLeft: '15px',
                      marginRight: '15px',
                      fontWeight: 'bold'
                    }}
                  >
                    Admin
                  </Link>
                  <button className="logout-button" onClick={handleLogout}>
                    Log Out
                  </button>
                </>
              ) : (
                <div></div>
              )
            )}
          </div>
        </div>
      </nav>
      <SignInModal isOpen={isModalOpen && isLandingPage} onClose={closeModal} />
    </>
  );
}

export default TopBar;
