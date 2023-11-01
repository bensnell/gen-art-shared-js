// Shuffle array
// (This is necessary for p5 version < 1.4.1 because it is only at this 
// point that shuffle was connected to the random seed.)
//    a   array
//    m   modify passed array? (default: false)
var shuffleList = (a, m) => {
  a = m ? a : a.slice();

  let r, // random
    t, // tmp
    i = a.length; // index
  while (i > 1) {
    r = (R.d() * i) | 0;

    t = a[--i];
    a[i] = a[r];
    a[r] = t;
  }

  return a;
};

// Clamp value to low and high
//    a   in value
//    l   low bound
//    h   high bound
var clamp = (a, l = 0, h = 1) => { 
  if (h < l) [l, h] = [h, l]; 
  return Math.max(Math.min(a, h), l) 
};

// Min max 
//    a   input array
var minmax = (...a) => [Math.min(...a), Math.max(...a)];

// Wrap
//    a   in value (value to wrap)
//    r   range within which to wrap
var wrap = (a, r) => (a + Math.ceil(Math.abs(a / r)) * r) % r;

// XOR
var xor = (a, b) => (a || b) && !(a && b); // XOR function

// Prepare a wrapped comparison
var prepareWrappedComparison = (a, b, r) => { 
  a = wrap(a, r); 
  b = wrap(b, r);
  [c, d] = minmax(a, b);
  q = d - c > r / 2;
  return [q ? d - r : c, q ? c : d, xor(a == d, q)] 
};

// Lerp Wrapped (e.g. an angle)
//    a   lerp from value
//    b   lerp to value
//    p   normalized parameter (can be outside range [0,1])
//    r   range (span) to use when wrapping
var lerpWrapped = (a, b, p, r) => {
  [c, d, f] = prepareWrappedComparison(a, b, r);
  return wrap(L(c, d, f ? 1 - p : p), r)
};

// minimum Wrapped Difference (signed) of `a` minus `b`
//    a   __ minus b
//    b   a minus __
//    r   range (span) to use when wrapping
var minWrappedDiff = (a, b, r) => {
  [c, d, f] = prepareWrappedComparison(a, b, r);
  return (c - d) * (f ? -1 : 1);
}
// Calculate the unidirectional wrapped difference of a - b.
var uniWrappedDiff = (a, b, r) => {
  return wrap(minWrappedDiff(a, b, r), r);
}
// Calculate the absolute wrapped difference of a - b.
var absWrappedDiff = (a, b, r) => {
  return Math.abs(minWrappedDiff(a, b, r));
}

// Wrapped Average; Calculate the average of a list of values `a` existing in range `r`; Optionally include weights `w` for each element in `a`
var wrappedAverage = (a, r, w) => wrap(
  noNAN(Math.atan2(
    ...[Math.sin, Math.cos].map(f =>
      a.map((i, j) =>
        f(wrap(i, r) / r * 2 * Math.PI) * (w ? w[j] : 1)
      ).sum() / a.length / (w ? w.sum() : a.length)
    )
  )),
  2 * Math.PI
) / 2 / Math.PI * r;

// ND-ranges
var range = (...dims) => {
  if (dims && dims.length > 0 && Array.isArray(dims[0])) dims = dims[0];
  let nTotalDims = dims.length;
  let range1 = (a) => Array(a).fill(0).map((_, i) => i);
  let out = [[]];
  while(dims.length > 0) {
    out = range1(dims.pop()).map(i => out.map(j => [i].concat(j))).flat();
  }
  return nTotalDims <= 1 ? out.flat() : out;
}

// Swap values at indices `p` and `q` in array `a`
var swap = (a, p, q) => [a[p], a[q]] = [a[q], a[p]];

// Recursive Deep Copy
// Note: This will copy all objects, arrays, variables, and functions in `a`. 
// All copies are deep, with the exception of functions.
// Optionally, provide an object `b` from which to copy items from into `a`.
// The result is analogous to the pseudocode: `union(copy(a),copy(b))`
var deepCopy = (a, b) => {

  // Function for deep copying a parseable object.
  let _copy = (i) => i instanceof Function ? i : JSON.parse(JSON.stringify(i));

  // Function for deep copying a parseable object and shallow copying all 
  // unparseable values.
  let all_copy = (i) => assign(_copy(i), i);

  // Recursive function for assigning all entries from source to target
  // if not already present. If target and source are not iterables (Arrays
  // or Objects), target is returned as is.
  let assign = (target, source) => {
    if (target instanceof Object && source instanceof Object) {
      // Iterate over all keys
      Object.entries(source).map(([key, value]) => {
        // Assign all elements within this value
        assign(target[key], value);
        // If the key is null, set it with a copy.
        if (target[key] == null) {
          target[key] = all_copy(value);
        }
      });
    }
    return target;
  };

  // Create a deep copy of a, and assign all elements from b to a, if not already present.
  return assign(all_copy(a), b);
};

// No NAN's with the default value `d`
var noNAN = (a, d = 0) => Number.isNaN(a) ? d : a;

// Mod, with no negative values returned
var mod = (a, b) => (a + Math.abs(Math.floor(a / b)) * b) % b;

// Safe Divide by zero
var safeDivide = (a, b) => b < Number.EPSILON ? 0 : a / b;

// Lerp value from a to b by param c.
// Optionally, a can be a range and b can be a param.
var lerpValue = (a, b, c = null) => { 
  if (c == null) { 
    c = b; 
    b = a[1]; 
    a = a[0] 
  }; 
  return c * (b - a) + a;
};

// Sensitize `a` with an IN (`o`=0) or OUT (`o`=1) ease function using power `p`
var sensitize = (a, o, s = 1) => Math.pow(clamp(1 - o - Math.cos(Math.PI / 2 * (a + o))), o ? 1 / s : s);

// get valUe recursively from object `a` using the sequential keys in `b`
var getValueByKeys = (a, b) => [b].flatRecursive().reduceArray((p, c) => p[c], a);

// Indexing operation on an array similar to python (with positive modulo)
Array.prototype.at = function (v) { 
  let _ = this;
  let l = _.length; 
  return l == 0 ? null : _[wrap(parseInt(v), l)];
}
// Cumulative Sum
Array.prototype.cumulativeSum = function () { 
  let o = []; 
  this.reduceArray((p, c) => { 
    o.push(p + c); 
    return p + c 
  }); 
  return o; 
}
// Index Interpolated for a value
Array.prototype.indexInterpolated = function (v) {
  let _ = this;
  let i = 0;
  let l = _.length; 
  while ((i + 2) < l && _[i + 1] < v) i++;
  return l < 2 ? 0 : i + clamp((v - _[i]) / (_[i + 1] - _[i]));
}
// Weighted index interpolated (revised)
Array.prototype.indexInterpolatedWeighted = function (v, s = 1) {
  let _ = this;
  let a = [0].concat(_.map(w => [w / 2, w / 2]).flat()).cumulativeSum().indexInterpolated(_.cumulativeSum().at(-1) * v); 
  return (parseInt(a) + SZ(a % 1, 1 - int(a) % 2, s) - 1) / 2 };
// Sum of all values in array
  Array.prototype.sum = function() {
  return this.reduceArray((p, c) => p + c)
}
// Fully flatten an array; Return a new array; Doesn't change existing array, like .flat(); Optionally pass `t` for the maximum number of flattens
Array.prototype.flatRecursive = function (t = Number.POSITIVE_INFINITY) { 
  let _ = this; 
  while (t-- && _.some(i => i instanceof Array)) _ = _.flat(); 
  return _ 
};
// Sort an array in-place using the sequential keys `k`. `i` refers to whether sort is increasing. Only works for numerical (not string) comparisons.
Array.prototype.sortByKey = function (k, i = 1) { 
  return this.sort((a, b) => getValueByKeys(i ? a : b, k) - getValueByKeys(i ? b : a, k))
}; 
// Reduce; works slightly differently than reduce because initialValue defaults to 0
Array.prototype.reduceArray = function (f, i = 0) { return this.reduce(f, i) };
// Sort Numbers (https://stackoverflow.com/questions/1063007/how-to-sort-an-array-of-integers-correctly)
Array.prototype.sortNumber = function() { 
  return this.sort(function(a, b) {
    if( a === Infinity ) 
      return 1; 
    else if( isNaN(a)) 
      return -1;
    else 
      return a - b;
  });
}
// Roll / Rotate / Offset an array
Array.prototype.roll = function(offset, reverse=false) {
  offset = wrap(offset, this.length);
  for (let i = 0; i < offset; i++) {
    if (reverse) this.unshift(this.pop());
    else this.push(this.shift());  
  }
  return this;
}
// Get the index that maximizes the compare function provided
Array.prototype.argAt = function(compare) {
  let first = [...this]
    .map((item, index) => [item, index])
    .sort((a,b) => compare(a[0],b[0]))
    .at(0);
  return first ? first[1] : first;
}
Array.prototype.argMax = function() {
  return this.argAt((a,b) => b-a);
}
Array.prototype.argMin = function() {
  return this.argAt((a,b) => a-b);
}
// Get the min or max value
Array.prototype.min = function() {
  return Math.min(...this);
}
Array.prototype.max = function() {
  return Math.max(...this);
}
// Return a new array with values from this array at the indices provided.
// This is similar to numpy.take()
Array.prototype.take = function(...indices) {
  indices = indices.flat();
  return indices.map(index => {
    if (Array.isArray(index)) {
      return this.take(index);
    } else {
      return this.at(index);
    }
  });
}

// Hash of string or number
var hash = (v, i = 0) => (typeof (v) == 'string' ? range(v.length).reduceArray((p, c) => p + v.charCodeAt(c) * 31 ** c) : v) * 31 ** i;

// Power (allows negative values)
var power = (b, e) => Math.pow(Math.abs(b), e) * Math.sign(b); 

// Log with optional base
var logarithm = (v, b = 10) => Math.log(v) / Math.log(b);

// Map value function, with defaults
var mapValue = (n, start1, stop1 = 1, start2 = 0, stop2 = 1, withinBounds = true) => {
  let newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
  if (!withinBounds) {
    return newval;
  } else {
    return clamp(newval, ...minmax(start2, stop2))
  }
}

// Unzip a zipped list; Expects all sublists to have equal length; e.g. [[a1,b1],[a2,b2]]=>[[a1,a2],[b1,b2]]
var unzip = (a) => a && a[0] instanceof Array ? a[0].map((_, i) => a.map(j => j[i])) : a;

// Map a value to the logistic function
var logistic = (_a, lo=0, hi=1) => {
  a = mapValue(_a, lo, hi, 0, 1);
  return a <= 0 ? 0 : (a >= 1 ? 1 : (1 - Math.cos(Math.PI * a))/2);
}

// Map a value unevenly, but smoothly with a provided mid value
var mapValueLog = (value, lo1, mi1, hi1, lo2, mi2, hi2, withinBounds) => {
  let e1 = logarithm(0.5, mapValue(mi1, lo1, hi1, 0, 1, true));
  let e2 = logarithm(mapValue(mi2, lo2, hi2, 0, 1, true), 0.5);
  let valueNormalized = power(power(mapValue(value, lo1, hi1, 0, 1, withinBounds), e1), e2);
  return mapValue(valueNormalized, 0, 1, lo2, hi2, withinBounds);
}

// Find all 2-combinations of the values provided
var choose2 = (values) =>
  values.flatMap(
    (v, i) => values.slice(i+1).map( w => [v, w] )
  );
