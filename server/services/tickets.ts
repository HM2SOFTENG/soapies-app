// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode') as { toDataURL(text: string): Promise<string> };

export async function generateTicketQR(reservationId: number): Promise<string> {
  const payload = `SOAPIES-TICKET-${reservationId}-${Date.now()}`;
  return QRCode.toDataURL(payload);
}
