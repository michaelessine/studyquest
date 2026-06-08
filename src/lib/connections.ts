export interface Connection {
  topicA: string; subjectA: string
  topicB: string; subjectB: string
  explanation: string
}

export const CONNECTIONS: Connection[] = [
  { topicA: 'Linear algebra',           subjectA: 'Mathematics',     topicB: 'Supervised Machine Learning', subjectB: 'ComputerScience', explanation: 'Eigenvalues and matrix operations underpin PCA, SVD, and most ML algorithms.' },
  { topicA: 'Linear algebra',           subjectA: 'Mathematics',     topicB: 'Deep Learning',               subjectB: 'ComputerScience', explanation: 'Neural networks are chains of matrix multiplications and non-linearities.' },
  { topicA: 'Probability theory',       subjectA: 'Mathematics',     topicB: 'Bayesian Data Analysis',      subjectB: 'ComputerScience', explanation: 'Bayesian inference is directly built on probability axioms and Bayes\' theorem.' },
  { topicA: 'Stochastic processes',     subjectA: 'Mathematics',     topicB: 'Reinforcement Learning',      subjectB: 'ComputerScience', explanation: 'Markov decision processes — the formal model for RL — are discrete stochastic processes.' },
  { topicA: 'Fourier analysis',         subjectA: 'Mathematics',     topicB: 'Deep Learning',               subjectB: 'ComputerScience', explanation: 'CNNs exploit frequency-domain structure; Fourier transforms explain why convolutions work.' },
  { topicA: 'Linear optimization',      subjectA: 'Mathematics',     topicB: 'Supervised Machine Learning', subjectB: 'ComputerScience', explanation: 'Gradient descent and convex loss minimisation sit directly on optimisation theory.' },
  { topicA: 'Complex analysis',         subjectA: 'Mathematics',     topicB: 'Quantum mechanics basics',    subjectB: 'QuantumMechanics', explanation: 'Wave functions are complex-valued; the Schrödinger equation lives in complex Hilbert spaces.' },
  { topicA: 'Linear algebra',           subjectA: 'Mathematics',     topicB: 'Quantum Circuits',            subjectB: 'QuantumMechanics', explanation: 'Quantum gates are unitary matrices acting on vector-space state representations.' },
  { topicA: 'Statistics',               subjectA: 'Mathematics',     topicB: 'Probabilistic Machine Learning', subjectB: 'ComputerScience', explanation: 'Probabilistic ML generalises classical statistics with learnable distributions.' },
  { topicA: 'Differential calculus',    subjectA: 'Mathematics',     topicB: 'Quantum mechanics basics',    subjectB: 'QuantumMechanics', explanation: 'The time-dependent Schrödinger equation is a first-order PDE in time.' },
  { topicA: 'Graph theory',             subjectA: 'Mathematics',     topicB: 'Data structures and algorithms', subjectB: 'ComputerScience', explanation: 'Graph traversal algorithms (BFS, DFS, Dijkstra) are core to both fields.' },
  { topicA: 'Cryptography',             subjectA: 'Mathematics',     topicB: 'Cybersecurity',               subjectB: 'ComputerScience', explanation: 'Number-theoretic cryptography (RSA, elliptic curves) is the mathematical core of network security.' },
  { topicA: 'Stochastic processes',     subjectA: 'Mathematics',     topicB: 'Options pricing theory',      subjectB: 'Finance',          explanation: 'The Black-Scholes model is derived from Brownian motion — a continuous stochastic process.' },
  { topicA: 'Probability theory',       subjectA: 'Mathematics',     topicB: 'Risk management',             subjectB: 'Finance',          explanation: 'Value-at-Risk, CVaR, and most risk measures are probability-weighted loss statistics.' },
  { topicA: 'Linear algebra',           subjectA: 'Mathematics',     topicB: 'Quantum Information',         subjectB: 'QuantumMechanics', explanation: 'Quantum states are unit vectors in Hilbert space; entanglement is a tensor-product structure.' },
  { topicA: 'Measure and integral',     subjectA: 'Mathematics',     topicB: 'Stochastic processes',        subjectB: 'Mathematics',      explanation: 'Itô calculus for stochastic differential equations requires Lebesgue measure theory.' },
  { topicA: 'Numerical analysis',       subjectA: 'Mathematics',     topicB: 'Deep Learning',               subjectB: 'ComputerScience', explanation: 'Floating-point stability, gradient explosion, and convergence of SGD are numerical analysis problems.' },
  { topicA: 'Statistics',               subjectA: 'Mathematics',     topicB: 'Econometrics',                subjectB: 'Finance',          explanation: 'Econometrics applies regression, hypothesis testing, and time-series statistics to economic data.' },
  { topicA: 'Statistics',               subjectA: 'Mathematics',     topicB: 'Econometrics',                subjectB: 'Economics',        explanation: 'Econometrics is statistics applied to economic questions — inference, causality, panel data.' },
  { topicA: 'Abstract algebra',         subjectA: 'Mathematics',     topicB: 'Cryptography',                subjectB: 'Mathematics',      explanation: 'Group and ring theory are the algebraic backbone of public-key cryptosystems.' },
  { topicA: 'Linear optimization',      subjectA: 'Mathematics',     topicB: 'Financial modeling',          subjectB: 'Finance',          explanation: 'Mean-variance portfolio optimisation is a quadratic programming problem.' },
  { topicA: 'PDE',                       subjectA: 'Mathematics',     topicB: 'Options pricing theory',      subjectB: 'Finance',          explanation: 'The Black-Scholes PDE is solved using heat-equation techniques from mathematical physics.' },
  { topicA: 'Game theory',              subjectA: 'Economics',       topicB: 'Mechanism design',            subjectB: 'Economics',        explanation: 'Mechanism design is "reverse game theory" — designing rules so rational agents achieve desired outcomes.' },
  { topicA: 'Convex Optimization',      subjectA: 'ComputerScience', topicB: 'Supervised Machine Learning', subjectB: 'ComputerScience',  explanation: 'Most ML training objectives are convex or quasi-convex; duality and KKT conditions apply directly.' },
  { topicA: 'Quantum Computing',        subjectA: 'QuantumMechanics', topicB: 'Quantum Machine Learning',   subjectB: 'QuantumMechanics', explanation: 'Quantum ML explores speedups for learning algorithms using quantum circuits and variational methods.' },
  { topicA: 'Probability theory',       subjectA: 'Mathematics',     topicB: 'Information Security',        subjectB: 'ComputerScience', explanation: 'Probabilistic analysis underpins cryptographic security proofs and differential privacy.' },
  { topicA: 'Linear algebra',           subjectA: 'Mathematics',     topicB: 'Computer Vision',             subjectB: 'ComputerScience', explanation: 'Image transformations (rotations, projections) and convolutional filters are linear maps.' },
]

/** Return only connections where both topics exist in the provided name set */
export function filterActiveConnections(
  topicNames: Set<string>,
  minMasteryByName: Map<string, number>
): Connection[] {
  return CONNECTIONS.filter(c => {
    if (!topicNames.has(c.topicA) || !topicNames.has(c.topicB)) return false
    const ml = Math.max(minMasteryByName.get(c.topicA) ?? 0, minMasteryByName.get(c.topicB) ?? 0)
    return ml >= 1
  })
}
