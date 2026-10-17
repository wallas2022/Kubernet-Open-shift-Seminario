import { WelcomePage } from '../pages/WelcomePage';
import { SessionProvider } from '../session/SessionContext';

export function App() {
  return <SessionProvider><WelcomePage /></SessionProvider>;
}
