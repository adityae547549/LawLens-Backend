const fs = require('fs');

class LegalParserService {
  parseJsonAct(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    const provisions = [];

    if (Array.isArray(data)) {
      data.forEach((group) => {
        const actName = group.act || 'Indian Statute';
        const year = group.year || null;
        const part = group.part || null;
        const chapter = group.chapter || null;

        if (group.sections && Array.isArray(group.sections)) {
          group.sections.forEach((sec) => {
            provisions.push({
              act: actName,
              year,
              part,
              chapter,
              section: String(sec.num || sec.section || ''),
              article: sec.article ? String(sec.article) : null,
              title: sec.title || '',
              text: sec.text || '',
              previousEquivalent: sec.previousEquivalent || null,
              keywords: sec.keywords || sec.key_topics || []
            });
          });
        } else if (group.case) {
          provisions.push({
            type: 'case_law',
            caseName: group.case,
            citation: group.citation || '',
            court: group.court || 'Supreme Court of India',
            bench: group.bench || '',
            year: group.year || null,
            facts: group.facts || '',
            issues: group.issues || [],
            decision: group.decision || '',
            ratioDecidendi: group.ratioDecidendi || group.principle || '',
            articles: group.articles || [],
            topics: group.topics || [],
            quotations: group.quotations || []
          });
        }
      });
    }
    return provisions;
  }
}

module.exports = new LegalParserService();
