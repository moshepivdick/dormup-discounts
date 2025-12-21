# How to Seed Universities into Supabase

## Prerequisites

1. Make sure your `.env` file has the correct `DATABASE_URL` and `DIRECT_URL` pointing to your Supabase database
2. Ensure migrations have been applied to your database

## Option 1: Run the Full Seed (Recommended)

This will seed universities along with venues, partners, and admins:

```bash
npm run prisma:seed
```

## Option 2: Seed Only Universities

If you only want to add universities without affecting other data:

```bash
npm run prisma:seed:universities
```

## Option 3: Manual SQL (If scripts don't work)

If the scripts fail, you can run this SQL directly in Supabase SQL Editor:

```sql
-- Insert universities (idempotent - won't create duplicates)
INSERT INTO universities (name, city, email_domains)
VALUES
  ('University of Bologna', 'Bologna', ARRAY['unibo.it', 'studenti.unibo.it', 'studio.unibo.it']),
  ('Bologna Business School', 'Bologna', ARRAY['bbs.unibo.it']),
  ('University of Bologna - Rimini Campus', 'Rimini', ARRAY['unibo.it', 'studenti.unibo.it', 'studio.unibo.it']),
  ('Politecnico di Milano', 'Milan', ARRAY['polimi.it', 'mail.polimi.it', 'studenti.polimi.it']),
  ('University of Milan', 'Milan', ARRAY['unimi.it', 'studenti.unimi.it']),
  ('Bocconi University', 'Milan', ARRAY['unibocconi.it', 'studbocconi.it']),
  ('Cattolica del Sacro Cuore', 'Milan', ARRAY['unicatt.it', 'studenti.unicatt.it']),
  ('Sapienza University of Rome', 'Rome', ARRAY['uniroma1.it', 'stud.uniroma1.it']),
  ('Roma Tre University', 'Rome', ARRAY['uniroma3.it', 'studenti.uniroma3.it']),
  ('University of Rome Tor Vergata', 'Rome', ARRAY['uniroma2.it', 'studenti.uniroma2.it']),
  ('University of Padua', 'Padua', ARRAY['unipd.it', 'studenti.unipd.it']),
  ('University of Turin', 'Turin', ARRAY['unito.it', 'studenti.unito.it']),
  ('Politecnico di Torino', 'Turin', ARRAY['polito.it', 'studenti.polito.it']),
  ('University of Florence', 'Florence', ARRAY['unifi.it', 'studenti.unifi.it']),
  ('University of Pisa', 'Pisa', ARRAY['unipi.it', 'studenti.unipi.it']),
  ('Ca'' Foscari University of Venice', 'Venice', ARRAY['unive.it', 'stud.unive.it']),
  ('University of Naples Federico II', 'Naples', ARRAY['unina.it', 'studenti.unina.it']),
  ('University of Genoa', 'Genoa', ARRAY['unige.it', 'studenti.unige.it']),
  ('University of Pavia', 'Pavia', ARRAY['unipv.it', 'studenti.unipv.it']),
  ('University of Verona', 'Verona', ARRAY['univr.it', 'studenti.univr.it']),
  ('University of Trento', 'Trento', ARRAY['unitn.it', 'studenti.unitn.it']),
  ('University of Modena and Reggio Emilia', 'Modena', ARRAY['unimore.it', 'studenti.unimore.it']),
  ('University of Ferrara', 'Ferrara', ARRAY['unife.it', 'studenti.unife.it']),
  ('University of Parma', 'Parma', ARRAY['unipr.it', 'studenti.unipr.it']),
  ('University of Urbino', 'Urbino', ARRAY['uniurb.it', 'studenti.uniurb.it']),
  ('Marche Polytechnic University', 'Ancona', ARRAY['univpm.it', 'studenti.univpm.it'])
ON CONFLICT (name) DO UPDATE
SET
  city = EXCLUDED.city,
  email_domains = EXCLUDED.email_domains;
```

## Verify Universities Were Added

After seeding, verify in Supabase:

1. Go to Table Editor
2. Select the `universities` table
3. You should see all the universities listed

Or run this query in SQL Editor:

```sql
SELECT name, city, email_domains FROM universities ORDER BY name;
```

## Troubleshooting

### Error: "column email_domains does not exist"

This means the migration hasn't been applied. Run:

```bash
npx prisma migrate deploy
```

### Error: "relation universities does not exist"

The tables haven't been created. Make sure you've run the migration:

```bash
npx prisma migrate deploy
```

### Connection Issues

1. Check your `.env` file has correct `DATABASE_URL` and `DIRECT_URL`
2. Make sure your Supabase project is active
3. Verify network connectivity



