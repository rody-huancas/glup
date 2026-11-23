import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { CaptureOverlay } from '@/modules/screen-text/components/CaptureOverlay';
import { isCaptureWindow } from '@/modules/screen-text/services/screenText';
import '@/index.css';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      {isCaptureWindow() ? <CaptureOverlay /> : <App />}
    </StrictMode>,
  );
}
