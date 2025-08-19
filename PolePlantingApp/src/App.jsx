import React, { useState, useEffect } from 'react';
import ProjectSelector from './components/ProjectSelector';
import PoleCapture from './components/PoleCapture';
import IncompletePoles from './components/IncompletePoles';
import './App.css'

function App() {
  const [selectedProject, setSelectedProject] = useState('');
  const [resumingPole, setResumingPole] = useState(null);
  const [activeTab, setActiveTab] = useState('capture');

  // Auto-switch to capture tab when project is selected
  useEffect(() => {
    if (selectedProject && activeTab !== 'capture') {
      setActiveTab('capture');
    }
  }, [selectedProject]);

  const handleProjectSelect = (projectId) => {
    setSelectedProject(projectId);
    setResumingPole(null); // Clear any resumed pole when switching projects
  };

  const handleResumeCapture = (pole) => {
    setResumingPole(pole);
    setActiveTab('capture');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌴 Pole Planting App</h1>
        <p>Field Worker Tool for Fiber Optic Pole Installation</p>
      </header>

      <main className="app-main">
        {/* Project Selection */}
        <section className="project-section">
          <ProjectSelector 
            onProjectSelect={handleProjectSelect}
            selectedProject={selectedProject}
          />
        </section>

        {selectedProject && (
          <>
            {/* Tab Navigation */}
            <nav className="tab-navigation">
              <button 
                className={`tab ${activeTab === 'capture' ? 'active' : ''}`}
                onClick={() => setActiveTab('capture')}
              >
                📷 Capture Pole
              </button>
              <button 
                className={`tab ${activeTab === 'incomplete' ? 'active' : ''}`}
                onClick={() => setActiveTab('incomplete')}
              >
                📋 Incomplete Poles
              </button>
            </nav>

            {/* Tab Content */}
            <section className="tab-content">
              {activeTab === 'capture' && (
                <PoleCapture 
                  projectId={selectedProject}
                  resumingPole={resumingPole}
                  onClearResume={() => setResumingPole(null)}
                />
              )}
              
              {activeTab === 'incomplete' && (
                <IncompletePoles 
                  projectId={selectedProject}
                  onResumeCapture={handleResumeCapture}
                />
              )}
            </section>
          </>
        )}

        {!selectedProject && (
          <div className="welcome-message">
            <h2>👋 Welcome to Pole Planting</h2>
            <p>Select a project above to start capturing pole installation data.</p>
            <div className="feature-list">
              <h3>Features:</h3>
              <ul>
                <li>📍 One-click GPS location capture</li>
                <li>📷 6 required photo types</li>
                <li>💾 Offline storage & sync</li>
                <li>🔄 Resume incomplete captures</li>
                <li>📱 Mobile-optimized interface</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>FibreFlow Pole Planting App v1.0</p>
        <p>Optimized for field workers</p>
      </footer>
    </div>
  );
}

export default App
