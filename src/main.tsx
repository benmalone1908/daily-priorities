
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { CampaignFilterProvider } from './contexts/CampaignFilterContext.tsx'

createRoot(document.getElementById("root")!).render(
  <CampaignFilterProvider>
    <App />
  </CampaignFilterProvider>
);
