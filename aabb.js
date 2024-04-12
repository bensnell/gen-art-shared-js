// Axis Aligned Bounding Box (AABB)
class AABB {

  // Create an AABB. Can be created one of two ways:
  // Method 1
  //  a   vector or list of vectors
  // Method 2
  //  a   AABB or list of AABB's
  // Method 3 (Sphere)
  //  a   centroid (vector)
  //  b   radius
  constructor(a, b) {
    let _ = this;

    // Public field declarations should be declared this way to 
    // maintain backwards compatibility with Safari version <= 13.
    // https://stackoverflow.com/questions/60026651
    _.initialized = 0; // initialized?
    _.min = new Vector() // min x,y,z
    _.max = new Vector() // max x,y,z
    
    if (a) _.add(b ? [a.sub(b, b, b), a.add(b, b, b)] : a)
  }

  // Add a list of vectors `a` or a list of AABB's `a`
  add(a) {
    a = [a].flat();
    let _ = this;
    [['min', Math.min], ['max', Math.max]].map(([v, f]) =>
      _[v].set(['x', 'y', 'z'].map(c =>
        f(...a.map(i => (a[0] instanceof AABB ? i[v] : i)[c]).concat(_.initialized ? [_[v][c]] : []))
      ))
    )
    _.initialized = 1;
    return _;
  }

  // Translate (offset) by a vector 
  //  a     vector to offset
  //  i     invert the vector provided? True by default
  translate(a, i = 0) {
    a = i ? a.mult(-1) : a;
    let _ = this;
    _.min = _.min.add(a);
    _.max = _.max.add(a);
    return _;
  }

  // Scale by a scalar
  //  s     scalar to scale by
  //  i     invert the scale provided? True by default
  scale(a, i = 0) {
    a = (a instanceof Vector ? a : new Vector(a,a,a)).pow(i ? -1 : 1);
    let _ = this;
    _.min = _.min.mult(a);
    _.max = _.max.mult(a);
    return _;
  }

  // Clear
  clear() {
    this.initialized = 0;
  }

  // Centroid of box
  centroid() {
    return this.min.add(this.max).div(2);
  }

  // Dimensions of box (width, height, depth)
  dims() {
    return this.max.sub(this.min);
  }
  // Get the max dimension
  dimsMax(nDims=3) {
    return Math.max(...this.dims().array().splice(0, nDims));
  }
  // Get the min dimension
  dimsMin(nDims=3) {
    return Math.max(...this.dims().array().splice(0, nDims));
  }

  // Get a list of all bounding points
  //  m   mode {0 = box corners (8 total), 1 = ellipsoid bounds (14 total)}
  boundingPoints(m = 0) {
    let _ = this;
    let d = _.dims().div(2).array(); // half dimensions [origin to left, origin to top, origin to front]
    let a = d.sum() / 3; // average dimension
    let o = _.centroid(); // origin
    return m ?
      [
        _.boundingPoints().map(i => i.mag(a)), // ellipsoid "corners"
        range(3, 2).map(([i, j]) => o.add(new Vector(...d.map((k, l) => i == l ? k * (j * 2 - 1) : 0)))) // box midpoints
      ].flat() : // m = 1
      range(2, 2, 2).map(i => new Vector(...i.map((j, k) => (j > 0 ? _.max : _.min).array()[k]))); // m = 0
  }

  // Check if this AABB contains a vector `b`.
  // Returns:
  //  -1  outside
  //  0   on edge
  //  1   inside
  contains(b, dims=3) {
    return range(dims)
    .reduce((res, i) => {
      return Math.min(
        res,
        Math.sign(
          this.max.array()[i] - b.array()[i]) * 
          (b.array()[i] - this.min.array()[i]
        )
      );
    }, 1);
  }

  // Does this AABB intersect with another?
  // Returns:
  //  -1    no intersection
  //  0     edge or point intersection
  //  1     overlapping area or volume intersection
  intersects(B, dims=3) {
    return this.boundingPoints().map(pt => B.contains(pt, dims)).max();
  }
}
