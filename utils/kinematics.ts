import { Vector3, Quaternion, Euler, MathUtils } from 'three';
import { RobotJoints } from '../types';
import { LIMITS } from '../constants';

// Simplified Forward Kinematics to calculate joint positions for CCD
// Matches the structure in RobotArm.tsx
export const calculateChain = (joints: RobotJoints) => {
  const positions: Vector3[] = [];
  const rotations: Quaternion[] = [];

  // Helper to apply rotation and translation
  let currentPos = new Vector3(0, 0, 0);
  let currentRot = new Quaternion();

  // 1. Base (J1)
  // Translate(0, 1.1, 0) -> RotateY(J1)
  currentPos.add(new Vector3(0, 1.1, 0));
  const qJ1 = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -joints.j1); // Note: RobotArm uses -j1
  currentRot.multiply(qJ1);
  positions.push(currentPos.clone()); // J1/J2 pivot
  rotations.push(currentRot.clone());

  // 2. Shoulder (J2)
  // RotateZ(J2)
  const qJ2 = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), joints.j2);
  currentRot.multiply(qJ2);
  positions.push(currentPos.clone()); // J2 Pivot (same loc as J1 visual top)
  rotations.push(currentRot.clone());

  // 3. Elbow (J3)
  // Translate(0, 4, 0) (Along current Y) -> RotateZ(J3)
  const vUpperArm = new Vector3(0, 4, 0).applyQuaternion(currentRot);
  currentPos.add(vUpperArm);
  const qJ3 = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), joints.j3);
  currentRot.multiply(qJ3);
  positions.push(currentPos.clone()); // J3 Pivot
  rotations.push(currentRot.clone());

  // 4. Forearm to Wrist Center (J4 housing)
  // Translate(0, 1.5, 0) -> RotateY(J4)
  const vForearm1 = new Vector3(0, 1.5, 0).applyQuaternion(currentRot);
  currentPos.add(vForearm1);
  const qJ4 = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), joints.j4);
  currentRot.multiply(qJ4);
  positions.push(currentPos.clone()); // J4
  rotations.push(currentRot.clone());

  // 5. Wrist Bend (J5)
  // Translate(0, 0.2, 0) (Inside J4 group) -> RotateZ(J5)
  const vWristDist = new Vector3(0, 0.2, 0).applyQuaternion(currentRot);
  currentPos.add(vWristDist);
  const qJ5 = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), joints.j5);
  currentRot.multiply(qJ5);
  positions.push(currentPos.clone()); // J5
  rotations.push(currentRot.clone());

  // 6. Flange (J6)
  // Translate(0, 0.8, 0) -> RotateY(J6)
  const vFlangeDist = new Vector3(0, 0.8, 0).applyQuaternion(currentRot);
  currentPos.add(vFlangeDist);
  const qJ6 = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), joints.j6);
  currentRot.multiply(qJ6);
  positions.push(currentPos.clone()); // J6
  rotations.push(currentRot.clone());

  // 7. Tip
  // Translate(0, 0.5, 0)
  const vTipDist = new Vector3(0, 0.5, 0).applyQuaternion(currentRot);
  currentPos.add(vTipDist);
  positions.push(currentPos.clone()); // Tip

  return { positions, rotations, endEffector: currentPos };
};

export const solveIK = (
  targetPosition: Vector3,
  currentJoints: RobotJoints,
  iterations: number = 5
): RobotJoints => {
  let newJoints = { ...currentJoints };
  
  // We will optimize J1, J2, J3, J5. 
  // J4 and J6 are primarily for orientation, which we are not solving for fully here (Position IK only).
  // J4/J6 will dampen to 0 or stay as is to prevent weird twisting during position solve.
  
  const jointKeys: (keyof RobotJoints)[] = ['j6', 'j5', 'j4', 'j3', 'j2', 'j1'];
  
  // Create axis vectors for each joint type
  const axisY = new Vector3(0, 1, 0);
  const axisZ = new Vector3(0, 0, 1);

  for (let iter = 0; iter < iterations; iter++) {
    for (const key of jointKeys) {
      if (key === 'j6') continue; // Skip J6 for position IK, it doesn't move the tip much

      const chain = calculateChain(newJoints);
      const tipPos = chain.endEffector;
      
      // Stop if close enough
      if (tipPos.distanceTo(targetPosition) < 0.01) break;

      // Get joint position
      // Map keys to chain indices (approximate based on calculateChain push order)
      // indices: 0=J1, 1=J2, 2=J3, 3=J4, 4=J5, 5=J6, 6=Tip
      let jointIdx = 0;
      let rotAxis = axisY; // Default Y

      switch(key) {
        case 'j1': jointIdx = 0; rotAxis = axisY; break;
        case 'j2': jointIdx = 1; rotAxis = axisZ; break;
        case 'j3': jointIdx = 2; rotAxis = axisZ; break;
        case 'j4': jointIdx = 3; rotAxis = axisY; break;
        case 'j5': jointIdx = 4; rotAxis = axisZ; break;
      }

      const jointPos = chain.positions[jointIdx];
      const jointRot = chain.rotations[jointIdx]; // Global rotation of this joint BEFORE its own rotation? 
      // Actually we need the rotation of the parent to project the axis correctly.
      // But CCD is simpler: 
      // Vector to Effector
      const toEffector = new Vector3().subVectors(tipPos, jointPos).normalize();
      // Vector to Target
      const toTarget = new Vector3().subVectors(targetPosition, jointPos).normalize();

      // Current Axis in World Space
      // To get the axis in world space, we need the rotation up to this joint.
      // In calculateChain, rotations[i] includes the rotation of joint i.
      // We need rotation[i-1].
      let parentRot = new Quaternion(); // Identity for J1
      if (jointIdx > 0) parentRot = chain.rotations[jointIdx - 1];
      
      const worldAxis = rotAxis.clone().applyQuaternion(parentRot).normalize();

      // Project vectors onto the plane perpendicular to the rotation axis
      // (CCD works best one DOF at a time)
      // Actually, standard CCD:
      // angle = acos( toEffector dot toTarget )
      // direction determined by cross product vs axis.
      
      // Let's project toEffector and toTarget onto the plane normal to worldAxis
      // v_proj = v - (v . axis) * axis
      const toEffectorProj = toEffector.clone().sub(worldAxis.clone().multiplyScalar(toEffector.dot(worldAxis))).normalize();
      const toTargetProj = toTarget.clone().sub(worldAxis.clone().multiplyScalar(toTarget.dot(worldAxis))).normalize();
      
      let angle = toEffectorProj.angleTo(toTargetProj);
      
      // Determine sign
      const cross = new Vector3().crossVectors(toEffectorProj, toTargetProj);
      if (cross.dot(worldAxis) < 0) angle = -angle;

      // Dampening
      angle = angle * 0.5;

      // Apply
      let newVal = newJoints[key] + angle;
      
      // J1 is inverted in visual mesh (rotation=[0, -j1, 0])
      if (key === 'j1') {
         // The math above assumed positive rotation. If visual is negative, we might need to flip.
         // Let's test: If I want to move left, and axis is Y. 
         // Standard: Positive angle around Y is CCW.
         // Visual: -J1. So if math says +angle, we need to SUBTRACT from J1 if J1 is inverted?
         // Let's keep it standard and see. The calculateChain uses -joints.j1 so it respects the visual.
         // If we add angle to j1, calculateChain will use -(j1+angle).
         // If we needed to rotate +10deg (CCW), and visual is -j1, then j1 should decrease?
         // Let's stick to adding and clamping.
         newVal = newJoints[key] - angle; // Flip for J1 due to visual flip
      } else {
         newVal = newJoints[key] + angle;
      }
      
      // Limits
      const limit = LIMITS[key];
      newVal = MathUtils.clamp(newVal, limit.min, limit.max);
      
      newJoints[key] = newVal;
    }
  }

  return newJoints;
};