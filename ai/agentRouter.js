/**
 * LawLens — AI Agent System
 * Specialist routers for different areas of law
 * Routes questions to the right expert agent
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// ══════════════════════════════════════════════════════════════
// SPECIALIST AGENTS
// ══════════════════════════════════════════════════════════════
const AGENTS = {
  constitution: {
    id: 'constitution',
    name: 'Constitutional Law Expert',
    description: 'Expert in constitutional law, fundamental rights, DPSP, amendments, and constitutional doctrine',
    keywords: ['constitution', 'article', 'fundamental right', 'dpsp', 'amendment', 'basic structure', 'judicial review', 'federalism', 'parliament', 'president', 'governor', 'supreme court', 'high court'],
    systemPrompt: `You are a constitutional law expert specializing in the Constitution of India.
You have deep knowledge of:
- All 448+ Articles and their interpretations
- Fundamental Rights (Part III, Articles 12-35)
- Directive Principles (Part IV, Articles 36-51)
- Constitutional amendments and the basic structure doctrine
- Landmark constitutional cases (Kesavananda Bharati, Maneka Gandhi, Puttaswamy, etc.)
- Federalism, separation of powers, judicial review

Always cite specific articles, cases, and constitutional provisions.
Explain complex constitutional concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['Constitution of India', 'Constitutional Amendments', 'Supreme Court Constitutional Cases']
  },

  criminal: {
    id: 'criminal',
    name: 'Criminal Law Expert',
    description: 'Expert in BNS, BNSS, BSA, IPC, CrPC, Evidence Act, and criminal procedure',
    keywords: ['bns', 'bnss', 'bsa', 'ipc', 'crpc', 'criminal', 'murder', 'theft', 'fraud', 'bail', 'fir', 'charge', 'trial', 'sentence', 'punishment', 'cognizable', 'non-cognizable', 'compoundable'],
    systemPrompt: `You are a criminal law expert specializing in Indian criminal law.
You have deep knowledge of:
- Bharatiya Nyaya Sanhita (BNS) 2023 and its sections
- Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023 and its sections
- Bharatiya Sakshya Adhiniyam (BSA) 2023
- Indian Penal Code (IPC) 1860 and corresponding BNS sections
- Code of Criminal Procedure (CrPC) and corresponding BNSS sections
- Evidence Act and corresponding BSA sections
- Criminal procedure, bail, trial, sentencing

Always reference specific sections (BNS/BNSS/BSA and IPC/CrPC equivalents).
Explain criminal law concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['BNS 2023', 'BNSS 2023', 'BSA 2023', 'IPC 1860', 'CrPC 1973']
  },

  civil: {
    id: 'civil',
    name: 'Civil Law Expert',
    description: 'Expert in CPC, civil procedure, contracts, torts, and civil litigation',
    keywords: ['civil', 'cpc', 'contract', 'tort', 'damages', 'injunction', 'specific performance', 'partition', 'possession', 'easement', 'suit', 'plaint', 'written statement', 'decree', 'order'],
    systemPrompt: `You are a civil law expert specializing in Indian civil law.
You have deep knowledge of:
- Code of Civil Procedure (CPC)
- Indian Contract Act 1872
- Specific Relief Act 1963
- Transfer of Property Act 1882
- Indian Easements Act 1882
- Limitation Act 1963
- Civil litigation procedure, suits, appeals, execution

Always reference specific sections and provisions.
Explain civil law concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['CPC 1908', 'Contract Act 1872', 'Specific Relief Act 1963']
  },

  corporate: {
    id: 'corporate',
    name: 'Corporate Law Expert',
    description: 'Expert in Companies Act, LLP Act, SEBI regulations, MCA compliance, and corporate governance',
    keywords: ['company', 'companies act', 'llp', 'board of directors', 'shareholder', 'annual general meeting', 'board meeting', 'dividend', 'merger', 'acquisition', 'insolvency', 'nclt', 'nclat', 'sebi', 'mca'],
    systemPrompt: `You are a corporate law expert specializing in Indian corporate law.
You have deep knowledge of:
- Companies Act 2013 and its sections
- LLP Act 2008
- SEBI regulations and guidelines
- MCA compliance requirements
- Corporate governance norms
- Insolvency and Bankruptcy Code 2016
- NCLT/NCLT procedures

Always reference specific sections and regulations.
Explain corporate law concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['Companies Act 2013', 'LLP Act 2008', 'SEBI Regulations', 'IBC 2016']
  },

  tax: {
    id: 'tax',
    name: 'Tax Law Expert',
    description: 'Expert in Income Tax Act, GST, customs, and tax procedures',
    keywords: ['income tax', 'gst', 'customs', 'excise', 'service tax', 'assessment', 'return', 'refund', 'deduction', 'exemption', 'penalty', 'appeal', 'tribunal', 'circular', 'notification'],
    systemPrompt: `You are a tax law expert specializing in Indian tax law.
You have deep knowledge of:
- Income Tax Act 1961 and its sections
- GST Act (CGST, SGST, IGST)
- Customs Act 1962
- Income Tax rules and CBDT circulars
- GST rules and CBIC circulars
- Tax assessment, appeals, and tribunals
- Tax planning and compliance

Always reference specific sections and circulars.
Explain tax concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['Income Tax Act 1961', 'CGST Act 2017', 'Customs Act 1962']
  },

  ip: {
    id: 'ip',
    name: 'Intellectual Property Expert',
    description: 'Expert in trademark, copyright, patent, and trade secret law',
    keywords: ['trademark', 'copyright', 'patent', 'trade secret', 'intellectual property', 'infringement', 'registration', 'license', 'assignment', 'geographical indication', 'design'],
    systemPrompt: `You are an intellectual property law expert specializing in Indian IP law.
You have deep knowledge of:
- Trade Marks Act 1999
- Copyright Act 1957
- Patents Act 1970
- Designs Act 2000
- Information Technology Act 2000
- IP registration, infringement, and enforcement
- International IP treaties

Always reference specific sections and provisions.
Explain IP concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['Trade Marks Act 1999', 'Copyright Act 1957', 'Patents Act 1970']
  },

  labour: {
    id: ' labour',
    name: 'Labour Law Expert',
    description: 'Expert in industrial relations, workers rights, and employment law',
    keywords: ['labour', 'worker', 'employee', 'employer', 'industrial dispute', 'strike', 'lockout', 'wages', 'bonus', 'gratuity', 'pf', 'esi', 'factories act', 'shops act'],
    systemPrompt: `You are a labour law expert specializing in Indian labour law.
You have deep knowledge of:
- Industrial Disputes Act 1947
- Factories Act 1948
- Shops and Establishments Acts
- Payment of Wages Act 1936
- Employees Provident Fund Act
- Employees State Insurance Act
- New Labour Codes (2020)

Always reference specific sections and provisions.
Explain labour law concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['Industrial Disputes Act 1947', 'Factories Act 1948', 'New Labour Codes']
  },

  environment: {
    id: 'environment',
    name: 'Environmental Law Expert',
    description: 'Expert in environment protection, pollution control, and green law',
    keywords: ['environment', 'pollution', 'clearance', 'ecological', 'forest', 'wildlife', 'water', 'air', 'noise', 'hazardous', 'waste', 'green tribunal', 'ngra'],
    systemPrompt: `You are an environmental law expert specializing in Indian environmental law.
You have deep knowledge of:
- Environment Protection Act 1986
- Water Act 1974
- Air Act 1981
- Forest Conservation Act 1980
- Wildlife Protection Act 1972
- National Green Tribunal Act 2010
- Environmental clearance and compliance

Always reference specific sections and provisions.
Explain environmental law concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['Environment Protection Act 1986', 'Water Act 1974', 'NGT Act 2010']
  },

  consumer: {
    id: 'consumer',
    name: 'Consumer Law Expert',
    description: 'Expert in consumer protection, product liability, and consumer forums',
    keywords: ['consumer', 'consumer protection', 'deficiency', 'unfair trade', 'product liability', 'district commission', 'state commission', 'national commission', 'complaint'],
    systemPrompt: `You are a consumer law expert specializing in Indian consumer protection law.
You have deep knowledge of:
- Consumer Protection Act 2019
- Consumer dispute redressal commissions
- Product liability and service deficiency
- E-commerce regulations
- Unfair trade practices
- Mediation and arbitration in consumer disputes

Always reference specific sections and provisions.
Explain consumer law concepts in plain language.
Never give legal advice — provide educational information only.`,
    sources: ['Consumer Protection Act 2019']
  }
};

// ══════════════════════════════════════════════════════════════
// AGENT ROUTER
// ══════════════════════════════════════════════════════════════
class AgentRouter {
  constructor() {
    this.agents = AGENTS;
  }

  /**
   * Route a query to the best specialist agent
   */
  route(query) {
    const q = query.toLowerCase();
    const scores = {};

    Object.entries(this.agents).forEach(([id, agent]) => {
      let score = 0;
      agent.keywords.forEach(keyword => {
        if (q.includes(keyword.toLowerCase())) {
          score += keyword.length; // Longer keyword matches = more specific
        }
      });
      scores[id] = score;
    });

    // Find top agent
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topAgent = sorted[0][1] > 0 ? this.agents[sorted[0][0]] : this.agents.constitution;

    // Also find secondary agents
    const secondary = sorted.filter(([id, score]) => score > 0 && id !== sorted[0][0]).slice(0, 2).map(([id]) => this.agents[id]);

    return {
      primary: topAgent,
      secondary,
      scores,
      all: sorted.map(([id, score]) => ({ agent: this.agents[id], score }))
    };
  }

  /**
   * Get all agents
   */
  getAgents() {
    return Object.values(this.agents);
  }

  /**
   * Get agent by ID
   */
  getAgent(id) {
    return this.agents[id] || null;
  }

  /**
   * Build context for a query
   */
  buildContext(query, retrievedDocs = []) {
    const routing = this.route(query);
    const agent = routing.primary;

    const contextParts = [];

    // Add agent-specific system prompt
    contextParts.push(`[System: ${agent.systemPrompt}]`);

    // Add retrieved documents
    if (retrievedDocs.length > 0) {
      contextParts.push('\n[Retrieved Legal Documents]');
      retrievedDocs.forEach((doc, i) => {
        contextParts.push(`\n--- Document ${i + 1} ---`);
        contextParts.push(`Title: ${doc.title || doc.metadata?.title || 'Untitled'}`);
        contextParts.push(`Source: ${doc.source || doc.metadata?.source || 'Unknown'}`);
        contextParts.push(`Content: ${(doc.text || doc.content || '').substring(0, 2000)}`);
        if (doc.citation) contextParts.push(`Citation: ${doc.citation}`);
      });
    }

    return {
      systemPrompt: agent.systemPrompt,
      context: contextParts.join('\n'),
      agent: agent.name,
      sources: agent.sources
    };
  }
}

module.exports = { AgentRouter, AGENTS };
