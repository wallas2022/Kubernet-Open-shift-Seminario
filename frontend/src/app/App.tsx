import { WelcomePage } from '../pages/WelcomePage';
import { SessionProvider } from '../session/SessionContext';
import { CreationProvider } from '../reservation/CreationContext';

export function App() {
  return <SessionProvider><CreationProvider><WelcomePage /></CreationProvider></SessionProvider>;
}
