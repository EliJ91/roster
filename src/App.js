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
                // If user is level 99, redirect to admin dashboard
                user.role === 99 ? 
                  <Navigate to={`/${user.MID}/admin`} replace /> :
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
            element={
              isLoggedIn ? 
                <LiveRoster /> : 
                <Navigate to="/" replace />
            } 
          />
          <Route 
            path="/:mid/admin" 
            element={
              isLoggedIn && user.role === 99 ? 
                <AdminDashboard /> : 
                <Navigate to="/" replace />
            } 
          />
          <Route 
            path="/:mid/admin/usermanagement" 
            element={
              isLoggedIn && user.role >= 98 ? 
                <UserManagement /> : 
                <Navigate to="/" replace />
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
