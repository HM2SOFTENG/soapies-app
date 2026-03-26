import QRCode from 'qrcode';

export async function generateTicketQR(reservationId: number): Promise<string> {
  const payload = `SOAPIES-TICKET-${reservationId}-${Date.now()}`;
  return QRCode.toDataURL(payload);
}
