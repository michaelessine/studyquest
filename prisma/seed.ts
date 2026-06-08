/**
 * Seed — topic-based skill tree with categories, tiers, and mastery fields.
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TopicDef = { name: string; tier: number; category: string; prereqs: string[] }

// ── MATHEMATICS ───────────────────────────────────────────────────────────────
const MATHEMATICS: TopicDef[] = [
  // Calculus & Analysis
  { name: 'Differential calculus',              tier: 0, category: 'Calculus & Analysis',          prereqs: [] },
  { name: 'Integral calculus',                  tier: 0, category: 'Calculus & Analysis',          prereqs: [] },
  { name: 'ODE',                                tier: 1, category: 'Calculus & Analysis',          prereqs: ['Differential calculus', 'Integral calculus'] },
  { name: 'Multivariable calculus',             tier: 1, category: 'Calculus & Analysis',          prereqs: ['Integral calculus'] },
  { name: 'Real analysis',                      tier: 1, category: 'Calculus & Analysis',          prereqs: ['Integral calculus', 'Linear algebra'] },
  { name: 'Metric spaces',                      tier: 1, category: 'Calculus & Analysis',          prereqs: ['Real analysis'] },
  { name: 'PDE',                                tier: 2, category: 'Calculus & Analysis',          prereqs: ['ODE', 'Multivariable calculus'] },
  { name: 'Complex analysis',                   tier: 2, category: 'Calculus & Analysis',          prereqs: ['Real analysis'] },
  { name: 'Fourier analysis',                   tier: 2, category: 'Calculus & Analysis',          prereqs: ['PDE', 'Real analysis'] },
  { name: 'Measure and integral',               tier: 2, category: 'Calculus & Analysis',          prereqs: ['Real analysis'] },
  { name: 'Functional analysis',               tier: 3, category: 'Calculus & Analysis',          prereqs: ['Measure and integral', 'Metric spaces'] },
  { name: 'Hilbert spaces',                     tier: 3, category: 'Calculus & Analysis',          prereqs: ['Functional analysis'] },
  { name: 'Banach spaces',                      tier: 3, category: 'Calculus & Analysis',          prereqs: ['Functional analysis'] },
  { name: 'Harmonic analysis',                  tier: 3, category: 'Calculus & Analysis',          prereqs: ['Fourier analysis', 'Measure and integral'] },
  { name: 'Variational calculus',               tier: 3, category: 'Calculus & Analysis',          prereqs: ['ODE', 'Multivariable calculus'] },
  { name: 'Spectral theory',                    tier: 4, category: 'Calculus & Analysis',          prereqs: ['Hilbert spaces', 'Functional analysis'] },
  // Linear Algebra & Matrix Theory
  { name: 'Linear algebra',                     tier: 0, category: 'Linear Algebra & Matrix Theory', prereqs: [] },
  { name: 'Matrix theory',                      tier: 1, category: 'Linear Algebra & Matrix Theory', prereqs: ['Linear algebra'] },
  { name: 'Numerical analysis',                 tier: 1, category: 'Linear Algebra & Matrix Theory', prereqs: ['Linear algebra', 'Integral calculus'] },
  { name: 'Differential geometry',              tier: 2, category: 'Linear Algebra & Matrix Theory', prereqs: ['Multivariable calculus', 'Linear algebra'] },
  { name: 'Numerical matrix computations',      tier: 2, category: 'Linear Algebra & Matrix Theory', prereqs: ['Numerical analysis', 'Matrix theory'] },
  { name: 'Random matrix theory',               tier: 4, category: 'Linear Algebra & Matrix Theory', prereqs: ['High-dimensional probability', 'Matrix theory'] },
  // Probability & Statistics
  { name: 'Probability theory',                 tier: 0, category: 'Probability & Statistics',    prereqs: [] },
  { name: 'Statistics',                         tier: 0, category: 'Probability & Statistics',    prereqs: [] },
  { name: 'Risk analysis',                      tier: 2, category: 'Probability & Statistics',    prereqs: ['Probability theory', 'Statistics'] },
  { name: 'Stochastic processes',               tier: 2, category: 'Probability & Statistics',    prereqs: ['Probability theory', 'Real analysis'] },
  { name: 'Multivariate statistical analysis',  tier: 2, category: 'Probability & Statistics',    prereqs: ['Statistics', 'Linear algebra'] },
  { name: 'Time series analysis',               tier: 2, category: 'Probability & Statistics',    prereqs: ['Statistics', 'Stochastic processes'] },
  { name: 'High-dimensional probability',       tier: 3, category: 'Probability & Statistics',    prereqs: ['Measure and integral', 'Stochastic processes'] },
  { name: 'High-dimensional statistics',        tier: 3, category: 'Probability & Statistics',    prereqs: ['Multivariate statistical analysis', 'High-dimensional probability'] },
  { name: 'Brownian motion and stochastic analysis', tier: 3, category: 'Probability & Statistics', prereqs: ['Stochastic processes', 'Measure and integral'] },
  { name: 'Computational methods in stochastics', tier: 3, category: 'Probability & Statistics',  prereqs: ['Stochastic processes', 'Numerical analysis'] },
  { name: 'Mathematical finance theory',        tier: 4, category: 'Probability & Statistics',    prereqs: ['Stochastic processes', 'Measure and integral'] },
  // Algebra & Number Theory
  { name: 'Discrete mathematics',               tier: 0, category: 'Algebra & Number Theory',     prereqs: [] },
  { name: 'Number theory',                      tier: 0, category: 'Algebra & Number Theory',     prereqs: [] },
  { name: 'Combinatorics',                      tier: 0, category: 'Algebra & Number Theory',     prereqs: [] },
  { name: 'Abstract algebra',                   tier: 1, category: 'Algebra & Number Theory',     prereqs: ['Discrete mathematics'] },
  { name: 'Graph theory',                       tier: 1, category: 'Algebra & Number Theory',     prereqs: ['Discrete mathematics'] },
  { name: 'Cryptography',                       tier: 2, category: 'Algebra & Number Theory',     prereqs: ['Number theory', 'Abstract algebra'] },
  { name: 'Galois theory',                      tier: 3, category: 'Algebra & Number Theory',     prereqs: ['Abstract algebra'] },
  { name: 'Lie groups and Lie algebras',        tier: 3, category: 'Algebra & Number Theory',     prereqs: ['Abstract algebra', 'Differential geometry'] },
  { name: 'Representation theory',              tier: 4, category: 'Algebra & Number Theory',     prereqs: ['Lie groups and Lie algebras', 'Abstract algebra'] },
  { name: 'Algebraic geometry',                 tier: 4, category: 'Algebra & Number Theory',     prereqs: ['Galois theory', 'Complex analysis'] },
  // Topology & Geometry
  { name: 'General topology',                   tier: 2, category: 'Topology & Geometry',         prereqs: ['Metric spaces'] },
  { name: 'Algebraic topology',                 tier: 3, category: 'Topology & Geometry',         prereqs: ['General topology', 'Abstract algebra'] },
  { name: 'Topological data analysis',          tier: 4, category: 'Topology & Geometry',         prereqs: ['Algebraic topology', 'Statistics'] },
  // Optimization
  { name: 'Linear optimization',                tier: 1, category: 'Optimization',                prereqs: ['Linear algebra'] },
  { name: 'Nonlinear optimization',             tier: 2, category: 'Optimization',                prereqs: ['Linear optimization'] },
  { name: 'Dynamic optimization',               tier: 2, category: 'Optimization',                prereqs: ['Linear optimization', 'ODE'] },
  { name: 'Operations research',                tier: 2, category: 'Optimization',                prereqs: ['Linear optimization'] },
  { name: 'Combinatorial optimization',         tier: 3, category: 'Optimization',                prereqs: ['Graph theory', 'Linear optimization'] },
  // Stochastic & Computational Methods
  { name: 'Computational inverse problems',     tier: 3, category: 'Stochastic & Computational Methods', prereqs: ['Numerical analysis', 'PDE'] },
  { name: 'Quantum probability',                tier: 4, category: 'Stochastic & Computational Methods', prereqs: ['Hilbert spaces', 'Probability theory'] },
]

// ── COMPUTER SCIENCE ──────────────────────────────────────────────────────────
const COMPUTER_SCIENCE: TopicDef[] = [
  // THEORY
  { name: 'Basics of programming',              tier: 0, category: 'Theory',    prereqs: [] },
  { name: 'Data structures and algorithms',     tier: 1, category: 'Theory',    prereqs: ['Basics of programming'] },
  { name: 'Theory of computation',              tier: 1, category: 'Theory',    prereqs: [] },
  { name: 'Computer architecture',              tier: 1, category: 'Theory',    prereqs: [] },
  { name: 'Databases',                          tier: 1, category: 'Theory',    prereqs: [] },
  { name: 'Operating systems',                  tier: 2, category: 'Theory',    prereqs: ['Computer architecture'] },
  { name: 'Software Design and Modelling',      tier: 2, category: 'Theory',    prereqs: [] },
  { name: 'Web Software Development',           tier: 2, category: 'Theory',    prereqs: ['Basics of programming'] },
  { name: 'Software Engineering',               tier: 2, category: 'Theory',    prereqs: [] },
  { name: 'Artificial Intelligence',            tier: 2, category: 'Theory',    prereqs: ['Data structures and algorithms'] },
  { name: 'Information Security',               tier: 2, category: 'Theory',    prereqs: [] },
  { name: 'Principles of Algorithmic Techniques', tier: 2, category: 'Theory', prereqs: ['Data structures and algorithms'] },
  { name: 'Computer networks',                  tier: 2, category: 'Theory',    prereqs: [] },
  { name: 'Declarative Programming',            tier: 2, category: 'Theory',    prereqs: [] },
  { name: 'Requirements Engineering',           tier: 2, category: 'Theory',    prereqs: ['Software Engineering'] },
  { name: 'Testing',                            tier: 2, category: 'Theory',    prereqs: ['Software Engineering'] },
  { name: 'Cloud Software and Systems',         tier: 3, category: 'Theory',    prereqs: [] },
  { name: 'Cybersecurity',                      tier: 3, category: 'Theory',    prereqs: ['Information Security', 'Computer networks'] },
  { name: 'Computational complexity',           tier: 3, category: 'Theory',    prereqs: ['Theory of computation', 'Principles of Algorithmic Techniques'] },
  { name: 'Supervised Machine Learning',        tier: 3, category: 'Theory',    prereqs: ['Artificial Intelligence'] },
  { name: 'Combinatorics of Computation',       tier: 3, category: 'Theory',    prereqs: ['Computational complexity'] },
  { name: 'Scalable Systems and Data Management', tier: 3, category: 'Theory',  prereqs: ['Databases', 'Cloud Software and Systems'] },
  { name: 'Data Mining',                        tier: 3, category: 'Theory',    prereqs: ['Databases'] },
  { name: 'Security Engineering',               tier: 3, category: 'Theory',    prereqs: ['Cybersecurity', 'Software Engineering'] },
  { name: 'Bayesian Data Analysis',             tier: 3, category: 'Theory',    prereqs: ['Supervised Machine Learning'] },
  { name: 'Convex Optimization',                tier: 3, category: 'Theory',    prereqs: ['Principles of Algorithmic Techniques'] },
  { name: 'Cross-Platform Development',         tier: 3, category: 'Theory',    prereqs: ['Web Software Development'] },
  { name: 'Unsupervised learning',              tier: 3, category: 'Theory',    prereqs: ['Supervised Machine Learning'] },
  { name: 'Compiler design',                    tier: 3, category: 'Theory',    prereqs: ['Theory of computation', 'Basics of programming'] },
  { name: 'Programming Parallel Computers',     tier: 3, category: 'Theory',    prereqs: ['Operating systems', 'Computer architecture'] },
  { name: 'Deep Learning',                      tier: 4, category: 'Theory',    prereqs: ['Supervised Machine Learning'] },
  { name: 'Reinforcement Learning',             tier: 4, category: 'Theory',    prereqs: ['Supervised Machine Learning'] },
  { name: 'Deep Generative Models',             tier: 4, category: 'Theory',    prereqs: ['Deep Learning'] },
  { name: 'Probabilistic Machine Learning',     tier: 4, category: 'Theory',    prereqs: ['Bayesian Data Analysis'] },
  { name: 'Gaussian Processes',                 tier: 4, category: 'Theory',    prereqs: ['Bayesian Data Analysis'] },
  { name: 'Computer Vision',                    tier: 4, category: 'Theory',    prereqs: ['Deep Learning'] },
  { name: 'Large Scale Data Analysis',          tier: 4, category: 'Theory',    prereqs: ['Scalable Systems and Data Management'] },
  { name: 'Distributed Machine learning',       tier: 4, category: 'Theory',    prereqs: ['Deep Learning', 'Cloud Software and Systems'] },
  { name: 'Federated Learning',                 tier: 4, category: 'Theory',    prereqs: ['Deep Learning', 'Distributed Machine learning'] },
  { name: 'LLMs',                               tier: 5, category: 'Theory',    prereqs: ['Deep Learning', 'Probabilistic Machine Learning'] },
  // LANGUAGES
  { name: 'Python',                             tier: 0, category: 'Languages', prereqs: [] },
  { name: 'C',                                  tier: 0, category: 'Languages', prereqs: [] },
  { name: 'C++',                                tier: 0, category: 'Languages', prereqs: [] },
  { name: 'C#',                                 tier: 0, category: 'Languages', prereqs: [] },
  { name: 'JavaScript',                         tier: 0, category: 'Languages', prereqs: [] },
  { name: 'SQL',                                tier: 0, category: 'Languages', prereqs: [] },
  { name: 'TypeScript',                         tier: 0, category: 'Languages', prereqs: [] },
  { name: 'Rust',                               tier: 0, category: 'Languages', prereqs: [] },
  { name: 'Pandas',                             tier: 1, category: 'Languages', prereqs: ['Python'] },
  { name: 'NumPy',                              tier: 1, category: 'Languages', prereqs: ['Python'] },
  { name: 'PyTorch',                            tier: 1, category: 'Languages', prereqs: ['Python'] },
  { name: 'TensorFlow',                         tier: 1, category: 'Languages', prereqs: ['Python'] },
  { name: 'scikit-learn',                       tier: 1, category: 'Languages', prereqs: ['Python'] },
  // TECHNOLOGIES
  { name: 'Git Control',                        tier: 0, category: 'Technologies', prereqs: [] },
  { name: 'AWS',                                tier: 1, category: 'Technologies', prereqs: ['Cloud Software and Systems'] },
  { name: 'Azure',                              tier: 1, category: 'Technologies', prereqs: ['Cloud Software and Systems'] },
  { name: 'Node.js',                            tier: 1, category: 'Technologies', prereqs: ['JavaScript'] },
  { name: 'React',                              tier: 1, category: 'Technologies', prereqs: ['JavaScript', 'Web Software Development'] },
  { name: 'Next.js',                            tier: 1, category: 'Technologies', prereqs: ['React', 'TypeScript'] },
]

// ── FINANCE ───────────────────────────────────────────────────────────────────
const FINANCE: TopicDef[] = [
  // Foundations
  { name: 'Financial accounting',               tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Microeconomics',                     tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Macroeconomics',                     tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Statistics',                         tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Linear algebra',                     tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Calculus',                           tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Time value of money',                tier: 0, category: 'Foundations', prereqs: [] },
  { name: 'Probability theory',                 tier: 1, category: 'Foundations', prereqs: ['Statistics'] },
  // Corporate & Markets
  { name: 'Financial markets',                  tier: 1, category: 'Corporate & Markets', prereqs: ['Microeconomics', 'Financial accounting'] },
  { name: 'Corporate finance',                  tier: 1, category: 'Corporate & Markets', prereqs: ['Financial accounting', 'Time value of money'] },
  { name: 'Financial statement analysis',       tier: 1, category: 'Corporate & Markets', prereqs: ['Financial accounting'] },
  { name: 'Econometrics',                       tier: 1, category: 'Corporate & Markets', prereqs: ['Statistics', 'Linear algebra'] },
  { name: 'International finance',              tier: 2, category: 'Corporate & Markets', prereqs: ['Financial markets', 'Macroeconomics'] },
  { name: 'Financial modeling',                 tier: 2, category: 'Corporate & Markets', prereqs: ['Corporate finance', 'Financial statement analysis', 'Econometrics'] },
  { name: 'Financial regulation',               tier: 3, category: 'Corporate & Markets', prereqs: ['Financial markets', 'Corporate finance'] },
  { name: 'FinTech and digital assets',         tier: 4, category: 'Corporate & Markets', prereqs: ['Financial markets', 'Financial regulation'] },
  // Investments & Portfolio
  { name: 'Investments and portfolio theory',   tier: 1, category: 'Investments & Portfolio', prereqs: ['Statistics', 'Time value of money'] },
  { name: 'Fixed income securities',            tier: 1, category: 'Investments & Portfolio', prereqs: ['Time value of money', 'Financial markets'] },
  { name: 'Derivatives and options',            tier: 2, category: 'Investments & Portfolio', prereqs: ['Investments and portfolio theory', 'Calculus'] },
  { name: 'Asset pricing',                      tier: 2, category: 'Investments & Portfolio', prereqs: ['Investments and portfolio theory', 'Econometrics'] },
  { name: 'Behavioral finance',                 tier: 2, category: 'Investments & Portfolio', prereqs: ['Investments and portfolio theory', 'Microeconomics'] },
  { name: 'Alternative investments',            tier: 3, category: 'Investments & Portfolio', prereqs: ['Asset pricing', 'Risk management'] },
  { name: 'Private equity and venture capital', tier: 3, category: 'Investments & Portfolio', prereqs: ['Corporate finance', 'Financial modeling'] },
  // Risk & Quantitative
  { name: 'Risk management',                    tier: 2, category: 'Risk & Quantitative', prereqs: ['Investments and portfolio theory', 'Probability theory'] },
  { name: 'Credit risk',                        tier: 2, category: 'Risk & Quantitative', prereqs: ['Risk management', 'Fixed income securities'] },
  { name: 'Stochastic calculus',                tier: 3, category: 'Risk & Quantitative', prereqs: ['Calculus', 'Probability theory'] },
  { name: 'Options pricing theory',             tier: 3, category: 'Risk & Quantitative', prereqs: ['Derivatives and options', 'Stochastic calculus'] },
  { name: 'Quantitative risk management',       tier: 3, category: 'Risk & Quantitative', prereqs: ['Risk management', 'Econometrics'] },
  { name: 'Structured products',                tier: 4, category: 'Risk & Quantitative', prereqs: ['Options pricing theory', 'Credit risk'] },
  // Trading & Technology
  { name: 'Market microstructure',              tier: 2, category: 'Trading & Technology', prereqs: ['Financial markets', 'Investments and portfolio theory'] },
  { name: 'Algorithmic trading',                tier: 3, category: 'Trading & Technology', prereqs: ['Market microstructure', 'Econometrics'] },
  { name: 'High-frequency trading',             tier: 4, category: 'Trading & Technology', prereqs: ['Algorithmic trading', 'Market microstructure'] },
  { name: 'Systematic investment strategies',   tier: 4, category: 'Trading & Technology', prereqs: ['Algorithmic trading', 'Asset pricing'] },
  { name: 'Machine learning in finance',        tier: 4, category: 'Trading & Technology', prereqs: ['Algorithmic trading', 'Quantitative risk management'] },
]

// ── ECONOMICS ─────────────────────────────────────────────────────────────────
const ECONOMICS: TopicDef[] = [
  // Core Theory
  { name: 'Microeconomics',                     tier: 0, category: 'Core Theory', prereqs: [] },
  { name: 'Macroeconomics',                     tier: 0, category: 'Core Theory', prereqs: [] },
  { name: 'Statistics',                         tier: 0, category: 'Core Theory', prereqs: [] },
  { name: 'Calculus',                           tier: 0, category: 'Core Theory', prereqs: [] },
  { name: 'Linear algebra',                     tier: 0, category: 'Core Theory', prereqs: [] },
  { name: 'Intermediate microeconomics',        tier: 1, category: 'Core Theory', prereqs: ['Microeconomics', 'Calculus'] },
  { name: 'Intermediate macroeconomics',        tier: 1, category: 'Core Theory', prereqs: ['Macroeconomics', 'Calculus'] },
  { name: 'Econometrics',                       tier: 1, category: 'Core Theory', prereqs: ['Statistics', 'Linear algebra'] },
  { name: 'Game theory',                        tier: 1, category: 'Core Theory', prereqs: ['Microeconomics', 'Calculus'] },
  { name: 'Advanced microeconomics',            tier: 2, category: 'Core Theory', prereqs: ['Intermediate microeconomics', 'Game theory'] },
  { name: 'Advanced macroeconomics',            tier: 2, category: 'Core Theory', prereqs: ['Intermediate macroeconomics', 'Econometrics'] },
  { name: 'Financial economics',                tier: 2, category: 'Core Theory', prereqs: ['Intermediate microeconomics', 'Econometrics'] },
  { name: 'General equilibrium theory',         tier: 3, category: 'Core Theory', prereqs: ['Advanced microeconomics'] },
  { name: 'Dynamic macroeconomics',             tier: 3, category: 'Core Theory', prereqs: ['Advanced macroeconomics'] },
  // Applied Economics
  { name: 'Public economics',                   tier: 1, category: 'Applied Economics', prereqs: ['Microeconomics'] },
  { name: 'Labor economics',                    tier: 1, category: 'Applied Economics', prereqs: ['Microeconomics'] },
  { name: 'Development economics',              tier: 1, category: 'Applied Economics', prereqs: ['Macroeconomics'] },
  { name: 'International economics',            tier: 1, category: 'Applied Economics', prereqs: ['Macroeconomics', 'Microeconomics'] },
  { name: 'Environmental economics',            tier: 2, category: 'Applied Economics', prereqs: ['Intermediate microeconomics', 'Public economics'] },
  { name: 'Health economics',                   tier: 2, category: 'Applied Economics', prereqs: ['Intermediate microeconomics', 'Public economics'] },
  { name: 'Urban and regional economics',       tier: 2, category: 'Applied Economics', prereqs: ['Intermediate microeconomics', 'Labor economics'] },
  { name: 'Trade theory',                       tier: 3, category: 'Applied Economics', prereqs: ['International economics', 'Advanced microeconomics'] },
  { name: 'Causal inference',                   tier: 3, category: 'Applied Economics', prereqs: ['Econometrics', 'Experimental economics'] },
  // Behavioural & Political
  { name: 'Behavioral economics',               tier: 2, category: 'Behavioural & Political', prereqs: ['Intermediate microeconomics', 'Game theory'] },
  { name: 'Political economy',                  tier: 2, category: 'Behavioural & Political', prereqs: ['Game theory', 'Public economics'] },
  { name: 'Industrial organization',            tier: 2, category: 'Behavioural & Political', prereqs: ['Intermediate microeconomics', 'Game theory'] },
  { name: 'Information economics',              tier: 2, category: 'Behavioural & Political', prereqs: ['Advanced microeconomics', 'Game theory'] },
  { name: 'Experimental economics',             tier: 3, category: 'Behavioural & Political', prereqs: ['Behavioral economics', 'Econometrics'] },
  // Mechanism Design
  { name: 'Mechanism design',                   tier: 3, category: 'Mechanism Design', prereqs: ['Advanced microeconomics', 'Game theory'] },
  { name: 'Computational economics',            tier: 3, category: 'Mechanism Design', prereqs: ['Advanced microeconomics', 'Econometrics'] },
  { name: 'Auction theory',                     tier: 4, category: 'Mechanism Design', prereqs: ['Mechanism design', 'Game theory'] },
  { name: 'Contract theory',                    tier: 4, category: 'Mechanism Design', prereqs: ['Mechanism design', 'Information economics'] },
  { name: 'Matching theory',                    tier: 4, category: 'Mechanism Design', prereqs: ['Mechanism design', 'Game theory'] },
  { name: 'Market design',                      tier: 4, category: 'Mechanism Design', prereqs: ['Auction theory', 'Matching theory'] },
  { name: 'Economic growth theory',             tier: 4, category: 'Mechanism Design', prereqs: ['Dynamic macroeconomics', 'General equilibrium theory'] },
]

// ── QUANTUM MECHANICS (Fix 7) ─────────────────────────────────────────────────
const QUANTUM_MECHANICS: TopicDef[] = [
  // Fundamentals
  { name: 'Quantum mechanics basics',           tier: 0, category: 'Fundamentals',      prereqs: [] },
  { name: 'Special relativity',                 tier: 0, category: 'Fundamentals',      prereqs: [] },
  { name: 'Advanced quantum mechanics',         tier: 1, category: 'Fundamentals',      prereqs: ['Quantum mechanics basics'] },
  // Quantum Physics
  { name: 'Semiconductor physics',              tier: 1, category: 'Quantum Physics',   prereqs: ['Quantum mechanics basics'] },
  { name: 'General relativity',                 tier: 2, category: 'Quantum Physics',   prereqs: ['Special relativity', 'Advanced quantum mechanics'] },
  // Quantum Computing
  { name: 'Quantum Information',                tier: 2, category: 'Quantum Computing', prereqs: ['Advanced quantum mechanics'] },
  { name: 'Quantum Circuits',                   tier: 2, category: 'Quantum Computing', prereqs: ['Quantum Information'] },
  { name: 'Quantum Computing',                  tier: 3, category: 'Quantum Computing', prereqs: ['Quantum Circuits', 'Quantum Information'] },
  { name: 'Quantum error correction',           tier: 3, category: 'Quantum Computing', prereqs: ['Quantum Computing'] },
  { name: 'Programming quantum computers',      tier: 3, category: 'Quantum Computing', prereqs: ['Quantum Computing'] },
  { name: 'Quantum Machine Learning',           tier: 4, category: 'Quantum Computing', prereqs: ['Quantum Computing'] },
  // Quantum Materials
  { name: 'Superconductivity',                  tier: 2, category: 'Quantum Materials', prereqs: ['Semiconductor physics', 'Advanced quantum mechanics'] },
  { name: 'Quantum Materials',                  tier: 3, category: 'Quantum Materials', prereqs: ['Superconductivity'] },
]

// ── Seeder ────────────────────────────────────────────────────────────────────

async function seedSubject(subject: string, topics: TopicDef[]) {
  const nameToId = new Map<string, string>()

  for (const t of topics) {
    const node = await prisma.skillNode.create({
      data: {
        name:         t.name,
        subject,
        category:     t.category,
        tier:         t.tier,
        status:       t.tier === 0 ? 'unlocked' : 'locked',
        masteryLevel: 0,
        xpValue:      (t.tier + 1) * 100,
      },
    })
    nameToId.set(t.name, node.id)
  }

  for (const t of topics) {
    const depId = nameToId.get(t.name)!
    for (const prereqName of t.prereqs) {
      const prereqId = nameToId.get(prereqName)
      if (!prereqId) {
        console.warn(`  ⚠ Missing prereq "${prereqName}" for "${t.name}" in ${subject}`)
        continue
      }
      await prisma.skillDependency.create({
        data: { prerequisiteId: prereqId, dependentId: depId },
      })
    }
  }

  console.log(`  ✓ ${subject}: ${topics.length} topics seeded`)
}

async function seedCourses() {
  const courses = [
    { code: 'MATH 301', name: 'Real Analysis',       subject: 'Mathematics',      semester: 'Spring', year: 2025, status: 'active' },
    { code: 'CS 401',   name: 'Machine Learning',    subject: 'ComputerScience',  semester: 'Spring', year: 2025, status: 'active' },
    { code: 'FIN 301',  name: 'Corporate Finance',   subject: 'Finance',           semester: 'Spring', year: 2025, status: 'active' },
    { code: 'ECON 201', name: 'Intermediate Micro',  subject: 'Economics',         semester: 'Fall',   year: 2024, status: 'completed' },
    { code: 'PHYS 401', name: 'Quantum Mechanics I', subject: 'QuantumMechanics', semester: 'Spring', year: 2025, status: 'active' },
  ]
  for (const c of courses) {
    await prisma.course.create({ data: c })
  }
  console.log(`  ✓ ${courses.length} sample courses seeded`)
}

async function seedSessions() {
  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }
  await prisma.sessionLog.createMany({
    data: [
      { rawNote: 'Studied real analysis — sequences and limits', durationMins: 60, xpEarned: 20, loggedAt: daysAgo(2) },
      { rawNote: 'Worked through ML gradient descent examples',  durationMins: 90, xpEarned: 30, loggedAt: daysAgo(1) },
      { rawNote: 'Reviewed quantum mechanics postulates',        durationMins: 45, xpEarned: 15, loggedAt: daysAgo(0) },
    ],
  })
  console.log('  ✓ Session logs seeded')
}

async function main() {
  console.log('🌱 Seeding StudyQuest database...')

  await prisma.skillDependency.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.sessionLog.deleteMany()
  await prisma.deadline.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.skillNode.deleteMany()
  await prisma.course.deleteMany()

  await seedSubject('Mathematics',     MATHEMATICS)
  await seedSubject('ComputerScience', COMPUTER_SCIENCE)
  await seedSubject('Finance',          FINANCE)
  await seedSubject('Economics',        ECONOMICS)
  await seedSubject('QuantumMechanics', QUANTUM_MECHANICS)

  await seedCourses()
  await seedSessions()

  await prisma.achievement.createMany({
    data: [
      { name: 'First Star',     condition: 'Rate your first topic' },
      { name: 'On a Roll',      condition: 'Rate 10 topics with at least 3 stars' },
      { name: 'Tier 2 Reached', condition: 'Unlock a Tier 2 topic in any subject' },
      { name: 'Polymath',       condition: 'Rate topics in 3 different subjects' },
      { name: 'Mastery',        condition: 'Achieve 5 stars on any topic' },
    ],
  })
  console.log('  ✓ Achievement slots seeded')
  console.log('\n✅ Seed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
