import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initAnalytics } from '@/shared/lib/analytics';
import { installGlobalErrorLogging } from '@/shared/lib/globalErrors';
import { installStaleBuildRecovery } from '@/shared/lib/staleBuild';

import { App } from './App';
import { router } from './router';
import { startRouterAnalytics } from './routerAnalytics';

installGlobalErrorLogging();
installStaleBuildRecovery();
initAnalytics();
startRouterAnalytics(router);

const root = document.getElementById('root');
if (!root) throw new Error('Не найден элемент #root в index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
