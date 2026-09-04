require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const vectorStore = require('../rag/vectorStore');
const documentProcessor = require('../rag/documentProcessor');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

async function seed() {
  console.log('LawLens - Seeding Database');
  console.log('=========================');

  const users = db.findAll('users');
  if (users.length === 0) {
    const defaultAdminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 12);
    const admin = db.insertOne('users', {
      name: 'Admin',
      email: 'admin@lawlense.com',
      password: hashedPassword,
      role: 'admin',
      preferences: { theme: 'dark', notifications: true }
    });
    console.log(`\nAdmin user created:`);
    console.log(`  Email: admin@lawlense.com`);
    console.log(`  Password: ${defaultAdminPassword}`);
    console.log(`  Role: admin`);
  } else {
    console.log('Users already exist, skipping admin creation');
  }

  console.log('\nBuilding vector database...');
  const files = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [];
  if (files.length === 0) {
    console.log('No documents found in data/ directory');
    console.log('Place legal documents (PDF, TXT, DOCX, JSON, MD) in backend/data/');
  } else {
    await vectorStore.clear();
    const { chunks, errors } = await documentProcessor.processDirectory(DATA_DIR);
    if (chunks.length > 0) {
      await vectorStore.addDocuments(chunks);
      console.log(`Added ${chunks.length} chunks to vector store`);
    }
    if (errors.length > 0) {
      errors.forEach(e => console.log(`Error: ${e.file}: ${e.error}`));
    }
  }

  console.log('\nSeed complete!');
  console.log(`\nAccess LawLens at http://localhost:${process.env.PORT || 3000}`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
