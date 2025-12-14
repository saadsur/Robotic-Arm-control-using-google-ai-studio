import React, { useState, useCallback } from 'react';
import { Scene } from './components/Scene';
import { Controls } from './components/Controls';
import { RobotJoints, INITIAL_JOINTS, SceneObject, ObjectShape } from './types';
import { BOX_SIZE } from './constants';
import { v4 as uuidv4 } from 'uuid'; // Actually we don't have uuid installed, let's use random string

const App: React.FC = () => {
  const [joints, setJoints] = useState<RobotJoints>(INITIAL_JOINTS);
  const [gripperOpen, setGripperOpen] = useState(true);
  const [ikMode, setIkMode] = useState(false);
  const [sequenceTrigger, setSequenceTrigger] = useState(0);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  
  const [boxes, setBoxes] = useState<SceneObject[]>([
    { id: '1', position: [4, BOX_SIZE / 2, 0], color: '#ef4444', shape: 'box' },
    { id: '2', position: [4, BOX_SIZE / 2, 1.5], color: '#3b82f6', shape: 'box' },
    { id: '3', position: [4, BOX_SIZE / 2, -1.5], color: '#eab308', shape: 'box' },
  ]);

  const reset = useCallback(() => {
    setJoints(INITIAL_JOINTS);
    setGripperOpen(true);
    setIkMode(false);
    setIsSequenceRunning(false);
  }, []);

  const handleAddObject = (shape: ObjectShape, color: string) => {
    // Random position within pick area
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 2; // Radius inside pick area
    // Actually Pick Area is at x=4. Let's spawn around there.
    const x = 4 + (Math.random() - 0.5) * 2;
    const z = (Math.random() - 0.5) * 2;
    
    // Height depends on shape
    const y = shape === 'sphere' ? BOX_SIZE / 1.5 : BOX_SIZE / 2;

    const newObj: SceneObject = {
      id: Math.random().toString(36).substr(2, 9),
      position: [x, y, z],
      color,
      shape
    };
    setBoxes(prev => [...prev, newObj]);
  };

  const handleRunSequence = () => {
    setSequenceTrigger(prev => prev + 1);
    setIsSequenceRunning(true);
  };

  const handleSequenceComplete = () => {
    setIsSequenceRunning(false);
  };

  return (
    <div className="w-full h-screen relative bg-gray-900 overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Scene 
          joints={joints}
          setJoints={setJoints}
          gripperOpen={gripperOpen}
          setGripperOpen={setGripperOpen}
          boxes={boxes}
          setBoxes={setBoxes}
          ikMode={ikMode}
          runSequenceTrigger={sequenceTrigger}
          onSequenceComplete={handleSequenceComplete}
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <Controls 
            joints={joints} 
            setJoints={setJoints}
            gripperOpen={gripperOpen}
            setGripperOpen={setGripperOpen}
            reset={reset}
            ikMode={ikMode}
            setIkMode={setIkMode}
            onAddObject={handleAddObject}
            onRunSequence={handleRunSequence}
            isSequenceRunning={isSequenceRunning}
          />
        </div>
        
        {/* Header / Info */}
        <div className="absolute top-4 left-4 text-white/50 pointer-events-none">
           <h1 className="text-2xl font-bold text-white tracking-wider">ROBO<span className="text-orange-500">SIM</span></h1>
           <p className="text-xs font-mono mt-1">6-DOF INDUSTRIAL MANIPULATOR</p>
           {ikMode && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded mt-2 inline-block">IK MODE ACTIVE</span>}
        </div>
      </div>
    </div>
  );
};

export default App;