export const ROBOT_COLOR = '#ff5722'; // KUKA Orange
export const ROBOT_METAL = '#333333';
export const FLOOR_COLOR = '#1a1a1a';

export const LIMITS = {
  j1: { min: -Math.PI, max: Math.PI },
  j2: { min: -Math.PI / 2, max: Math.PI / 2 },
  j3: { min: -Math.PI / 1.5, max: Math.PI / 1.5 },
  j4: { min: -Math.PI, max: Math.PI },
  j5: { min: -Math.PI / 2, max: Math.PI / 2 },
  j6: { min: -Math.PI, max: Math.PI },
};

export const BOX_SIZE = 0.8;

export const HOME_JOINTS = {
  j1: 0,
  j2: 0.2,
  j3: 0.5,
  j4: 0,
  j5: -0.5,
  j6: 0,
};

export const OBJECT_SHAPES = [
  { id: 'box', label: 'Box' },
  { id: 'sphere', label: 'Sphere' },
  { id: 'cylinder', label: 'Cylinder' },
];

export const OBJECT_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#10b981', // Green
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#64748b', // Slate
];