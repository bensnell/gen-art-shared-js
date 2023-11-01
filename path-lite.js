// A "light" path representation, structured similarly to Path in Paper.js.
// In the context of this path, a segment is a line connecting two points.
// This path only supports 2D paths. Z components will result in undefined 
// behaviors.
class PathLite {
  // Contruct a lite path from vertices (a list of objects of type Vertex)
  constructor(vertices=[]) {

    this.vertices = vertices;

    this._closed = false;

    this._use_z = false;

    // Custom length metric pattern, used in distance calculations of length.
    // Available patterns include any combination of 'x', 'y' and 'z' as a string.
    // For example, 'xy' yields distance calculations in the XY plane.
    this._length_metric = null;

    this._length = null;
    this._length_segments = null;
    this._length_segments_cumulative = null;
  }

  set closed(value) {
    this._closed = value;
    this._flagLengthDirty();
  }

  get closed() {
    return this._closed;
  }

  // This needs to be set before setting vertices.
  set useZ(value) {
    this._use_z = value;
    this._flagVerticesDirty();
  }

  get useZ() {
    return this._use_z;
  }

  set lengthMetric(value) {
    this._length_metric = value;
    this._flagLengthDirty();
  }

  get lengthMetric() {
    return this._length_metric;
  }

  get vertices() {
    this._cleanVertices();
    return this._vertices;
  }

  get tangents() {
    return this.offsets.map(offset => this.getTangentAt(offset));
  }

  get normals() {
    return this.offsets.map(offset => this.getNormalAt(offset));
  }

  _flagVerticesDirty() {
    this._vertices_dirty = true;
    // Flag that length will need to be re-calculated.
    this._flagLengthDirty();
  }

  _cleanVertices() {
    if (this._vertices_dirty) {
      this._vertices_dirty = false;
      // Make a workable copy of vertices, removing z components if requested.
      this._vertices = this._vertices_original.map(i => this.useZ ? i.copy() : i.copy().copy('xy'));
    }
  }

  set vertices(value) {
    // Make all incoming vertices of type Vector, copying non-destructively.
    this._vertices_original = value.map(i => i instanceof Vector ? i.copy() : new Vector(...i));

    // Flag that vertices need to be re-set.
    this._flagVerticesDirty();
  }

  get length() {
    this._cleanLength();
    return this._length;
  }

  get _nSegments() {
    return this.vertices.length - (this.closed ? 0 : 1);
  }

  // Get offsets for each vertex
  get offsets() {
    this._cleanLength();
    return [0].concat([...this._length_segments_cumulative])
      .splice(0, this.vertices.length);
  }

  get times() {
    return this.offsets.map(offset => offset / this.length);
  }

  get lineSegments() {
    return range(this._nSegments)
      .map(i => [this.vertices.at(i), this.vertices.at(i+1)])
  }

  _flagLengthDirty() {
    this._length_dirty = true;
  }

  _cleanLength() {
    if (this._length_dirty) {
      this._length_dirty = false;
      [this._length, this._length_segments] = 
        calcPathLength(this.vertices, this.closed, true, this.lengthMetric);
      this._length_segments_cumulative = this._length_segments.cumulativeSum();
    }
  }

  // Given a point (a Vector), find the nearest curve location object.
  getNearestLocation(...point) {

    // Make point a vector
    point = point.at(0) instanceof Vector ? point.at(0) : new Vector(...point.flat());

    // Find the nearest location across all segments.
    let curveLocation = range(this._nSegments)
    .map(i => {
      let curveLocation = queryPointToSegmentAB(
        point,
        this.vertices.at(i),
        this.vertices.at(i+1)
      );
      curveLocation.index = i;
      return curveLocation;
    })
    .sort((a,b) => {
      // Sort by distance first, then index
      if (a.distance == b.distance) {
        return a.index - b.index;
      } else {
        return a.distance - b.distance;
      }
    })
    .at(0);

    // Validate the curve location.
    if (curveLocation == null) return null;

    // Validate that lengths are clean.
    this._cleanLength();

    // Calculate the offset for this point.
    curveLocation.offset = clamp(
      [0].concat(this._length_segments_cumulative).at(curveLocation.index) +
      curveLocation.point.dist(this.vertices[curveLocation.index]),
      0, 
      this.length
    );

    return curveLocation;
  }

  // Get the index interpolated between [0, _nSegments) for an offset
  _getIndexInterpolatedAt(offset) {

    // Verify that there are clean lengths.
    this._cleanLength();

    // Clamp the offse to the allotted range.
    offset = clamp(offset, 0, this.length);

    // Retrieve the point at this offset
    let ii = clamp(
      [0].concat(this._length_segments_cumulative)
      .indexInterpolated(offset),
      0,
      this._nSegments
    );
    
    // Wrap the index if requested.
    if (this.closed) ii = ii % this._nSegments;

    return ii;
  }

  // Get the point at an offset
  getPointAt(offset) {

    // Get the index interpolated for this offset
    let ii = this._getIndexInterpolatedAt(offset);

    // Find the lo and hi indicies
    let lo = Math.floor(ii);
    let hi = Math.ceil(ii);
    let param = ii-lo;

    // Lerp the vertices to get the point at an offset.
    return this.vertices.at(lo).lerp(this.vertices.at(hi), param);
  }

  // Get the tangent at an offset.
  // By default, when useZ is enabled, the result is confined to the XY plane.
  getTangentAt(offset, confineToXYPlane=true, returnOrtho=false) {
    
    // Get the index interpolated
    let ii = this._getIndexInterpolatedAt(offset);
    // If it's really close to a round number set it to that round number.
    if (Math.abs(ii - Math.round(ii)) < Number.EPSILON) ii = Math.round(ii);

    let mi = this.getPointAt(offset);

    // Method for getting the next unique vertex in a specified direction (-1 or +1).
    let getNextUniqueVertex = (indexInterp, direction) => {

      // Calculate the first offset vertex index to check
      let lastIndex = indexInterp;
      for (let i = 0; i < this._nSegments+1; i++) {

        // Calculate the next index and clamp to correct range based on path closure.
        let index = Math.round(lastIndex) == lastIndex
          ? (lastIndex + direction)
          : (direction >= 0 ? Math.ceil(lastIndex) : Math.floor(lastIndex));
        index = this.closed ? (index % this.vertices.length) : clamp(index, 0, this.vertices.length-1);

        // Is this index different from the last index?
        // If not, then we can't find the next unique vertex, so return null.
        if (index == lastIndex) return null;

        // Otherwise, check if this index is different from the point of interest
        if (this.vertices.at(index).hash() != mi.hash()) return this.vertices.at(index);

        // Save this index
        lastIndex = index;
      }

      return null;
    }

    // Get the unique vertices above and below.
    let lo = getNextUniqueVertex(ii, -1);
    let hi = getNextUniqueVertex(ii, 1);
    
    // Validate lo and hi
    if (lo == null && hi == null) {
      return new Vector();
    }

    // Get the vector heading directly above and below.
    let loDir = lo ? (confineToXYPlane ? mi.copy('xy').sub(lo.copy('xy')).norm() : mi.sub(lo).norm()) : null;
    let hiDir = hi ? (confineToXYPlane ? hi.copy('xy').sub(mi.copy('xy')).norm() : hi.sub(mi).norm()) : null;
    
    // Calculate the tangent
    let tangent = (lo ? hi ? loDir.slerp(hiDir, 0.5) : loDir : hiDir).norm();

    if (returnOrtho) {
      // Calculate the orthonormal vector to loDir and hiDir
      let ortho = loDir.ortho(hiDir);
      return [tangent, ortho];
    } else {
      return tangent;
    }
  }

  // Get the normal at an offset.
  // By default, when useZ is enabled, the result is confined to the XY plane.
  getNormalAt(offset, confineToXYPlane=true) {
    // How we calculate the normal depends on whether this path is in 2d or 3d,
    // and whether we want to confine the normal to the xy plane, which is 
    // true by default.
    if (this.useZ) { // 3D

      if (confineToXYPlane) { // tangent lies in XY plane

        // Cross the tangent with the up vector
        // return this.getTangentAt(offset).ortho(new Vector(0, 0, 1));
        // return this.getTangentAt(offset).cross(new Vector(0, 0, 1));
        return this.getTangentAt(offset).copy('xy').norm().cross(new Vector(0, 0, 1));
      
      } else { // tangent lies in 3D space, possibly with a Z-component
        
        // Get the tangent and the ortho vector at this point in the path.
        let [tangent, ortho] = this.getTangentAt(offset, false, true);

        // The normal will be ortho to the tangent and the ortho vector
        return tangent.ortho(ortho);
      }

    } else { // 2D

      // Get the tangent and rotate it 90 degrees.
      return this.getTangentAt(offset).rotate(-Math.PI/2);
    }
  }

  // Calculate the signed distance for a set of points.
  // TODO: May not work for 3D paths (when useZ is enabled).
  calcSignedDistance(points) {

    points = [points].flat();

    return points
    // Get the offset for all points
    .map(point => [point, this.getNearestLocation(point)])
    .map(([point, curveLocation]) => {
      // Calculate the normal direction.
      let normal = this.getNormalAt(curveLocation.offset);
      // Does the point, relative to the nearest point, face in the same direction 
      // as the normal?
      let dot = point.sub(curveLocation.point).norm().dot(normal);
      // If so, the sign is positive. Otherwise, it's negative.
      let sign = dot >= 0 ? 1 : -1;
      // Return the signed distance
      return curveLocation.distance * sign;
    });
  }

  // Remove identical neighboring vertices 
  _removeDuplicateVertices() {
    this.vertices = removeDupPointsFromPath(this.vertices, this.closed);
  }

  _removeColinearVertices() {
    this.vertices = removeColinearPointsFromPath(this.vertices, this.closed);
  }

  // Remove duplicate vertices by position and colinearity.
  reduce() {
    this._removeDuplicateVertices();
    this._removeColinearVertices();
    return this;
  }

  // Clear all vertex data in this path, but keep the closed status
  clearVertices() {
    this.vertices = [];
  }

  remove() {
    // Release all utilized resources
  }

}