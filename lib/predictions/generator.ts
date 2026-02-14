// Kabbalah Prediction Generator - Horoscope Style
// Authentic Kabbalistic Numerology with Actionable Guidance
// NO RANDOMNESS - Pure deterministic sacred mathematics

// ============================================================================
// ORIGINAL INTERFACE - Maintain compatibility
// ============================================================================

const LIFE_DOMAINS = [
  { id: "career", name: "Career & Purpose", hebrew: "פרנסה" },
  { id: "love", name: "Love & Relationships", hebrew: "אהבה" },
  { id: "health", name: "Health & Vitality", hebrew: "בריאות" },
  { id: "wealth", name: "Wealth & Abundance", hebrew: "עושר" },
  { id: "family", name: "Family & Home", hebrew: "משפחה" },
  { id: "creativity", name: "Creativity & Expression", hebrew: "יצירה" },
  { id: "spirituality", name: "Spirituality & Growth", hebrew: "רוחניות" },
  { id: "knowledge", name: "Knowledge & Wisdom", hebrew: "חכמה" },
  { id: "community", name: "Community & Service", hebrew: "קהילה" },
  { id: "transformation", name: "Transformation", hebrew: "שינוי" },
  { id: "protection", name: "Protection & Safety", hebrew: "הגנה" },
  { id: "manifestation", name: "Manifestation", hebrew: "התגשמות" },
]

const SEPHIROT = [
  { id: 1, name: "Kether", meaning: "Crown", energy: "Divine Will" },
  { id: 2, name: "Chokmah", meaning: "Wisdom", energy: "Creative Force" },
  { id: 3, name: "Binah", meaning: "Understanding", energy: "Form & Structure" },
  { id: 4, name: "Chesed", meaning: "Loving-kindness", energy: "Expansion" },
  { id: 5, name: "Gevurah", meaning: "Strength", energy: "Discipline" },
  { id: 6, name: "Tiphereth", meaning: "Beauty", energy: "Harmony" },
  { id: 7, name: "Netzach", meaning: "Victory", energy: "Persistence" },
  { id: 8, name: "Hod", meaning: "Splendor", energy: "Communication" },
  { id: 9, name: "Yesod", meaning: "Foundation", energy: "Connection" },
  { id: 10, name: "Malkuth", meaning: "Kingdom", energy: "Manifestation" },
]

const ARCHETYPES = [
  "The Warrior",
  "The Sage",
  "The Healer",
  "The Creator",
  "The Ruler",
  "The Lover",
  "The Seeker",
  "The Magician",
  "The Innocent",
  "The Rebel",
  "The Caregiver",
  "The Jester",
]

const ACTIONS = [
  "embrace",
  "release",
  "cultivate",
  "transform",
  "protect",
  "illuminate",
  "balance",
  "strengthen",
  "surrender",
  "initiate",
  "complete",
  "connect",
  "separate",
  "unite",
  "transcend",
  "ground",
  "elevate",
  "purify",
]

const PREDICTIONS_TEMPLATES = [
  "The {sephira} energy flows through your {domain}. {action} the {quality} within you.",
  "Today, {sephira} guides your path in {domain}. Your inner {archetype} calls you to {action}.",
  "Sacred vibrations of {sephira} illuminate your {domain}. {action} what no longer serves you.",
  "The Tree of Life reveals: {sephira} awakens in your {domain}. {action} with wisdom.",
  "Your destiny number {number} resonates with {sephira}. In matters of {domain}, {action} boldly.",
]

export interface Prediction {
  code: string
  domain: (typeof LIFE_DOMAINS)[number]
  sephira: (typeof SEPHIROT)[number]
  archetype: string
  action: string
  message: string
  date: string
}

// ============================================================================
// 22 PATHS OF WISDOM - Authentic Kabbalah
// ============================================================================

const WISDOM_PATHS = [
  { id: 1, name: "Admirable Intelligence", energy: "divine inspiration awakens" },
  { id: 2, name: "Illuminating Intelligence", energy: "sudden clarity pierces darkness" },
  { id: 3, name: "Sanctifying Intelligence", energy: "sacred foundations establish" },
  { id: 4, name: "Cohesive Intelligence", energy: "unity harmonizes all forces" },
  { id: 5, name: "Radical Intelligence", energy: "breakthrough shatters limitations" },
  { id: 6, name: "Mediating Intelligence", energy: "balance restores equilibrium" },
  { id: 7, name: "Hidden Intelligence", energy: "occult wisdom surfaces" },
  { id: 8, name: "Perfect Intelligence", energy: "divine order manifests" },
  { id: 9, name: "Pure Intelligence", energy: "truth dissolves all illusion" },
  { id: 10, name: "Resplendent Intelligence", energy: "ideas crystallize into form" },
  { id: 11, name: "Fiery Intelligence", energy: "passion ignites movement" },
  { id: 12, name: "Transparent Intelligence", energy: "future patterns reveal" },
  { id: 13, name: "Uniting Intelligence", energy: "fragments merge into wholeness" },
  { id: 14, name: "Luminous Intelligence", energy: "consciousness expands infinitely" },
  { id: 15, name: "Constituting Intelligence", energy: "thoughts materialize reality" },
  { id: 16, name: "Triumphant Intelligence", energy: "victory crowns all efforts" },
  { id: 17, name: "Disposing Intelligence", energy: "chaos transforms to order" },
  { id: 18, name: "Intelligence of the House", energy: "stable foundations anchor" },
  { id: 19, name: "Intelligence of Spiritual Activity", energy: "divine flow activates" },
  { id: 20, name: "Intelligence of Will", energy: "unshakeable resolve manifests" },
  { id: 21, name: "Intelligence of Conciliation", energy: "cosmic rewards descend" },
  { id: 22, name: "Faithful Intelligence", energy: "cycles complete perfectly" },
]

// ============================================================================
// HOROSCOPE-STYLE PREDICTION COMPONENTS
// ============================================================================

// Opening Hooks (what's happening this week)
const OPENING_HOOKS = {
  career: [
    "Divine timing aligns for your career breakthrough",
    "Recognition you deserve finally arrives this week",
    "A professional opportunity emerges from unexpected places",
    "Your voice carries unusual weight in business matters",
    "Career momentum builds rapidly starting today",
    "Leadership energy activates in your professional sphere",
  ],
  love: [
    "Hidden feelings surface this week in matters of the heart",
    "New romantic energy enters your life this week",
    "Deep emotional connections strengthen unexpectedly",
    "Love takes a surprising turn in your favor",
    "Your heart opens to new possibilities now",
    "Relationship clarity arrives through honest conversation",
  ],
  wealth: [
    "Financial opportunity knocks three times this week",
    "Money moves in your favor this week",
    "Abundance flows through unexpected channels",
    "Your financial intuition peaks dramatically",
    "Wealth-building energy intensifies now",
    "Resources multiply when you take bold action",
  ],
  health: [
    "Your body sends clear signals this week",
    "Energy levels soar this week with one simple change",
    "Healing accelerates through conscious choices",
    "Physical vitality reaches a powerful peak",
    "Your wellness journey takes a positive turn",
    "Body wisdom speaks loudly - listen carefully",
  ],
  spirituality: [
    "A spiritual awakening begins this week",
    "Divine connection strengthens through daily practice",
    "Sacred insights arrive in unexpected moments",
    "Your intuitive powers amplify significantly",
    "Mystical experiences become more frequent",
    "Spiritual downloads accelerate starting now",
  ],
  family: [
    "Home matters demand attention but bring rewards",
    "Family bonds deepen through shared experiences",
    "Domestic harmony restores naturally this week",
    "An old family pattern finally breaks",
    "Home becomes your sanctuary of power",
    "Family wisdom passes through generations now",
  ],
  creativity: [
    "Creative fire ignites within you this week",
    "Stop planning, start creating this week",
    "Artistic expression reaches new heights",
    "Your unique vision demands manifestation",
    "Creative blocks dissolve suddenly",
    "Inspiration strikes with unusual frequency",
  ],
  knowledge: [
    "Sudden insights illuminate complex problems",
    "A new skill calls to you this week",
    "Learning accelerates through perfect timing",
    "Mental clarity reaches brilliant levels",
    "Knowledge seeking leads to breakthroughs",
    "Wisdom arrives from unexpected teachers",
  ],
  community: [
    "Your presence makes a difference this week",
    "Leadership energy activates in group settings",
    "Community building opportunities multiply",
    "Social connections deepen meaningfully",
    "You become the catalyst for change",
    "Collective energy amplifies your impact",
  ],
  transformation: [
    "Major transformation accelerates this week",
    "Personal evolution reaches critical mass",
    "Old patterns crumble to make space for new",
    "Metamorphosis happens faster than expected",
    "You shed what no longer serves powerfully",
    "Rebirth energy pulses through your being",
  ],
  protection: [
    "Guardian forces surround you this week",
    "Your protective instincts sharpen dramatically",
    "Safety consciousness increases naturally",
    "Boundaries strengthen without effort",
    "Divine protection becomes tangible",
    "You create sacred space effortlessly",
  ],
  manifestation: [
    "What you've visualized starts materializing",
    "Dreams become reality through aligned action",
    "Manifestation power peaks this week",
    "Your intentions crystallize into form",
    "The universe delivers beyond expectations",
    "Reality bends to meet your vision",
  ],
}

// Specific Events (when/what happens)
const SPECIFIC_EVENTS = {
  career: [
    "A conversation this week opens doors you thought were closed",
    "Someone influential notices your work by Thursday",
    "An unexpected job offer arrives through old connections",
    "Your skills get showcased in front of decision-makers",
    "A project you abandoned becomes relevant again",
    "Tuesday brings a career-defining conversation",
  ],
  love: [
    "Someone close wants to reveal their true feelings",
    "You meet someone special in an unexpected place",
    "An old flame resurfaces with new energy",
    "Wednesday evening favors deep romantic conversations",
    "A friendship evolves into something more",
    "Your vulnerability attracts genuine connection",
  ],
  wealth: [
    "Review old contracts and connections this week",
    "A side hustle idea gains unexpected traction",
    "Money you thought lost may return by Friday",
    "Investment timing aligns perfectly midweek",
    "Someone offers a lucrative collaboration",
    "Financial clarity arrives through simple calculation",
  ],
  health: [
    "Energy peaks midweek - perfect for new habits",
    "A nagging symptom needs attention now, not later",
    "Your workout routine craves variety by Wednesday",
    "Sleep quality improves with one simple change",
    "Body responds powerfully to plant-based nutrition",
    "Movement becomes medicine starting today",
  ],
  spirituality: [
    "Dreams carry important messages - keep a journal",
    "Meditation reveals answers you've been seeking",
    "A spiritual teacher appears at the perfect moment",
    "Your third eye opens during sunset meditation",
    "Synchronicities multiply after Tuesday",
    "Angel numbers appear everywhere you look",
  ],
  family: [
    "A family member needs your wisdom more than advice",
    "Reorganize one space this week - clarity follows",
    "Old family issues resolve through gentle conversation",
    "Sunday dinner becomes a healing ritual",
    "Ancestral patterns become clear and breakable",
    "Children teach you profound lessons this week",
  ],
  creativity: [
    "That abandoned project calls you back now",
    "Your unique voice needs expression by Friday",
    "Inspiration strikes Tuesday morning - capture it",
    "Collaboration opportunities emerge naturally",
    "Imperfect action beats perfect planning",
    "Your art heals others in unexpected ways",
  ],
  knowledge: [
    "A mystery that puzzled you becomes crystal clear",
    "The perfect course or mentor appears this week",
    "Wednesday afternoon brings breakthrough understanding",
    "Your brain craves new information - feed it",
    "Teaching others deepens your own mastery",
    "Questions you ask unlock universal answers",
  ],
  community: [
    "A friend needs help but won't ask - offer first",
    "That group you've been considering? Join now",
    "Your organizing skills get recognized and needed",
    "Small acts of kindness ripple outward powerfully",
    "Leadership emerges naturally through service",
    "Community building starts with showing up",
  ],
  transformation: [
    "What no longer serves falls away naturally",
    "Breakthrough happens when you stop forcing",
    "Old patterns break; new possibilities emerge",
    "Change accelerates beyond your control - embrace it",
    "Your past self thanks you for letting go",
    "Transformation requires releasing yesterday's identity",
  ],
  protection: [
    "Trust your instinct about certain people or places",
    "Set boundaries without guilt - 'no' is complete",
    "Energy vampires reveal themselves clearly",
    "Sacred space at home becomes non-negotiable",
    "Your gut feelings prove accurate by Friday",
    "Protection comes through conscious awareness",
  ],
  manifestation: [
    "Universe heard your request - match it with action",
    "Write goals daily - they materialize faster",
    "Opportunities appear disguised as work",
    "Say yes to invitations - synchronicity waits there",
    "Your thoughts create reality faster now",
    "Stay positive and persistent through Thursday",
  ],
}

// Action Steps (3-5 specific things to do)
const ACTION_STEPS = {
  career: [
    "Trust instincts and speak up in meetings - your ideas have power now",
    "Update your resume and portfolio before Thursday",
    "Negotiate confidently - you have more leverage than you realize",
    "Prepare to showcase achievements when someone asks",
    "Network actively - Monday evening is especially powerful",
    "Document your wins - recognition requires evidence",
  ],
  love: [
    "Create quiet moments for honest conversation",
    "Your vulnerability will be met with warmth",
    "Let go of past hurts - forgiveness unlocks new love",
    "Wear something that makes you feel confident Tuesday",
    "Flirt playfully - romantic energy flows easily",
    "Express feelings through actions, not just words",
  ],
  wealth: [
    "Invest in yourself now - take that course, buy that tool",
    "Research investments you've been eyeing",
    "Start the side hustle today, even just 30 minutes",
    "Politely remind anyone who owes you money",
    "Raise your rates - your skills are worth more",
    "Practice abundance mindset daily",
  ],
  health: [
    "Sleep becomes your superpower - prioritize 8 hours",
    "Movement heals: even a 10-minute walk changes everything",
    "Drink water first thing every morning",
    "Try something new in your workout Wednesday",
    "Green smoothies daily work wonders",
    "Listen to your body's whispers before they become screams",
  ],
  spirituality: [
    "Keep a dream journal by your bed",
    "Meditate for 5 minutes every morning",
    "Light a candle and set daily intentions",
    "Notice repeating numbers - angels are messaging",
    "Practice gratitude before bed nightly",
    "Trust those gut feelings - intuition is accurate",
  ],
  family: [
    "Cook and eat dinner together this week",
    "Laugh together - humor heals old wounds",
    "Listen more than you advise",
    "Create one new family ritual starting Sunday",
    "Share stories of ancestors - honor lineage",
    "Small gestures matter more than grand plans",
  ],
  creativity: [
    "Don't wait for perfection - start messy today",
    "Share your work publicly by Friday",
    "Collaborate with someone creative this week",
    "Create daily, even just 5 minutes",
    "Express emotions through art, not arguments",
    "Your work doesn't need permission to exist",
  ],
  knowledge: [
    "Enroll in that course you've been eyeing",
    "Ask questions others are afraid to voice",
    "Practice new skills 15 minutes daily",
    "Share what you learn - teaching deepens understanding",
    "Read for 20 minutes before bed",
    "Watch that tutorial you bookmarked months ago",
  ],
  community: [
    "Show up even when you don't feel like it",
    "Lead by example, not by words",
    "Organize the gathering everyone talks about",
    "Mentor someone younger or less experienced",
    "Your voice matters in group decisions",
    "Small acts of service create massive ripples",
  ],
  transformation: [
    "Don't fight change - flow with it naturally",
    "Let your past self go with gratitude",
    "Embrace the unknown courageously",
    "Journal about who you're becoming",
    "Release without regret or guilt",
    "Trust the process even when it's uncomfortable",
  ],
  protection: [
    "Say no without explanation or guilt",
    "Protect your energy from draining people",
    "Create sacred space at home this weekend",
    "Trust feelings when something seems off",
    "Clear your space with smoke or sound",
    "Set digital boundaries - limit social media",
  ],
  manifestation: [
    "Visualize desired outcomes every morning",
    "Act as if it's already yours",
    "Write 'I am' affirmations daily",
    "Take one aligned action every day",
    "Stay in receiving mode - expect miracles",
    "Match energy of what you desire",
  ],
}

// Motivational Closes
const MOTIVATIONAL_CLOSES = [
  "Your moment is here",
  "Fortune favors the bold",
  "Trust the process",
  "You're exactly where you need to be",
  "The universe supports you",
  "Magic happens when you believe",
  "Your time has come",
  "Believe in your power",
  "Everything is unfolding perfectly",
  "Success is inevitable now",
  "You are divinely guided",
  "Your path is clearing",
  "Miracles are normal for you",
  "You're more ready than you realize",
  "The best is yet to come",
]

// ============================================================================
// LUNAR PHASES - Affect prediction tone and timing
// ============================================================================

const LUNAR_PHASES = [
  { phase: "new_moon", name: "New Moon", energy: "new beginnings", timing: "this week" },
  { phase: "waxing_crescent", name: "Waxing Crescent", energy: "building momentum", timing: "within 3 days" },
  { phase: "first_quarter", name: "First Quarter", energy: "taking action", timing: "by midweek" },
  { phase: "waxing_gibbous", name: "Waxing Gibbous", energy: "refining plans", timing: "before Friday" },
  { phase: "full_moon", name: "Full Moon", energy: "peak manifestation", timing: "this week" },
  { phase: "waning_gibbous", name: "Waning Gibbous", energy: "gratitude and sharing", timing: "in coming days" },
  { phase: "last_quarter", name: "Last Quarter", energy: "releasing and clearing", timing: "by weekend" },
  { phase: "waning_crescent", name: "Waning Crescent", energy: "rest and reflection", timing: "within days" },
]

// ============================================================================
// SEASONS - Affect domain focus and energy
// ============================================================================

const SEASONS = [
  { season: "spring", energy: "growth and renewal", focus: "new beginnings" },
  { season: "summer", energy: "abundance and action", focus: "manifestation" },
  { season: "autumn", energy: "harvest and gratitude", focus: "completion" },
  { season: "winter", energy: "rest and reflection", focus: "inner work" },
]

// ============================================================================
// AUTHENTIC KABBALISTIC NUMEROLOGY ENGINE
// ============================================================================

class KabbalahNumerology {
  private readonly MASTER_NUMBERS = [11, 22, 33]
  
  walletToGematria(walletAddress: string): number {
    const cleanAddr = walletAddress.replace('0x', '').toLowerCase()
    let sum = 0
    
    for (const char of cleanAddr) {
      if (char >= '0' && char <= '9') {
        sum += parseInt(char)
      } else {
        sum += (char.charCodeAt(0) - 'a'.charCodeAt(0) + 1)
      }
    }
    
    return this.reduceToSingleDigit(sum)
  }
  
  reduceToSingleDigit(num: number): number {
    while (num > 9 && !this.MASTER_NUMBERS.includes(num)) {
      num = String(num).split('').reduce((sum, digit) => sum + parseInt(digit), 0)
    }
    return num
  }
  
  getLunarInfluence(date: Date): number {
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const combined = day + month + (year % 100)
    return this.reduceToSingleDigit(combined)
  }
  
  getLunarPhase(date: Date): typeof LUNAR_PHASES[number] {
    // Simplified lunar calculation (day of month mod 29)
    const dayOfMonth = date.getDate()
    const phaseIndex = Math.floor((dayOfMonth / 29) * 8)
    return LUNAR_PHASES[phaseIndex % 8]
  }
  
  getSeason(date: Date): typeof SEASONS[number] {
    const month = date.getMonth()
    if (month >= 2 && month <= 4) return SEASONS[0] // spring
    if (month >= 5 && month <= 7) return SEASONS[1] // summer
    if (month >= 8 && month <= 10) return SEASONS[2] // autumn
    return SEASONS[3] // winter
  }
  
  calculatePath(walletNum: number, dateNum: number, destinyNum: number): number {
    return ((walletNum + dateNum + destinyNum - 3) % 22) + 1
  }
  
  getDeterministicIndex(factor1: number, factor2: number, arrayLength: number): number {
    const combined = (factor1 * 7) + (factor2 * 13)
    return combined % arrayLength
  }
}

// ============================================================================
// MAIN GENERATION FUNCTION - HOROSCOPE STYLE
// ============================================================================

export function generatePrediction(
  walletAddress: string, 
  walletNumber: number, 
  date: Date = new Date()
): Prediction {
  const numerology = new KabbalahNumerology()
  const dateStr = date.toISOString().split("T")[0]
  
  // Calculate sacred numbers
  const walletGematria = numerology.walletToGematria(walletAddress)
  const lunarInfluence = numerology.getLunarInfluence(date)
  const destinyNumber = numerology.reduceToSingleDigit(walletGematria + lunarInfluence + walletNumber)
  const pathNumber = numerology.calculatePath(walletGematria, lunarInfluence, destinyNumber)
  const sephirahNumber = ((walletGematria + lunarInfluence - 2) % 10) + 1
  
  // Get lunar and seasonal influences
  const lunarPhase = numerology.getLunarPhase(date)
  const season = numerology.getSeason(date)
  
  // Select components
  const path = WISDOM_PATHS[pathNumber - 1]
  const sephira = SEPHIROT[sephirahNumber - 1]
  
  const domainIndex = numerology.getDeterministicIndex(destinyNumber, lunarInfluence, LIFE_DOMAINS.length)
  const domain = LIFE_DOMAINS[domainIndex]
  const domainKey = domain.id as keyof typeof OPENING_HOOKS
  
  const archetypeIndex = numerology.getDeterministicIndex(pathNumber, walletGematria, ARCHETYPES.length)
  const archetype = ARCHETYPES[archetypeIndex]
  
  const baseActionIndex = numerology.getDeterministicIndex(pathNumber, sephirahNumber, ACTIONS.length)
  const baseAction = ACTIONS[baseActionIndex]
  
  // Select horoscope components
  const hookIndex = numerology.getDeterministicIndex(walletGematria, pathNumber, OPENING_HOOKS[domainKey].length)
  const hook = OPENING_HOOKS[domainKey][hookIndex]
  
  const eventIndex = numerology.getDeterministicIndex(lunarInfluence, sephirahNumber, SPECIFIC_EVENTS[domainKey].length)
  const event = SPECIFIC_EVENTS[domainKey][eventIndex]
  
  const actionIndex = numerology.getDeterministicIndex(destinyNumber, date.getDate(), ACTION_STEPS[domainKey].length)
  const actionStep = ACTION_STEPS[domainKey][actionIndex]
  
  const closeIndex = numerology.getDeterministicIndex(pathNumber, destinyNumber, MOTIVATIONAL_CLOSES.length)
  const close = MOTIVATIONAL_CLOSES[closeIndex]
  
  // Generate unique code
  const hash = Math.abs(walletAddress.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0) + date.getTime()).toString(16).slice(0, 4)
  const code = `KC-${pathNumber}-${hash}`
  
  // Build horoscope-style message (under 280 chars for Twitter)
  const message = `${hook}. ${event}. ${actionStep}. ${close}.`
  
  // Trim if too long
  let finalMessage = message
  if (message.length > 240) {
    finalMessage = `${hook}. ${event}. ${close}.`
  }
  
  return {
    code,
    domain,
    sephira,
    archetype,
    action: baseAction,
    message: finalMessage,
    date: dateStr,
  }
}

export function generateShareText(prediction: Prediction): string {
  const pathNumber = parseInt(prediction.code.split('-')[1])
  
  // Format: [Prediction] + Path info + hashtag (under 280 chars)
  const pathInfo = `Path ${pathNumber} • ${prediction.sephira.name} Energy`
  const fullText = `${prediction.message}\n\n${pathInfo}\n#KabbalahCode`
  
  if (fullText.length <= 280) {
    return fullText
  }
  
  // If too long, remove path info
  return `${prediction.message}\n\n#KabbalahCode`
}

export function getPredictionInsight(prediction: Prediction): string {
  const pathNumber = parseInt(prediction.code.split('-')[1])
  const path = WISDOM_PATHS[pathNumber - 1]
  
  return `The ${path.name} (Path ${pathNumber}) activates through ${prediction.sephira.name}, bringing ${path.energy}. Your ${prediction.domain.name} receives focused cosmic support today.`
}

export function getCalculationProof(walletAddress: string, walletNumber: number, date: Date): string {
  const numerology = new KabbalahNumerology()
  const walletGematria = numerology.walletToGematria(walletAddress)
  const lunarInfluence = numerology.getLunarInfluence(date)
  const destinyNumber = numerology.reduceToSingleDigit(walletGematria + lunarInfluence + walletNumber)
  const pathNumber = numerology.calculatePath(walletGematria, lunarInfluence, destinyNumber)
  const lunarPhase = numerology.getLunarPhase(date)
  
  return `Your Gematria: ${walletGematria} | Lunar: ${lunarInfluence} (${lunarPhase.name}) | Destiny: ${destinyNumber} | Path: ${pathNumber}/22 | Sacred mathematics, not randomness.`
}
