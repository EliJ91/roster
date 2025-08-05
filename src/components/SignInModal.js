import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserAccount, signInUser } from '../firebase/auth-firestore';
import { useUser } from '../context/UserContext';
import './SignInModal.css';

function SignInModal({ isOpen, onClose }) {
  const { login } = useUser();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  // Show auto-dismissing notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000); // Auto-dismiss after 3 seconds
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp) {
      // Sign up validation
      if (formData.username.includes(' ')) {
        setError('Username cannot contain spaces');
        setLoading(false);
        return;
      }
      if (formData.username.length < 3) {
        setError('Username must be at least 3 characters');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      
      // Create account
      const result = await createUserAccount(formData.username, formData.password);
      if (result.success) {
        // Auto-login the user after account creation
        const loginResult = await signInUser(formData.username, formData.password);
        if (loginResult.success) {
          login(loginResult.userData);
          showNotification('Account created!');
          onClose();
        }
      } else {
        setError(result.error);
      }
    } else {
      // Sign in
      const result = await signInUser(formData.username, formData.password);
      if (result.success) {
        login(result.userData);
        onClose();
      } else {
        setError(result.error);
      }
    }
    
    setLoading(false);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setFormData({
      username: '',
      password: '',
      confirmPassword: ''
    });
  };

  if (!isOpen) return null;

  const handleOverlayMouseDown = (e) => {
    // Only close if the mousedown started on the overlay itself
    if (e.target === e.currentTarget) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
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
          zIndex: 10001,
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '300px',
          transform: 'translateX(0)',
          transition: 'all 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}
      
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="signin-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              placeholder={isSignUp ? "Choose a username (no spaces)" : "Enter your username"}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
            />
          </div>
          
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="Confirm your password"
              />
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        <div className="toggle-mode">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="toggle-button" onClick={toggleMode}>
            {isSignUp ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignInModal;
