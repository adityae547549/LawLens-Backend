require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initFirebaseAdmin } = require('../utils/firebaseAdmin');
initFirebaseAdmin();
const db = require('../database/db');

async function seed() {
  const adminFirebaseUid = process.env.ADMIN_FIREBASE_UID;
  if (!adminFirebaseUid) {
    console.error('ADMIN_FIREBASE_UID is not set. Skipping admin seeding.');
    console.error('Set ADMIN_FIREBASE_UID=<firebase-uid> in backend/.env and re-run.');
    process.exit(1);
  }

  const existing = await db.findOne('users', { firebaseUid: adminFirebaseUid });

  if (existing) {
    await db.updateOne('users', { id: existing.id }, { role: 'admin' });
    console.log(`Admin role applied to ${existing.email || adminFirebaseUid}`);
  } else {
    await db.insertOne('users', {
      firebaseUid: adminFirebaseUid,
      name: process.env.ADMIN_NAME || 'Admin',
      email: process.env.ADMIN_EMAIL || null,
      role: 'admin',
      preferences: { theme: 'dark', notifications: true },
    });
    console.log(`Admin user created for ${process.env.ADMIN_EMAIL || adminFirebaseUid}`);
  }

  const seeded = true;
  console.log('Seeding complete.');
  return { seeded };
}

if (require.main === module) {
  seed()
    .then(({ seeded }) => process.exit(seeded ? 0 : 1))
    .catch(err => {
      console.error('Seeding failed:', err.message);
      process.exit(1);
    });
}

module.exports = seed;