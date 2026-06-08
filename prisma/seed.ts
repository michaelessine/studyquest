/**
 * Seed — complete topic-based skill tree for all subjects.
 * Two-phase: 1) create all nodes (building global name map)
 *            2) create all dependencies (including cross-subject)
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import { cascadeUnlock } from '../src/lib/unlock'

const prisma = new PrismaClient()

type TopicDef = { name: string; tier: number; category: string; prereqs: string[] }

// Cross-subject prereq resolution: "Supervised Machine Learning from CS" → "Supervised Machine Learning"
function resolvePrereq(ref: string): string {
  return ref.replace(/\s+from\s+\S+$/i, '').trim()
}

// ── MATHEMATICS ───────────────────────────────────────────────────────────────
const MATHEMATICS: TopicDef[] = [
  // Calculus & Analysis
  { name: 'Differential calculus',                  tier: 0, category: 'Calculus & Analysis', prereqs: [] },
  { name: 'Integral calculus',                      tier: 0, category: 'Calculus & Analysis', prereqs: [] },
  { name: 'ODE',                                    tier: 1, category: 'Calculus & Analysis', prereqs: ['Differential calculus', 'Integral calculus'] },
  { name: 'Multivariable calculus',                 tier: 1, category: 'Calculus & Analysis', prereqs: ['Integral calculus'] },
  { name: 'Real analysis',                          tier: 1, category: 'Calculus & Analysis', prereqs: ['Integral calculus', 'Linear algebra'] },
  { name: 'Metric spaces',                          tier: 1, category: 'Calculus & Analysis', prereqs: ['Real analysis'] },
  { name: 'PDE',                                    tier: 2, category: 'Calculus & Analysis', prereqs: ['ODE', 'Multivariable calculus'] },
  { name: 'Complex analysis',                       tier: 2, category: 'Calculus & Analysis', prereqs: ['Real analysis'] },
  { name: 'Fourier analysis',                       tier: 2, category: 'Calculus & Analysis', prereqs: ['PDE', 'Real analysis'] },
  { name: 'Measure and integral',                   tier: 2, category: 'Calculus & Analysis', prereqs: ['Real analysis'] },
  { name: 'Asymptotics and perturbation theory',    tier: 2, category: 'Calculus & Analysis', prereqs: ['Real analysis', 'ODE'] },
  { name: 'Mathematical modelling',                 tier: 2, category: 'Calculus & Analysis', prereqs: ['ODE', 'Linear algebra'] },
  { name: 'Functional analysis',                    tier: 3, category: 'Calculus & Analysis', prereqs: ['Measure and integral', 'Metric spaces'] },
  { name: 'Hilbert spaces',                         tier: 3, category: 'Calculus & Analysis', prereqs: ['Functional analysis'] },
  { name: 'Banach spaces',                          tier: 3, category: 'Calculus & Analysis', prereqs: ['Functional analysis'] },
  { name: 'Harmonic analysis',                      tier: 3, category: 'Calculus & Analysis', prereqs: ['Fourier analysis', 'Measure and integral'] },
  { name: 'Variational calculus',                   tier: 3, category: 'Calculus & Analysis', prereqs: ['ODE', 'Multivariable calculus'] },
  { name: 'Spectral theory',                        tier: 4, category: 'Calculus & Analysis', prereqs: ['Hilbert spaces', 'Functional analysis'] },
  // Linear Algebra & Matrix Theory
  { name: 'Linear algebra',                         tier: 0, category: 'Linear Algebra & Matrix Theory', prereqs: [] },
  { name: 'Matrix theory',                          tier: 1, category: 'Linear Algebra & Matrix Theory', prereqs: ['Linear algebra'] },
  { name: 'Numerical analysis',                     tier: 1, category: 'Linear Algebra & Matrix Theory', prereqs: ['Linear algebra', 'Integral calculus'] },
  { name: 'Differential geometry',                  tier: 2, category: 'Linear Algebra & Matrix Theory', prereqs: ['Multivariable calculus', 'Linear algebra'] },
  { name: 'Numerical matrix computations',          tier: 2, category: 'Linear Algebra & Matrix Theory', prereqs: ['Numerical analysis', 'Matrix theory'] },
  { name: 'Random matrix theory',                   tier: 4, category: 'Linear Algebra & Matrix Theory', prereqs: ['High-dimensional probability', 'Matrix theory'] },
  // Probability & Statistics
  { name: 'Probability theory',                     tier: 0, category: 'Probability & Statistics', prereqs: [] },
  { name: 'Statistics',                             tier: 0, category: 'Probability & Statistics', prereqs: [] },
  { name: 'Risk analysis',                          tier: 2, category: 'Probability & Statistics', prereqs: ['Probability theory', 'Statistics'] },
  { name: 'Stochastic processes',                   tier: 2, category: 'Probability & Statistics', prereqs: ['Probability theory', 'Real analysis'] },
  { name: 'Multivariate statistical analysis',      tier: 2, category: 'Probability & Statistics', prereqs: ['Statistics', 'Linear algebra'] },
  { name: 'Time series analysis',                   tier: 2, category: 'Probability & Statistics', prereqs: ['Statistics', 'Stochastic processes'] },
  { name: 'High-dimensional probability',           tier: 3, category: 'Probability & Statistics', prereqs: ['Measure and integral', 'Stochastic processes'] },
  { name: 'High-dimensional statistics',            tier: 3, category: 'Probability & Statistics', prereqs: ['Multivariate statistical analysis', 'High-dimensional probability'] },
  { name: 'Brownian motion and stochastic analysis',tier: 3, category: 'Probability & Statistics', prereqs: ['Stochastic processes', 'Measure and integral'] },
  { name: 'Computational methods in stochastics',   tier: 3, category: 'Probability & Statistics', prereqs: ['Stochastic processes', 'Numerical analysis'] },
  { name: 'Mathematical finance theory',            tier: 4, category: 'Probability & Statistics', prereqs: ['Stochastic processes', 'Measure and integral'] },
  // Algebra & Number Theory
  { name: 'Discrete mathematics',                   tier: 0, category: 'Algebra & Number Theory', prereqs: [] },
  { name: 'Number theory',                          tier: 0, category: 'Algebra & Number Theory', prereqs: [] },
  { name: 'Combinatorics',                          tier: 0, category: 'Algebra & Number Theory', prereqs: [] },
  { name: 'Abstract algebra',                       tier: 1, category: 'Algebra & Number Theory', prereqs: ['Discrete mathematics'] },
  { name: 'Graph theory',                           tier: 1, category: 'Algebra & Number Theory', prereqs: ['Discrete mathematics'] },
  { name: 'Cryptography',                           tier: 2, category: 'Algebra & Number Theory', prereqs: ['Number theory', 'Abstract algebra'] },
  { name: 'Galois theory',                          tier: 3, category: 'Algebra & Number Theory', prereqs: ['Abstract algebra'] },
  { name: 'Lie groups and Lie algebras',            tier: 3, category: 'Algebra & Number Theory', prereqs: ['Abstract algebra', 'Differential geometry'] },
  { name: 'Representation theory',                  tier: 4, category: 'Algebra & Number Theory', prereqs: ['Lie groups and Lie algebras', 'Abstract algebra'] },
  { name: 'Algebraic geometry',                     tier: 4, category: 'Algebra & Number Theory', prereqs: ['Galois theory', 'Complex analysis'] },
  // Topology & Geometry
  { name: 'General topology',                       tier: 2, category: 'Topology & Geometry', prereqs: ['Metric spaces'] },
  { name: 'Algebraic topology',                     tier: 3, category: 'Topology & Geometry', prereqs: ['General topology', 'Abstract algebra'] },
  { name: 'Topological data analysis',              tier: 4, category: 'Topology & Geometry', prereqs: ['Algebraic topology', 'Statistics'] },
  // Optimization
  { name: 'Linear optimization',                    tier: 1, category: 'Optimization', prereqs: ['Linear algebra'] },
  { name: 'Nonlinear optimization',                 tier: 2, category: 'Optimization', prereqs: ['Linear optimization'] },
  { name: 'Dynamic optimization',                   tier: 2, category: 'Optimization', prereqs: ['Linear optimization', 'ODE'] },
  { name: 'Operations research',                    tier: 2, category: 'Optimization', prereqs: ['Linear optimization'] },
  { name: 'Combinatorial optimization',             tier: 3, category: 'Optimization', prereqs: ['Graph theory', 'Linear optimization'] },
  // Stochastic & Computational
  { name: 'Computational inverse problems',         tier: 3, category: 'Stochastic & Computational Methods', prereqs: ['Numerical analysis', 'PDE'] },
  { name: 'Quantum probability',                    tier: 4, category: 'Stochastic & Computational Methods', prereqs: ['Hilbert spaces', 'Probability theory'] },
]

// ── COMPUTER SCIENCE ──────────────────────────────────────────────────────────
const COMPUTER_SCIENCE: TopicDef[] = [
  // Theory
  { name: 'Basics of programming',               tier: 0, category: 'Theory', prereqs: [] },
  { name: 'Data structures and algorithms',      tier: 1, category: 'Theory', prereqs: ['Basics of programming'] },
  { name: 'Theory of computation',               tier: 1, category: 'Theory', prereqs: [] },
  { name: 'Computer architecture',               tier: 1, category: 'Theory', prereqs: [] },
  { name: 'Databases',                           tier: 1, category: 'Theory', prereqs: [] },
  { name: 'Operating systems',                   tier: 2, category: 'Theory', prereqs: ['Computer architecture'] },
  { name: 'Software Design and Modelling',       tier: 2, category: 'Theory', prereqs: [] },
  { name: 'Web Software Development',            tier: 2, category: 'Theory', prereqs: ['Basics of programming'] },
  { name: 'Software Engineering',                tier: 2, category: 'Theory', prereqs: [] },
  { name: 'Artificial Intelligence',             tier: 2, category: 'Theory', prereqs: ['Data structures and algorithms'] },
  { name: 'Information Security',                tier: 2, category: 'Theory', prereqs: [] },
  { name: 'Principles of Algorithmic Techniques',tier: 2, category: 'Theory', prereqs: ['Data structures and algorithms'] },
  { name: 'Computer networks',                   tier: 2, category: 'Theory', prereqs: [] },
  { name: 'Declarative Programming',             tier: 2, category: 'Theory', prereqs: [] },
  { name: 'Requirements Engineering',            tier: 2, category: 'Theory', prereqs: ['Software Engineering'] },
  { name: 'Testing',                             tier: 2, category: 'Theory', prereqs: ['Software Engineering'] },
  { name: 'Cloud Software and Systems',          tier: 3, category: 'Theory', prereqs: [] },
  { name: 'Cybersecurity',                       tier: 3, category: 'Theory', prereqs: ['Information Security', 'Computer networks'] },
  { name: 'Computational complexity',            tier: 3, category: 'Theory', prereqs: ['Theory of computation', 'Principles of Algorithmic Techniques'] },
  { name: 'Supervised Machine Learning',         tier: 3, category: 'Theory', prereqs: ['Artificial Intelligence'] },
  { name: 'Combinatorics of Computation',        tier: 3, category: 'Theory', prereqs: ['Computational complexity'] },
  { name: 'Scalable Systems and Data Management',tier: 3, category: 'Theory', prereqs: ['Databases', 'Cloud Software and Systems'] },
  { name: 'Data Mining',                         tier: 3, category: 'Theory', prereqs: ['Databases'] },
  { name: 'Security Engineering',                tier: 3, category: 'Theory', prereqs: ['Cybersecurity', 'Software Engineering'] },
  { name: 'Bayesian Data Analysis',              tier: 3, category: 'Theory', prereqs: ['Supervised Machine Learning'] },
  { name: 'Convex Optimization',                 tier: 3, category: 'Theory', prereqs: ['Principles of Algorithmic Techniques'] },
  { name: 'Cross-Platform Development',          tier: 3, category: 'Theory', prereqs: ['Web Software Development'] },
  { name: 'Unsupervised learning',               tier: 3, category: 'Theory', prereqs: ['Supervised Machine Learning'] },
  { name: 'Compiler design',                     tier: 3, category: 'Theory', prereqs: ['Theory of computation', 'Basics of programming'] },
  { name: 'Programming Parallel Computers',      tier: 3, category: 'Theory', prereqs: ['Operating systems', 'Computer architecture'] },
  { name: 'Deep Learning',                       tier: 4, category: 'Theory', prereqs: ['Supervised Machine Learning'] },
  { name: 'Reinforcement Learning',              tier: 4, category: 'Theory', prereqs: ['Supervised Machine Learning'] },
  { name: 'Deep Generative Models',              tier: 4, category: 'Theory', prereqs: ['Deep Learning'] },
  { name: 'Probabilistic Machine Learning',      tier: 4, category: 'Theory', prereqs: ['Bayesian Data Analysis'] },
  { name: 'Gaussian Processes',                  tier: 4, category: 'Theory', prereqs: ['Bayesian Data Analysis'] },
  { name: 'Computer Vision',                     tier: 4, category: 'Theory', prereqs: ['Deep Learning'] },
  { name: 'Large Scale Data Analysis',           tier: 4, category: 'Theory', prereqs: ['Scalable Systems and Data Management'] },
  { name: 'Distributed Machine learning',        tier: 4, category: 'Theory', prereqs: ['Deep Learning', 'Cloud Software and Systems'] },
  { name: 'Federated Learning',                  tier: 4, category: 'Theory', prereqs: ['Deep Learning', 'Distributed Machine learning'] },
  { name: 'LLMs',                                tier: 5, category: 'Theory', prereqs: ['Deep Learning', 'Probabilistic Machine Learning'] },
  // Languages
  { name: 'Python',      tier: 0, category: 'Languages', prereqs: [] },
  { name: 'C',           tier: 0, category: 'Languages', prereqs: [] },
  { name: 'C++',         tier: 0, category: 'Languages', prereqs: [] },
  { name: 'C#',          tier: 0, category: 'Languages', prereqs: [] },
  { name: 'JavaScript',  tier: 0, category: 'Languages', prereqs: [] },
  { name: 'SQL',         tier: 0, category: 'Languages', prereqs: [] },
  { name: 'TypeScript',  tier: 0, category: 'Languages', prereqs: [] },
  { name: 'Rust',        tier: 0, category: 'Languages', prereqs: [] },
  { name: 'R',           tier: 0, category: 'Languages', prereqs: [] },
  { name: 'Power Query', tier: 0, category: 'Languages', prereqs: [] },
  { name: 'Pandas',      tier: 1, category: 'Languages', prereqs: ['Python'] },
  { name: 'NumPy',       tier: 1, category: 'Languages', prereqs: ['Python'] },
  { name: 'PyTorch',     tier: 1, category: 'Languages', prereqs: ['Python'] },
  { name: 'TensorFlow',  tier: 1, category: 'Languages', prereqs: ['Python'] },
  { name: 'scikit-learn',tier: 1, category: 'Languages', prereqs: ['Python'] },
  // Technologies
  { name: 'Git Control', tier: 0, category: 'Technologies', prereqs: [] },
  { name: 'AWS',         tier: 1, category: 'Technologies', prereqs: ['Cloud Software and Systems'] },
  { name: 'Azure',       tier: 1, category: 'Technologies', prereqs: ['Cloud Software and Systems'] },
  { name: 'Node.js',     tier: 1, category: 'Technologies', prereqs: ['JavaScript'] },
  { name: 'React',       tier: 1, category: 'Technologies', prereqs: ['JavaScript', 'Web Software Development'] },
  { name: 'Next.js',     tier: 1, category: 'Technologies', prereqs: ['React', 'TypeScript'] },
  { name: 'GraphQL',     tier: 1, category: 'Technologies', prereqs: ['Web Software Development'] },
  { name: 'MySQL',       tier: 1, category: 'Technologies', prereqs: ['Databases'] },
  { name: 'PostgreSQL',  tier: 1, category: 'Technologies', prereqs: ['Databases'] },
  { name: 'BigQuery',    tier: 2, category: 'Technologies', prereqs: ['Databases', 'Cloud Software and Systems'] },
  { name: 'Qlik Sense',  tier: 1, category: 'Technologies', prereqs: ['Databases'] },
  { name: 'ETL/ELT',     tier: 2, category: 'Technologies', prereqs: ['Databases'] },
  { name: 'Fabric',      tier: 2, category: 'Technologies', prereqs: ['Cloud Software and Systems', 'Databases'] },
  { name: 'CI/CD',       tier: 2, category: 'Technologies', prereqs: ['Software Engineering', 'Cloud Software and Systems'] },
]

// ── FINANCE (Fix 6) ───────────────────────────────────────────────────────────
const FINANCE: TopicDef[] = [
  // Foundations
  { name: 'Fundamentals of Corporate Finance',                tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Fundamentals of Investments',                      tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Fundamentals of Financial Markets and Institutions', tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Personal Finance',                                 tier: 0, category: 'Foundations', prereqs: [] },
  // Corporate Finance
  { name: 'Mergers and Acquisitions',                         tier: 2, category: 'Corporate Finance', prereqs: ['Fundamentals of Corporate Finance'] },
  { name: 'Advanced Corporate Finance',                       tier: 2, category: 'Corporate Finance', prereqs: ['Fundamentals of Corporate Finance'] },
  { name: 'Entrepreneurial Finance',                          tier: 2, category: 'Corporate Finance', prereqs: ['Fundamentals of Corporate Finance'] },
  { name: 'Corporate Governance',                             tier: 2, category: 'Corporate Finance', prereqs: ['Advanced Corporate Finance'] },
  { name: 'Real Estate Finance',                              tier: 2, category: 'Corporate Finance', prereqs: ['Fundamentals of Corporate Finance'] },
  { name: 'Startup Finance',                                  tier: 2, category: 'Corporate Finance', prereqs: ['Entrepreneurial Finance'] },
  { name: 'Financial Modeling in Strategy and Venturing',     tier: 3, category: 'Corporate Finance', prereqs: ['Advanced Corporate Finance'] },
  // Investments
  { name: 'Derivatives and Fixed Income',                     tier: 1, category: 'Investments', prereqs: ['Fundamentals of Investments'] },
  { name: 'Alternative Investments',                          tier: 1, category: 'Investments', prereqs: ['Fundamentals of Investments'] },
  { name: 'Advanced Investments',                             tier: 2, category: 'Investments', prereqs: ['Derivatives and Fixed Income'] },
  { name: 'Portfolio Management',                             tier: 2, category: 'Investments', prereqs: ['Fundamentals of Investments'] },
  { name: 'Theoretical Asset Pricing',                        tier: 3, category: 'Investments', prereqs: ['Advanced Investments', 'Portfolio Management'] },
  { name: 'Private Equity and Venture Capital',               tier: 2, category: 'Investments', prereqs: ['Alternative Investments', 'Entrepreneurial Finance'] },
  // Risk Management
  { name: 'Fundamentals of Financial Risk Management',        tier: 1, category: 'Risk Management', prereqs: ['Fundamentals of Investments'] },
  { name: 'Advanced Financial Risk Management',               tier: 2, category: 'Risk Management', prereqs: ['Fundamentals of Financial Risk Management'] },
  { name: 'Quantitative Risk Management',                     tier: 3, category: 'Risk Management', prereqs: ['Advanced Financial Risk Management'] },
  { name: 'Machine Learning in Financial Risk Management',    tier: 4, category: 'Risk Management', prereqs: ['Quantitative Risk Management', 'Supervised Machine Learning from CS'] },
  // Quantitative Finance
  { name: 'Options Pricing Theory',                           tier: 3, category: 'Quantitative Finance', prereqs: ['Derivatives and Fixed Income', 'Stochastic processes from Math'] },
  { name: 'Algorithmic Trading',                              tier: 3, category: 'Quantitative Finance', prereqs: ['Financial Markets', 'Supervised Machine Learning from CS'] },
  { name: 'High-Frequency Trading',                           tier: 4, category: 'Quantitative Finance', prereqs: ['Algorithmic Trading'] },
  { name: 'Systematic Investment Strategies',                 tier: 4, category: 'Quantitative Finance', prereqs: ['Algorithmic Trading', 'Portfolio Management'] },
  // Specializations
  { name: 'Financial Markets',                                tier: 1, category: 'Specializations', prereqs: ['Fundamentals of Financial Markets and Institutions'] },
  { name: 'Advances in Financial Technology',                 tier: 2, category: 'Specializations', prereqs: ['Fundamentals of Financial Markets and Institutions'] },
  { name: 'Fintech',                                          tier: 2, category: 'Specializations', prereqs: ['Advances in Financial Technology'] },
]

// ── ECONOMICS (Fix 5) ─────────────────────────────────────────────────────────
const ECONOMICS: TopicDef[] = [
  // Foundations
  { name: 'Economics of Global Challenges',                   tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Basics of microeconomics',                         tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Basics of macroeconomics',                         tier: 0, category: 'Foundations', prereqs: [] },
  // Microeconomics
  { name: 'Advanced microeconomics',                          tier: 1, category: 'Microeconomics', prereqs: ['Basics of microeconomics'] },
  { name: 'Personnel Economics',                              tier: 2, category: 'Microeconomics', prereqs: ['Advanced microeconomics'] },
  { name: 'Competition and Market Strategy',                  tier: 2, category: 'Microeconomics', prereqs: ['Advanced microeconomics'] },
  { name: 'Economics of Strategy',                            tier: 2, category: 'Microeconomics', prereqs: ['Game Theory'] },
  { name: 'Economics of Organisation and Information',        tier: 2, category: 'Microeconomics', prereqs: ['Advanced microeconomics'] },
  { name: 'Microeconomics Pricing',                           tier: 2, category: 'Microeconomics', prereqs: ['Advanced microeconomics'] },
  { name: 'Real Estate Economics',                            tier: 3, category: 'Microeconomics', prereqs: ['Advanced microeconomics'] },
  { name: 'Industrial organization',                          tier: 3, category: 'Microeconomics', prereqs: ['Competition and Market Strategy'] },
  { name: 'Information economics',                            tier: 3, category: 'Microeconomics', prereqs: ['Economics of Organisation and Information'] },
  { name: 'General equilibrium theory',                       tier: 3, category: 'Microeconomics', prereqs: ['Advanced microeconomics', 'Advanced macroeconomics'] },
  // Macroeconomics
  { name: 'Advanced macroeconomics',                          tier: 1, category: 'Macroeconomics', prereqs: ['Basics of macroeconomics'] },
  { name: 'Money and Banking Theory',                         tier: 2, category: 'Macroeconomics', prereqs: ['Basics of macroeconomics'] },
  { name: 'International trade',                              tier: 2, category: 'Macroeconomics', prereqs: ['Basics of macroeconomics', 'Basics of microeconomics'] },
  { name: 'Macroeconomics Policy',                            tier: 2, category: 'Macroeconomics', prereqs: ['Advanced macroeconomics'] },
  { name: 'Economic growth theory',                           tier: 3, category: 'Macroeconomics', prereqs: ['Advanced macroeconomics'] },
  // Quantitative Methods
  { name: 'Econometrics',                                     tier: 1, category: 'Quantitative Methods', prereqs: ['Basics of microeconomics', 'Statistics from Math'] },
  { name: 'Game Theory',                                      tier: 1, category: 'Quantitative Methods', prereqs: ['Basics of microeconomics'] },
  { name: 'Algorithmic game theory',                          tier: 2, category: 'Quantitative Methods', prereqs: ['Game Theory'] },
  { name: 'Computational economics',                          tier: 3, category: 'Quantitative Methods', prereqs: ['Algorithmic game theory', 'Econometrics'] },
  // Specializations
  { name: 'Matching theory',                                  tier: 3, category: 'Specializations', prereqs: ['Game Theory'] },
  { name: 'Market design',                                    tier: 3, category: 'Specializations', prereqs: ['Matching theory', 'Game Theory'] },
]

// ── QUANTUM MECHANICS ─────────────────────────────────────────────────────────
const QUANTUM_MECHANICS: TopicDef[] = [
  { name: 'Quantum mechanics basics',      tier: 0, category: 'Fundamentals',      prereqs: [] },
  { name: 'Special relativity',            tier: 0, category: 'Fundamentals',      prereqs: [] },
  { name: 'Advanced quantum mechanics',    tier: 1, category: 'Fundamentals',      prereqs: ['Quantum mechanics basics'] },
  { name: 'Semiconductor physics',         tier: 1, category: 'Quantum Physics',   prereqs: ['Quantum mechanics basics'] },
  { name: 'General relativity',            tier: 2, category: 'Quantum Physics',   prereqs: ['Special relativity', 'Advanced quantum mechanics'] },
  { name: 'Quantum Information',           tier: 2, category: 'Quantum Computing', prereqs: ['Advanced quantum mechanics'] },
  { name: 'Quantum Circuits',              tier: 2, category: 'Quantum Computing', prereqs: ['Quantum Information'] },
  { name: 'Quantum Computing',             tier: 3, category: 'Quantum Computing', prereqs: ['Quantum Circuits', 'Quantum Information'] },
  { name: 'Quantum error correction',      tier: 3, category: 'Quantum Computing', prereqs: ['Quantum Computing'] },
  { name: 'Programming quantum computers', tier: 3, category: 'Quantum Computing', prereqs: ['Quantum Computing'] },
  { name: 'Quantum Machine Learning',      tier: 4, category: 'Quantum Computing', prereqs: ['Quantum Computing'] },
  { name: 'Superconductivity',             tier: 2, category: 'Quantum Materials', prereqs: ['Semiconductor physics', 'Advanced quantum mechanics'] },
  { name: 'Quantum Materials',             tier: 3, category: 'Quantum Materials', prereqs: ['Superconductivity'] },
]

// ── OTHERS (Fix 3) ────────────────────────────────────────────────────────────
const OTHERS: TopicDef[] = [
  { name: 'History',               tier: 0, category: 'General', prereqs: [] },
  { name: 'Philosophy',            tier: 0, category: 'General', prereqs: [] },
  { name: 'Neuroplasticity',       tier: 0, category: 'General', prereqs: [] },
  { name: 'Strategic Management',  tier: 0, category: 'General', prereqs: [] },
  { name: 'Operations Management', tier: 0, category: 'General', prereqs: [] },
  { name: 'Product Management',    tier: 0, category: 'General', prereqs: [] },
  { name: 'Entrepreneurship',      tier: 0, category: 'General', prereqs: [] },
  { name: 'Business Analytics',    tier: 0, category: 'General', prereqs: [] },
  { name: 'Physics',               tier: 0, category: 'General', prereqs: [] },
]

// ── Seeder ────────────────────────────────────────────────────────────────────

async function seedAllSubjects() {
  // Global name→id map for cross-subject prereq resolution
  const globalNameToId = new Map<string, string>()

  const ALL_SUBJECTS: [string, TopicDef[]][] = [
    ['Mathematics',     MATHEMATICS],
    ['ComputerScience', COMPUTER_SCIENCE],
    ['Finance',         FINANCE],
    ['Economics',       ECONOMICS],
    ['QuantumMechanics', QUANTUM_MECHANICS],
    ['Others',          OTHERS],
  ]

  // Phase 1: create all nodes
  for (const [subject, topics] of ALL_SUBJECTS) {
    for (const t of topics) {
      const node = await prisma.skillNode.create({
        data: {
          name: t.name, subject,
          category: t.category, tier: t.tier,
          status: t.tier === 0 ? 'unlocked' : 'locked',
          masteryLevel: 0,
          xpValue: (t.tier + 1) * 100,
        },
      })
      globalNameToId.set(t.name, node.id)
    }
    console.log(`  ✓ ${subject}: ${topics.length} nodes created`)
  }

  // Phase 2: create all dependencies (resolves cross-subject refs)
  let depCount = 0
  for (const [, topics] of ALL_SUBJECTS) {
    for (const t of topics) {
      const depId = globalNameToId.get(t.name)!
      for (const prereqRef of t.prereqs) {
        const prereqName = resolvePrereq(prereqRef)
        const prereqId = globalNameToId.get(prereqName)
        if (!prereqId) { console.warn(`  ⚠ Missing prereq "${prereqRef}" for "${t.name}"`); continue }
        await prisma.skillDependency.create({ data: { prerequisiteId: prereqId, dependentId: depId } })
        depCount++
      }
    }
  }
  console.log(`  ✓ ${depCount} dependencies created`)
}

async function seedCourses() {
  const courses = [
    { code: 'MATH 301', name: 'Real Analysis',       subject: 'Mathematics',      semester: 'Spring', year: 2025, status: 'active' },
    { code: 'CS 401',   name: 'Machine Learning',    subject: 'ComputerScience',  semester: 'Spring', year: 2025, status: 'active' },
    { code: 'FIN 301',  name: 'Corporate Finance',   subject: 'Finance',           semester: 'Spring', year: 2025, status: 'active' },
    { code: 'ECON 201', name: 'Intermediate Micro',  subject: 'Economics',         semester: 'Fall',   year: 2024, status: 'completed' },
    { code: 'PHYS 401', name: 'Quantum Mechanics I', subject: 'QuantumMechanics', semester: 'Spring', year: 2025, status: 'active' },
  ]
  for (const c of courses) await prisma.course.create({ data: c })
  console.log(`  ✓ ${courses.length} courses seeded`)
}

async function seedSessions() {
  const ago = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }
  await prisma.sessionLog.createMany({ data: [
    { rawNote: 'Real analysis — sequences and limits', durationMins: 60, xpEarned: 20, loggedAt: ago(2) },
    { rawNote: 'ML gradient descent examples',          durationMins: 90, xpEarned: 30, loggedAt: ago(1) },
    { rawNote: 'Quantum mechanics postulates',          durationMins: 45, xpEarned: 15, loggedAt: ago(0) },
  ]})
  console.log('  ✓ Session logs seeded')
}

async function seedLearningPaths() {
  // Resolve topic IDs by name
  const allNodes = await prisma.skillNode.findMany({ select: { id: true, name: true, subject: true } })
  const byName = (subject: string, name: string) =>
    allNodes.find(n => n.subject === subject && n.name === name)?.id

  const paths: { name: string; subject: string; goal: string; topics: { name: string; hours: number }[] }[] = [
    {
      name: 'Machine Learning for Beginners', subject: 'ComputerScience',
      goal: 'Build a foundation in machine learning from programming basics',
      topics: [
        { name: 'Basics of programming', hours: 20 },
        { name: 'Python', hours: 15 },
        { name: 'Data structures and algorithms', hours: 25 },
        { name: 'Artificial Intelligence', hours: 20 },
        { name: 'Supervised Machine Learning', hours: 30 },
        { name: 'Deep Learning', hours: 40 },
      ],
    },
    {
      name: 'Quantum Computing 101', subject: 'QuantumMechanics',
      goal: 'Understand the fundamentals of quantum computing',
      topics: [
        { name: 'Quantum mechanics basics', hours: 30 },
        { name: 'Advanced quantum mechanics', hours: 35 },
        { name: 'Quantum Information', hours: 25 },
        { name: 'Quantum Circuits', hours: 25 },
        { name: 'Quantum Computing', hours: 40 },
      ],
    },
    {
      name: 'Real Analysis Track', subject: 'Mathematics',
      goal: 'Master rigorous mathematical analysis',
      topics: [
        { name: 'Differential calculus', hours: 20 },
        { name: 'Integral calculus', hours: 20 },
        { name: 'Linear algebra', hours: 25 },
        { name: 'Real analysis', hours: 40 },
        { name: 'Metric spaces', hours: 30 },
      ],
    },
    {
      name: 'Corporate Finance Essentials', subject: 'Finance',
      goal: 'Learn the core of corporate finance and valuation',
      topics: [
        { name: 'Fundamentals of Corporate Finance', hours: 25 },
        { name: 'Advanced Corporate Finance', hours: 30 },
        { name: 'Mergers and Acquisitions', hours: 25 },
      ],
    },
    {
      name: 'Game Theory Foundations', subject: 'Economics',
      goal: 'Build up to strategic and mechanism design thinking',
      topics: [
        { name: 'Basics of microeconomics', hours: 20 },
        { name: 'Game Theory', hours: 30 },
        { name: 'Algorithmic game theory', hours: 35 },
      ],
    },
  ]

  let count = 0
  for (const p of paths) {
    const topicIds: string[] = []
    const estimatedHours: Record<string, number> = {}
    for (const t of p.topics) {
      const id = byName(p.subject, t.name)
      if (!id) { console.warn(`  ⚠ Path topic not found: ${p.subject}/${t.name}`); continue }
      topicIds.push(id)
      estimatedHours[id] = t.hours
    }
    if (topicIds.length === 0) continue
    await prisma.learningPath.create({
      data: {
        name: p.name, subject: p.subject, goalDescription: p.goal,
        topics: topicIds, estimatedHours, pinned: false,
      },
    })
    count++
  }
  console.log(`  ✓ ${count} example learning paths seeded`)
}

async function main() {
  console.log('🌱 Seeding StudyQuest database...')

  await prisma.socraticSession.deleteMany()
  await prisma.textbookChapter.deleteMany()
  await prisma.researchPaper.deleteMany()
  await prisma.teachSession.deleteMany()
  await prisma.debateSession.deleteMany()
  await prisma.conceptMapValidation.deleteMany()
  await prisma.conceptMap.deleteMany()
  await prisma.studySession.deleteMany()
  await prisma.learningPath.deleteMany()
  await prisma.skillDependency.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.sessionLog.deleteMany()
  await prisma.deadline.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.quizResult.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.skillNode.deleteMany()
  await prisma.course.deleteMany()

  await seedAllSubjects()
  await seedCourses()
  await seedSessions()
  await seedLearningPaths()

  await prisma.achievement.createMany({ data: [
    { name: 'First Star',     condition: 'Rate your first topic' },
    { name: 'On a Roll',      condition: 'Rate 10 topics ≥3 stars' },
    { name: 'Tier 2 Reached', condition: 'Unlock a Tier 2 topic' },
    { name: 'Polymath',       condition: 'Rate topics in 3 subjects' },
    { name: 'Mastery',        condition: 'Achieve 5 stars on any topic' },
  ]})

  // Run cascade unlock so Tier-0 nodes with no prereqs are properly unlocked
  // and any cross-subject prereqs that were already satisfied get propagated
  console.log('  Running cascade unlock...')
  const unlocked = await cascadeUnlock()
  console.log(`  ✓ ${unlocked} nodes unlocked by cascade`)

  console.log('\n✅ Seed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
