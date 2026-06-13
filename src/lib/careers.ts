// PART 7 — career path alignment. Pure, deterministic (no API cost).
// Topic lists use real skill-node names; non-matching names are ignored at compute time.

export interface Career {
  id: string
  label: string
  topics: string[]
}

export const CAREERS: Career[] = [
  {
    id: 'data-science', label: 'Data Science & Machine Learning',
    topics: ['Supervised Machine Learning', 'Unsupervised learning', 'Deep Learning', 'Statistics', 'Multivariate statistical analysis', 'Linear algebra', 'Probability theory', 'Python', 'SQL', 'Pandas', 'NumPy', 'TensorFlow', 'scikit-learn', 'Bayesian Data Analysis', 'Data Mining', 'Large Scale Data Analysis', 'Probabilistic Machine Learning'],
  },
  {
    id: 'ai-dl', label: 'Artificial Intelligence & Deep Learning',
    topics: ['Deep Learning', 'Supervised Machine Learning', 'Reinforcement Learning', 'Computer Vision', 'Deep Generative Models', 'Generative models', 'LLMs', 'AI agents', 'Multiagent learning', 'Graph neural networks', 'Quantum Machine Learning', 'PyTorch', 'TensorFlow', 'Linear algebra'],
  },
  {
    id: 'banking-consulting', label: 'Banking & Financial Consulting',
    topics: ['Microeconomics', 'Macroeconomics', 'Basics of microeconomics', 'Basics of macroeconomics', 'Game Theory', 'Game theory', 'Financial Markets', 'Risk management', 'Fundamentals of Financial Risk Management', 'Econometrics', 'Advanced strategic Management', 'Strategic Management basics', 'Statistics'],
  },
  {
    id: 'finance', label: 'Finance & Trading',
    topics: ['Fundamentals of Investments', 'Fundamentals of Corporate Finance', 'Advanced Investments', 'Portfolio Management', 'Derivatives and Fixed Income', 'Options Pricing Theory', 'Algorithmic Trading', 'High-Frequency Trading', 'Systematic Investment Strategies', 'Quantitative Risk Management', 'Machine Learning in Financial Risk Management', 'Stochastic processes', 'Linear optimization', 'Theoretical Asset Pricing', 'Financial Markets'],
  },
  {
    id: 'product', label: 'Product Management',
    topics: ['Product management basics', 'Advanced product Management', 'Product Leadership and Operating Models', 'Business metrics and KPIs', 'Funnel analysis and conversion optimization', 'A/B testing design and analysis', 'Storytelling with data', 'Data-driven decision making', 'Customer development methodology', 'Market research and validation'],
  },
  {
    id: 'software-eng', label: 'Software Engineering & Development',
    topics: ['Basics of programming', 'Data structures and algorithms', 'Principles of Algorithmic Techniques', 'Advanced algorithms', 'Theory of computation', 'Software Engineering', 'Software Design and Modelling', 'Software testing', 'Testing', 'Databases', 'Computer networks', 'Operating systems', 'Web Software Development', 'FullStack', 'Git Control'],
  },
  {
    id: 'engineering', label: 'Engineering (Systems / Electrical / Mechanical)',
    topics: ['Control theory', 'ODE', 'PDE', 'Linear algebra', 'Numerical analysis', 'Differential equations', 'Thermodynamics', 'Kinetic theory of gases', 'Optimization', 'Linear optimization', 'Mathematical modelling', 'Operations research'],
  },
  {
    id: 'cybersecurity', label: 'Cybersecurity & Information Security',
    topics: ['Cybersecurity', 'Information Security', 'Security Engineering', 'Cryptography', 'Applied cryptography', 'Hacking (offensive security)', 'Computer networks', 'Operating systems', 'Fundamentals of Financial Risk Management'],
  },
  {
    id: 'quantum', label: 'Quantum Computing & Algorithms',
    topics: ['Quantum mechanics basics', 'Advanced quantum mechanics', 'Quantum Information', 'Quantum Circuits', 'Quantum Computing', 'Quantum error correction', 'Programming quantum computers', 'Quantum complexity theory', 'Quantum Machine Learning', 'Linear algebra'],
  },
  {
    id: 'cloud', label: 'Cloud Architecture',
    topics: ['Cloud Software and Systems', 'Scalable Systems and Data Management', 'Databases', 'PostgreSQL', 'MySQL', 'BigQuery', 'Computer networks', 'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Distributed Machine learning'],
  },
  {
    id: 'devops', label: 'DevOps & Infrastructure',
    topics: ['CI/CD', 'Docker', 'Kubernetes', 'Linux', 'Bash/PowerShell', 'Cloud Software and Systems', 'AWS', 'Azure', 'Google Cloud', 'Computer networks', 'Operating systems', 'Software testing'],
  },
  {
    id: 'entrepreneurship', label: 'Startup / Entrepreneurship',
    topics: ['Startup fundamentals', 'Business model canvas and lean startup', 'Product-market fit', 'Customer development methodology', 'Growth hacking strategies', 'Fundraising (angel, VC, crowdfunding)', 'Pitch deck design and investor relations', 'Scaling and operations', 'Team building and hiring', 'Fundamentals of Corporate Finance', 'Personal Finance'],
  },
  {
    id: 'business-strategy', label: 'Business Strategy & Consulting',
    topics: ['Strategic Management basics', 'Advanced strategic Management', 'Strategy Process', 'Designing Adaptive and Creative Organisations', 'Game Theory', 'Microeconomics', 'Industrial organization', 'Competition and Market Strategy', 'Risk analysis', 'Decision analysis', 'Economics of Strategy'],
  },
  {
    id: 'operations', label: 'Operations Management',
    topics: ['Operations management basics', 'Advanced Operations Management', 'Innovation in Operations', 'Operating Models', 'Operations research', 'Linear optimization', 'Nonlinear optimization', 'Decision analysis', 'Business metrics and KPIs'],
  },
  // ── Additional careers ──────────────────────────────────────────────────────
  {
    id: 'data-engineering', label: 'Data Engineering & Platforms',
    topics: ['Databases', 'SQL', 'PostgreSQL', 'MySQL', 'BigQuery', 'ETL/ELT', 'Fabric', 'Principles and Techniques of Data Platforms', 'Scalable Systems and Data Management', 'Large Scale Data Analysis', 'Python', 'Cloud Software and Systems', 'Qlik Sense'],
  },
  {
    id: 'quant-research', label: 'Quantitative Research',
    topics: ['Stochastic processes', 'Brownian motion and stochastic analysis', 'Probability theory', 'Statistics', 'Time series analysis', 'Options Pricing Theory', 'Linear algebra', 'Numerical analysis', 'Mathematical finance theory', 'Control theory', 'High-dimensional probability'],
  },
  {
    id: 'research-academia', label: 'Research & Academia (Math/Physics)',
    topics: ['Real analysis', 'Functional analysis', 'Measure and integral', 'Abstract algebra', 'Galois theory', 'Algebraic topology', 'Differential geometry', 'Category theory', 'Quantum field theory', 'General relativity', 'Mean field theory'],
  },
  {
    id: 'biz-analytics', label: 'Business Analytics',
    topics: ['Descriptive analytics (data summarization)', 'Exploratory data analysis (EDA)', 'Business metrics and KPIs', 'Cohort analysis and retention curves', 'Customer lifetime value (CLV) modeling', 'Funnel analysis and conversion optimization', 'Attribution modeling (multi-touch)', 'A/B testing design and analysis', 'Dashboarding and visualization for business', 'Storytelling with data', 'Python for analytics', 'Market sizing and forecasting'],
  },
  {
    id: 'ml-ops', label: 'Machine Learning Engineering / MLOps',
    topics: ['Supervised Machine Learning', 'Deep Learning', 'Distributed Machine learning', 'Federated Learning', 'Python', 'PyTorch', 'TensorFlow', 'Docker', 'Kubernetes', 'Cloud Software and Systems', 'CI/CD', 'Large Scale Data Analysis'],
  },
]

// ── Compute ───────────────────────────────────────────────────────────────────

export type SlimNode = { id: string; name: string; subject: string; masteryLevel: number; status: string }

export interface CareerProgress {
  id: string
  label: string
  matched: { id: string; name: string; subject: string; masteryLevel: number; status: string }[]
  masteredTopics: { id: string; name: string; subject: string }[]
  recommendedNext: { id: string; name: string; subject: string; masteryLevel: number }[]
  // Every topic the path requires — whether or not it's in your skill tree yet.
  allTopics: { name: string; id: string | null; subject: string | null; masteryLevel: number; inTree: boolean }[]
  relevance: number   // % of career topics you've engaged (mastery >= 1)
  readiness: number   // avg mastery / 5 → entry-level readiness
  gapText: string
  totalTopics: number   // mapped (in-tree) topics
  requiredTopics: number // all listed topics for the path
}

const MASTERED = 4   // green / strong
const ENGAGED = 1

export function computeCareerProgress(career: Career, nodes: SlimNode[]): CareerProgress {
  const byName = new Map<string, SlimNode>()
  for (const n of nodes) byName.set(n.name.toLowerCase(), n)

  const matched: SlimNode[] = []
  const allTopics = career.topics.map(t => {
    const n = byName.get(t.toLowerCase())
    if (n) { matched.push(n); return { name: n.name, id: n.id, subject: n.subject, masteryLevel: n.masteryLevel, inTree: true } }
    return { name: t, id: null, subject: null, masteryLevel: 0, inTree: false }
  })
  const total = matched.length

  const mastered = matched.filter(n => n.masteryLevel >= MASTERED)
  const engaged  = matched.filter(n => n.masteryLevel >= ENGAGED)
  const avg = total > 0 ? matched.reduce((s, n) => s + n.masteryLevel, 0) / total : 0

  const relevance = total > 0 ? Math.round((engaged.length / total) * 100) : 0
  const readiness = Math.round((avg / 5) * 100)

  // Recommend unlocked/in-progress relevant topics not yet mastered, closest-to-done first
  const recommendedNext = matched
    .filter(n => (n.status === 'unlocked' || n.status === 'in_progress') && n.masteryLevel < MASTERED)
    .sort((a, b) => b.masteryLevel - a.masteryLevel)
    .slice(0, 5)
    .map(n => ({ id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel }))

  // Gap analysis sentence
  const strong = mastered.slice(0, 3).map(n => n.name)
  const weak = matched.filter(n => n.masteryLevel < 2).slice(0, 3).map(n => n.name)
  let gapText: string
  if (total === 0) gapText = 'No mapped topics found for this path yet.'
  else if (readiness >= 80) gapText = `You're at ${readiness}% readiness — strong across this path. Polish ${weak[0] ?? 'advanced electives'} to round it out.`
  else if (strong.length && weak.length) gapText = `You're strong in ${strong.join(', ')} but weak in ${weak.join(', ')}. Prioritize ${weak[0]} to push toward 80% readiness.`
  else if (weak.length) gapText = `Build foundations first: focus on ${weak.join(', ')} to start building readiness for this path.`
  else gapText = `Keep advancing your current topics toward mastery to reach 80% readiness.`

  return {
    id: career.id, label: career.label,
    matched: matched.map(n => ({ id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel, status: n.status })),
    masteredTopics: mastered.map(n => ({ id: n.id, name: n.name, subject: n.subject })),
    recommendedNext, allTopics,
    relevance, readiness, gapText, totalTopics: total, requiredTopics: career.topics.length,
  }
}
