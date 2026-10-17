import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { installGlobalErrorLogging } from '@/shared/lib/globalErrors';

import { App } from './App';

installGlobalErrorLogging();

const root = document.getElementById('root');
if (!root) throw new Error('Не найден элемент #root в index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
