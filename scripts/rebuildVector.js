require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const documentProcessor = require('../rag/documentProcessor');
const vectorStore = require('../rag/vectorStore');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

async function rebuildVectorDatabase() {
  console.log('LawLens - Rebuilding Vector Database');
  console.log('====================================');
  console.log(`Data directory: ${DATA_DIR}`);
  console.log('');

  try {
    await vectorStore.clear();
    console.log('✓ Cleared existing vector store');

    const { chunks, errors } = await documentProcessor.processDirectory(DATA_DIR);

    if (chunks.length > 0) {
      await vectorStore.addDocuments(chunks);
      console.log(`✓ Added ${chunks.length} chunks to vector store`);
    } else {
      console.log('No documents found to process');
    }

    if (errors.length > 0) {
      console.log('');
      console.log('Errors:');
      errors.forEach(e => console.log(`  ✗ ${e.file}: ${e.error}`));
    }

    console.log('');
    console.log(`Vector database rebuilt successfully. Total chunks: ${vectorStore.count()}`);
  } catch (error) {
    console.error('Failed to rebuild vector database:', error);
    process.exit(1);
  }
}

rebuildVectorDatabase();
