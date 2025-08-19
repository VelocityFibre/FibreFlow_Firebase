import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

function Dashboard({ onNewCapture, onResumeCapture, selectedProject }) {
  const [projects, setProjects] = useState([]);
  const [incompletePoles, setIncompletePoles] = useState([]);
  const [recentCaptures, setRecentCaptures] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
    loadIncompletePoles();
    loadRecentCaptures();
  }, []);

  const loadProjects = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsList);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadIncompletePoles = () => {
    // Load from IndexedDB
    const saved = localStorage.getItem('incompletePoles');
    if (saved) {
      const poles = JSON.parse(saved);
      setIncompletePoles(poles);
    }
    setLoading(false);
  };

  const loadRecentCaptures = () => {
    // Load recent completed captures from IndexedDB
    const saved = localStorage.getItem('completedPoles');
    if (saved) {
      const completed = JSON.parse(saved);
      // Get last 5
      setRecentCaptures(completed.slice(-5).reverse());
    }
  };

  const handleProjectSelect = (project) => {
    onNewCapture(project);
  };

  const filteredIncomplete = incompletePoles.filter(pole => 
    pole.poleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgressText = (pole) => {
    const steps = [
      pole.data?.beforePhoto?.captured,
      pole.data?.depthPhoto?.captured,
      pole.data?.compactionPhoto?.captured,
      pole.data?.concretePhoto?.captured,
      pole.data?.frontPhoto?.captured,
      pole.data?.sidePhoto?.captured
    ];
    const completed = steps.filter(Boolean).length;
    return `${completed}/6 photos`;
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Pole Planting</h1>
        <p>Field Installation Capture</p>
      </header>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search pole number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Project Selection for New Capture */}
      {!selectedProject && (
        <div className="section">
          <h2>Select Project</h2>
          <div className="project-grid">
            {projects.map(project => (
              <button
                key={project.id}
                className="project-card"
                onClick={() => handleProjectSelect(project)}
              >
                <h3>{project.name}</h3>
                <p>{project.description || 'No description'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedProject && (
        <>
          {/* Current Project */}
          <div className="current-project">
            <span>Project: {selectedProject.name}</span>
            <button 
              className="btn-primary"
              onClick={() => onNewCapture(selectedProject)}
            >
              + New Capture
            </button>
          </div>

          {/* Continue Capture Section */}
          {filteredIncomplete.length > 0 && (
            <div className="section">
              <h2>Continue Capture</h2>
              <div className="incomplete-list">
                {filteredIncomplete.map(pole => (
                  <div key={pole.id} className="incomplete-card">
                    <div className="pole-info">
                      <h3>{pole.poleNumber || 'No pole number'}</h3>
                      <p className="progress">{getProgressText(pole)}</p>
                      <p className="time">{getTimeAgo(pole.lastUpdated)}</p>
                    </div>
                    <button
                      className="btn-continue"
                      onClick={() => onResumeCapture(pole)}
                    >
                      Continue
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Captures */}
          {recentCaptures.length > 0 && (
            <div className="section">
              <h2>Recent Captures</h2>
              <div className="recent-list">
                {recentCaptures.map(pole => (
                  <div key={pole.id} className="recent-card">
                    <h4>{pole.poleNumber}</h4>
                    <p>{getTimeAgo(pole.completedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredIncomplete.length === 0 && searchTerm && (
            <div className="empty-state">
              <p>No poles found matching "{searchTerm}"</p>
            </div>
          )}

          {filteredIncomplete.length === 0 && !searchTerm && (
            <div className="empty-state">
              <h3>No incomplete captures</h3>
              <p>Start a new capture to begin</p>
            </div>
          )}
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading">
          <p>Loading...</p>
        </div>
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Logged in as: Dev User</p>
      </footer>
    </div>
  );
}

export default Dashboard;