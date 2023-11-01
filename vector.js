// This class is modeled on p5js' Vector class, which allows
// for vector operations on up to 3D points. Many functions are
// borrowed from it, and some new ones are added.
// An important difference is that all operations return a copy
// of the result, leaving the vectors operated on, unchanged.
// https://github.com/processing/p5.js/tree/v1.5.0
class Vector {
  constructor(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
  }

  get xy() {
    return [this.x, this.y];
  }
  get xz() {
    return [this.x, this.z];
  }
  get yz() {
    return [this.y, this.z];
  }
  get xyz() {
    return [this.x, this.y, this.z];
  }

  set(x, y, z) {
    if (x instanceof Vector) {
      this.x = x.x || 0;
      this.y = x.y || 0;
      this.z = x.z || 0;
      return this;
    }
    if (x instanceof Array) {
      this.x = x[0] || 0;
      this.y = x[1] || 0;
      this.z = x[2] || 0;
      return this;
    }
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    return this;
  }

  copy(pattern=null) {
    if (pattern) {
      return new Vector(
        ...range(Math.min(pattern.length,3))
        .map(index => {
          let character = pattern[index];
          switch (character) {
            case 'x':
            case 'X':
              return this.x;
            case 'y':
            case 'Y':
              return this.y;
            case 'z':
            case 'Z':
              return this.z;
            default:
              return 0;
          }
        })
      );
    } else {
      return new Vector(this.x, this.y, this.z);  
    }
  }

  clone() {
    console.warn("Vector clone() is deprecated.");
    return this.copy();
  }

  _parseArgs(x, y, z) {
    if (x instanceof Vector) {
      return [
        x.x || 0, 
        x.y || 0, 
        x.z || 0
      ];
    }
    if (x instanceof Array) {
      return [
        x[0] || 0, 
        x[1] || 0,
        x[2] || 0
      ];
    }
    return [
      x || 0, 
      y || 0,
      z || 0
    ];
  }

  _parseArgsFinite(x, y, z) {
    let values = this._parseArgs(x,y,z);
    if (!values.every(i => Number.isFinite(i)) || 
      !values.every(i => typeof i === 'number')) {
      console.warn('Vector contains undefined or infinite components.')
    }
    return values;
  }

  add(x, y, z) {
    let result = this.copy();
    if (x instanceof Vector) {
      result.x += x.x || 0;
      result.y += x.y || 0;
      result.z += x.z || 0;
      return result;
    }
    if (x instanceof Array) {
      result.x += x[0] || 0;
      result.y += x[1] || 0;
      result.z += x[2] || 0;
      return result;
    }
    result.x += x || 0;
    result.y += y || 0;
    result.z += z || 0;
    return result;
  }

  sub(x, y, z) {
    let result = this.copy();
    if (x instanceof Vector) {
      result.x -= x.x || 0;
      result.y -= x.y || 0;
      result.z -= x.z || 0;
      return result;
    }
    if (x instanceof Array) {
      result.x -= x[0] || 0;
      result.y -= x[1] || 0;
      result.z -= x[2] || 0;
      return result;
    }
    result.x -= x || 0;
    result.y -= y || 0;
    result.z -= z || 0;
    return result;
  }

  mult(x, y, z) {
    let result = this.copy();
    if (x instanceof Vector) {
      // new Vector will check that values are valid upon construction but it's possible
      // that someone could change the value of a component after creation, which is why we still
      // perform this check
      if (
        Number.isFinite(x.x) &&
        Number.isFinite(x.y) &&
        Number.isFinite(x.z) &&
        typeof x.x === 'number' &&
        typeof x.y === 'number' &&
        typeof x.z === 'number'
      ) {
        result.x *= x.x;
        result.y *= x.y;
        result.z *= x.z;
      } else {
        console.warn(
          'Vector.prototype.mult:',
          'x contains components that are either undefined or not finite numbers'
        );
      }
      return result;
    }
    if (x instanceof Array) {
      if (
        x.every(element => Number.isFinite(element)) &&
        x.every(element => typeof element === 'number')
      ) {
        if (x.length === 1) {
          result.x *= x[0];
          result.y *= x[0];
          result.z *= x[0];
        } else if (x.length === 2) {
          result.x *= x[0];
          result.y *= x[1];
        } else if (x.length === 3) {
          result.x *= x[0];
          result.y *= x[1];
          result.z *= x[2];
        }
      } else {
        console.warn(
          'Vector.prototype.mult:',
          'x contains elements that are either undefined or not finite numbers'
        );
      }
      return result;
    }
  
    const vectorComponents = [...arguments];
    if (
      vectorComponents.every(element => Number.isFinite(element)) &&
      vectorComponents.every(element => typeof element === 'number')
    ) {
      if (arguments.length === 1) {
        result.x *= x;
        result.y *= x;
        result.z *= x;
      }
      if (arguments.length === 2) {
        result.x *= x;
        result.y *= y;
      }
      if (arguments.length === 3) {
        result.x *= x;
        result.y *= y;
        result.z *= z;
      }
    } else {
      console.warn(
        'Vector.prototype.mult:',
        'x, y, or z arguments are either undefined or not a finite number'
      );
    }
  
    return result;
  }

  div(x, y, z) {
    let result = this.copy();
    if (x instanceof Vector) {
      // new Vector will check that values are valid upon construction but it's possible
      // that someone could change the value of a component after creation, which is why we still
      // perform this check
      if (
        Number.isFinite(x.x) &&
        Number.isFinite(x.y) &&
        Number.isFinite(x.z) &&
        typeof x.x === 'number' &&
        typeof x.y === 'number' &&
        typeof x.z === 'number'
      ) {
        if (x.x === 0 || x.y === 0 || x.z === 0) {
          console.warn('Vector.prototype.div:', 'divide by 0');
          return result;
        }
        result.x /= x.x;
        result.y /= x.y;
        result.z /= x.z;
      } else {
        console.warn(
          'Vector.prototype.div:',
          'x contains components that are either undefined or not finite numbers'
        );
      }
      return result;
    }
    if (x instanceof Array) {
      if (
        x.every(element => Number.isFinite(element)) &&
        x.every(element => typeof element === 'number')
      ) {
        if (x.some(element => element === 0)) {
          console.warn('Vector.prototype.div:', 'divide by 0');
          return result;
        }
  
        if (x.length === 1) {
          result.x /= x[0];
          result.y /= x[0];
          result.z /= x[0];
        } else if (x.length === 2) {
          result.x /= x[0];
          result.y /= x[1];
        } else if (x.length === 3) {
          result.x /= x[0];
          result.y /= x[1];
          result.z /= x[2];
        }
      } else {
        console.warn(
          'Vector.prototype.div:',
          'x contains components that are either undefined or not finite numbers'
        );
      }
  
      return result;
    }
  
    const vectorComponents = [...arguments];
    if (
      vectorComponents.every(element => Number.isFinite(element)) &&
      vectorComponents.every(element => typeof element === 'number')
    ) {
      if (vectorComponents.some(element => element === 0)) {
        console.warn('Vector.prototype.div:', 'divide by 0');
        return result;
      }
  
      if (arguments.length === 1) {
        result.x /= x;
        result.y /= x;
        result.z /= x;
      }
      if (arguments.length === 2) {
        result.x /= x;
        result.y /= y;
      }
      if (arguments.length === 3) {
        result.x /= x;
        result.y /= y;
        result.z /= z;
      }
    } else {
      console.warn(
        'Vector.prototype.div:',
        'x, y, or z arguments are either undefined or not a finite number'
      );
    }
  
    return result;
  }

  mag(n) {
    if (n != null) {
      return this.copy().normalize().mult(n);
    } else {
      return Math.sqrt(this.magSq());
    }
  }

  magSq() {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    return x * x + y * y + z * z;
  }

  dot(x, y, z) {
    if (x instanceof Vector) {
      return this.dot(x.x, x.y, x.z);
    }
    return this.x * (x || 0) + this.y * (y || 0) + this.z * (z || 0);
  }

  cross(v) {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;
    return new Vector(x, y, z);
  }

  dist(v, pattern=null) {
    return v
      .copy(pattern)
      .sub(this.copy(pattern))
      .mag();
  }

  normalize() {
    const len = this.mag();
    let result = this.copy();
    // here we multiply by the reciprocal instead of calling 'div()'
    // since div duplicates this zero check.
    if (len !== 0) result = result.mult(1 / len);
    return result;
  }

  norm() {
    return this.normalize();
  }

  limit(max) {
    let result = this.copy();
    const mSq = result.magSq();
    if (mSq > max * max) {
      result.div(Math.sqrt(mSq)) //normalize it
        .mult(max);
    }
    return result;
  }

  heading(a) {
    if (a) {
      let result = this.copy();
      let m = result.mag();
      result.x = m * Math.cos(a);
      result.y = m * Math.sin(a);
      return result;
    } else {
      const h = Math.atan2(this.y, this.x);
      return h;
    }
  }

  rotate(a) {
    let result = this.copy();
    let newHeading = result.heading() + a;
    const mag = result.mag();
    result.x = Math.cos(newHeading) * mag;
    result.y = Math.sin(newHeading) * mag;
    return result;
  }

  _angleBetween(v) {
    const dotmagmag = this.dot(v) / (this.mag() * v.mag());
    // Mathematically speaking: the dotmagmag variable will be between -1 and 1
    // inclusive. Practically though it could be slightly outside this range due
    // to floating-point rounding issues. This can make Math.acos return NaN.
    //
    // Solution: we'll clamp the value to the -1,1 range
    let angle;
    angle = Math.acos(Math.min(1, Math.max(-1, dotmagmag)));
    angle = angle * Math.sign(this.cross(v).z || 1);
    return angle;
  }
  // Get the angle between two vectors. If either has a length of 0, then 0 is returned.
  angleBetween(a) { 
    return this.mag() > Number.EPSILON && a.mag() > Number.EPSILON ? this._angleBetween(a) : 0 
  }

  lerp(x, y, z, amt) {
    if (x instanceof Vector) {
      return this.lerp(x.x, x.y, x.z, y);
    }
    let result = this.copy();
    result.x += (x - result.x) * amt || 0;
    result.y += (y - result.y) * amt || 0;
    result.z += (z - result.z) * amt || 0;
    return result;
  }

  array() {
    return [this.x || 0, this.y || 0, this.z || 0];
  }

  equals(x, y, z) {
    let a, b, c;
    if (x instanceof Vector) {
      a = x.x || 0;
      b = x.y || 0;
      c = x.z || 0;
    } else if (x instanceof Array) {
      a = x[0] || 0;
      b = x[1] || 0;
      c = x[2] || 0;
    } else {
      a = x || 0;
      b = y || 0;
      c = z || 0;
    }
    return this.x === a && this.y === b && this.z === c;
  }

  reflect(surfaceNormal) {
    let result = this.copy();
    surfaceNormal.normalize();
    return result.sub(surfaceNormal.mult(2 * result.dot(surfaceNormal)));
  }

  // Rotate 3D, expects normalized axis
  rotate3D(axis, angle) {
    let _ = this.copy();

    let h = angle / 2;
    let s = Math.sin(h);
    
    let a = axis.x * s;
    let b = axis.y * s;
    let c = axis.z * s;
    let d = Math.cos(h);
    
    let x = _.x;
    let y = _.y;
    let z = _.z;

    let ix = d * x + b * z - c * y;
    let iy = d * y + c * x - a * z;
    let iz = d * z + a * y - b * x;
    let iw = -a * x - b * y - c * z;
    
    _.x = ix * d + iw * -a + iy * -c - iz * -b;
    _.y = iy * d + iw * -b + iz * -a - ix * -c;
    _.z = iz * d + iw * -c + ix * -b - iy * -a;
    
    return _;
  }

  // Project (normalized) onto vector `b`. 
  // If `r` is 1, then the remainder of the projection (the component 
  // orthogonal to `b`) is returned instead of the actual projection.
  project(b, r = 0) { 
    let _ = this.copy();
    let j = b.norm().mag(b.norm().dot(_)); 
    return _.set(r ? (_.sub(j)) : j); 
  }

  // L-Norm
  lnorm(n=2) { 
    let _ = this;
    return n == 1 ? (Math.abs(_.x) + Math.abs(_.y) + Math.abs(_.z)) : _.mag();
  } 

  // Get euler angles to rotate an object oriented along the `i` indexed axis (0=+x, 1=+y, 2=+z) to the axis [angle] contained within this vector. Euler is in ZYX order. Note: You may need to apply a -1 to the euler angles in some situations. Use trial and error.
  euler(i = 1) { 
    let _ = this.normalize();
    let a = _.array();
    SW = (a, p, q) => [a[p], a[q]] = [a[q], a[p]]; // Swap values at indices `p` and `q` in array `a`
    SW(a, 1, i); 
    a = [Math.atan2(a[2], Math.sqrt(a[0] ** 2 + a[1] ** 2)), 0, -Math.atan2(a[0], a[1])];
    SW(a, 1, i);
    _.set(a);
    return _; 
  } 

  // Normalized orthogonal vector to this vector. 
  // If `b` is provided, then the orthogonal vector is orthogonal to `this` and `b`. 
  // If `b` is not provided, then a random orthogonal vector is returned. 
  // If a vector of length zero is provided, it is treated as null.
  ortho(b = null) { 
    let _ = this.copy();
    let z = (-_.x - _.y) / _.z;
    b = b 
      && b.mag() > Number.EPSILON 
      && (1 - Math.abs(_.norm().dot(b.norm()))) > Number.EPSILON 
      ? b 
      : new Vector(1, 1, isFinite(z) ? z : 1);
    return _.cross(b).norm(); 
  } 

  // Slerp (Spherical lerp). Vectors with zero length can be provided
  slerp(b, p) { 
    let _ = this.copy(); 
    let [c, d, q] = _.mag() <= Number.EPSILON ? [b, _, 1 - p] : [_, b, p];
    return c.rotate3D(
      c.norm().ortho(d), 
      Math.abs(d.norm().angleBetween(c.norm())) * q
    ).mag(
      q * (d.mag() - c.mag()) + c.mag()
    )
  }

  // Are all components of this vector zero?
  isZero() {
    return Math.abs(this.x) <= Math.EPSILON
      && Math.abs(this.y) <= Math.EPSILON
      && Math.abs(this.z) <= Math.EPSILON
  }

  toString(delim=',') {
    return this.array().join(delim);
  }

  hash(fractionalDigits=6) {
    return (this.x || 0).toFixed(fractionalDigits)
      + ',' + (this.y || 0).toFixed(fractionalDigits)
      + ',' + (this.z || 0).toFixed(fractionalDigits);
  }

  fromAngle(angle, length) {
    if (typeof length === 'undefined') {
      length = 1;
    }
    return new Vector(length * Math.cos(angle), length * Math.sin(angle), 0);
  };

  round() {
    return new Vector(
      Math.round(this.x),
      Math.round(this.y),
      Math.round(this.z)
    );
  }

  floor() {
    return new Vector(
      Math.floor(this.x),
      Math.floor(this.y),
      Math.floor(this.z)
    );
  }

  ceil() {
    return new Vector(
      Math.ceil(this.x),
      Math.ceil(this.y),
      Math.ceil(this.z)
    );
  }

  pow(e, preserveFinite=true) {
    return new Vector(
      ...this.array()
      .map(i => {
        let tmp = Math.pow(i, e);
        if (preserveFinite && !isFinite(tmp)) return i;
        return tmp;
      })
    );
  }
}