class LegalChunkerService {
  chunkProvision(provision, metadata) {
    if (provision.type === 'case_law') {
      const text = `Case: ${provision.caseName} (${provision.year || ''})\nCitation: ${provision.citation}\nCourt: ${provision.court}\nBench: ${provision.bench}\nFacts: ${provision.facts}\nIssues: ${(provision.issues || []).join('; ')}\nDecision: ${provision.decision}\nRatio Decidendi: ${provision.ratioDecidendi}\nArticles: ${(provision.articles || []).join(', ')}\nTopics: ${(provision.topics || []).join(', ')}\nQuotations: ${(provision.quotations || []).join(' ')}`;
      return [{
        text,
        metadata: {
          ...metadata,
          caseName: provision.caseName,
          citation: provision.citation,
          chunkType: 'case_law'
        }
      }];
    }

    const headerParts = [];
    if (metadata.act) headerParts.push(`Act: ${metadata.act}`);
    if (metadata.chapter) headerParts.push(`${metadata.chapter}`);
    if (metadata.section) headerParts.push(`Section ${metadata.section}`);
    if (metadata.article) headerParts.push(`Article ${metadata.article}`);
    if (metadata.title) headerParts.push(`${metadata.title}`);
    if (metadata.previousEquivalent) headerParts.push(`[Previous Equivalent: ${metadata.previousEquivalent}]`);

    const header = headerParts.join(' | ');
    const fullText = `${header}\n${provision.text}\n[Keywords: ${(metadata.keywords || []).join(', ')}]`;

    return [{
      text: fullText,
      metadata: {
        ...metadata,
        section: provision.section,
        article: provision.article,
        chunkType: 'statutory_provision'
      }
    }];
  }
}

module.exports = new LegalChunkerService();
