import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MaterialsSection } from './components/MaterialsSection';
import { CampaignImportance } from './components/CampaignImportance';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { ReservationModal } from './components/ReservationModal';
import { RecentPurchaseBubble } from './components/RecentPurchaseBubble';
import { StoredReservation } from './types';
import { DEFAULT_EXCHANGE_RATE } from './data/parishes';

export default function App() {
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [preselectedItemId, setPreselectedItemId] = useState<string | undefined>();
  const [exchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('aef_exchange_rate');
    return saved ? parseFloat(saved) : DEFAULT_EXCHANGE_RATE;
  });
  const [googleSheetsWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('aef_sheets_webhook_url') || '';
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

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 flex flex-col selection:bg-amber-100 selection:text-amber-900 font-sans">
      {/* Navegación Simple y Minimalista */}
      <Navbar onOpenReservation={() => handleOpenReservation()} />

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

      {/* Burbuja push no intrusiva de compras recientes en parroquias de Maracaibo */}
      <RecentPurchaseBubble onOpenReservation={() => handleOpenReservation()} />
    </div>
  );
}
