import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AddOperation } from './screens/AddOperation';
import { Operations } from './screens/Operations';
import { Plan } from './screens/Plan';
import { Reports } from './screens/Reports';
import { Settings } from './screens/Settings';
import { Shell } from './ui';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || '#ops');
  useEffect(() => {
    const on = () => { setHash(window.location.hash || '#ops'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#/, '');
}

function App() {
  const path = useHash();
  if (path === 'add') return <Shell section="ops"><Operations /><AddOperation /></Shell>;
  if (path.startsWith('reports')) {
    const level = path === 'reports-auto' ? 'auto' : path === 'reports-tags' ? 'tags' : 'cats';
    return <Shell section="reports"><Reports level={level} /></Shell>;
  }
  if (path.startsWith('plan')) return <Shell section="plan"><Plan create={path === 'plan-new'} /></Shell>;
  if (path.startsWith('settings')) {
    const s = path.split('-')[1];
    const section = s === 'members' ? 'members' : s ? 'categories' : 'list';
    return <Shell section="settings"><Settings section={section} /></Shell>;
  }
  return <Shell section="ops"><Operations /></Shell>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
