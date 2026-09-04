const SEARCH_MODES = {
  strict: {
    name: 'Official Sources Only',
    badge: '🟢 Official Sources Only',
    description: 'Government and institutional sources only',
    allowedDomains: [
      'indiacode.nic.in',
      'sci.gov.in',
      'hcourt.gov.in',
      'ecourts.gov.in',
      'egazette.nic.in',
      'sansad.in',
      'parliamentofindia.nic.in',
      'lawcommissionofindia.nic.in',
      'legislative.gov.in',
      'mlj.gov.in',
      'meity.gov.in',
      'india.gov.in',
      'presidentofindia.nic.in',
      'rajyasabha.nic.in',
      'loksabha.nic.in',
      'constitutionofindia.net'
    ],
    excludedTerms: ['blog', 'quora', 'reddit', 'medium.com', 'wordpress', 'blogspot'],
    maxResults: 5,
    searchSuffix: ' site:indiacode.nic.in OR site:sci.gov.in OR site:ecourts.gov.in OR site:sansad.in'
  },
  extended: {
    name: 'Official + Trusted Legal Sources',
    badge: '🟡 Official + Trusted Legal Sources',
    description: 'Official sources plus trusted legal publishers',
    allowedDomains: [
      'indiacode.nic.in',
      'sci.gov.in',
      'hcourt.gov.in',
      'ecourts.gov.in',
      'egazette.nic.in',
      'sansad.in',
      'parliamentofindia.nic.in',
      'indiankanoon.org',
      'scconline.com',
      'livelaw.in',
      'barandbench.com',
      'manupatra.com',
      'legalserviceindia.com',
      'lawctopus.com',
      'ccanon.com',
      'indialegalsolution.com',
      'vskarnataka.org'
    ],
    excludedTerms: ['quora', 'reddit', 'medium.com', 'wordpress', 'blogspot'],
    maxResults: 6,
    searchSuffix: ' Indian law'
  },
  general: {
    name: 'General Web Search',
    badge: '🔵 Web Search',
    description: 'Search the entire web',
    allowedDomains: null,
    excludedTerms: ['quora', 'reddit'],
    maxResults: 5,
    searchSuffix: ' Indian law constitution'
  }
};

module.exports = SEARCH_MODES;
