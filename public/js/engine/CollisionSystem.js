/**
 * High-Performance Mathematical Collision System
 * Circle vs AABB distance calculation
 * Ground crash check (y + r >= 528)
 * Ceiling boundary clamp (y - r <= 0)
 */
export class CollisionSystem {
  /**
   * Circle vs Axis-Aligned Bounding Box (AABB) Distance Calculation.
   * Finds nearest point on AABB to circle center and tests distance squared: d² < r²
   * @param {Object} circle - { x, y, radius }
   * @param {Object} box - { x|rx, y|ry, width|rw, height|rh }
   * @returns {boolean} True if circle intersects AABB
   */
  static checkCircleAABB(circle, box) {
    const cx = circle.x;
    const cy = circle.y;
    const r = circle.radius !== undefined ? circle.radius : 13;

    const rx = box.rx !== undefined ? box.rx : (box.x !== undefined ? box.x : 0);
    const ry = box.ry !== undefined ? box.ry : (box.y !== undefined ? box.y : 0);
    const rw = box.rw !== undefined ? box.rw : (box.width !== undefined ? box.width : 0);
    const rh = box.rh !== undefined ? box.rh : (box.height !== undefined ? box.height : 0);

    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));

    const distX = cx - nearestX;
    const distY = cy - nearestY;
    const distanceSquared = (distX * distX) + (distY * distY);

    return distanceSquared < (r * r);
  }

  /**
   * Checks if bird has crashed into the ground.
   * @param {Object} bird - { y, radius }
   * @param {number} playHeight - Ground level Y (default: 528)
   * @returns {boolean} True if y + r >= playHeight
   */
  static checkGroundCollision(bird, playHeight = 528) {
    const r = bird.radius !== undefined ? bird.radius : 13;
    if ((bird.y + r) >= playHeight) {
      bird.y = playHeight - r;
      if (bird.vy !== undefined && bird.vy > 0) {
        bird.vy = 0;
      }
      return true;
    }
    return false;
  }

  /**
   * Checks if bird top edge reaches or crosses ceiling boundary (y - r <= 0).
   * @param {Object} bird - { y, radius }
   * @returns {boolean} True if y - r <= 0
   */
  static checkCeilingCollision(bird) {
    const r = bird.radius !== undefined ? bird.radius : 13;
    return (bird.y - r) <= 0;
  }

  /**
   * Clamps bird position and velocity at ceiling boundary if hit.
   * @param {Object} bird - Bird entity
   * @returns {boolean} True if ceiling was hit
   */
  static applyCeilingBoundary(bird) {
    const r = bird.radius !== undefined ? bird.radius : 13;
    if (bird.y - r <= 0) {
      bird.y = r;
      if (bird.vy < 0) {
        bird.vy = Math.max(0, bird.vy);
      }
      return true;
    }
    return false;
  }

  /**
   * Checks collision between bird circle and a single pipe pair (top & bottom pipes).
   * @param {Object} bird - Bird entity or bounding circle
   * @param {Object} pipePair - Pipe pair object
   * @returns {boolean} True if collision detected
   */
  static checkPipeCollision(bird, pipePair) {
    // Avoid object allocation per frame if possible, but respect getBoundingCircle if it exists.
    // If we must create an object, fallback radius to 13.
    const circle = bird.getBoundingCircle ? bird.getBoundingCircle() : bird;
    if (circle.radius === undefined) circle.radius = 13;

    const topBox = pipePair.topPipe || {
      rx: pipePair.x,
      ry: 0,
      rw: pipePair.width || 64,
      rh: pipePair.topHeight
    };

    const bottomBox = pipePair.bottomPipe || {
      rx: pipePair.x,
      ry: pipePair.bottomY,
      rw: pipePair.width || 64,
      rh: pipePair.bottomHeight !== undefined ? pipePair.bottomHeight : (528 - pipePair.bottomY)
    };

    return this.checkCircleAABB(circle, topBox) || this.checkCircleAABB(circle, bottomBox);
  }

  /**
   * Checks all possible collisions for bird (ceiling clamp, ground crash, pipe pair hits).
   * @param {Object} bird - Bird entity
   * @param {Array} pipes - Active pipe pairs list
   * @param {number} playHeight - Ground level Y (default: 528)
   * @returns {Object} { collided: boolean, cause: string|null }
   */
  static checkAll(bird, pipes, playHeight = 528) {
    // 1. Ceiling collision clamping
    this.applyCeilingBoundary(bird);

    // 2. Ground crash check
    if (this.checkGroundCollision(bird, playHeight)) {
      return { collided: true, cause: 'ground' };
    }

    // 3. Pipe collision check
    if (pipes && pipes.length > 0) {
      const birdR = bird.radius !== undefined ? bird.radius : 13;
      for (const pipePair of pipes) {
        // Broad-phase AABB horizontal bounds check to skip far pipes
        const pipeRight = pipePair.x + (pipePair.width || 64);
        if (bird.x + birdR < pipePair.x || bird.x - birdR > pipeRight) {
          continue;
        }

        if (this.checkPipeCollision(bird, pipePair)) {
          return { collided: true, cause: 'pipe' };
        }
      }
    }

    return { collided: false, cause: null };
  }
}
