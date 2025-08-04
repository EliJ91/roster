import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import TopBar from './components/TopBar';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import LiveRoster from './components/LiveRoster';
import './App.css';

function AppContent() {
  const { user, isLoggedIn, loading } = useUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <TopBar />
      <main className="main-content">
        <Routes>
          <Route 
            path="/" 
            element={
              isLoggedIn ? (
                <Navigate to={`/${user.MID}`} replace />
              ) : (
                <>
                  <h2>Welcome to Roster</h2>
                  <p>Please sign in to continue</p>
                </>
              )
            } 
          />
          <Route 
            path="/:mid" 
            element={<LiveRoster />} 
          />
          <Route 
            path="/:mid/admin" 
            element={
              isLoggedIn ? 
                <AdminDashboard /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Restricted</h2>
                  <p>Please sign in to access admin area</p>
                </div>
            } 
          />
          <Route 
            path="/:mid/admin/usermanagement" 
            element={
              isLoggedIn ? 
                <UserManagement /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Restricted</h2>
                  <p>Please sign in to access admin area</p>
                </div>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  );
}

export default App;
