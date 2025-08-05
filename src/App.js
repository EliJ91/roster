import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import TopBar from './components/TopBar';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import CreateRoster from './components/CreateRoster';
import ManageRosters from './components/ManageRosters';
import LiveRoster from './components/LiveRoster';
import SharedRoster from './components/SharedRoster';
// import DevAdminPanel from './components/DevAdminPanel';
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
            path="/shared/:shareId" 
            element={<SharedRoster />} 
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
          <Route 
            path="/:mid/admin/create-roster" 
            element={
              isLoggedIn ? 
                <CreateRoster /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Restricted</h2>
                  <p>Please sign in to access admin area</p>
                </div>
            } 
          />
          <Route 
            path="/:mid/admin/manage-rosters" 
            element={
              isLoggedIn ? 
                <ManageRosters /> : 
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h2>Access Restricted</h2>
                  <p>Please sign in to access admin area</p>
                </div>
            } 
          />
        </Routes>
      </main>
      
      {/* Development Admin Panel - Only shows in development mode */}
      {/* <DevAdminPanel /> */}
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
