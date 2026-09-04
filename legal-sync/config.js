const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const REGISTRY_FILE = path.join(__dirname, 'registry.json');
const REPORTS_DIR = path.join(__dirname, 'reports');

const OFFICIAL_SOURCES = [
  {
    id: 'constitution_of_india',
    title: 'Constitution of India',
    year: 1950,
    source: 'Legislative Department, Ministry of Law and Justice',
    officialUrl: 'https://legislative.gov.in/constitution-of-india/',
    fileType: 'pdf',
    localFile: 'constitution_of_india.pdf',
    category: 'constitutional'
  },
  {
    id: 'constitution_of_india_amendment',
    title: 'Constitution of India Amendments',
    year: 2023,
    source: 'Legislative Department, Ministry of Law and Justice',
    officialUrl: 'https://legislative.gov.in/constitution-of-india/',
    fileType: 'pdf',
    localFile: 'constitution_of_india_amendment.pdf',
    category: 'constitutional'
  },
  {
    id: 'amendments_json',
    title: 'Constitutional Amendments Summary',
    year: 2023,
    source: 'Legislative Department',
    officialUrl: 'https://legislative.gov.in/',
    fileType: 'json',
    localFile: 'amendments.json',
    category: 'constitutional'
  },
  {
    id: 'bns_2023',
    title: 'Bharatiya Nyaya Sanhita',
    year: 2023,
    source: 'eGazette / India Code',
    officialUrl: 'https://egazette.gov.in/',
    fileType: 'json',
    localFile: 'bns.json',
    category: 'criminal_substantive'
  },
  {
    id: 'bnss_2023',
    title: 'Bharatiya Nagarik Suraksha Sanhita',
    year: 2023,
    source: 'eGazette / India Code',
    officialUrl: 'https://egazette.gov.in/',
    fileType: 'json',
    localFile: 'bnss.json',
    category: 'criminal_procedure'
  },
  {
    id: 'bsa_2023',
    title: 'Bharatiya Sakshya Adhiniyam',
    year: 2023,
    source: 'eGazette / India Code',
    officialUrl: 'https://egazette.gov.in/',
    fileType: 'json',
    localFile: 'bsa.json',
    category: 'evidence'
  },
  {
    id: 'ipc_1860',
    title: 'Indian Penal Code',
    year: 1860,
    source: 'India Code',
    officialUrl: 'https://www.indiacode.nic.in/',
    fileType: 'json',
    localFile: 'ipc.json',
    category: 'criminal_substantive'
  },
  {
    id: 'crpc_1973',
    title: 'Code of Criminal Procedure',
    year: 1973,
    source: 'India Code',
    officialUrl: 'https://www.indiacode.nic.in/',
    fileType: 'json',
    localFile: 'crpc.json',
    category: 'criminal_procedure'
  },
  {
    id: 'evidence_act_1872',
    title: 'Indian Evidence Act',
    year: 1872,
    source: 'India Code',
    officialUrl: 'https://www.indiacode.nic.in/',
    fileType: 'json',
    localFile: 'evidence-act.json',
    category: 'evidence'
  },
  {
    id: 'rti_2005',
    title: 'Right to Information Act',
    year: 2005,
    source: 'India Code',
    officialUrl: 'https://www.indiacode.nic.in/',
    fileType: 'json',
    localFile: 'rti.json',
    category: 'transparency'
  },
  {
    id: 'consumer_protection_2019',
    title: 'Consumer Protection Act',
    year: 2019,
    source: 'India Code',
    officialUrl: 'https://www.indiacode.nic.in/',
    fileType: 'json',
    localFile: 'consumer_protection.json',
    category: 'consumer'
  },
  {
    id: 'it_act_2000',
    title: 'Information Technology Act',
    year: 2000,
    source: 'India Code',
    officialUrl: 'https://www.indiacode.nic.in/',
    fileType: 'json',
    localFile: 'it_act.json',
    category: 'cyber'
  },
  {
    id: 'contract_act_1872',
    title: 'Indian Contract Act',
    year: 1872,
    source: 'India Code',
    officialUrl: 'https://www.indiacode.nic.in/',
    fileType: 'json',
    localFile: 'contract_act.json',
    category: 'civil_contract'
  },
  {
    id: 'companies_act_2013',
    title: 'Companies Act',
    year: 2013,
    source: 'Ministry of Corporate Affairs / India Code',
    officialUrl: 'https://www.mca.gov.in/',
    fileType: 'json',
    localFile: 'companies_act.json',
    category: 'corporate'
  },
  {
    id: 'gst_act_2017',
    title: 'Central Goods and Services Tax Act',
    year: 2017,
    source: 'CBIC / India Code',
    officialUrl: 'https://www.cbic.gov.in/',
    fileType: 'json',
    localFile: 'gst_act.json',
    category: 'taxation'
  },
  {
    id: 'motor_vehicles_1988',
    title: 'Motor Vehicles Act',
    year: 1988,
    source: 'India Code',
    officialUrl: 'https://www.indiacode.nic.in/',
    fileType: 'json',
    localFile: 'motor_vehicles.json',
    category: 'traffic_claims'
  },
  {
    id: 'environment_act_1986',
    title: 'Environment (Protection) Act',
    year: 1986,
    source: 'MoEFCC / India Code',
    officialUrl: 'https://moef.gov.in/',
    fileType: 'json',
    localFile: 'environment_act.json',
    category: 'environment'
  },
  {
    id: 'landmark_cases',
    title: 'Landmark Supreme Court Judgments',
    year: 2023,
    source: 'Supreme Court of India',
    officialUrl: 'https://main.sci.gov.in/',
    fileType: 'json',
    localFile: 'landmark-cases.json',
    category: 'jurisprudence'
  },
  {
    id: 'legal_maxims',
    title: 'Legal Maxims & Principles',
    year: 2023,
    source: 'Supreme Court Jurisprudence',
    officialUrl: 'https://main.sci.gov.in/',
    fileType: 'json',
    localFile: 'legal-maxims.json',
    category: 'jurisprudence'
  }
];

module.exports = {
  BASE_DIR,
  DATA_DIR,
  REGISTRY_FILE,
  REPORTS_DIR,
  OFFICIAL_SOURCES
};
