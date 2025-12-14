export interface RobotJoints {
  j1: number; // Base rotation (Y axis)
  j2: number; // Shoulder (Z axis)
  j3: number; // Elbow (Z axis)
  j4: number; // Forearm roll (X axis)
  j5: number; // Wrist bend (Z axis)
  j6: number; // Flange rotation (X axis)
}

export type ObjectShape = 'box' | 'sphere' | 'cylinder';

export interface SceneObject {
  id: string;
  position: [number, number, number];
  color: string;
  shape: ObjectShape;
}

export const INITIAL_JOINTS: RobotJoints = {
  j1: 0,
  j2: 0,
  j3: 0,
  j4: 0,
  j5: 0,
  j6: 0,
};
