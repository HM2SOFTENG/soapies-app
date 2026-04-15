export async function generateTicketQR(reservationId: number): Promise<string> {
  // Store a compact scannable payload, not a PNG data URL
  // Format: SOAPIES-{reservationId}-{timestamp}-{checksum}
  const timestamp = Date.now();
  const checksum = (reservationId * 7 + timestamp % 1000).toString(36).toUpperCase();
  return `SOAPIES-${reservationId}-${timestamp}-${checksum}`;
}
