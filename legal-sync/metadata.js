class MetadataGeneratorService {
  enrichMetadata(provision, sourceConfig) {
    return {
      act: provision.act || sourceConfig.title,
      year: provision.year || sourceConfig.year,
      part: provision.part || null,
      chapter: provision.chapter || null,
      section: provision.section || null,
      article: provision.article || null,
      title: provision.title || '',
      previousEquivalent: provision.previousEquivalent || null,
      keywords: Array.from(new Set([...(provision.keywords || []), ...(sourceConfig.category ? [sourceConfig.category] : [])])),
      sourceUrl: sourceConfig.officialUrl,
      sourceAgency: sourceConfig.source,
      category: sourceConfig.category
    };
  }
}

module.exports = new MetadataGeneratorService();
