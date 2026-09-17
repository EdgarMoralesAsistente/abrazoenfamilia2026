import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MaterialsSection } from './components/MaterialsSection';
import { CampaignImportance } from './components/CampaignImportance';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { ReservationModal } from './components/ReservationModal';
import { RecentPurchaseBubble } from './components/RecentPurchaseBubble';
import { CrmDashboard } from './components/crm/CrmDashboard';
import { CrmLoginModal } from './components/crm/CrmLoginModal';
import { StoredReservation } from './types';
import { CrmUser } from './types/auth';
import { DEFAULT_EXCHANGE_RATE } from './data/parishes';
import { DEFAULT_SHEETS_WEBHOOK_URL } from './utils/sheetsSync';
import { getCrmSession, clearCrmSession } from './lib/googleSheets';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'crm'>('landing');
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isCrmLoginOpen, setIsCrmLoginOpen] = useState(false);
  const [crmUser, setCrmUser] = useState<CrmUser | null>(() => {
    const session = getCrmSession();
    return session ? session.user : null;
  });
  const [preselectedItemId, setPreselectedItemId] = useState<string | undefined>();
  const [exchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('aef_exchange_rate');
    return saved ? parseFloat(saved) : DEFAULT_EXCHANGE_RATE;
  });
  const [googleSheetsWebhookUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryUrl = params.get('sheets_url') || params.get('webhook');
      if (queryUrl && queryUrl.startsWith('http')) {
        localStorage.setItem('aef_sheets_webhook_url', queryUrl);
        return queryUrl;
      }
    }
    return (
      localStorage.getItem('aef_sheets_webhook_url') ||
      (import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL as string) ||
      (process.env.GOOGLE_SHEETS_WEBHOOK_URL as string) ||
      DEFAULT_SHEETS_WEBHOOK_URL
    );
  });
  const [, setReservations] = useState<StoredReservation[]>([]);

  useEffect(() => {
    const loadReservations = async () => {
      try {
        const res = await fetch('/api/reservations');
        if (res.ok) {
          const data = await res.json();
          if (data.reservations && data.reservations.length > 0) {
            setReservations(data.reservations);
            return;
          }
        }
      } catch {}

      const local = localStorage.getItem('aef_reservations_mcbo');
      if (local) {
        try {
          setReservations(JSON.parse(local));
        } catch {}
      }
    };

    loadReservations();
  }, []);

  const handleOpenReservation = (itemId?: string) => {
    setPreselectedItemId(itemId);
    setIsReservationModalOpen(true);
  };

  const handleCloseReservation = () => {
    setIsReservationModalOpen(false);
    setPreselectedItemId(undefined);
  };

  const handleReservationCreated = (newRes: StoredReservation) => {
    setReservations((prev) => [newRes, ...prev]);
  };

  // Manejo del acceso seguro al CRM
  const handleOpenCrm = () => {
    const session = getCrmSession();
    if (session && session.user) {
      setCrmUser(session.user);
      setCurrentView('crm');
    } else {
      setIsCrmLoginOpen(true);
    }
  };

  const handleCrmLoginSuccess = (user: CrmUser) => {
    setCrmUser(user);
    setIsCrmLoginOpen(false);
    setCurrentView('crm');
  };

  const handleCrmLogout = () => {
    clearCrmSession();
    setCrmUser(null);
    setCurrentView('landing');
  };

  if (currentView === 'crm') {
    return (
      <CrmDashboard
        onBackToPublicSite={() => setCurrentView('landing')}
        currentUser={crmUser || undefined}
        onLogout={handleCrmLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 flex flex-col selection:bg-amber-100 selection:text-amber-900 font-sans">
      {/* Navegación con Botón Discreto de CRM con Autenticación */}
      <Navbar
        onOpenReservation={() => handleOpenReservation()}
        onOpenCrm={handleOpenCrm}
      />

      {/* Contenido de la Landing Page */}
      <main className="flex-1">
        <Hero onOpenReservation={() => handleOpenReservation()} />
        <MaterialsSection
          onSelectAndOpenModal={handleOpenReservation}
          exchangeRate={exchangeRate}
        />
        <CampaignImportance />
        <FAQSection />
      </main>

      {/* Pie de Página */}
      <Footer onOpenReservation={() => handleOpenReservation()} />

      {/* Modal de Reserva con Kit y Productos por Separado */}
      <ReservationModal
        isOpen={isReservationModalOpen}
        onClose={handleCloseReservation}
        preselectedItemId={preselectedItemId}
        exchangeRate={exchangeRate}
        onReservationCreated={handleReservationCreated}
        googleSheetsWebhookUrl={googleSheetsWebhookUrl}
      />

      {/* Modal de Inicio de Sesión para Acceso al CRM */}
      <CrmLoginModal
        isOpen={isCrmLoginOpen}
        onClose={() => setIsCrmLoginOpen(false)}
        onLoginSuccess={handleCrmLoginSuccess}
      />

      {/* Burbuja push no intrusiva de compras recientes en parroquias de Maracaibo */}
      <RecentPurchaseBubble onOpenReservation={() => handleOpenReservation()} />
    </div>
  );
}


