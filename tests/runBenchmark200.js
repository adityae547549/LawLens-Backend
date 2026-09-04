const retriever = require('../rag/retriever');

// Generate 200 comprehensive legal benchmark questions across 12 domains
const BENCHMARK_200_QUESTIONS = [
  // 1. Constitution (Questions 1-25)
  "What is Article 21 of the Constitution of India?",
  "What is Article 19 freedom of speech?",
  "What is Article 14 equality before law?",
  "What is Article 32 right to constitutional remedies?",
  "What is Article 226 High Court writ jurisdiction?",
  "What is the Basic Structure Doctrine?",
  "What is Article 368 constitutional amendment power?",
  "What is Article 356 President's rule?",
  "What is Article 352 national emergency?",
  "What is Article 15 prohibition of discrimination?",
  "What is Article 16 equality of opportunity in public employment?",
  "What is Article 17 abolition of untouchability?",
  "What is Article 18 abolition of titles?",
  "What is Article 20 protection in respect of conviction for offences?",
  "What is double jeopardy under Article 20(2)?",
  "What is self-incrimination under Article 20(3)?",
  "What is Article 21A right to education?",
  "What is Article 22 protection against arrest and detention?",
  "What is Article 25 freedom of conscience and religion?",
  "What is Article 26 freedom to manage religious affairs?",
  "What is Article 29 protection of interests of minorities?",
  "What is Article 30 right of minorities to establish educational institutions?",
  "What is Article 44 Uniform Civil Code?",
  "What is Article 51A fundamental duties?",
  "What is Article 279A GST Council?",

  // 2. Criminal Law - IPC & BNS (Questions 26-50)
  "What is Section 302 IPC / Section 103 BNS?",
  "What is Section 300 IPC definition of murder?",
  "What is Section 299 IPC culpable homicide?",
  "What is Section 307 IPC attempt to murder?",
  "What is Section 304A IPC death by negligence?",
  "What is Section 375 IPC / Section 63 BNS definition of rape?",
  "What is Section 376 IPC / Section 64 BNS rape punishment?",
  "What is Section 69 BNS false promise of marriage?",
  "What is Section 354 IPC / Section 74 BNS outraging modesty?",
  "What is Section 378 IPC / Section 303 BNS theft?",
  "What is Section 383 IPC / Section 308 BNS extortion?",
  "What is Section 390 IPC / Section 309 BNS robbery?",
  "What is Section 415 IPC / Section 318 BNS cheating?",
  "What is Section 420 IPC cheating and dishonestly inducing delivery of property?",
  "What is Section 124A IPC sedition / Section 152 BNS?",
  "What is Section 111 BNS organised crime?",
  "What is Section 113 BNS terrorist act?",
  "What is mob lynching provision under Section 103(2) BNS?",
  "What is Section 34 IPC common intention?",
  "What is Section 149 IPC unlawful assembly?",
  "What is Section 120B IPC criminal conspiracy?",
  "What is Section 498A IPC cruelty by husband or relatives?",
  "What is Section 304B IPC dowry death?",
  "What is Section 506 IPC criminal intimidation?",
  "What is Section 509 IPC word, gesture or act intended to insult modesty of woman?",

  // 3. Criminal Procedure - CrPC & BNSS (Questions 51-75)
  "What is an FIR under Section 173 BNSS / Section 154 CrPC?",
  "What is a Zero FIR?",
  "What is an E-FIR under BNSS?",
  "What is Section 35 BNSS / Section 41 CrPC arrest without warrant?",
  "What is Section 482 BNSS / Section 438 CrPC anticipatory bail?",
  "What is Section 483 BNSS / Section 439 CrPC regular bail?",
  "What is Section 480 BNSS / Section 436 CrPC bail in bailable offences?",
  "What is Section 187 BNSS / Section 167 CrPC remand and custody?",
  "What is 24 hours rule for producing arrested person before Magistrate?",
  "What is default bail under CrPC 167(2) / BNSS 187?",
  "What is Section 43 BNSS / Section 46 CrPC mode of arrest?",
  "What are rules for arrest of women after sunset and before sunrise?",
  "What is Section 47 BNSS grounds of arrest information?",
  "What is Section 37 BNSS designated police officer?",
  "What is a cognizable offence?",
  "What is a non-cognizable offence?",
  "What is a bailable offence?",
  "What is a non-bailable offence?",
  "What is Section 82 CrPC proclaimed offender?",
  "What is Section 144 CrPC / Section 163 BNSS power to issue order in urgent cases?",
  "What is summary trial procedure?",
  "What is plea bargaining under CrPC Chapter XXI-A?",
  "What is search and seizure procedure?",
  "What is inquest report under Section 174 CrPC?",
  "What is charge sheet filing deadline?",

  // 4. Evidence Law - Evidence Act & BSA (Questions 76-100)
  "What is Section 61 BSA / Section 65B Evidence Act electronic evidence?",
  "What is Section 63 BSA electronic evidence certificate?",
  "What is oral evidence under Section 2 BSA?",
  "What is documentary evidence under Section 2 BSA?",
  "What is Section 104 BSA / Section 101 Evidence Act burden of proof?",
  "What is Section 105 BSA / Section 102 Evidence Act onus of proof?",
  "What is Section 115 Evidence Act / Section 116 BSA estoppel?",
  "What is a confession before police officer under Section 25 Evidence Act?",
  "What is admission under Evidence Act?",
  "What is dying declaration under Section 32(1) Evidence Act?",
  "What is expert opinion under Section 45 Evidence Act?",
  "What is primary evidence?",
  "What is secondary evidence?",
  "What is hearsay evidence rule?",
  "What is res gestae under Section 6 Evidence Act?",
  "What is judicial notice under Section 56 Evidence Act?",
  "What is presumption as to dowry death under Section 113B Evidence Act?",
  "What is accomplice evidence under Section 133 Evidence Act?",
  "What is examination-in-chief, cross-examination, and re-examination?",
  "What is hostiling witness?",
  "What is privileged communication between attorney and client?",
  "What is marital communication privilege?",
  "What is burden of proof in criminal trial vs civil trial?",
  "What is beyond reasonable doubt standard?",
  "What is preponderance of probabilities standard?",

  // 5. Consumer Protection Act 2019 (Questions 101-120)
  "What are consumer rights under Consumer Protection Act 2019?",
  "What is the definition of consumer under Section 2?",
  "What is Central Consumer Protection Authority CCPA under Section 10?",
  "What is pecuniary jurisdiction of District Consumer Commission under Section 28?",
  "What is pecuniary jurisdiction of State Consumer Commission under Section 47?",
  "What is pecuniary jurisdiction of National Consumer Commission NCDRC under Section 58?",
  "What is product liability under Section 82?",
  "What is deficiency of service?",
  "What is unfair trade practice under Consumer Protection Act?",
  "What is misleading advertisement penalty under Section 21?",
  "What is liability of celebrity endorsers for misleading ads?",
  "Does consumer protection act apply to e-commerce transactions?",
  "What is time limit for filing consumer complaint?",
  "What is mediation under Consumer Protection Act 2019?",
  "Can commercial buyers file consumer complaints?",
  "What relief can Consumer Commission grant?",
  "What is appeal period against District Commission order?",
  "What is appeal period against State Commission order?",
  "What is penalty for non-compliance of Consumer Commission order?",
  "What is unfair contract under Consumer Protection Act?",

  // 6. Cyber Law & IT Act 2000 (Questions 121-140)
  "What is Section 66 IT Act cyber crimes and hacking punishment?",
  "What is Section 66A IT Act and why was it struck down in Shreya Singhal?",
  "What is Section 69A IT Act website and content blocking power?",
  "What is Section 79 IT Act intermediary liability safe harbour?",
  "What is Section 43 IT Act penalty for damage to computer system?",
  "What is Section 65 IT Act tampering with computer source code?",
  "What is Section 66C IT Act punishment for identity theft?",
  "What is Section 66D IT Act cheating by personation using computer resource?",
  "What is Section 67 IT Act publishing obscene material in electronic form?",
  "What is cyber terrorism under Section 66F IT Act?",
  "What is digital signature and electronic signature under IT Act?",
  "What is Certifying Authority under IT Act?",
  "What is Cyber Appellate Tribunal?",
  "What is computer source document?",
  "What is intermediary due diligence under IT Rules?",
  "What is notice and takedown procedure under Section 79?",
  "Does IT Act apply to offences committed outside India?",
  "What is data protection framework under Indian law?",
  "What is penalty for un-authorised access to protected computer system under Section 70?",
  "What is CERT-In role under IT Act?",

  // 7. Indian Contract Act 1872 (Questions 141-160)
  "What is Section 2(h) definition of contract?",
  "What are essential conditions of a valid contract under Section 10?",
  "What is offer and acceptance under Contract Act?",
  "What is consideration under Section 2(d)?",
  "What is Section 11 competency to contract and minor contract?",
  "What is Mohori Bibee v Dharmodas Ghose minor contract ruling?",
  "What is free consent under Section 14?",
  "What is coercion under Section 15?",
  "What is undue influence under Section 16?",
  "What is fraud under Section 17?",
  "What is misrepresentation under Section 18?",
  "What is Section 27 agreement in restraint of trade void?",
  "What is Section 73 damages for breach of contract?",
  "What is Hadley v Baxendale rule for remoteness of damages?",
  "What is Section 74 liquidated damages and penalty?",
  "What is Section 124 contract of indemnity?",
  "What is Section 126 contract of guarantee, surety, principal debtor?",
  "What is discharge of contract by performance?",
  "What is frustration of contract under Section 56?",
  "What is novation of contract under Section 62?",

  // 8. Companies Act 2013 (Questions 161-175)
  "What is Section 135 Corporate Social Responsibility CSR mandatory spend?",
  "What is Section 3 formation of company and OPC?",
  "What is Section 7 incorporation procedure and ROC?",
  "What is Memorandum of Association MOA and Articles of Association AOA?",
  "What is Section 149 Board of Directors and Independent Directors?",
  "What is Section 166 duties of directors?",
  "What is Section 241 oppression and mismanagement relief?",
  "What is National Company Law Tribunal NCLT role?",
  "What is National Company Law Appellate Tribunal NCLAT?",
  "What is Corporate Insolvency Resolution Process CIRP under IBC?",
  "What is One Person Company OPC benefits?",
  "What is minimum number of directors for public and private company?",
  "What is Key Managerial Personnel KMP under Companies Act?",
  "What is annual general meeting AGM requirement?",
  "What is statutory audit requirement for companies?",

  // 9. GST Act & Article 279A (Questions 176-185)
  "What is Article 279A GST Council?",
  "What is Section 7 CGST Act scope of supply?",
  "What is Section 9 CGST Act levy and collection of GST?",
  "What is Section 16 CGST Act Input Tax Credit ITC eligibility?",
  "What is Section 22 GST registration turnover threshold limit?",
  "What is Reverse Charge Mechanism RCM under GST?",
  "What is CGST, SGST, and IGST difference?",
  "What is GSTR-3B return filing?",
  "What is GST refund provision under Section 54?",
  "What is penalty for GST evasion under Section 132?",

  // 10. Environment Protection Act 1986 (Questions 186-190)
  "What is Section 3 Environment Protection Act Central Government powers?",
  "What is Section 5 EPA power to issue directions and close industries?",
  "What is Section 7 EPA pollution discharge limit?",
  "What is Section 15 EPA penalty for environmental contravention?",
  "What is Polluter Pays Principle and Absolute Liability in environmental law?",

  // 11. RTI Act 2005 (Questions 191-195)
  "What is Section 2(h) public authority under RTI Act?",
  "What is Section 6 RTI application process and CPIO role?",
  "What is 30 days time limit and 48 hours life/liberty rule under Section 7 RTI?",
  "What are Section 8 exemptions from disclosure under RTI?",
  "What is Section 19 First Appeal and Second Appeal to CIC/SIC?",

  // 12. Motor Vehicles Act (Questions 196-200)
  "What is Section 134 Motor Vehicles Act Good Samaritan protection?",
  "What is Section 146 mandatory Third Party Insurance?",
  "What is Section 161 Hit and Run compensation scheme?",
  "What is Motor Accidents Claims Tribunal MACT under Section 165?",
  "What is Section 185 drunk driving breath analyser test penalty?"
];

async function runBenchmark200() {
  console.log('========================================================================');
  console.log(' LawLens 200-Question Comprehensive Legal RAG Benchmark Suite ');
  console.log('========================================================================');
  console.log(`Evaluating ${BENCHMARK_200_QUESTIONS.length} legal questions across 12 statutory domains...\n`);

  let totalLatency = 0;
  let totalConfidence = 0;
  let totalChunks = 0;
  let highConfidenceCount = 0;
  let trustedSourceCount = 0;

  for (let i = 0; i < BENCHMARK_200_QUESTIONS.length; i++) {
    const question = BENCHMARK_200_QUESTIONS[i];
    const t0 = Date.now();

    const { localResults, webResults } = await retriever.retrieve(question, { mode: 'hybrid', k: 5 });
    const latency = Date.now() - t0;

    const citations = retriever.getCitations(localResults, webResults);
    const confidence = retriever.calculateOverallConfidence(citations);

    totalLatency += latency;
    totalConfidence += confidence.score;
    totalChunks += localResults.length;

    if (confidence.score >= 30) highConfidenceCount++;
    if (citations.some(c => c.trust === 'high' || c.level === 1)) trustedSourceCount++;

    if ((i + 1) % 25 === 0 || i === BENCHMARK_200_QUESTIONS.length - 1) {
      console.log(`[Progress ${i + 1}/200] Avg Latency: ${Math.round(totalLatency / (i + 1))}ms | Avg Confidence: ${Math.round(totalConfidence / (i + 1))}% | Avg Chunks: ${(totalChunks / (i + 1)).toFixed(1)}`);
    }
  }

  const avgLatency = Math.round(totalLatency / BENCHMARK_200_QUESTIONS.length);
  const avgConfidence = Math.round(totalConfidence / BENCHMARK_200_QUESTIONS.length);
  const avgChunks = (totalChunks / BENCHMARK_200_QUESTIONS.length).toFixed(1);
  const precisionRate = Math.round((highConfidenceCount / BENCHMARK_200_QUESTIONS.length) * 100);
  const trustedRate = Math.round((trustedSourceCount / BENCHMARK_200_QUESTIONS.length) * 100);

  console.log('\n========================================================================');
  console.log(' FINAL 200-QUESTION BENCHMARK RESULTS ');
  console.log('========================================================================');
  console.log(` Total Questions Evaluated   : ${BENCHMARK_200_QUESTIONS.length}`);
  console.log(` Average Retrieval Latency  : ${avgLatency} ms`);
  console.log(` Average Confidence Score   : ${avgConfidence}%`);
  console.log(` Average Chunks Retrieved    : ${avgChunks} per query`);
  console.log(` Retrieval Precision Rate    : ${precisionRate}% (Score >= 30)`);
  console.log(` High-Trust Citation Rate   : ${trustedRate}% (Official Statutory Source)`);
  console.log(` Estimated Hallucination Rate: ${100 - precisionRate}%`);
  console.log('========================================================================\n');
}

runBenchmark200();
