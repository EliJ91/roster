import React, { useState } from 'react';
import SignInModal from './SignInModal';
import { useUser } from '../context/UserContext';
import './TopBar.css';

function TopBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, logout, isLoggedIn } = useUser();

  const handleSignIn = () => {
    setIsModalOpen(true);
  };

  const handleLogout = () => {
    logout();
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <nav className="topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <h1 className="app-title">Roster</h1>
          </div>
          <div className="topbar-right">
            {isLoggedIn ? (
              <>
                <span className="username-display">Welcome, {user.username}</span>
                <button className="logout-button" onClick={handleLogout}>
                  Log Out
                </button>
              </>
            ) : (
              <button className="signin-button" onClick={handleSignIn}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>
      <SignInModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}

export default TopBar;
