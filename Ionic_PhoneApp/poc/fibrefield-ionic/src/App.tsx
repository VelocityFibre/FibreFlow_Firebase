import React, { useState, useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
  IonContent,
  IonPage
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, camera, sync, settings } from 'ionicons/icons';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

/* Import existing components - we'll convert them to Ionic gradually */
import Dashboard from './components/Dashboard';
import WizardCapture from './components/WizardCapture';
import SyncPage from './pages/SyncPage';
import SettingsPage from './pages/SettingsPage';

setupIonicReact();

const App: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState(null);

  // Load last selected project from localStorage
  useEffect(() => {
    const lastProject = localStorage.getItem('lastSelectedProject');
    if (lastProject) {
      setSelectedProject(JSON.parse(lastProject));
    }
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home">
              <IonPage>
                <IonContent>
                  <Dashboard 
                    onNewCapture={(project) => {
                      setSelectedProject(project);
                      localStorage.setItem('lastSelectedProject', JSON.stringify(project));
                    }}
                    onResumeCapture={() => {}}
                    selectedProject={selectedProject}
                  />
                </IonContent>
              </IonPage>
            </Route>
            <Route exact path="/capture">
              <IonPage>
                <IonContent>
                  <WizardCapture 
                    project={selectedProject}
                    resumingPole={null}
                    onBack={() => {}}
                    onComplete={() => {}}
                  />
                </IonContent>
              </IonPage>
            </Route>
            <Route exact path="/sync">
              <SyncPage />
            </Route>
            <Route exact path="/settings">
              <SettingsPage />
            </Route>
            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </IonRouterOutlet>
          
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon aria-hidden="true" icon={home} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="capture" href="/capture">
              <IonIcon aria-hidden="true" icon={camera} />
              <IonLabel>Capture</IonLabel>
            </IonTabButton>
            <IonTabButton tab="sync" href="/sync">
              <IonIcon aria-hidden="true" icon={sync} />
              <IonLabel>Sync</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon aria-hidden="true" icon={settings} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;