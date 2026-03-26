import { motion } from 'framer-motion';
import { trpc } from '../lib/trpc';
import { Link } from 'wouter';

export default function Tickets() {
  const { data: tickets, isLoading } = trpc.reservations.myTickets.useQuery();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-white">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-black/90 p-4 pt-20 pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">🎟 My Tickets</h1>
      {!tickets?.length ? (
        <div className="text-center text-white/60 py-20">
          <p className="text-lg mb-4">No tickets yet</p>
          <Link href="/events" className="bg-pink-600 text-white px-6 py-2 rounded-full">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4"
            >
              <div className="flex gap-4 items-start">
                {t.qrCode && (
                  <img
                    src={t.qrCode}
                    alt="QR"
                    className="w-24 h-24 rounded-xl bg-white p-1 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-bold text-lg truncate">{t.eventTitle}</h2>
                  <p className="text-white/60 text-sm">{t.eventVenue}</p>
                  <p className="text-white/60 text-sm">
                    {t.eventDate ? new Date(t.eventDate).toLocaleDateString() : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {t.ticketType && (
                      <span className="bg-pink-600/30 text-pink-300 text-xs px-2 py-1 rounded-full">
                        {t.ticketType.replace(/_/g, ' ')}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        t.checkinStatus === 'checked_in'
                          ? 'bg-green-600/30 text-green-300'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {t.checkinStatus === 'checked_in' ? '✓ Checked In' : 'Not checked in'}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        t.paymentStatus === 'paid'
                          ? 'bg-blue-600/30 text-blue-300'
                          : 'bg-yellow-600/30 text-yellow-300'
                      }`}
                    >
                      {t.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
