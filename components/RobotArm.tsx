import React, { useRef, useImperativeHandle, useEffect } from 'react';
import { Group, Mesh, Vector3 } from 'three';
import { RobotJoints } from '../types';
import { ROBOT_COLOR, ROBOT_METAL } from '../constants';

interface RobotArmProps {
  joints: RobotJoints;
  gripperOpen: boolean;
  onTipUpdate: (tipPosition: Vector3, tipRef: React.RefObject<Group>) => void;
}

const JointMaterial = () => <meshStandardMaterial color={ROBOT_METAL} roughness={0.5} metalness={0.8} />;
const LinkMaterial = () => <meshStandardMaterial color={ROBOT_COLOR} roughness={0.3} metalness={0.1} />;

export const RobotArm = React.forwardRef<Group, RobotArmProps>(({ joints, gripperOpen, onTipUpdate }, ref) => {
  const tipRef = useRef<Group>(null);
  
  // Expose the tip ref to the parent scene for picking logic
  useEffect(() => {
    if (tipRef.current) {
      // Pass a dummy vector initially, the Scene will read the world position directly from the ref
      onTipUpdate(new Vector3(), tipRef);
    }
  }, [onTipUpdate]);

  const fingerOffset = gripperOpen ? 0.25 : 0.08;

  return (
    <group ref={ref} position={[0, 0, 0]}>
      {/* Base Platform */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.4, 0.2, 32]} />
        <JointMaterial />
      </mesh>

      {/* J1: Turret (Rotates Y) */}
      <group rotation={[0, -joints.j1, 0]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1, 1.0, 32]} />
          <LinkMaterial />
        </mesh>

        {/* J2: Shoulder (Rotates Z) */}
        {/* Pivot point at top of turret */}
        <group position={[0, 1.1, 0]} rotation={[0, 0, joints.j2]}>
          
          {/* Shoulder Joint Visual */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 1.4, 32]} />
            <JointMaterial />
          </mesh>
          
          {/* Link 2: Upper Arm */}
          <group position={[0, 2, 0]}>
             <mesh position={[0, 0, 0]} castShadow>
               <boxGeometry args={[0.8, 4, 0.8]} />
               <LinkMaterial />
             </mesh>
          </group>

          {/* J3: Elbow (Rotates Z) */}
          <group position={[0, 4, 0]} rotation={[0, 0, joints.j3]}>
            
            {/* Elbow Joint Visual */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 1.2, 32]} />
              <JointMaterial />
            </mesh>

            {/* Link 3: Forearm housing */}
            <group position={[0, 1.5, 0]}> 
               {/* This link contains J4 rotation internally usually, but we model it as a sequence */}
               <mesh position={[0, 0, 0]} castShadow>
                 <cylinderGeometry args={[0.4, 0.5, 3, 32]} />
                 <LinkMaterial />
               </mesh>

               {/* J4: Forearm Roll (Rotates Y axis of the previous frame, effectively local Y here) */}
               {/* Actually in Kuka, J4 is a roll along the arm axis. Our arm axis is Y here. */}
               <group position={[0, 1.5, 0]} rotation={[0, joints.j4, 0]}>
                  
                  {/* J5: Wrist Bend (Rotates Z) */}
                  <group position={[0, 0.2, 0]} rotation={[0, 0, joints.j5]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[0.3, 0.3, 0.8, 32]} />
                      <JointMaterial />
                    </mesh>

                    {/* Link 5: Wrist */}
                    <mesh position={[0, 0.4, 0]} castShadow>
                      <boxGeometry args={[0.4, 0.8, 0.5]} />
                      <LinkMaterial />
                    </mesh>

                    {/* J6: Flange (Rotates Y axis local) */}
                    <group position={[0, 0.8, 0]} rotation={[0, joints.j6, 0]}>
                      
                      {/* Flange */}
                      <mesh position={[0, 0.1, 0]}>
                        <cylinderGeometry args={[0.3, 0.3, 0.2, 32]} />
                        <JointMaterial />
                      </mesh>

                      {/* Gripper Base */}
                      <group position={[0, 0.3, 0]}>
                         <mesh castShadow>
                           <boxGeometry args={[0.8, 0.2, 0.3]} />
                           <meshStandardMaterial color="#444" />
                         </mesh>

                         {/* Gripper Tool Center Point (TCP) Ref */}
                         <group ref={tipRef} position={[0, 0.5, 0]}>
                           {/* Debug Helper if needed <axesHelper args={[1]} /> */}
                         </group>

                         {/* Finger Left */}
                         <mesh position={[fingerOffset, 0.4, 0]} castShadow>
                           <boxGeometry args={[0.1, 0.6, 0.2]} />
                           <meshStandardMaterial color="#222" />
                         </mesh>

                         {/* Finger Right */}
                         <mesh position={[-fingerOffset, 0.4, 0]} castShadow>
                           <boxGeometry args={[0.1, 0.6, 0.2]} />
                           <meshStandardMaterial color="#222" />
                         </mesh>
                      </group>

                    </group>
                  </group>
               </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});