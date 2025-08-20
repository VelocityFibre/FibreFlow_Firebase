import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import WizardCapture from './components/WizardCapture';
import HelpButton from './components/HelpButton';
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  const [resumingPole, setResumingPole] = useState(null);

  // Load last selected project from localStorage
  useEffect(() => {
    const lastProject = localStorage.getItem('lastSelectedProject');
    if (lastProject) {
      setSelectedProject(JSON.parse(lastProject));
    }
  }, []);

  const handleNewCapture = (project) => {
    setSelectedProject(project);
    setResumingPole(null);
    setCurrentView('capture');
    localStorage.setItem('lastSelectedProject', JSON.stringify(project));
  };

  const handleResumeCapture = (poleData) => {
    setResumingPole(poleData);
    setCurrentView('capture');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setResumingPole(null);
  };

  const handleCaptureComplete = () => {
    setCurrentView('dashboard');
    setResumingPole(null);
  };

  return (
    <div className="app">
      {currentView === 'dashboard' && (
        <Dashboard 
          onNewCapture={handleNewCapture}
          onResumeCapture={handleResumeCapture}
          selectedProject={selectedProject}
        />
      )}

      {currentView === 'capture' && (
        <WizardCapture 
          project={selectedProject}
          resumingPole={resumingPole}
          onBack={handleBackToDashboard}
          onComplete={handleCaptureComplete}
        />
      )}
      
      <HelpButton />
    </div>
  );
}

export default App
