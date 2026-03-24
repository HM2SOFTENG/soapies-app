import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const RAVE_COVER = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/event-rave-cover_f3a91331.jpg";
const HOUSE_COVER = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/event-house-cover_1334aa1a.webp";
const BEACH_COVER = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/event-beach-cover_f6a1e6d1.jpg";

const descriptions = {
  "SD House Party": "Get ready for an unforgettable night at Lan's House in Mira Mesa! Our legendary SD House Parties bring together the most vibrant members of the Soapies community for an evening of music, dancing, and genuine connections. Dress to impress and let loose in an intimate, curated setting.",
  "Vegas House Party": "Experience the ultimate Vegas-style house party right here in Mira Mesa! Lan's House transforms into a high-energy playground with premium vibes, incredible music, and the hottest crowd in San Diego. This is where memories are made.",
  "Sex Rave SD": "The most electrifying night in San Diego awaits at CSW in Kearny Mesa! Our Sex Rave events combine pulsating beats, mesmerizing lights, and an uninhibited atmosphere that pushes boundaries. This is the event everyone talks about.",
  "Blacks Beach Party": "Sun, sand, and Soapies! Join us for an all-day celebration at the iconic Black's Beach. From sunrise to sunset, enjoy beach games, music, cocktails, and the best company in San Diego. The ultimate daytime experience for our community.",
};

const events = [
  // Jan 2026
  { date: "2026-01-24", type: "Sex Rave SD", theme: "Anything But Clothes" },
  // Feb 2026
  { date: "2026-02-07", type: "Vegas House Party", theme: "Valentines and Vikings" },
  { date: "2026-02-14", type: "SD House Party", theme: "Valentines and Vikings" },
  { date: "2026-02-28", type: "Sex Rave SD", theme: "Valentines and Vikings" },
  // Mar 2026
  { date: "2026-03-07", type: "Vegas House Party", theme: "Mardi Gras" },
  { date: "2026-03-13", type: "SD House Party", theme: "Mardi Gras" },
  { date: "2026-03-28", type: "Sex Rave SD", theme: "Mardi Gras" },
  // Apr 2026
  { date: "2026-04-04", type: "Vegas House Party", theme: "Barbie" },
  { date: "2026-04-11", type: "SD House Party", theme: "Barbie" },
  { date: "2026-04-25", type: "Sex Rave SD", theme: "Barbie" },
  // May 2026
  { date: "2026-05-02", type: "SD House Party", theme: "Cowboys and Aliens" },
  { date: "2026-05-09", type: "Vegas House Party", theme: "Cowboys and Aliens" },
  { date: "2026-05-16", type: "Sex Rave SD", theme: "Cowboys and Aliens" },
  // Jun 2026
  { date: "2026-06-06", type: "Vegas House Party", theme: "Rainbow Road, Mario" },
  { date: "2026-06-13", type: "SD House Party", theme: "Rainbow Road, Mario" },
  { date: "2026-06-27", type: "Sex Rave SD", theme: "Rainbow Road, Mario" },
  // Jul 2026
  { date: "2026-07-04", type: "Blacks Beach Party", theme: "Herogasm, Comic Con" },
  { date: "2026-07-11", type: "SD House Party", theme: "Herogasm, Comic Con" },
  { date: "2026-07-17", type: "Vegas House Party", theme: "Herogasm, Comic Con" },
  { date: "2026-07-25", type: "Sex Rave SD", theme: "Herogasm, Comic Con" },
  // Aug 2026
  { date: "2026-08-01", type: "Blacks Beach Party", theme: "Circus" },
  { date: "2026-08-08", type: "SD House Party", theme: "Circus" },
  { date: "2026-08-15", type: "Vegas House Party", theme: "Circus" },
  { date: "2026-08-22", type: "Sex Rave SD", theme: "Circus" },
  { date: "2026-08-29", type: "Blacks Beach Party", theme: "Circus" },
  // Sep 2026
  { date: "2026-09-11", type: "SD House Party", theme: "Disco" },
  { date: "2026-09-13", type: "Blacks Beach Party", theme: "Disco" },
  { date: "2026-09-18", type: "Vegas House Party", theme: "Disco" },
  { date: "2026-09-19", type: "Sex Rave SD", theme: "Disco" },
  // Oct 2026
  { date: "2026-10-03", type: "Blacks Beach Party", theme: "Halloween" },
  { date: "2026-10-10", type: "SD House Party", theme: "Halloween" },
  { date: "2026-10-17", type: "Vegas House Party", theme: "Halloween" },
  { date: "2026-10-31", type: "Sex Rave SD", theme: "Halloween" },
  // Nov 2026
  { date: "2026-11-07", type: "Vegas House Party", theme: "80's Goth Prom" },
  { date: "2026-11-14", type: "SD House Party", theme: "80's Goth Prom" },
  { date: "2026-11-21", type: "Sex Rave SD", theme: "80's Goth Prom" },
  // Dec 2026
  { date: "2026-12-05", type: "Vegas House Party", theme: "Christmas" },
  { date: "2026-12-12", type: "SD House Party", theme: "Christmas" },
  { date: "2026-12-31", type: "Sex Rave SD", theme: "New Millennium 2000's" },
];

function getVenue(type) {
  if (type.includes("Beach")) return "Black's Beach";
  if (type.includes("Rave")) return "CSW";
  return "Lan's House";
}

function getAddress(type) {
  if (type.includes("Beach")) return "Black's Beach, La Jolla, CA";
  if (type.includes("Rave")) return "CSW, Kearny Mesa, CA";
  return "Lan's House, Mira Mesa, CA";
}

function getCover(type) {
  if (type.includes("Beach")) return BEACH_COVER;
  if (type.includes("Rave")) return RAVE_COVER;
  return HOUSE_COVER;
}

function getStartDate(dateStr, type) {
  if (type.includes("Beach")) {
    return new Date(dateStr + "T17:00:00.000Z"); // 10am PT = 17:00 UTC
  }
  return new Date(dateStr + "T04:00:00.000Z"); // 8pm PT = 04:00 UTC next day... but we want the date to show correctly
  // Actually, 8pm Pacific = 8pm + 8 = 4am UTC next day. Let's use the date as-is with 8pm local.
  // For DB storage, let's store as the actual UTC time.
}

function getEndDate(dateStr, type) {
  if (type.includes("Beach")) {
    return new Date(dateStr + "T03:00:00.000Z"); // 8pm PT = end of all-day
  }
  // 2am PT next day = 10:00 UTC next day
  const d = new Date(dateStr + "T10:00:00.000Z");
  d.setDate(d.getDate() + 1);
  return d;
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log(`Seeding ${events.length} events...`);

  for (const evt of events) {
    const title = `${evt.type}: ${evt.theme}`;
    const desc = descriptions[evt.type];
    const now = new Date();
    const startDate = getStartDate(evt.date, evt.type);
    const isPast = startDate < now;

    const values = {
      title,
      description: desc,
      coverImageUrl: getCover(evt.type),
      eventType: "regular",
      communityId: "soapies",
      venue: getVenue(evt.type),
      address: getAddress(evt.type),
      startDate,
      endDate: getEndDate(evt.date, evt.type),
      capacity: evt.type.includes("Beach") ? 200 : evt.type.includes("Rave") ? 150 : 80,
      currentAttendees: isPast ? Math.floor(Math.random() * 60) + 20 : Math.floor(Math.random() * 30),
      priceSingleMale: "145.00",
      priceSingleFemale: "40.00",
      priceCouple: "130.00",
      isPublished: true,
      status: isPast ? "completed" : "published",
      createdAt: now,
      updatedAt: now,
    };

    await connection.execute(
      `INSERT INTO events (title, description, coverImageUrl, eventType, communityId, venue, address, startDate, endDate, capacity, currentAttendees, priceSingleMale, priceSingleFemale, priceCouple, isPublished, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.title, values.description, values.coverImageUrl, values.eventType,
        values.communityId, values.venue, values.address, values.startDate, values.endDate,
        values.capacity, values.currentAttendees, values.priceSingleMale, values.priceSingleFemale,
        values.priceCouple, values.isPublished ? 1 : 0, values.status, values.createdAt, values.updatedAt,
      ]
    );

    console.log(`  ✓ ${title} (${evt.date}) - ${values.status}`);
  }

  console.log(`\nDone! ${events.length} events seeded.`);
  await connection.end();
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
