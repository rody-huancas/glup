import '@/demo/clock';
import { StrictMode, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { islandFrame } from '@/demo/frame';
import { demoControls, play, scene } from '@/demo/scene';
import { Mascot } from '@/modules/mascot/components/Mascot';
import '@/index.css';

declare global {
  interface Window {
    glupDemo: typeof demoControls & { area: () => unknown; frame: () => unknown };
  }
}

window.glupDemo = { ...demoControls, area: islandFrame.area, frame: islandFrame.frame };

// A desktop of its own (a dark gradient and a suggested taskbar) with the island's window on it.
const Desktop = () => {
  const frame = useSyncExternalStore(islandFrame.subscribe, islandFrame.frame);
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'radial-gradient(120% 90% at 30% 10%, #2b2f4a 0%, #191a2b 45%, #0e0f18 100%)' }}>
      <div className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 bg-[#1c1d2a]/90 backdrop-blur">
        {Array.from({ length: 6 }, (_, index) => <span key={index} className="size-7 rounded-md bg-white/10" />)}
      </div>
      {/* Drawn at once: the island says where its window goes once it is drawn. */}
      <div className="absolute" style={frame ? { left: frame.x, top: frame.y, width: frame.width, height: frame.height } : { left: 0, top: 0, width: '100%', height: '100%', visibility: 'hidden' }}>
        <App />
      </div>
    </div>
  );
};

// Glup alone for the logo of the README: the same layers as in the app (body, open eyes, happy mouth,
// arms and feet at rest), on nothing.
const MascotScene = () => (
  <div id="mascot" className="p-6" style={{ width: 160 }}>
    <Mascot reactToDrops={false} />
  </div>
);

const scenes: Record<string, () => React.JSX.Element> = { desktop: Desktop, mascot: MascotScene };
const Scene = (scene && scenes[scene]) || App;

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<StrictMode><Scene /></StrictMode>);
  if (scene !== 'mascot') void play();
}
