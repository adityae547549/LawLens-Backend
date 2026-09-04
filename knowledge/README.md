# LawLens Legal Knowledge Operating System (LKOS)

## Overview

The Legal Knowledge Operating System (LKOS) transforms LawLens from a static legal chatbot into a continuously evolving Legal Knowledge Platform. It automatically ingests, verifies, organizes, indexes, and updates authentic legal knowledge from official sources.

## Architecture

```
Official Sources
      ↓
Source Registry
      ↓
Change Detection
      ↓
Downloader
      ↓
Integrity Verification
      ↓
Parser (Hierarchy-Preserving)
      ↓
Hierarchy Builder
      ↓
Metadata Extraction
      ↓
Cross Reference Engine
      ↓
Knowledge Graph
      ↓
Chunking Engine
      ↓
Embedding Generation
      ↓
BM25 Index
      ↓
Hybrid Retrieval
      ↓
Benchmark Suite
      ↓
Production
```

## Components

### 1. Source Registry (`registry/sourceRegistry.js`)
Central registry tracking all legal data sources with:
- Unique source IDs
- Authority and document type
- Source URLs and parsers
- Update frequency and checksums
- Version tracking and integrity status

### 2. Change Detection (`monitors/changeDetector.js`)
Smart update detection using:
- SHA-256 checksums
- HTTP ETags and Last-Modified headers
- Version comparison
- Local file hash comparison

### 3. Document Parser (`parsers/documentParser.js`)
Hierarchy-preserving parser supporting:
- **IndiaCode format**: Acts with chapters and sections
- **Supreme Court judgments**: Case facts, issues, decisions
- **Legal maxims**: Latin maxims with explanations
- **Constitutional amendments**: Amendment history and affected articles
- **Regulatory documents**: RBI, SEBI, MCA notifications

### 4. Hierarchy Builder (`parsers/hierarchyBuilder.js`)
Preserves exact legal hierarchy:
```
Act → Part → Chapter → Section → Subsection → Clause → Explanation → Illustration → Exception → Schedule
```

### 5. Metadata Extraction (`parsers/metadataExtractor.js`)
Rich metadata for every provision:
- Act, Year, Part, Chapter, Section
- Legal Topics and Keywords
- Related Acts and Previous Equivalents
- Amendment History
- Citation IDs and Source URLs

### 6. Cross Reference Engine (`graph/crossReferenceEngine.js`)
Automatically discovers relationships:
- IPC → BNS replacements
- Constitutional article interpretations
- Inter-act references
- Case law citations

### 7. Knowledge Graph (`graph/legalKnowledgeGraph.js`)
Comprehensive graph with:
- **594 nodes** (as of initial import)
- **886 edges** connecting legal provisions
- Node types: Constitutional articles, statutory provisions, landmark cases, legal maxims, government bodies
- Edge types: REPLACES, INTERPRETS, REFERENCES, APPLIES_TO, CONTAINS, etc.

### 8. Legal Synonym Engine (`synonyms/legalSynonymEngine.js`)
463 synonyms across 52 groups:
- IPC → BNS mappings (302 → 103, etc.)
- CrPC → BNSS mappings (154 → 173, etc.)
- Evidence Act → BSA mappings
- Constitutional terms
- Legal terminology

### 9. Chunking Engine (`embeddings/chunkingEngine.js`)
Hierarchical, context-aware chunking:
- Preserves legal structure
- Creates optimal chunks for retrieval
- Maintains path context for each chunk

### 10. Benchmark Suite (`benchmark/benchmarkSuite.js`)
Automated quality gates measuring:
- Retrieval precision and recall
- Citation accuracy
- Grounding quality
- Hallucination rate
- Latency

### 11. Self-Healing System (`healing/selfHealer.js`)
Automatically detects and recovers from:
- Corrupted datasets
- Duplicate entries
- Broken graph edges
- Missing metadata
- Failed embeddings

### 12. Observatory (`observability/observability.js`)
Detailed reporting for:
- Imported documents
- Failed imports
- Graph statistics
- Benchmark history
- System events

## CLI Usage

```bash
# Get system status
node knowledge/cli.js --status

# Run full sync
node knowledge/cli.js --sync

# Query knowledge graph
node knowledge/cli.js --query "murder punishment BNS"

# Expand query with synonyms
node knowledge/cli.js --expand "IPC 302"

# Run benchmark
node knowledge/cli.js --benchmark

# Run self-healing
node knowledge/cli.js --heal

# Show graph stats
node knowledge/cli.js --graph

# List sources
node knowledge/cli.js --sources

# Get observatory report
node knowledge/cli.js --report
```

## API Endpoints

### Knowledge System
- `GET /api/knowledge/status` - System status
- `POST /api/knowledge/sync` - Trigger sync (admin)
- `GET /api/knowledge/sources` - List sources
- `POST /api/knowledge/sources` - Add source (admin)
- `GET /api/knowledge/graph` - Graph statistics
- `GET /api/knowledge/graph/query?q=...` - Query graph
- `GET /api/knowledge/graph/node/:id` - Node connections
- `GET /api/knowledge/synonyms` - Synonym stats
- `GET /api/knowledge/synonyms/expand?q=...` - Expand query
- `GET /api/knowledge/benchmark` - Benchmark results
- `POST /api/knowledge/benchmark/run` - Run benchmark (admin)
- `GET /api/knowledge/observatory` - Observatory report
- `POST /api/knowledge/heal` - Run self-healing (admin)

## Integration with Chat

The LKOS integrates with the existing chat system:

1. **Query Expansion**: Uses 463 legal synonyms to expand user queries
2. **Knowledge Graph Retrieval**: Queries the graph for related provisions
3. **Enhanced Context**: Includes graph relationships in AI context
4. **Source Trust**: Maintains trust levels for different sources

## Data Files

Located in `backend/data/`:
- `bns.json` - Bharatiya Nyaya Sanhita (2023)
- `bnss.json` - Bharatiya Nagarik Suraksha Sanhita (2023)
- `bsa.json` - Bharatiya Sakshya Adhiniyam (2023)
- `ipc.json` - Indian Penal Code (1860)
- `crpc.json` - Code of Criminal Procedure (1973)
- `evidence-act.json` - Indian Evidence Act (1872)
- `rti.json` - Right to Information Act (2005)
- `contract_act.json` - Indian Contract Act (1872)
- `consumer_protection.json` - Consumer Protection Act (2019)
- `it_act.json` - Information Technology Act (2000)
- `companies_act.json` - Companies Act (2013)
- `gst_act.json` - Central GST Act (2017)
- `motor_vehicles.json` - Motor Vehicles Act (1988)
- `environment_act.json` - Environment Protection Act (1986)
- `amendments.json` - Constitutional Amendments
- `landmark-cases.json` - Landmark Supreme Court Judgments
- `legal-maxims.json` - Legal Maxims & Principles

## Current Statistics

| Metric | Value |
|--------|-------|
| Knowledge Graph Nodes | 594 |
| Knowledge Graph Edges | 886 |
| Total Chunks | 462 |
| Synonym Groups | 52 |
| Total Synonyms | 463 |
| Registered Sources | 53 |
| Active Sources | 52 |

## Quality Metrics

| Metric | Value |
|--------|-------|
| Precision | 80% |
| Recall | 49% |
| F1 Score | 52% |
| Citation Accuracy | 30% |
| Grounding Quality | 87% |
| Hallucination Rate | 13% |

## Future Enhancements

1. **Automated Source Discovery**: Auto-discover new legal sources
2. **Real-time Monitoring**: Watch for source updates
3. **Multi-language Support**: Hindi and regional language terms
4. **Advanced Reranking**: ML-based reranking of results
5. **Citation Network**: Build comprehensive citation network
6. **Temporal Indexing**: Track amendment timelines
7. **Judgment Analysis**: Extract holdings and ratios automatically
8. **Cross-jurisdictional**: Compare with other jurisdictions

## Principles

1. **Never fabricate legal content**
2. **Never fabricate judgments**
3. **Never fabricate amendments**
4. **Authenticity over completeness**
5. **Traceability of all data**
6. **Continuous improvement**
