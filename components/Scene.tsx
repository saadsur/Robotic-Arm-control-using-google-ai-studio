import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, Environment, Text, TransformControls } from '@react-three/drei';
import { Vector3, Group, Mesh } from 'three';
import { RobotArm } from './RobotArm';
import { RobotJoints, SceneObject } from '../types';
import { BOX_SIZE, ROBOT_COLOR, HOME_JOINTS } from '../constants';
import { solveIK, calculateChain } from '../utils/kinematics';
import * as THREE from 'three';

interface SceneProps {
  joints: RobotJoints;
  setJoints: React.Dispatch<React.SetStateAction<RobotJoints>>;
  gripperOpen: boolean;
  setGripperOpen: (open: boolean) => void;
  boxes: SceneObject[];
  setBoxes: React.Dispatch<React.SetStateAction<SceneObject[]>>;
  ikMode: boolean;
  runSequenceTrigger: number;
  onSequenceComplete: () => void;
}

const PICK_AREA_POS = new Vector3(4, 0.05, 0);
const DROP_AREA_POS = new Vector3(-4, 0.05, 0);

type SequencePhase = 'IDLE' | 'APPROACH' | 'DESCEND_PICK' | 'GRIP' | 'LIFT_PICK' | 'TRAVEL' | 'DESCEND_DROP' | 'RELEASE' | 'LIFT_DROP' | 'HOME';

// Helper component to handle the simulation loop
const SimulationController = ({ 
  gripperOpen,
  setGripperOpen,
  tipRef, 
  boxes, 
  setBoxes,
  ikMode,
  ikTargetPos,
  setIkTargetPos,
  joints,
  setJoints,
  runSequenceTrigger,
  onSequenceComplete
}: { 
  gripperOpen: boolean;
  setGripperOpen: (open: boolean) => void;
  tipRef: React.RefObject<Group>;
  boxes: SceneObject[];
  setBoxes: React.Dispatch<React.SetStateAction<SceneObject[]>>;
  ikMode: boolean;
  ikTargetPos: Vector3;
  setIkTargetPos: React.Dispatch<React.SetStateAction<Vector3>>;
  joints: RobotJoints;
  setJoints: React.Dispatch<React.SetStateAction<RobotJoints>>;
  runSequenceTrigger: number;
  onSequenceComplete: () => void;
}) => {
  const heldBoxId = useRef<string | null>(null);
  const prevGripperOpen = useRef(gripperOpen);
  
  // Sequence State
  const [phase, setPhase] = useState<SequencePhase>('IDLE');
  const phaseStartTime = useRef(0);
  const startPos = useRef(new Vector3());
  const endPos = useRef(new Vector3());
  const targetBoxId = useRef<string | null>(null);
  const lastTrigger = useRef(runSequenceTrigger);

  // Trigger Sequence
  useEffect(() => {
    if (runSequenceTrigger > lastTrigger.current) {
      lastTrigger.current = runSequenceTrigger;
      // Find a box to pick
      // Prioritize boxes in Pick Area (x > 0)
      const availableBox = boxes.find(b => b.position[0] > 0);
      
      if (availableBox) {
        targetBoxId.current = availableBox.id;
        setPhase('APPROACH');
        phaseStartTime.current = Date.now();
        startPos.current = ikTargetPos.clone();
        // Target: Above box
        endPos.current = new Vector3(availableBox.position[0], availableBox.position[1] + 2, availableBox.position[2]);
        setGripperOpen(true);
      } else {
        console.warn("No boxes found in pick area");
        onSequenceComplete();
      }
    }
  }, [runSequenceTrigger, boxes, ikTargetPos, onSequenceComplete, setGripperOpen]);

  useFrame((state, delta) => {
    // Sequence Logic
    if (phase !== 'IDLE') {
      const now = Date.now();
      const elapsed = (now - phaseStartTime.current) / 1000;
      const speed = 4.0; // Units per second
      const dist = startPos.current.distanceTo(endPos.current);
      const duration = Math.max(0.5, dist / speed);
      const t = Math.min(1, elapsed / duration);
      
      // Interpolate Position
      const currentLerp = new Vector3().lerpVectors(startPos.current, endPos.current, t);
      
      // For movement phases, update IK target
      if (!['GRIP', 'RELEASE'].includes(phase)) {
        setIkTargetPos(currentLerp);
      }

      if (t >= 1) {
        // Phase Transition
        switch (phase) {
          case 'APPROACH':
            setPhase('DESCEND_PICK');
            phaseStartTime.current = now;
            startPos.current = currentLerp.clone();
            // Get box pos again to be sure
            const box = boxes.find(b => b.id === targetBoxId.current);
            if (box) {
                // Target: Box center (adjusted for gripper offset)
                // Gripper TCP is usually some distance from wrist. 
                // Our IK target is the TCP.
                endPos.current = new Vector3(box.position[0], box.position[1] + 0.2, box.position[2]); 
            } else {
                setPhase('IDLE'); // Abort
                onSequenceComplete();
            }
            break;
            
          case 'DESCEND_PICK':
            setPhase('GRIP');
            phaseStartTime.current = now;
            // Wait a bit for grip
            setGripperOpen(false);
            break;

          case 'GRIP':
             if (elapsed > 0.5) { // 0.5s wait for grip
                setPhase('LIFT_PICK');
                phaseStartTime.current = now;
                startPos.current = ikTargetPos.clone();
                endPos.current = startPos.current.clone().add(new Vector3(0, 3, 0));
             }
             break;

          case 'LIFT_PICK':
            setPhase('TRAVEL');
            phaseStartTime.current = now;
            startPos.current = ikTargetPos.clone();
            // Drop Area + Height
            endPos.current = new Vector3(DROP_AREA_POS.x, 3, DROP_AREA_POS.z);
            break;

          case 'TRAVEL':
            setPhase('DESCEND_DROP');
            phaseStartTime.current = now;
            startPos.current = ikTargetPos.clone();
            endPos.current = new Vector3(DROP_AREA_POS.x, 1, DROP_AREA_POS.z);
            break;

          case 'DESCEND_DROP':
            setPhase('RELEASE');
            phaseStartTime.current = now;
            setGripperOpen(true);
            break;

          case 'RELEASE':
            if (elapsed > 0.5) {
                setPhase('LIFT_DROP');
                phaseStartTime.current = now;
                startPos.current = ikTargetPos.clone();
                endPos.current = startPos.current.clone().add(new Vector3(0, 2, 0));
            }
            break;
            
          case 'LIFT_DROP':
            setPhase('HOME');
            phaseStartTime.current = now;
            startPos.current = ikTargetPos.clone();
            // Calculate Cartesian Home Position
            const homeFK = calculateChain(HOME_JOINTS);
            endPos.current = homeFK.endEffector;
            break;

          case 'HOME':
            setPhase('IDLE');
            onSequenceComplete();
            break;
        }
      }
    }

    // IK Logic (Always active if ikMode is on, or during sequence)
    // We allow IK logic to run even if not in "ikMode" strictly, if sequence is running.
    if (ikMode || phase !== 'IDLE') {
      const solvedJoints = solveIK(ikTargetPos, joints, 5); // Higher iterations for auto movement
      setJoints(solvedJoints);
    }

    // --- Gripper & Physics Logic ---
    if (!tipRef.current) return;

    const tipPos = new Vector3();
    tipRef.current.getWorldPosition(tipPos);
    // Adjust logic center to be slightly below the visual center of the gripper pads
    tipPos.y -= 0.2; 

    // Handle Grabbing
    if (prevGripperOpen.current && !gripperOpen) {
      // Transition from Open -> Closed: Try to grab
      let closestBox: string | null = null;
      let minDistance = 1.2; // Grabbing threshold

      boxes.forEach(box => {
        const boxPos = new Vector3(...box.position);
        const distance = tipPos.distanceTo(boxPos);
        if (distance < minDistance) {
          minDistance = distance;
          closestBox = box.id;
        }
      });

      if (closestBox) {
        heldBoxId.current = closestBox;
      }
    }

    // Handle Releasing
    if (!prevGripperOpen.current && gripperOpen) {
       // Transition from Closed -> Open: Drop
       heldBoxId.current = null;
    }

    // Update Physics/Position
    if (heldBoxId.current) {
      // Move held box to gripper position
      setBoxes(prev => prev.map(b => {
        if (b.id === heldBoxId.current) {
          return { ...b, position: [tipPos.x, tipPos.y, tipPos.z] };
        }
        return b;
      }));
    } else {
      // Simple Gravity: if box is in air, drop it to floor (y=BOX_SIZE/2)
      setBoxes(prev => {
        let changed = false;
        const newBoxes = prev.map(b => {
          // Calculate ground level based on shape
          const groundOffset = b.shape === 'sphere' ? BOX_SIZE / 1.5 : BOX_SIZE / 2;
          
          if (b.position[1] > groundOffset + 0.01) {
            changed = true;
            const newY = Math.max(groundOffset, b.position[1] - 0.2); // Fall speed
            return { ...b, position: [b.position[0], newY, b.position[2]] as [number, number, number] };
          }
          return b;
        });
        return changed ? newBoxes : prev;
      });
    }

    prevGripperOpen.current = gripperOpen;
  });

  return null;
};

const RenderObject = ({ object }: { object: SceneObject }) => {
  let geometry;
  const size = BOX_SIZE;
  
  switch (object.shape) {
    case 'cylinder': 
      geometry = <cylinderGeometry args={[size/2, size/2, size, 32]} />; 
      break;
    case 'sphere': 
      geometry = <sphereGeometry args={[size/1.5, 32, 32]} />; 
      break;
    default: 
      geometry = <boxGeometry args={[size, size, size]} />;
  }

  return (
    <mesh position={object.position} castShadow receiveShadow>
      {geometry}
      <meshStandardMaterial color={object.color} />
    </mesh>
  );
}

export const Scene: React.FC<SceneProps> = ({ joints, setJoints, gripperOpen, setGripperOpen, boxes, setBoxes, ikMode, runSequenceTrigger, onSequenceComplete }) => {
  const tipRef = useRef<Group>(null);
  const [ikTargetPos, setIkTargetPos] = useState<Vector3>(new Vector3(4, 2, 0));

  // Initialize IK Target to current End Effector pos when switching to IK mode
  // This prevents jumping. We use a simple effect for now.
  useEffect(() => {
    if (ikMode) {
      // Calculate current FK
      const fk = calculateChain(joints);
      setIkTargetPos(fk.endEffector);
    }
  }, [ikMode]); // Only run when mode changes

  return (
    <Canvas shadows dpr={[1, 2]}>
      <PerspectiveCamera makeDefault position={[10, 8, 10]} fov={50} />
      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
      
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
      />

      <group position={[0, 0, 0]}>
        {/* The Robot */}
        <RobotArm 
          joints={joints} 
          gripperOpen={gripperOpen} 
          onTipUpdate={(_, ref) => { tipRef.current = ref.current; }}
          ref={useRef(null)}
        />

        {/* IK Target Gizmo */}
        {ikMode && (
          <TransformControls 
            position={[ikTargetPos.x, ikTargetPos.y, ikTargetPos.z]} 
            onObjectChange={(e: any) => {
              if (e?.target?.object) {
                setIkTargetPos(e.target.object.position.clone());
              }
            }}
            mode="translate"
            size={0.7}
          >
            <mesh>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshBasicMaterial color="white" transparent opacity={0.5} wireframe />
            </mesh>
          </TransformControls>
        )}

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
        </mesh>
        <gridHelper args={[50, 50, '#333', '#222']} />

        {/* Zones */}
        <group position={PICK_AREA_POS}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
            <ringGeometry args={[0, 2.5, 32]} />
            <meshBasicMaterial color="#10b981" opacity={0.2} transparent />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[2.4, 2.5, 32]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          <Text position={[0, 0.1, 2.8]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#10b981">
            PICK AREA
          </Text>
        </group>

        <group position={DROP_AREA_POS}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.01, 0]}>
            <ringGeometry args={[0, 2.5, 32]} />
            <meshBasicMaterial color="#ef4444" opacity={0.2} transparent />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[2.4, 2.5, 32]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
           <Text position={[0, 0.1, 2.8]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#ef4444">
            DROP AREA
          </Text>
        </group>

        {/* Objects */}
        {boxes.map((box) => (
          <RenderObject key={box.id} object={box} />
        ))}

        <ContactShadows opacity={0.5} scale={50} blur={1} far={10} resolution={256} color="#000000" />
      </group>
      
      <SimulationController 
        gripperOpen={gripperOpen} 
        setGripperOpen={setGripperOpen}
        tipRef={tipRef}
        boxes={boxes} 
        setBoxes={setBoxes}
        ikMode={ikMode}
        ikTargetPos={ikTargetPos}
        setIkTargetPos={setIkTargetPos}
        joints={joints}
        setJoints={setJoints}
        runSequenceTrigger={runSequenceTrigger}
        onSequenceComplete={onSequenceComplete}
      />
    </Canvas>
  );
};