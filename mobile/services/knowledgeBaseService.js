// Comprehensive V-Care AI Chatbot Knowledge Base & Intent Resolution Engine

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'did',
  'for', 'from', 'get', 'got', 'has', 'have', 'he', 'how', 'i', 'in', 'is', 'it',
  'its', 'me', 'my', 'of', 'on', 'or', 'she', 'should', 'so', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would',
  'you', 'your', 'yours', 'am', 'im', 'i\'m'
]);

const bloodCompatibility = {
  'o-': ['o-', 'o+', 'a-', 'a+', 'b-', 'b+', 'ab-', 'ab+'],
  'o+': ['o+', 'a+', 'b+', 'ab+'],
  'a-': ['a-', 'a+', 'ab-', 'ab+'],
  'a+': ['a+', 'ab+'],
  'b-': ['b-', 'b+', 'ab-', 'ab+'],
  'b+': ['b+', 'ab+'],
  'ab-': ['ab-', 'ab+'],
  'ab+': ['ab+']
};

const knowledgeBase = [
  // App Guidance & Features
  {
    keywords: ['vcare', 'v-care', 'about app', 'what is this app'],
    question: "What is the V-Care app?",
    answer: "V-Care is a smart blood donor management platform connecting blood donors with patients in urgent need. You can search for donors by blood group and location, register as a donor, post emergency requests, and chat with Ismail AI for guidance."
  },
  {
    keywords: ['register app', 'sign up', 'create account'],
    question: "How do I register in the app?",
    answer: "To register, open the app and enter your mobile number. Verify with the OTP sent to your phone, then complete your profile details (name, blood group, location). Once submitted, your account is activated!"
  },
  {
    keywords: ['search donor', 'find donor', 'where to find donor', 'look for blood'],
    question: "How to search for blood donors?",
    answer: "On the Home screen, tap 'Find Donors' or go to the Search Donors screen. Select your required blood group, state, and city. The app will list matching active donors with their contact details so you can reach them directly."
  },
  {
    keywords: ['edit profile', 'change profile', 'update profile', 'change blood group', 'update location'],
    question: "How to edit my profile?",
    answer: "Go to your Profile tab in the bottom menu and tap 'Edit Profile'. You can update your name, blood group, location (state & city), and contact details."
  },
  {
    keywords: ['register donor', 'become donor', 'donor registration'],
    question: "How do I register as a blood donor?",
    answer: "Go to the Donor Registration section in the app. Enter your blood group, date of birth, weight, location, and medical confirmation. Once submitted, your profile will appear in donor search results when someone needs blood!"
  },
  {
    keywords: ['refer friend', 'invite', 'share app'],
    question: "How does the refer friend feature work?",
    answer: "Go to the Refer Friend screen from the menu. You can copy your referral code or share the app download link directly with friends on WhatsApp or social media to help grow our life-saving donor network."
  },
  {
    keywords: ['privacy', 'data safe', 'personal info', 'share number'],
    question: "Is my personal information and contact number safe?",
    answer: "Your privacy is our priority. Your mobile number is only visible to users searching for blood donors when you explicitly register as an active donor. You can toggle your donor availability anytime in Settings or Profile."
  },
  {
    keywords: ['delete account', 'close account', 'remove account'],
    question: "How to delete my account?",
    answer: "You can delete your account by going to Settings -> Account -> Delete Account. This will permanently remove your profile and donor registration details from our system."
  },
  {
    keywords: ['offline', 'internet', 'no network'],
    question: "Does the app work offline?",
    answer: "The V-Care app requires internet connectivity to fetch real-time donor listings and sync messages. If you lose network connection, the app will display a retry option."
  },

  // Donor Eligibility & Requirements
  {
    keywords: ['who can donate', 'eligibility', 'can i donate', 'am i eligible'],
    question: "Who is eligible to donate blood?",
    answer: "General eligibility rules:\n• Age: 18 to 65 years\n• Weight: Minimum 50 kg (110 lbs)\n• Hemoglobin: At least 12.5 g/dL\n• Pulse & BP: Normal range\n• Frequency: At least 56 days (8 weeks) since whole blood donation\n• Overall health: Feeling well with no active infections."
  },
  {
    keywords: ['age', 'old', 'young', 'minimum age'],
    question: "What is the age limit for blood donation?",
    answer: "You must be at least 18 years old to donate blood. Regular donors can donate up to age 65 (or up to 70 with medical approval from a certified blood center physician)."
  },
  {
    keywords: ['weight', 'heavy', 'thin', 'minimum weight'],
    question: "What is the minimum weight required to donate blood?",
    answer: "Donors must weigh at least 50 kg (110 lbs). This ensures your body can safely tolerate donating standard 350ml - 450ml units of whole blood without side effects like dizziness."
  },
  {
    keywords: ['how often', 'frequency', 'interval', 'gap'],
    question: "How often can I donate blood?",
    answer: "Whole blood can be donated once every 56 days (8 weeks) for men and women. Platelet (apheresis) donations can be done up to every 7 days (maximum 24 times a year)."
  },
  {
    keywords: ['tattoo', 'piercing', 'ink'],
    question: "Can I donate blood if I have a tattoo or piercing?",
    answer: "Yes, but you must wait 3 to 6 months after getting a tattoo or body piercing before donating. The tattoo or piercing must have been performed using sterile, single-use needles at a licensed facility."
  },
  {
    keywords: ['alcohol', 'drink', 'beer', 'whisky'],
    question: "Can I donate blood after drinking alcohol?",
    answer: "You must NOT consume alcohol for at least 24 hours prior to blood donation. Alcohol causes dehydration, affects blood pressure, and interferes with post-donation recovery."
  },
  {
    keywords: ['smoking', 'cigarette', 'vape'],
    question: "Can I donate blood if I smoke?",
    answer: "Smoking does not permanently disqualify you, but you should avoid smoking for at least 2 to 3 hours before donation and at least 2 hours after donation to prevent dizziness and elevated carbon monoxide levels."
  },
  {
    keywords: ['period', 'menstruation', 'menstrual', 'monthly cycle'],
    question: "Can women donate blood during their period/menstruation?",
    answer: "Yes! Women can donate blood during menstruation as long as they feel well, have adequate hemoglobin levels (12.5 g/dL+), and are not experiencing severe painful cramps or exceptionally heavy flow."
  },
  {
    keywords: ['pregnancy', 'pregnant', 'breastfeeding', 'nursing'],
    question: "Can pregnant or breastfeeding women donate blood?",
    answer: "No. Pregnant women cannot donate blood. After childbirth, you must wait at least 6 months (and complete breastfeeding) before you are eligible to donate whole blood."
  },
  {
    keywords: ['diabetes', 'diabetic', 'sugar', 'insulin'],
    question: "Can a diabetic person donate blood?",
    answer: "Diabetics managed by diet or oral medications (like Metformin) with stable blood sugar CAN donate blood! Diabetics taking insulin injections are generally deferred from donating for safety reasons."
  },
  {
    keywords: ['bp', 'blood pressure', 'hypertension', 'hypotension'],
    question: "Can I donate blood if I have high or low blood pressure?",
    answer: "You can donate if your blood pressure is within normal limits at donation time (Systolic: 100-140, Diastolic: 60-90). Donors taking blood pressure medications can donate if their BP is well-controlled."
  },
  {
    keywords: ['thyroid', 'thyroxine'],
    question: "Can I donate blood if I have a thyroid condition?",
    answer: "Yes! People with hypothyroidism or hyperthyroidism taking thyroid hormone supplements (e.g., Levothyroxine) can donate blood as long as their thyroid levels are stable and they feel well."
  },
  {
    keywords: ['covid', 'vaccine', 'corona', 'vaccination'],
    question: "Can I donate blood after getting a vaccine?",
    answer: "For COVID-19 vaccines (Covishield, Covaxin, Pfizer, Moderna), you must wait 14 days after receiving any dose before donating blood. For rabies vaccine after animal bite, wait 1 year."
  },
  {
    keywords: ['malaria', 'dengue', 'typhoid', 'fever'],
    question: "Can I donate after recovering from Malaria, Dengue, or Typhoid?",
    answer: "Deferral periods after recovery:\n• Malaria: Wait 3 months after complete cure\n• Dengue / Chikungunya: Wait 6 months after full recovery\n• Typhoid: Wait 12 months after recovery."
  },

  // Medical Preparation & Recovery
  {
    keywords: ['before donation', 'eat before', 'prepare', 'pre donation'],
    question: "What should I eat and do before donating blood?",
    answer: "Before donating:\n1. Drink 500ml of water or fruit juice 1-2 hours before.\n2. Eat an iron-rich, healthy meal (spinach, lentils, beans, eggs, lean meat).\n3. Avoid fatty or oily foods (like burgers or fries) as fat in blood interferes with testing.\n4. Get 7-8 hours of sleep the night before."
  },
  {
    keywords: ['after donation', 'eat after', 'care after', 'post donation'],
    question: "What should I do after donating blood?",
    answer: "After donating:\n1. Rest at the blood bank for 10-15 minutes and consume refreshments.\n2. Drink plenty of extra fluids (water, juice) over the next 24-48 hours.\n3. Keep the bandage on your arm for 4-6 hours.\n4. Avoid strenuous exercise or heavy lifting for 24 hours.\n5. If you feel lightheaded, sit or lie down with feet elevated."
  },
  {
    keywords: ['universal donor', 'universal recipient', 'o negative', 'ab positive'],
    question: "Which blood types are universal donors and recipients?",
    answer: "• Universal Donor: O Negative (O-)\nRed blood cells from O- donors can be given to patients of any blood type (A+, A-, B+, B-, AB+, AB-, O+, O-).\n\n• Universal Recipient: AB Positive (AB+)\nPatients with AB+ blood can safely receive red blood cells from any blood type!"
  }
];

function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeaningfulWords(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

function normalizeBloodType(match) {
  let cleaned = match.toLowerCase().replace(/\s+/g, '');
  cleaned = cleaned.replace(/\+ve$/, '+').replace(/-ve$/, '-');
  if (cleaned.includes('positive')) return cleaned.replace('positive', '+');
  if (cleaned.includes('negative')) return cleaned.replace('negative', '-');
  return cleaned;
}

function extractBloodTypes(query) {
  if (!query) return [];
  const types = [];
  
  const text = query.toLowerCase()
    .replace(/\bpositive\b/g, '+')
    .replace(/\bnegative\b/g, '-')
    .replace(/\bplus\b/g, '+')
    .replace(/\bminus\b/g, '-')
    .replace(/\+ve\b/g, '+')
    .replace(/-ve\b/g, '-');

  const regex = /\b(ab|a|b|o)\s*([\+\-])/gi;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const normalized = match[1].toLowerCase() + match[2];
    if (['o-', 'o+', 'a-', 'a+', 'b-', 'b+', 'ab-', 'ab+'].includes(normalized)) {
      types.push(normalized);
    }
  }

  return types;
}

class KnowledgeBaseService {
  isPersonaQuery(query) {
    const lower = normalizeText(query);
    const personaKeywords = [
      'boy', 'girl', 'male', 'female', 'gender', 'who are you', 'who made you',
      'your name', 'are you bot', 'are you human', 'are you ai', 'what are you'
    ];
    return personaKeywords.some(keyword => lower.includes(keyword));
  }

  answerPersonaQuery() {
    return "I am Ismail, your V-Care AI Blood Assistant! 🤖🩸\n\nI don't have a physical form or gender, but I am designed 24/7 to help you with blood donor searches, blood compatibility guidelines, donor eligibility rules, and using the V-Care app.";
  }

  isGreetingQuery(query) {
    const lower = normalizeText(query);
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon', 'greetings', 'namaste'];
    return greetings.some(g => lower === g || lower.startsWith(g + ' ') || lower.endsWith(' ' + g));
  }

  answerGreetingQuery() {
    return "Hello! 👋 I'm Ismail, your V-Care AI Assistant! 🩸\n\nI can help you with:\n• Blood compatibility checks (e.g. 'Can B+ donate to A-?')\n• Donor eligibility (e.g. 'Can I donate if I have a tattoo?')\n• Searching for donors in your state/city\n• App navigation and profile updates\n\nHow can I help you today?";
  }

  isCompatibilityQuery(query) {
    const lower = (query || '').toLowerCase();
    const types = extractBloodTypes(query);
    if (types.length > 0) return true;

    return lower.includes('donate to') || lower.includes('receive from') || lower.includes('compatible') || (lower.includes('can') && lower.includes('donate'));
  }

  answerCompatibilityQuery(query) {
    const lower = (query || '').toLowerCase();
    const types = extractBloodTypes(query);

    // Case 1: Two blood types specified
    if (types.length >= 2) {
      const from = types[0].toLowerCase();
      const to = types[1].toLowerCase();

      if (bloodCompatibility[from] && bloodCompatibility[to]) {
        const canDonate = bloodCompatibility[from].includes(to);
        const fromUpper = from.toUpperCase();
        const toUpper = to.toUpperCase();
        const compatibleRecipients = bloodCompatibility[from].map(t => t.toUpperCase()).join(', ');

        if (canDonate) {
          if (from === 'o-') {
            return `Yes! ${fromUpper} can donate blood to ${toUpper}. ${fromUpper} (O negative) is the universal donor type and can donate to all blood types!`;
          }
          return `Yes, ${fromUpper} blood can be donated to a ${toUpper} recipient. ${fromUpper} donors can donate to: ${compatibleRecipients}. Always confirm with a blood bank or doctor before donation.`;
        } else {
          const compatibleDonorsForTo = Object.keys(bloodCompatibility)
            .filter(k => bloodCompatibility[k].includes(to))
            .map(t => t.toUpperCase())
            .join(', ');
          return `No, ${fromUpper} blood CANNOT be donated to a ${toUpper} recipient. ${fromUpper} donors can only donate to: ${compatibleRecipients}. A ${toUpper} recipient can receive blood from: ${compatibleDonorsForTo}.`;
        }
      }
    }

    // Case 2: Single blood type specified
    if (types.length === 1) {
      const type = types[0].toLowerCase();
      const typeUpper = type.toUpperCase();

      if (bloodCompatibility[type]) {
        const canDonateTo = bloodCompatibility[type].map(t => t.toUpperCase()).join(', ');
        const canReceiveFrom = Object.keys(bloodCompatibility)
          .filter(k => bloodCompatibility[k].includes(type))
          .map(t => t.toUpperCase())
          .join(', ');

        if (lower.includes('receive') || lower.includes('accept') || lower.includes('get blood') || lower.includes('give to ' + type)) {
          return `A person with ${typeUpper} blood can receive blood from: ${canReceiveFrom}.${type === 'ab+' ? ' (AB+ is the universal recipient!)' : ''}`;
        } else {
          return `As a ${typeUpper} donor, you can donate blood to: ${canDonateTo}.${type === 'o-' ? ' (O- is the universal donor!)' : ''}`;
        }
      }
    }

    return null;
  }

  isAgeEligibilityQuery(query) {
    const lower = (query || '').toLowerCase();
    const ageMatch = lower.match(/\b(\d{1,3})\b/);
    if (!ageMatch) return false;

    const age = Number(ageMatch[1]);
    return (lower.includes('donate') || lower.includes('eligible') || lower.includes('age') || lower.includes('old')) && age > 0 && age < 120;
  }

  answerAgeEligibilityQuery(query) {
    const lower = (query || '').toLowerCase();
    const ageMatch = lower.match(/\b(\d{1,3})\b/);
    if (!ageMatch) return null;
    const age = Number(ageMatch[1]);

    if (age < 18) {
      return `At ${age} years old, you are below the minimum donation age of 18. Most blood centers require donors to be at least 18 years old to ensure safety and full physiological maturity.`;
    }
    if (age > 75) {
      return `At ${age} years old, whole blood donation is generally deferred for safety reasons. Please consult a physician or local blood bank for medical guidance.`;
    }
    if (age > 65) {
      return `At ${age} years old, donation eligibility depends on your health and local blood bank rules (many accept donors up to 65-70 with medical approval). Please check with your doctor before donating.`;
    }
    return `If you are ${age} years old, you are within the standard age group (18-65) to donate blood! Make sure you weigh at least 50 kg, feel healthy, and meet other basic requirements.`;
  }

  findBestMatch(query) {
    const queryMeaningfulWords = extractMeaningfulWords(query);
    if (queryMeaningfulWords.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of knowledgeBase) {
      if (!entry) continue;

      let score = 0;

      // 1. Keyword array exact matching
      if (entry.keywords) {
        const queryNorm = normalizeText(query);
        for (const kw of entry.keywords) {
          if (queryNorm.includes(kw)) {
            score += 8;
          }
        }
      }

      // 2. Meaningful content word matching
      if (entry.question) {
        const questionWords = extractMeaningfulWords(entry.question);
        for (const qWord of queryMeaningfulWords) {
          if (questionWords.includes(qWord)) {
            score += 3;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    // Require a minimum threshold score of 3 (at least one exact keyword match or meaningful word match)
    return bestScore >= 3 ? bestMatch : null;
  }

  generateAnswer(query) {
    if (!query || !query.trim()) {
      return "How can I assist you today? Feel free to ask about blood donation or the V-Care app!";
    }

    // Step 1: Check Persona Questions (e.g. "are you a boy?")
    if (this.isPersonaQuery(query)) {
      return this.answerPersonaQuery();
    }

    // Step 2: Check Greetings (e.g. "hello", "hi")
    if (this.isGreetingQuery(query)) {
      return this.answerGreetingQuery();
    }

    // Step 3: Check Blood Compatibility Queries (Any query mentioning blood type e.g. B+, O-, A-ve)
    const types = extractBloodTypes(query);
    if (types.length > 0 || this.isCompatibilityQuery(query)) {
      const compatAnswer = this.answerCompatibilityQuery(query);
      if (compatAnswer) return compatAnswer;
    }

    // Step 4: Check Age Eligibility Queries (e.g. "can I donate at 17?")
    if (this.isAgeEligibilityQuery(query)) {
      const ageAnswer = this.answerAgeEligibilityQuery(query);
      if (ageAnswer) return ageAnswer;
    }

    // Step 5: Check Knowledge Base Search
    const match = this.findBestMatch(query);
    if (match) {
      return match.answer;
    }

    // Step 6: Fallback for Off-Topic / Unmatched Questions
    return "I'm Ismail, your V-Care AI Blood Assistant! 🤖🩸\n\nI can answer questions related to blood donation, donor eligibility, blood group compatibility, and using the V-Care app.\n\nTry asking me:\n• 'Can B+ donate to A-?'\n• 'Can I donate blood if I have a tattoo?'\n• 'How to search for donors?'\n• 'What to eat before blood donation?'";
  }
}

const serviceInstance = new KnowledgeBaseService();
module.exports = serviceInstance;
module.exports.default = serviceInstance;