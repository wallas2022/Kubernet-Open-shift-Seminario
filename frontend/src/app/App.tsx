import { WelcomePage } from '../pages/WelcomePage';
import { SessionProvider } from '../session/SessionContext';
import { CreationProvider } from '../reservation/CreationContext';
import { useState } from 'react';
import { ExitSession } from '../session/ExitSession';

export function App() {
  const [generation, setGeneration] = useState(0);
  const [cleanupFailed, setCleanupFailed] = useState(false);
  return <SessionProvider key={generation}><CreationProvider>
    <ExitSession failed={cleanupFailed} onExit={cleaned => { setCleanupFailed(!cleaned); setGeneration(value => value + 1); }} />
    <WelcomePage />
  </CreationProvider></SessionProvider>;
}
