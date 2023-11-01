// Helper class for RNG
class SFC32 {
  constructor(u) { // uint128Hex
    this.u = u;
    this.data_original = [0, 8, 16, 24].map(i => parseInt(u.substr(i, 8), 16));
    this.restart();
  }

  restart() {
    this.data = [...this.data_original];
  }

  generate() {
    let data = this.data;
    data[0] |= 0; data[1] |= 0; data[2] |= 0; data[3] |= 0;
    let t = (((data[0] + data[1]) | 0) + data[3]) | 0;
    data[3] = (data[3] + 1) | 0;
    data[0] = data[1] ^ (data[1] >>> 9);
    data[1] = (data[2] + (data[2] << 3)) | 0;
    data[2] = (data[2] << 21) | (data[2] >>> 11);
    data[2] = (data[2] + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  clone() {
    let s = new SFC32(this.u);
    s.data = [...this.data];
    return s;
  }
}

// Random number generator class
class RNG {
  constructor() {

    // Use A
    this.useA = false;

    // seed prngA with first half of tokenData.hash
    // seed prngB with second half of tokenData.hash
    [this.A, this.B] = [2, 34].map(i => 
      new SFC32(tokenData.hash.substr(i, 32)));

    // Warm up the RNG
    this.warmup();
  }

  restart() {
    this.useA = false;
    this.A.restart();
    this.B.restart();
    this.warmup();
    return this;
  }

  warmup() {
    for (let i = 0; i < 5e5; i += 1) this.step();
    return this;
  }

  // Step forward the generator
  step(nSteps=1) {
    for (let i = 0; i < nSteps; i++) {
      this.A.generate();
      this.B.generate();
    }
    return this;
  }

  // random Decimal between 0 (inclusive) and 1 (exclusive)
  d() {
    this.useA = !this.useA;
    return this.useA ? this.A.generate() : this.B.generate();
  }

  // random Number between a (inclusive) and b (exclusive)
  n(a, b) {
    return a + (b - a) * this.d();
  }

  // random Integer between a (inclusive) and b (inclusive)
  // requires a < b for proper probability distribution
  i(a, b) {
    return Math.floor(this.n(a, b + 1));
  }
  
  // random Gaussian
  // l and h are multipliers applied to the lo's (<0) and hi's (>0)
  g(m = 0, s = 1, l = 1, h = 1) { 
    let a = 0;
    let b = 0;
    while (a === 0) a = this.d();
    while (b === 0) b = this.d();
    let o = Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
    return o * [o > 0 ? h : l] * s + m;
  }

  // random Choice
  // Optionally provide weights for each value.
  // Optionally sensitize with a power applied to the random number
  //  to prioritize low or high values.
  c(values, weights, sensitization=1) {
    if (values.length == 0) return null;
    if (sensitization != null) {
      sensitization = clamp(sensitization, 0, Number.MAX_SAFE_INTEGER);
    }

    if (weights != null && weights.length == values.length) {
      // Calculate the cumulative weights, normalized
      let weightsCumulative = [];
      weights.reduce((sum, curr) => {
        sum += curr;
        weightsCumulative.push(sum);
        return sum;
      }, 0);
      let sum = weightsCumulative[weightsCumulative.length-1];
      weightsCumulative = weightsCumulative.map(i => i/sum);
      // Calculate a random param
      let param = this.d() ** sensitization;
      // Find the index of this param in the array
      let index = 0;
      while (index <= (weightsCumulative.length-1) && 
        param > weightsCumulative[index]) index++;
      // Return the value at this index
      return values[index];
    } else {
      let index = Math.max(Math.min(Math.floor((this.d() ** 
        sensitization) * values.length), values.length-1), 0);
      return values[index];
    }
  }

  // Get a diverged instance of this random number generator from 
  // this point on.
  diverge() {
    // Create a copy of this object
    let diverged = new RNG();
    diverged.useA = this.useA;
    diverged.A = this.A.clone();
    diverged.B = this.B.clone();
    return diverged;
  }

  // Given a seed (either string or number) as a starting point
  // for the RNG, reliably return to it.
  goto(seed) {
    let text = seed.toString();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash += text.charCodeAt(i) * 31**i;
    }
    hash %=1e6;
    return this.restart().step(hash);
  }
}

// Instantiate a random number generator
const R = new RNG();
