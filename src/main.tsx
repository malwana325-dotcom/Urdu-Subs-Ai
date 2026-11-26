import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { preloadStudioImages } from './components/ResponsiveLazyImage';
import studioHeroBackdrop from './assets/images/studio_hero_backdrop_1795665458553.jpg';
import urduStudioEmblem from './assets/images/urdu_studio_emblem_1795665457910.jpg';
import cinemaInsightsBanner from './assets/images/cinema_insights_banner_1795665459138.jpg';

// Preload bundled studio assets immediately on boot (lazy loading disabled)
preloadStudioImages([studioHeroBackdrop, urduStudioEmblem, cinemaInsightsBanner]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
