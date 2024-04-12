// Determine whether a point is inside a polygon. 
// This works well, except when the point lies on the polygon.
// In that case, behavior is undefined.
// https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon
// Alt? https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/isPointInPath
function pointInPolygon(_point, _vs) {
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

  let point = _point instanceof Vector ? _point.array() : _point;
  let vs = _vs.map(v => v instanceof Vector ? v.array() : v);
  
  let x = point[0], y = point[1];
  
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1];
    let xj = vs[j][0], yj = vs[j][1];
    
    let intersect = ((yi > y) != (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
};

// Calculate the convex hull of an ordered list of Vectors or Nodes.
// You must also provide the pocket requesting this hull.
// Assumes vectors are provided in order of the resulting hull.
// Return null if cannot be found.
const calcConvexHull = (samplesRaw, requestFromPocket=null) => {

  // Collect all vectors that comprise the nodes provided
  let samples = samplesRaw
    .map(sampleRaw => {
      if (sampleRaw instanceof Node) return sampleRaw.getPosition(requestFromPocket);
      else if (sampleRaw instanceof Vector) return sampleRaw;
      else console.error("Cannot calcConvexHull with samples of invalid type.");
    })
    .flat(2);

  // Build up a sequence of the max convex angles along this
  // path of vectors.
  let hull = samples.splice(0,1);
  while (samples.length > 1) {

    // Find the average angle to all remaining vectors.
    // This angle will serve as the reference angle we use to calculate the 
    // max angle for each sample.
    let dirRef = (new Vector()).fromAngle(wrappedAverage(
      samples.map(sample => sample.sub(hull.at(-1)).heading())
      , 2*Math.PI
    ));

    // Alt method for calculating the reference angle would be finding
    // the angle to the last vector. This will not work when the angle
    // is so acute that samples can be confused as having large angles when they
    // actually have small angles.
    // let posRef = null;
    // if (hull.length == 1) {
    //   // Use the first node to calculate this angle.
    //   let neighborIndex = nodes[0].getNeighborIndex(nodes[1]);
    //   if (neighborIndex < 0) {
    //     console.error("Nodes provided are not vaild.");
    //     return null;
    //   }
    //   // Find the first next built neighbor
    //   let nodeRef = null;
    //   for (let neighborOffset = 1; neighborOffset < nodes[0].nNeighbors; neighborOffset++) {
    //     let neighbor = nodes[0].neighbors.at(neighborIndex+neighborOffset);
    //     if (neighbor.position != null) {
    //       nodeRef = neighbor;
    //       break;
    //     }
    //   }
    //   if (nodeRef == null) {
    //     console.error("Cannot find built neighbor to calculate convex hull.");
    //     return null;
    //   }
    //   // Get the reference position
    //   posRef = Array.isArray(nodeRef.position) ? 
    //     nodeRef.position.at(-1) : nodeRef.position;
    // } else {
    //   // The reference position will be the vector just before
    //   // posRef = hullVectors.at(currentIndex-1);
    //   posRef = hull.at(-2);
    // }
    // let dirRef = posRef.sub(hull.at(-1)).norm();

    // The last vector in `hull` is part of the hull.
    // From this vector, continue building the hull.
    // Find the vector in samples that yields the maximum angle 
    // between the last vector in `hull` and the reference angle.
    // If two angles are the same, choose the point further away.
    let argMax = samples
      .map(sample => {
        let diff = sample.sub(hull.at(-1));
        return {
          angle: dirRef.angleBetween(diff.norm()),
          dist: diff.mag()
        }
      })
      .argAt((a,b) => {
        if (Math.abs(b.angle - a.angle) > Number.EPSILON) {
          return b.angle - a.angle;
        } else {
          return b.dist - a.dist;
        }
      });

    // Add this sample to the hull
    hull.push(samples[argMax]);

    // Remove samples that have been processed
    samples.splice(0, argMax+1);
  }
  // Add the last sample to the hull, always
  if (samples.length > 0) hull.push(samples.shift());

  // Verify that all samples have been processed
  if (samples.length > 0) {
    console.error("Samples should not contain any more items.");
  }

  return hull;
}

// Can a point be projected onto a line segment (in 2D)? 
// If so, how far away is it?
// All args are of type Vector.
// Returns null if not projectable, or a number indiciating how far away it is
// if it is projectable.
//
//                      o (null)
//          o (2)       :
//          :           :
//     .____v______.    v
//
const projectPointToSegment = (point, segmentOrigin, segmentVector) => {
  if (
    point
    .sub(segmentOrigin)
    .dot(segmentVector) >= -Number.EPSILON
    &&
    point
    .sub(segmentOrigin.add(segmentVector))
    .dot(segmentVector.mult(-1)) >= -Number.EPSILON
  ) {
    // Find how far away the point is
    return point
    .sub(segmentOrigin)
    .project(segmentVector, true)
    .mag()
  }
  return null;
}

// Query the location of a point relative to a segment (in 2D).
const queryPointToSegmentOV = (point, segmentOrigin, segmentVector) => {

  // This is the object returned.
  let curveLocation = {};

  // Is the point nearer to the segment or its end points?
  if (
    point
    .sub(segmentOrigin)
    .dot(segmentVector) >= -Number.EPSILON
    &&
    point
    .sub(segmentOrigin.add(segmentVector))
    .dot(segmentVector.mult(-1)) >= -Number.EPSILON
  ) { // Segment

    // Calculate the point it is nearest to.
    curveLocation.point = point.sub(segmentOrigin).project(segmentVector, false).add(segmentOrigin);
    // Calculate how far it is.
    curveLocation.distance = point.dist(curveLocation.point);

  } else { // End Points

    [curveLocation.point, curveLocation.distance] = [
      segmentOrigin.copy(), 
      segmentOrigin.add(segmentVector)
    ]
    .map(i => [i, point.dist(i)])
    .sort((a,b) => a[1]-b[1])
    .at(0);
  }
  
  // Calculate and save the signed distance.
  // Signed distance cannot be calculated from a segment alone, since neighboring segments
  // will affect sign when the nearest point is a segment end point.
  // let sign = Math.sign(point.sub(curveLocation.point).cross(segmentVector).z) < 0 ? -1 : 1;
  // curveLocation.distanceSigned = curveLocation.distance * sign;
  
  return curveLocation;
}
const queryPointToSegmentAB = (point, segmentStart, segmentEnd) => {
  return queryPointToSegmentOV(point, segmentStart, segmentEnd.sub(segmentStart));
}

// Return a new list with duplicate points removed.
// Only duplicate neighbors are removed. Thus, a sorted list is expected.
// `samples` should be a list of items of type Vector.
const removeDupPointsFromPath = (samples, closed=false) => {
  let samplesNonDup = [];
  let counter = -1;
  while (counter++ < (samples.length-1)) {
    if (samplesNonDup.length == 0) {
      samplesNonDup.push(samples[counter]);
    } else {
      if (samples[counter].dist(samplesNonDup.at(-1)) > Number.EPSILON) {
        samplesNonDup.push(samples[counter]);
      }
    }
  }
  if (closed && samplesNonDup.length >= 2) {
    if (samplesNonDup.at(0).dist(samplesNonDup.at(-1)) <= Number.EPSILON) {
      samplesNonDup.pop();
    }
  }
  return samplesNonDup;
}

// Remove colinear points (points which are superfluous in that
// they lie on the same line as neighboring vertices).
// Note: duplicate points should be removed beforehand.
const removeColinearPointsFromPath = (samples, closed=false) => {
  let newSamples = [];
  samples.forEach((sample, index) => {
    if (!closed && (index == 0 || index == (samples.length-1))) {
      newSamples.push(sample.copy());
    } else {
      let loDir = sample.sub(samples.at(index-1)).norm();
      let hiDir = samples.at(index+1).sub(sample).norm();
      if (Math.abs(loDir.dot(hiDir) - 1) > Number.EPSILON) {
        newSamples.push(sample.copy());
      }
    }
  });
  return newSamples;
}

// Get the length of a path defined by a list of points.
// This function does not depend on paper.js.
// `samples` should be a list of Vectors.
const calcPathLength = (samples, closed=false, returnAll=false, distPattern=null) => {
  // Calculate all segment lengths.
  let allLengths = 
  (closed ? samples : [...samples].splice(0, samples.length-1))
  .map((sample, sampleIndex) => 
    sample.dist(samples.at(sampleIndex+1), distPattern)
  );
  // Calculate the sum;
  let sum = allLengths.sum();
  // Return values requested
  if (returnAll) {
    return [sum, allLengths];
  } else {
    return sum;
  }
}

// Subdivide the provided path into `nSegments` segments.
// `path` can be of type PathLite or Paper.Path.
const subdividePath = (path, nSegments) => {

  let newSegments = range(nSegments).map(segmentIndex => {
    let param = segmentIndex / (nSegments - (path.closed ? 0 : 1));
    return path.getPointAt(param * path.length);
  });

  if (path instanceof PathLite) {

    path.vertices = newSegments;

  } else { // Paper.Path
    
    path.removeSegments(0, path.segments.length);
    path.addSegments(newSegments);
  }

  return path;
}

// Smooth the provided path nIterations times.
// Accepts paths of type PathLite and Paper.Path
const smoothPath = (path, radius, nIterations, weights=null) => {

  let usePathLite = path instanceof PathLite;

  // Pre-calculate index of index offsets
  let indexOffsets = [[0], range(radius).map(r => [-(r+1), r+1])].flat(2);
  // Pre-calculate the weights of index offsets
  let indexOffsetWeights = indexOffsets.map(indexOffset => {
    return logistic(1 - Math.abs(indexOffset / (radius+1)));
  });
  // let indexOffsetWeightsSum = indexOffsetWeights.sum();
  // indexOffsetWeights = indexOffsetWeights.map(i => i/indexOffsetWeightsSum);

  // Apply smoothing each iteration
  range(nIterations).forEach(() => {

    // Extract new points
    let newSegments = 
    range(usePathLite ? path.vertices.length : path.segments.length)
    .map(segmentIndex => {

      // Calculate the average weighted point and return it
      let [avgPoint, weightSum] = range(1+2*radius).reduce(([point, weightSum], i) => {
        // Get the point at this index offset
        let thisPoint = usePathLite
          ? path.vertices.at(segmentIndex + indexOffsets[i])
          : path.segments.at(segmentIndex + indexOffsets[i]).point;
        // Get the supplied weight
        let weightUser = weights==null ? 1 : weights.at(segmentIndex + indexOffsets[i]);
        // Calculate the weight at this index
        let weight = indexOffsetWeights[i] * weightUser;
        // Accumulate the average
        point.x += thisPoint.x * weight;
        point.y += thisPoint.y * weight;
        if (usePathLite) point.z += thisPoint.z * weight;
        // Accumulate the total weight
        weightSum += weight;
        return [point, weightSum];
      }, [
        usePathLite ? new Vector() : new Point(), 
        0
      ]);
      
      // Average the average point
      avgPoint.x = safeDivide(avgPoint.x, weightSum);
      avgPoint.y = safeDivide(avgPoint.y, weightSum);
      if (usePathLite) avgPoint.z = safeDivide(avgPoint.z, weightSum);
      
      return avgPoint;
    });

    // Replace the old segments with these
    if (path instanceof PathLite) {
      path.vertices = newSegments;
    } else {
      path.removeSegments(0, path.segments.length);
      path.addSegments(newSegments);  
    }
  });

  return path;
}

// Resize 2D path to fit within a rectangle.
// `path` can be of type PathLite or Paper.Path
const fitPathInsideRect = (path, aabbFrom, aabbTo) => {

  let rangeFrom = Math.max(aabbFrom.dims().x, aabbFrom.dims().y);
  let xFrom = (aabbFrom.min.x + aabbFrom.max.x) / 2;
  let yFrom = (aabbFrom.min.y + aabbFrom.max.y) / 2;

  let rangeTo = Math.min(aabbTo.dims().x, aabbTo.dims().y);
  let xTo = (aabbTo.min.x + aabbTo.max.x) / 2;
  let yTo = (aabbTo.min.y + aabbTo.max.y) / 2;
    
  if (path instanceof PathLite) {

    path.vertices = path.vertices.map(vertex => 
      vertex
        .add(-xFrom, -yFrom)
        .mult(1/rangeFrom)
        .mult(rangeTo)
        .add(xTo, yTo)
    );

  } else {

    let mat = (new Matrix())
      .translate(xTo, yTo)
      .scale(rangeTo)
      .scale(1/rangeFrom)
      .translate(-xFrom, -yFrom);
    path.segments.forEach(segment => {
      segment.transform(mat);
    });
  }

  return path; //(1/rangeFrom)/rangeTo;
}

// Given a set of points and a path, order points along
// the path.
// Returned is a list of ordered points. Points may be duplicated if they fit in
// multiple spots.
// `pathPoints` should be a list of Vectors.
// `samples` should be a list of Vectors.
const orderPointsAlongPath = (samples, pathPoints) => {

  // Create an invisible path for quicker computations
  let path = new PathLite(pathPoints);

  // Compute the offsets along the path for all samples
  let samplesOrdered = samples
  .map(sample => {

    // Get the closest curve location to this sample on the path
    let curveLocation = path.getNearestLocation(sample);

    // Get the offset along the path
    let offset = curveLocation.offset;
    
    // Get the normal at this location on the path
    let normal = path.getNormalAt(offset);
    normal = new Vector(normal.x, normal.y).mult(-1);

    // Get the direction from the nearest point to the sample
    let dir = sample.sub(curveLocation.point);

    // Get the angle between the normal and this direction
    let angle = dir.angleBetween(normal);

    // This angle will serve as a secondary sorting mechanism if two offsets are the same

    return [sample, offset, angle];
  })
  .sort((a, b) => {
    let offsetDiff = a[1]-b[1];
    if (Math.abs(offsetDiff) < Number.EPSILON) {
      let angleDiff = a[2]-b[2];
      return angleDiff;
    } else {
      return offsetDiff;
    }
  })
  .map(([sample, offset, angle]) => sample);

  return samplesOrdered;
}

// Offset a convex path with a preference for the given direction 
// and smoothed at the edges with the provided margin.
// `samples` should be an array of Vectors with no duplicate neighboring points.
// Returned is an array of Vectors.
const offsetConvexPath = (samples, targetDirection, targetDirectionFactor, margin, 
  minSpacing, offsetAmt, targetLength) => {

  // TODO: Remove duplicates from samples?
  let samplesNoDup = removeDupPointsFromPath([...samples]);

  // Verify that there are at least two samples present.
  if (samplesNoDup.length <= 1) {
    return samplesNoDup.map(() => new Vector())
  }

  // Space out the samples per the minSpacing requested.
  let samplesSpaced = samplesNoDup
  .map((sample, sampleIndex) => {
    // Subsample this segment if it's too large per the spacing requested.
    let subsamples = [];
    if (sampleIndex < (samplesNoDup.length-1) && minSpacing != null) {
      let dist = sample.dist(samplesNoDup.at(sampleIndex+1));
      let nSegments = Math.ceil(dist / minSpacing);
      subsamples = range(nSegments-1).map(i => {
        let param = (i+1)/nSegments;
        return sample.lerp(samplesNoDup.at(sampleIndex+1), param);
      });
    }
    return [sample].concat(subsamples);
  })
  .flat();

  // Create an invisible path for quicker computations
  let path = new PathLite(samplesSpaced);

  // Pre-compute the momentums for each spaced sample
  let targetDirectionNorm = targetDirection.norm();
  let momentums = samplesSpaced
  .map((sample, sampleIndex) => {

    // Get the samples above and below.
    let lo = sampleIndex > 0 ? samplesSpaced.at(sampleIndex-1) : null;
    let mi = sample;
    let hi = sampleIndex < (samplesSpaced.length-1) ? samplesSpaced.at(sampleIndex+1) : null;
    
    // Get the directions to the lo and hi samples
    let lomi = lo ? mi.sub(lo).norm().rotate(Math.PI/2) : null;
    let mihi = hi ? hi.sub(mi).norm().rotate(Math.PI/2) : null;
    lomi = lomi ? lomi : mihi;
    mihi = mihi ? mihi : lomi;

    // Calculate the normal vector
    let normal = lomi.slerp(mihi, 0.5);

    // Slerp this normal toward the target direction the amount specified.
    // This forms the base momentum.
    let momentum = normal.slerp(targetDirectionNorm, targetDirectionFactor);

    // Attenuate this momentum if this sample lies near the margin, if requested.
    if (margin != null) {
      let distToEdge = absWrappedDiff(path.offsets.at(sampleIndex), 0, path.length);
      let attenuation = mapValue(distToEdge, 0, Math.min(margin, path.length/2), 0, 1, true);
      momentum = momentum.mult(attenuation);
    }

    return momentum;
  });

  // Either offset it a specified amount or offset until it achieves the target length
  const getOffsetSamplesSpaced = (offset) => {
    return samplesSpaced
      .map((sample, sampleIndex) => sample.add(momentums[sampleIndex].mult(offset)))
  }
  let samplesOffset = samplesSpaced;
  if (offsetAmt != null) {
    samplesOffset = getOffsetSamplesSpaced(offsetAmt);
  } else if (targetLength != null) {
    if (targetLength <= path.length) {
      // console.log("Path is already long enough.");
      samplesOffset = samplesNoDup;
    } else {
      // Path is not long enough yet, so make it longer.

      // Get the length of the path if the offet were 1.
      let pathLengthOffset1 = calcPathLength(getOffsetSamplesSpaced(1));
      // Use the ratio from this offset to the current path length to estimate how far 
      // the path should be offset.
      let offsetApprox = targetLength**2 / pathLengthOffset1**2;
      // Now, offset the samples this amount.
      samplesOffset = getOffsetSamplesSpaced(offsetApprox);
      
      // console.log("Path offset by", (calcPathLength(samplesOffset)/targetLength*100).toFixed(0), "%");
    }
  }

  // Find the new convex hull
  let samplesOffsetConvexHull = calcConvexHull(samplesOffset);

  return samplesOffsetConvexHull;
}

// Get the signed distances of a set of points.
// Both arguments are lists of objects of type Vector.
// Returned is a list of signed distances, where left = (-) and right = (+)
const calcSignedDistance = (samples, pathPoints) => {
  return (new PathLite(pathPoints)).calcSignedDistance(samples);
}

// Calculates the intersection of two segments.
// Arguments are all of type Vector
// Returns true or false.
// Note: Does not test special cases when end points are colinear with
// the other segment
// const segmentsIntersect = (a,b,p,q) => {
//   var det, gamma, lambda;
//   det = (b.x - a.x) * (q.y - p.y) - (q.x - p.x) * (b.y - a.y);
//   if (det === 0) {
//     return false;
//   } else {
//     lambda = ((q.y - p.y) * (q.x - a.x) + (p.x - q.x) * (q.y - a.y)) / det;
//     gamma = ((a.y - b.y) * (q.x - a.x) + (b.x - a.x) * (q.y - a.y)) / det;
//     return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
//   }
// };

// Segment Intersection code that checks special cases:
// https://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/
//
// Given three collinear points p, q, r, the function checks if
// point q lies on line segment 'pr'
const pointOnSegment = (p, q, r) => {
  return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
  q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y));
}
//
// To find orientation of ordered triplet (p, q, r).
// The function returns following values
// 0 --> p, q and r are collinear
// 1 --> Clockwise
// 2 --> Counterclockwise
const tripletOrientation = (p, q, r) => {
  // See https://www.geeksforgeeks.org/orientation-3-ordered-points/
  // for details of below formula.
  let val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  return val == 0 
    ? 0 // colinear
    : (val > 0) 
      ? 1 // clockwise
      : 2; // counterclockwise
}
//
// The main function that tests whether the line segment 'p1q1'
// and 'p2q2' intersect.
// Returns:
//  -1    no intersection  
//   0    intersection by end point
//  +1    intersection by segment line
const segmentsIntersect = (p1, q1, p2, q2) => {
  
  // Find the four orientations needed for general and
  // special cases
  let o1 = tripletOrientation(p1, q1, p2);
  let o2 = tripletOrientation(p1, q1, q2);
  let o3 = tripletOrientation(p2, q2, p1);
  let o4 = tripletOrientation(p2, q2, q1);
  
  // General case
  if (o1 != o2 && o3 != o4) return 1;
  
  // Special Cases
  if (
    // p1, q1 and p2 are collinear and p2 lies on segment p1q1
    (o1 == 0 && pointOnSegment(p1, p2, q1))
    // p1, q1 and q2 are collinear and q2 lies on segment p1q1
    || (o2 == 0 && pointOnSegment(p1, q2, q1))
    // p2, q2 and p1 are collinear and p1 lies on segment p2q2
    || (o3 == 0 && pointOnSegment(p2, p1, q2))
    // p2, q2 and q1 are collinear and q1 lies on segment p2q2
    || (o4 == 0 && pointOnSegment(p2, q1, q2))
  ) return 0;
  
  return -1; // Doesn't fall in any of the above cases
}

// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return `null` if the lines don't intersect
const getSegmentsIntersection = (a, b, p, q) => {

  // Check if none of the lines are of length 0
	if ((a.x === b.x && a.y === b.y) || (p.x === q.x && p.y === q.y)) return null;

	let denominator = ((q.y - p.y) * (b.x - a.x) - (q.x - p.x) * (b.y - a.y));

  // Lines are parallel
	if (denominator === 0) return null;

	let ua = ((q.x - p.x) * (a.y - p.y) - (q.y - p.y) * (a.x - p.x)) / denominator;
	let ub = ((b.x - a.x) * (a.y - p.y) - (b.y - a.y) * (a.x - p.x)) / denominator;

  // is the intersection along the segments
	if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;

  // Return a object with the x and y coordinates of the intersection
	let x = a.x + ua * (b.x - a.x)
	let y = a.y + ua * (b.y - a.y)

	return new Vector(x,y);
}

// Count the number of intersections between a set of closed paths.
// Self-intersections count.
// Touching counts as an intersection.
// `paths` should be a list of objects of type `PathLite`
// TODO: Make this work for non-closed paths.
const countPathIntersections = (paths) => {
  
  let ixnCount = 0;

  // Iterate over all paths
  paths.forEach(pathA => {

    // Count self-intersections
    let segmentsA = pathA.lineSegments;
    segmentsA.forEach((segment0, segment0Index) => {
      segmentsA.forEach((segment1, segment1Index) => {
        if (absWrappedDiff(segment0Index, segment1Index, segmentsA.length) > 1) {
          // Check for ixn
          if (segmentsIntersect(...segment0, ...segment1) >= 0) ixnCount++;
        }
      });
    });

    // Count intersections with other paths
    paths
    .filter(pathB => pathB != pathA)
    .forEach(pathB => {
      let segmentsB = pathB.lineSegments;
      segmentsA.forEach(segment0 => {
        segmentsB.forEach(segment1 => {
          if (segmentsIntersect(...segment0, ...segment1) >= 0) ixnCount++;
        })
      })

    });
  });

  return ixnCount/2;
}

// Calculate and return intersections among a set of PathLite's.
// Returned are pairs of curveLocations for each intersection.
const getPathsIntersections = (paths) => {

  // List of curveLocations making up all observed intersections.
  // Each curveLocation object has props:
  // {
  //    point : Vertex
  //    path : PathLite
  //    offset : Number
  //    intersection : curveLocation
  // }
  let hashToCurveLocations = {};

  // Helper method for checking for intersection and saving it if it's new
  let checkForIxn = (segment0, segment1, pathA, pathB, segment0Index, segment1Index) => {
    
    // Check for intersection; if none, then return
    let ixnPoint = getSegmentsIntersection(...segment0, ...segment1);
    if (ixnPoint == null) return;

    // Calculate the hash for this intersection
    let ixnPointHash = ixnPoint.hash();
    // If there's already this intersection, then return.
    if (ixnPointHash in hashToCurveLocations) return;

    // Create a curveLocation for both sides of the intersection.
    let curveLocationA = {
      point : ixnPoint.copy(),
      pointHash : ixnPointHash,
      path : pathA,
      offset : pathA.offsets[segment0Index] + ixnPoint.dist(segment0[0])
    };
    let curveLocationB = {
      point : ixnPoint.copy(),
      pointHash : ixnPointHash,
      path : pathB,
      offset : pathB.offsets[segment1Index] + ixnPoint.dist(segment1[0])
    };

    // Link the curveLocations to each other
    curveLocationA.intersection = curveLocationB;
    curveLocationB.intersection = curveLocationA;

    // Save the curveLocations
    hashToCurveLocations[ixnPointHash] = [curveLocationA, curveLocationB];
  }

  // Iterate over all paths
  paths.forEach(pathA => {

    // Count self-intersections
    let segmentsA = pathA.lineSegments;
    segmentsA.forEach((segment0, segment0Index) => {
      segmentsA.forEach((segment1, segment1Index) => {
        // If the segments are not neighbors, then check for intersection.
        if (absWrappedDiff(segment0Index, segment1Index, segmentsA.length) > 1) {
          checkForIxn(segment0, segment1, pathA, pathA, segment0Index, segment1Index);
        }
      });
    });

    // Count intersections with other paths
    paths
    .filter(pathB => pathB != pathA)
    .forEach(pathB => {
      let segmentsB = pathB.lineSegments;
      segmentsA.forEach((segment0, segment0Index) => {
        segmentsB.forEach((segment1, segment1Index) => {
          checkForIxn(segment0, segment1, pathA, pathB, segment0Index, segment1Index);
        })
      })
    });
  });

  // Return pairs of intersections of the form:
  // [
  //    [ curveLocation, curveLocation ],  // this is an intersection
  //    [ curveLocation, curveLocation ],  // this is another intersection
  //    ...
  // ]
  return Object.values(hashToCurveLocations);
}