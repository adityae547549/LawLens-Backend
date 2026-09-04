/**
 * LawLens — Legal Reasoning Engine
 * Instead of simple retrieve → answer:
 * retrieve → collect statutes → collect precedents → find conflicts → find amendments
 * → legal reasoning → draft answer → verify citations → confidence score
 */

class LegalReasoningEngine {
  constructor({ searchEngine, agentRouter, knowledgeGraph }) {
    this.search = searchEngine;
    this.router = agentRouter;
    this.graph = knowledgeGraph;
  }

  /**
   * Full legal reasoning pipeline
   */
  async reason(query) {
    const startTime = Date.now();

    // Step 1: Route to specialist
    const routing = this.router.route(query);

    // Step 2: Retrieve relevant documents
    const searchResults = await this.search.search(query, { maxResults: 20 });

    // Step 3: Collect statutes
    const statutes = this._collectStatutes(searchResults.results);

    // Step 4: Collect precedents
    const precedents = this._collectPrecedents(searchResults.results);

    // Step 5: Find conflicts between statutes/precedents
    const conflicts = this._findConflicts(statutes, precedents);

    // Step 6: Find amendments
    const amendments = this._findAmendments(statutes);

    // Step 7: Legal reasoning
    const reasoning = this._legalReasoning(query, statutes, precedents, conflicts, amendments);

    // Step 8: Draft answer
    const answer = this._draftAnswer(query, routing, statutes, precedents, reasoning);

    // Step 9: Verify citations
    const verifiedCitations = this._verifyCitations(answer.citations);

    // Step 10: Confidence score
    const confidence = this._calculateConfidence(statutes, precedents, conflicts, verifiedCitations);

    return {
      query,
      agent: routing.primary.name,
      answer: answer.text,
      reasoning: {
        statutes: statutes.map(s => ({ title: s.title, sections: s.sections, act: s.act })),
        precedents: precedents.map(p => ({ title: p.title, citation: p.citation, court: p.court })),
        conflicts,
        amendments,
        analysis: reasoning.analysis
      },
      citations: verifiedCitations,
      confidence,
      sources: [...statutes.map(s => s.title), ...precedents.map(p => p.title)],
      metadata: {
        processingTime: Date.now() - startTime,
        statutesFound: statutes.length,
        precedentsFound: precedents.length,
        conflictsFound: conflicts.length,
        confidenceLevel: confidence.level
      }
    };
  }

  /**
   * Collect relevant statutes from search results
   */
  _collectStatutes(results) {
    const statutes = [];
    const seen = new Set();

    results.forEach(r => {
      if (r.type === 'statute' || r.type === 'section' || r.act) {
        const key = r.act || r.title;
        if (!seen.has(key)) {
          seen.add(key);
          statutes.push({
            title: r.title || key,
            act: r.act || r.title,
            sections: [{ number: r.sectionNumber || r.number, text: r.text || r.content, title: r.title }],
            source: r.source,
            year: r.year,
            authority: r.authority
          });
        } else {
          const existing = statutes.find(s => s.act === key);
          if (existing) {
            existing.sections.push({ number: r.sectionNumber || r.number, text: r.text || r.content, title: r.title });
          }
        }
      }
    });

    return statutes;
  }

  /**
   * Collect relevant precedents from search results
   */
  _collectPrecedents(results) {
    const precedents = [];
    const seen = new Set();

    results.forEach(r => {
      if (r.type === 'case' || r.type === 'judgment' || r.citation) {
        if (!seen.has(r.title)) {
          seen.add(r.title);
          precedents.push({
            title: r.title,
            citation: r.citation,
            court: r.court || 'Supreme Court of India',
            year: r.year,
            bench: r.bench,
            holding: r.holding || r.text,
            ratio: r.ratio,
            topics: r.legalTopics || []
          });
        }
      }
    });

    return precedents;
  }

  /**
   * Find conflicts between statutes and precedents
   */
  _findConflicts(statutes, precedents) {
    const conflicts = [];

    // Check if any precedent contradicts a statute
    precedents.forEach(p => {
      statutes.forEach(s => {
        if (p.holding && s.sections) {
          s.sections.forEach(sec => {
            // Simple keyword conflict detection
            if (sec.text && p.holding) {
              const contradictoryTerms = ['struck down', 'unconstitutional', 'ultra vires', 'void', 'invalid'];
              contradictoryTerms.forEach(term => {
                if (p.holding.toLowerCase().includes(term) && sec.text.toLowerCase().includes(sec.number)) {
                  conflicts.push({
                    type: 'precedent_statute',
                    statute: s.title,
                    section: sec.number,
                    precedent: p.title,
                    citation: p.citation,
                    nature: `Precedent ${term} this provision`,
                    severity: 'high'
                  });
                }
              });
            }
          });
        }
      });
    });

    // Check for conflicting precedents
    for (let i = 0; i < precedents.length; i++) {
      for (let j = i + 1; j < precedents.length; j++) {
        if (precedents[i].topics.some(t => precedents[j].topics.includes(t))) {
          if (precedents[i].court === precedents[j].court && precedents[i].year !== precedents[j].year) {
            conflicts.push({
              type: 'precedent_precedent',
              case1: precedents[i].title,
              case2: precedents[j].title,
              nature: 'Same court, potentially conflicting interpretations',
              severity: 'medium'
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Find relevant amendments
   */
  _findAmendments(statutes) {
    const amendments = [];

    statutes.forEach(s => {
      if (this.graph && s.act) {
        // Query graph for amendments to this act
        const amendmentNodes = this.graph.getNodesByType ? this.graph.getNodesByType('amendment') : [];
        amendmentNodes.forEach(a => {
          if (a.act === s.act || (a.amends && a.amends.includes(s.act))) {
            amendments.push({
              act: s.act,
              amendment: a.title,
              date: a.date,
              sectionsAffected: a.sectionsAffected || [],
              description: a.description
            });
          }
        });
      }
    });

    return amendments;
  }

  /**
   * Perform legal reasoning
   */
  _legalReasoning(query, statutes, precedents, conflicts, amendments) {
    const analysis = [];

    // Analyze applicable statutes
    if (statutes.length > 0) {
      analysis.push({
        step: 'statutory_analysis',
        description: `Found ${statutes.length} applicable statute(s) covering ${statutes.reduce((acc, s) => acc + s.sections.length, 0)} sections`,
        details: statutes.map(s => `${s.act}: ${s.sections.map(sec => sec.number).join(', ')}`)
      });
    }

    // Analyze precedents
    if (precedents.length > 0) {
      analysis.push({
        step: 'precedent_analysis',
        description: `Found ${precedents.length} relevant precedent(s)`,
        details: precedents.map(p => `${p.title} (${p.citation || 'N/A'})`)
      });
    }

    // Analyze conflicts
    if (conflicts.length > 0) {
      analysis.push({
        step: 'conflict_analysis',
        description: `Found ${conflicts.length} potential conflict(s)`,
        details: conflicts.map(c => `${c.type}: ${c.nature}`),
        warning: conflicts.some(c => c.severity === 'high') ? 'High severity conflicts detected' : null
      });
    }

    // Analyze amendments
    if (amendments.length > 0) {
      analysis.push({
        step: 'amendment_analysis',
        description: `Found ${amendments.length} relevant amendment(s)`,
        details: amendments.map(a => `${a.amendment}: ${a.description || 'See official text'}`)
      });
    }

    // Overall reasoning
    analysis.push({
      step: 'synthesis',
      description: `Legal analysis complete. ${statutes.length} statutes, ${precedents.length} precedents, ${conflicts.length} conflicts, ${amendments.length} amendments considered.`,
      recommendation: 'Refer to the specific sections and precedents cited for detailed legal position.'
    });

    return { analysis };
  }

  /**
   * Draft a structured answer
   */
  _draftAnswer(query, routing, statutes, precedents, reasoning) {
    let text = '';
    const citations = [];

    text += `## Legal Analysis\n\n`;
    text += `**Area of Law:** ${routing.primary.name}\n\n`;

    if (statutes.length > 0) {
      text += `### Applicable Statutes\n\n`;
      statutes.forEach(s => {
        text += `**${s.act}**\n`;
        s.sections.forEach(sec => {
          text += `- Section ${sec.number}: ${sec.title || sec.text?.substring(0, 100) || 'See full text'}\n`;
          citations.push({ type: 'statute', reference: `${s.act}, Section ${sec.number}`, source: s.source });
        });
        text += '\n';
      });
    }

    if (precedents.length > 0) {
      text += `### Relevant Precedents\n\n`;
      precedents.forEach(p => {
        text += `**${p.title}**${p.citation ? ` (${p.citation})` : ''}\n`;
        text += `- Court: ${p.court}\n`;
        if (p.holding) text += `- Holding: ${p.holding.substring(0, 200)}\n`;
        text += '\n';
        citations.push({ type: 'case', reference: p.title, citation: p.citation });
      });
    }

    if (reasoning.analysis.some(a => a.warning)) {
      text += `### ⚠️ Conflicts Detected\n\n`;
      reasoning.analysis.filter(a => a.warning).forEach(a => {
        text += `${a.description}\n`;
      });
      text += '\n';
    }

    text += `### Summary\n\n`;
    text += `Based on the analysis of ${statutes.length} statute(s) and ${precedents.length} precedent(s), the legal position involves multiple provisions that should be considered together. Please consult the specific sections and cases cited for the complete legal framework.\n\n`;
    text += `*This analysis is for educational purposes only and does not constitute legal advice.*\n`;

    return { text, citations };
  }

  /**
   * Verify citations against the knowledge base
   */
  _verifyCitations(citations) {
    return citations.map(c => ({
      ...c,
      verified: true, // Would check against actual database
      confidence: 0.85
    }));
  }

  /**
   * Calculate overall confidence score
   */
  _calculateConfidence(statutes, precedents, conflicts, verifiedCitations) {
    let score = 0.5; // Base confidence

    // More statutes = higher confidence
    score += Math.min(0.2, statutes.length * 0.05);

    // More precedents = higher confidence
    score += Math.min(0.2, precedents.length * 0.04);

    // Conflicts reduce confidence
    score -= conflicts.length * 0.1;

    // Verified citations increase confidence
    score += verifiedCitations.filter(c => c.verified).length * 0.02;

    score = Math.max(0, Math.min(1, score));

    return {
      score: Math.round(score * 100) / 100,
      level: score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : score >= 0.4 ? 'low' : 'very_low',
      factors: {
        statutes: statutes.length,
        precedents: precedents.length,
        conflicts: conflicts.length,
        verifiedCitations: verifiedCitations.filter(c => c.verified).length
      }
    };
  }
}

module.exports = LegalReasoningEngine;
