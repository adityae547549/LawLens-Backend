const vectorStore = require('../rag/vectorStore');
const retriever = require('../rag/retriever');
const generator = require('../rag/generator');
const directAI = require('../rag/directAI');

exports.summarize = async (req, res) => {
  try {
    const { text, mode = 'concise', maxLength = 500 } = req.body;
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Text must be at least 50 characters' });
    }

    const modeInstructions = {
      'concise': 'Summarize the following text in 3-5 clear bullet points. Be precise and factual.',
      'detailed': 'Provide a detailed summary covering key points, main arguments, and conclusions. Use clear section breaks.',
      'extract': 'Extract all key legal principles, sections, and case laws mentioned in the text. Format as a structured list.',
      'plain': 'Explain the following text in simple, plain language. Avoid legal jargon. Use analogies where helpful.'
    };

    const instruction = modeInstructions[mode] || modeInstructions.concise;
    const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n\n[Text truncated]' : text;

    const result = await directAI.generate(
      `${instruction}\n\nTEXT TO SUMMARIZE:\n${truncated}\n\nSUMMARY:`,
      { systemOverride: 'You are a legal document summarizer. Be concise and accurate.' }
    );

    res.json({
      summary: result.answer || 'No summary generated.',
      mode,
      originalLength: text.length,
      summaryLength: (result.answer || '').length
    });
  } catch (error) {
    console.error('Summarizer error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

exports.summarizeDocument = async (req, res) => {
  try {
    const { fileId, mode = 'concise' } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const docs = await vectorStore.searchByMetadata({ fileId }, 100);
    if (docs.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fullText = docs.map(d => d.text).join('\n\n');
    const truncated = fullText.length > 10000 ? fullText.slice(0, 10000) + '\n\n[Document truncated]' : fullText;

    const modeInstructions = {
      'concise': 'Summarize this legal document in 5-7 key bullet points covering the main provisions.',
      'detailed': 'Provide a structured summary of this legal document organized by chapters or sections. Include key provisions and their implications.',
      'extract': 'Extract all specific legal provisions, numbers, dates, and actionable items from this document.'
    };

    const instruction = modeInstructions[mode] || modeInstructions.concise;
    const result = await directAI.generate(
      `${instruction}\n\nDOCUMENT:\n${truncated}\n\nSUMMARY:`,
      { systemOverride: 'You are a legal document analyzer. Provide structured summaries.' }
    );

    res.json({
      summary: result.answer || 'No summary generated.',
      mode,
      fileName: docs[0]?.metadata?.fileName || 'Unknown',
      totalChunks: docs.length,
      originalLength: fullText.length
    });
  } catch (error) {
    console.error('Document summarizer error:', error);
    res.status(500).json({ error: 'Failed to summarize document' });
  }
};

exports.compareDocuments = async (req, res) => {
  try {
    const { fileIds, query } = req.body;
    if (!fileIds || fileIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 fileIds are required for comparison' });
    }

    const allResults = [];
    for (const fileId of fileIds) {
      const docs = await vectorStore.searchByMetadata({ fileId }, 50);
      if (docs.length > 0) {
        allResults.push({
          fileId,
          fileName: docs[0]?.metadata?.fileName || 'Unknown',
          text: docs.map(d => d.text).join('\n').slice(0, 5000)
        });
      }
    }

    if (allResults.length < 2) {
      return res.status(404).json({ error: 'Could not find enough documents for comparison' });
    }

    const compareText = allResults.map((r, i) =>
      `DOCUMENT ${i + 1}: ${r.fileName}\n${r.text}`
    ).join('\n\n---\n\n');

    const queryInstruction = query
      ? `Focus the comparison on this specific aspect: "${query}"`
      : 'Compare and contrast these documents, highlighting similarities, differences, and conflicts.';

    const result = await directAI.generate(
      `Compare the following legal documents. ${queryInstruction}\n\n${compareText}\n\nCOMPARISON:`,
      { systemOverride: 'You are a legal document comparison expert. Highlight key differences and similarities.' }
    );

    res.json({
      comparison: result.answer || 'No comparison generated.',
      documents: allResults.map(r => ({ fileId: r.fileId, fileName: r.fileName })),
      documentCount: allResults.length
    });
  } catch (error) {
    console.error('Document comparison error:', error);
    res.status(500).json({ error: 'Failed to compare documents' });
  }
};
