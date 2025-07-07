/* eslint-disable no-restricted-globals */

/**
 * Web Worker for Nanite system parallel processing
 * Handles:
 * - LOD selection calculations
 * - Screen-space error computation
 * - Visibility culling
 * - Geometry simplification
 */

// Message handlers
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'SELECT_LODS':
      handleLODSelection(data);
      break;
      
    case 'SIMPLIFY_GEOMETRY':
      handleGeometrySimplification(data);
      break;
      
    case 'FRUSTUM_CULL':
      handleFrustumCulling(data);
      break;
      
    case 'COMPUTE_ERRORS':
      handleErrorComputation(data);
      break;
      
    default:
      console.warn('Unknown worker message type:', type);
  }
};

/**
 * Parallel LOD selection for multiple clusters
 */
function handleLODSelection(data) {
  const { clusters, camera, screenWidth, screenHeight, errorThreshold } = data;
  const results = [];
  
  // Process clusters in parallel batches
  if (clusters && clusters.length > 0) {
    clusters.forEach(cluster => {
      const result = selectBestLOD(
        cluster,
        camera,
        screenWidth,
        screenHeight,
        errorThreshold
      );
      
      if (result) {
        results.push({
          meshId: cluster.meshId,
          clusterId: cluster.cluster ? cluster.cluster.id : cluster.id,
          selectedLevel: result.level,
          error: result.error,
          triangleCount: result.triangleCount
        });
      }
    });
  }
  
  self.postMessage({
    type: 'LOD_SELECTION_COMPLETE',
    results: results
  });
}

/**
 * Select best LOD based on screen-space error
 */
function selectBestLOD(clusterData, camera, screenWidth, screenHeight, errorThreshold) {
  // Handle different cluster data formats
  const cluster = clusterData.cluster || clusterData;
  const bounds = cluster.bounds;
  
  if (!bounds || !bounds.min || !bounds.max) {
    return null; // Skip invalid clusters
  }
  
  // Calculate distance from camera
  const center = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2
  };
  
  const dx = camera.position.x - center.x;
  const dy = camera.position.y - center.y;
  const dz = camera.position.z - center.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // Calculate bounds size
  const sizeX = bounds.max.x - bounds.min.x;
  const sizeY = bounds.max.y - bounds.min.y;
  const sizeZ = bounds.max.z - bounds.min.z;
  const size = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ);
  
  // Project to screen space
  const fov = camera.fov * Math.PI / 180;
  const screenSize = (size / distance) * screenHeight / (2 * Math.tan(fov / 2));
  
  // Calculate error
  const triangleCount = cluster.triangleCount || 1000;
  const error = screenSize / Math.max(1, Math.sqrt(triangleCount));
  
  // Select appropriate LOD level
  let selectedLevel = 0;
  if (error < errorThreshold * 0.25) selectedLevel = 4;
  else if (error < errorThreshold * 0.5) selectedLevel = 3;
  else if (error < errorThreshold) selectedLevel = 2;
  else if (error < errorThreshold * 2) selectedLevel = 1;
  
  return {
    level: selectedLevel,
    error: error,
    triangleCount: triangleCount
  };
}

/**
 * Parallel geometry simplification
 */
function handleGeometrySimplification(data) {
  const { vertices, indices, targetRatio } = data;
  
  // Simple edge collapse simplification
  const simplified = simplifyMesh(vertices, indices, targetRatio);
  
  // Don't transfer ownership, just send the data
  self.postMessage({
    type: 'SIMPLIFICATION_COMPLETE',
    result: simplified
  });
}

/**
 * Simplify mesh using edge collapse
 */
function simplifyMesh(verticesArray, indicesArray, targetRatio) {
  // Convert arrays if needed
  const vertices = verticesArray instanceof Float32Array ? verticesArray : new Float32Array(verticesArray);
  const indices = indicesArray instanceof Uint32Array ? indicesArray : new Uint32Array(indicesArray);
  
  const targetIndexCount = Math.floor(indices.length * targetRatio);
  
  // Build vertex-face adjacency
  const vertexFaces = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const v0 = indices[i];
    const v1 = indices[i + 1];
    const v2 = indices[i + 2];
    
    addVertexFace(vertexFaces, v0, i / 3);
    addVertexFace(vertexFaces, v1, i / 3);
    addVertexFace(vertexFaces, v2, i / 3);
  }
  
  // Simple decimation - sample triangles
  const newIndices = new Uint32Array(targetIndexCount);
  const step = Math.ceil(indices.length / targetIndexCount);
  
  let writeIndex = 0;
  for (let i = 0; i < indices.length && writeIndex < targetIndexCount - 2; i += step * 3) {
    if (i + 2 < indices.length) {
      newIndices[writeIndex++] = indices[i];
      newIndices[writeIndex++] = indices[i + 1];
      newIndices[writeIndex++] = indices[i + 2];
    }
  }
  
  return {
    vertices: Array.from(vertices),
    indices: Array.from(newIndices.slice(0, writeIndex))
  };
}

function addVertexFace(map, vertex, face) {
  if (!map.has(vertex)) {
    map.set(vertex, []);
  }
  map.get(vertex).push(face);
}

/**
 * Parallel frustum culling
 */
function handleFrustumCulling(data) {
  const { objects, frustumPlanes } = data;
  const visible = [];
  const culled = [];
  
  objects.forEach(obj => {
    if (isInFrustum(obj.bounds, frustumPlanes)) {
      visible.push(obj.id);
    } else {
      culled.push(obj.id);
    }
  });
  
  self.postMessage({
    type: 'FRUSTUM_CULL_COMPLETE',
    visible: visible,
    culled: culled
  });
}

/**
 * Check if bounds are in frustum
 */
function isInFrustum(bounds, planes) {
  for (let i = 0; i < 6; i++) {
    const plane = planes[i];
    
    // Find the vertex furthest in the direction of the plane normal
    const px = plane.x > 0 ? bounds.max.x : bounds.min.x;
    const py = plane.y > 0 ? bounds.max.y : bounds.min.y;
    const pz = plane.z > 0 ? bounds.max.z : bounds.min.z;
    
    // If this vertex is outside, the whole box is outside
    if (plane.x * px + plane.y * py + plane.z * pz + plane.w < 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Batch compute screen-space errors
 */
function handleErrorComputation(data) {
  const { clusters, camera, screenHeight } = data;
  const errors = new Float32Array(clusters.length);
  
  clusters.forEach((cluster, index) => {
    // Calculate distance
    const center = {
      x: (cluster.bounds.min.x + cluster.bounds.max.x) / 2,
      y: (cluster.bounds.min.y + cluster.bounds.max.y) / 2,
      z: (cluster.bounds.min.z + cluster.bounds.max.z) / 2
    };
    
    const dx = camera.position.x - center.x;
    const dy = camera.position.y - center.y;
    const dz = camera.position.z - center.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Calculate size
    const sizeX = cluster.bounds.max.x - cluster.bounds.min.x;
    const sizeY = cluster.bounds.max.y - cluster.bounds.min.y;
    const sizeZ = cluster.bounds.max.z - cluster.bounds.min.z;
    const size = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ);
    
    // Screen-space projection
    const fov = camera.fov * Math.PI / 180;
    const screenSize = (size / distance) * screenHeight / (2 * Math.tan(fov / 2));
    
    // Error metric
    const triangleCount = cluster.triangleCount || 1000;
    errors[index] = screenSize / Math.max(1, Math.sqrt(triangleCount));
  });
  
  // Convert to regular array to avoid transfer issues
  self.postMessage({
    type: 'ERROR_COMPUTATION_COMPLETE',
    errors: Array.from(errors)
  });
}

// Export for module bundlers (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleLODSelection, handleGeometrySimplification };
}