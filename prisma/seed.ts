import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const venues = [
  {
    name: 'Moka Brew Lab',
    city: 'Rimini',
    category: 'Specialty Cafe',
    discountText: '15% off specialty coffee flights + pastries.',
    details:
      'Valid daily until 18:00. Ask for the DormUp board for seasonal drinks. Address: Corso d\'Augusto, 45, 47921 Rimini RN.',
    openingHours: 'Mon–Fri 08:00–20:00 · Sat 09:00–18:00 · Sun closed',
    openingHoursShort: 'Weekdays 08:00–20:00 · Sat 09:00–18:00',
    mapUrl:
      'https://maps.app.goo.gl/6VjbSd9VYrQnNkg96',
    latitude: 44.0678,
    longitude: 12.5695,
  },
  {
    name: 'Tramonto Piadineria',
    city: 'Rimini',
    category: 'Street Food',
    discountText: 'Buy 1 piadina, get the second at 50% off.',
    details: 'Applies to all vegetarian options. Max 2 redemptions per day. Address: Via San Giuliano, 12, 47921 Rimini RN.',
    openingHours: 'Daily 11:00–23:00',
    openingHoursShort: 'Daily 11:00–23:00',
    mapUrl:
      'https://maps.app.goo.gl/SbZr48YzX35N1B5g8',
    latitude: 44.0665,
    longitude: 12.5710,
  },
  {
    name: 'Portico Social Bar',
    city: 'Bologna',
    category: 'Cocktail Bar',
    discountText: 'Free mocktail with every aperitivo board.',
    details:
      'Bring at least one friend. Available from 17:00–20:00 Monday to Friday. Address: Via del Pratello, 18, 40122 Bologna BO.',
    openingHours: 'Mon–Thu 16:00–00:00 · Fri–Sat 16:00–02:00 · Sun closed',
    openingHoursShort: 'Tue–Sat 16:00–late',
    mapUrl:
      'https://maps.app.goo.gl/iK4ZC2u4dV3iBEMc6',
    latitude: 44.4949,
    longitude: 11.3426,
  },
  {
    name: 'Forno di Piazza',
    city: 'Bologna',
    category: 'Bakery & Cafe',
    discountText: '10% off focaccia slices and drip coffee combos.',
    details: 'Show your DormUp code before paying at the counter. Address: Via Rizzoli, 8, 40125 Bologna BO.',
    openingHours: 'Daily 07:30–19:30',
    openingHoursShort: 'Daily 07:30–19:30',
    mapUrl:
      'https://maps.app.goo.gl/zv45ij4eQvZ9Uq3J7',
    latitude: 44.4938,
    longitude: 11.3387,
  },
  {
    name: 'Chi Burdlaz Garden',
    city: 'Rimini',
    category: 'Restaurant',
    discountText: '10% OFF for DormUp students',
    details: 'Present your DormUp code before ordering. Address: incrocio, Viale Vespucci, Viale Trieste, 63, 47921 Rimini RN.',
    openingHoursShort: 'Every day · 12:00–23:30',
    mapUrl: 'https://maps.app.goo.gl/DDAUAfgQhZxwKajm8',
    phone: '0541 21528',
    latitude: 44.0680992,
    longitude: 12.5802418,
    imageUrl:
      'https://lh3.googleusercontent.com/p/AF1QipMY3ABLMEUE8g_o6k1gHRt54T5Rogd8GvdNp7DD=w600-h400-k-no',
    thumbnailUrl: '/venues/chi-burdlaz.jpg',
  },
  {
    name: 'Osteria Pizzeria Le Logge',
    city: 'Rimini',
    category: 'Restaurant / Pizzeria',
    discountText: '10% OFF for DormUp students',
    details: 'Show your DormUp code at the counter when ordering. Valid for dine-in and takeaway. Address: Viale Trieste, 5, 47921 Rimini RN.',
    openingHours: 'Daily 12:00–23:30',
    openingHoursShort: 'Every day · 12:00–23:30',
    mapUrl: 'https://www.google.com/maps?q=44.069654,12.573245',
    latitude: 44.069654,
    longitude: 12.573245,
  },
  {
    name: 'Caffè Letterario',
    city: 'Bologna',
    category: 'Cafe',
    discountText: '20% off all coffee drinks and croissants before 11:00 AM.',
    details: 'Perfect morning spot for students! Show your DormUp code at checkout. Valid Monday to Friday. Address: Via de\' Giudei, 15, 40126 Bologna BO.',
    openingHours: 'Mon–Fri 07:00–19:00 · Sat–Sun 08:00–20:00',
    openingHoursShort: 'Daily 07:00–20:00',
    mapUrl: 'https://maps.app.goo.gl/example1',
    latitude: 44.4920,
    longitude: 11.3430,
  },
  {
    name: 'Espresso Bar Marina',
    city: 'Rimini',
    category: 'Cafe',
    discountText: 'Buy 2 coffees, get 1 free. Valid all day.',
    details: 'Relax by the beach with discounted coffee! Present your DormUp code. Address: Lungomare Augusto Murri, 47, 47921 Rimini RN.',
    openingHours: 'Daily 06:30–22:00',
    openingHoursShort: 'Daily 06:30–22:00',
    mapUrl: 'https://maps.app.goo.gl/example2',
    latitude: 44.0650,
    longitude: 12.5750,
  },
];

const italianUniversities = [
  {
    name: 'University of Bologna',
    city: 'Bologna',
    emailDomains: ['unibo.it', 'studenti.unibo.it'],
  },
  {
    name: 'Politecnico di Milano',
    city: 'Milan',
    emailDomains: ['polimi.it', 'mail.polimi.it'],
  },
  {
    name: 'University of Milan',
    city: 'Milan',
    emailDomains: ['unimi.it', 'studenti.unimi.it'],
  },
  {
    name: 'Sapienza University of Rome',
    city: 'Rome',
    emailDomains: ['uniroma1.it', 'stud.uniroma1.it'],
  },
  {
    name: 'University of Padua',
    city: 'Padua',
    emailDomains: ['unipd.it', 'studenti.unipd.it'],
  },
  {
    name: 'University of Turin',
    city: 'Turin',
    emailDomains: ['unito.it', 'studenti.unito.it'],
  },
  {
    name: 'Politecnico di Torino',
    city: 'Turin',
    emailDomains: ['polito.it', 'studenti.polito.it'],
  },
  {
    name: 'University of Florence',
    city: 'Florence',
    emailDomains: ['unifi.it', 'studenti.unifi.it'],
  },
  {
    name: 'University of Pisa',
    city: 'Pisa',
    emailDomains: ['unipi.it', 'studenti.unipi.it'],
  },
  {
    name: 'Bocconi University',
    city: 'Milan',
    emailDomains: ['unibocconi.it', 'studbocconi.it'],
  },
  {
    name: "Ca' Foscari University of Venice",
    city: 'Venice',
    emailDomains: ['unive.it', 'stud.unive.it'],
  },
  {
    name: 'University of Naples Federico II',
    city: 'Naples',
    emailDomains: ['unina.it', 'studenti.unina.it'],
  },
  {
    name: 'Roma Tre University',
    city: 'Rome',
    emailDomains: ['uniroma3.it', 'studenti.uniroma3.it'],
  },
  {
    name: 'University of Rome Tor Vergata',
    city: 'Rome',
    emailDomains: ['uniroma2.it', 'studenti.uniroma2.it'],
  },
];

async function main() {
  // Seed universities (idempotent)
  for (const uni of italianUniversities) {
    await prisma.university.upsert({
      where: { name: uni.name },
      update: {
        city: uni.city,
        emailDomains: uni.emailDomains,
      },
      create: {
        name: uni.name,
        city: uni.city,
        emailDomains: uni.emailDomains,
      },
    });
  }

  await prisma.discountUse.deleteMany();
  await prisma.venueView.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.venue.createMany({ data: venues });

  const targetVenue = await prisma.venue.findFirst({
    where: { name: 'Chi Burdlaz Garden' },
  });

  if (!targetVenue) {
    throw new Error('Seed venue for partner not found.');
  }

  const [partnerPassword, adminPassword] = await Promise.all([
    bcrypt.hash('dormup2024', 10),
    bcrypt.hash('admin123', 10),
  ]);

  // Idempotent partner creation: upsert by email
  // If partner exists, update passwordHash and keep rest unchanged
  await prisma.partner.upsert({
    where: { email: 'demo@partner.com' },
    update: {
      passwordHash: partnerPassword,
      // Keep existing name, isActive, venueId, etc. unchanged
    },
    create: {
      email: 'demo@partner.com',
      passwordHash: partnerPassword,
      venueId: targetVenue.id,
      // isActive defaults to true in schema
    },
  });

  // Idempotent admin creation: upsert by email
  // If admin exists, update passwordHash and keep rest unchanged
  await prisma.admin.upsert({
    where: { email: 'admin@dormup.it' },
    update: {
      passwordHash: adminPassword,
      // Keep existing role unchanged
    },
    create: {
      email: 'admin@dormup.it',
      passwordHash: adminPassword,
      role: 'superadmin',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

