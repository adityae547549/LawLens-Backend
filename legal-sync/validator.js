class QualityValidatorService {
  validateChunks(chunks, sourceId) {
    const issues = {
      duplicates: 0,
      emptyChunks: 0,
      missingMetadata: 0,
      validChunks: 0
    };
    const seenText = new Set();

    chunks.forEach((chunk) => {
      if (!chunk.text || chunk.text.trim().length === 0) {
        issues.emptyChunks++;
      } else if (seenText.has(chunk.text)) {
        issues.duplicates++;
      } else {
        seenText.add(chunk.text);
        if (!chunk.metadata || !chunk.metadata.act) {
          issues.missingMetadata++;
        } else {
          issues.validChunks++;
        }
      }
    });

    return {
      sourceId,
      total: chunks.length,
      valid: issues.validChunks,
      issues,
      status: issues.emptyChunks === 0 && issues.missingMetadata === 0 ? 'PASSED' : 'WARNING'
    };
  }
}

module.exports = new QualityValidatorService();
