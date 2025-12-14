import React, { useState } from 'react';
import { RobotJoints, SceneObject, ObjectShape } from '../types';
import { LIMITS, OBJECT_COLORS, OBJECT_SHAPES, BOX_SIZE } from '../constants';
import { RotateCcw, Box, Hand, Crosshair, Plus, Shapes, Play } from 'lucide-react';

interface ControlsProps {
  joints: RobotJoints;
  setJoints: React.Dispatch<React.SetStateAction<RobotJoints>>;
  gripperOpen: boolean;
  setGripperOpen: (open: boolean) => void;
  reset: () => void;
  ikMode: boolean;
  setIkMode: (mode: boolean) => void;
  onAddObject: (shape: ObjectShape, color: string) => void;
  onRunSequence: () => void;
  isSequenceRunning: boolean;
}

const Slider = ({ label, value, min, max, onChange, disabled }: { label: string, value: number, min: number, max: number, onChange: (val: number) => void, disabled?: boolean }) => {
  const deg = (value * 180 / Math.PI).toFixed(0);
  
  return (
    <div className={`mb-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
        <span>{label}</span>
        <span className="text-orange-400">{deg}° <span className="text-gray-600">({value.toFixed(2)})</span></span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
      />
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ 
  joints, 
  setJoints, 
  gripperOpen, 
  setGripperOpen, 
  reset,
  ikMode,
  setIkMode,
  onAddObject,
  onRunSequence,
  isSequenceRunning
}) => {
  const [activeTab, setActiveTab] = useState<'control' | 'spawn'>('control');
  const [selectedShape, setSelectedShape] = useState<ObjectShape>('box');
  const [selectedColor, setSelectedColor] = useState(OBJECT_COLORS[0]);

  const updateJoint = (key: keyof RobotJoints, val: number) => {
    setJoints(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-md p-6 rounded-xl border border-gray-700 text-white w-80 shadow-2xl overflow-y-auto max-h-[90vh]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-orange-500">
          <Box size={20} />
          <span>KUKA Control</span>
        </h2>
        <button 
          onClick={reset}
          disabled={isSequenceRunning}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white disabled:opacity-50"
          title="Reset Position"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('control')}
          className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'control' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400 hover:text-white'}`}
        >
          Control
        </button>
        <button
          onClick={() => setActiveTab('spawn')}
          className={`flex-1 pb-2 text-sm font-medium transition-colors ${activeTab === 'spawn' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400 hover:text-white'}`}
        >
          Spawner
        </button>
      </div>

      {activeTab === 'control' ? (
        <>
          <div className="flex items-center justify-between mb-4 bg-gray-800 p-2 rounded-lg">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Crosshair size={16} className={ikMode ? "text-green-400" : "text-gray-400"} />
              Inverse Kinematics
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={ikMode} 
                onChange={(e) => setIkMode(e.target.checked)} 
                disabled={isSequenceRunning}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div className="space-y-1 relative">
            {ikMode && (
              <div className="flex flex-col gap-3 mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                   <span className="text-xs text-orange-200">Joints controlled by IK Target</span>
                </div>
                <button
                  onClick={onRunSequence}
                  disabled={isSequenceRunning}
                  className={`w-full py-2 px-3 text-sm font-bold rounded flex items-center justify-center gap-2 transition-all ${
                    isSequenceRunning 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white shadow shadow-green-900/20 active:scale-95'
                  }`}
                >
                  <Play size={14} className={isSequenceRunning ? "animate-pulse" : ""} />
                  {isSequenceRunning ? 'Running Sequence...' : 'Auto Pick & Place'}
                </button>
              </div>
            )}
            
            <div className={ikMode ? "opacity-50 pointer-events-none filter blur-[1px] transition-all" : "transition-all"}>
                <Slider label="J1: Base" value={joints.j1} min={LIMITS.j1.min} max={LIMITS.j1.max} onChange={(v) => updateJoint('j1', v)} disabled={ikMode} />
                <Slider label="J2: Shoulder" value={joints.j2} min={LIMITS.j2.min} max={LIMITS.j2.max} onChange={(v) => updateJoint('j2', v)} disabled={ikMode} />
                <Slider label="J3: Elbow" value={joints.j3} min={LIMITS.j3.min} max={LIMITS.j3.max} onChange={(v) => updateJoint('j3', v)} disabled={ikMode} />
                <Slider label="J4: Roll" value={joints.j4} min={LIMITS.j4.min} max={LIMITS.j4.max} onChange={(v) => updateJoint('j4', v)} disabled={ikMode} />
                <Slider label="J5: Pitch" value={joints.j5} min={LIMITS.j5.min} max={LIMITS.j5.max} onChange={(v) => updateJoint('j5', v)} disabled={ikMode} />
                <Slider label="J6: Yaw" value={joints.j6} min={LIMITS.j6.min} max={LIMITS.j6.max} onChange={(v) => updateJoint('j6', v)} disabled={ikMode} />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Hand size={16} /> Gripper
              </span>
              <span className={`text-xs px-2 py-1 rounded ${gripperOpen ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'}`}>
                {gripperOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <button
              onClick={() => setGripperOpen(!gripperOpen)}
              disabled={isSequenceRunning || (ikMode && isSequenceRunning)}
              className={`w-full py-3 rounded-lg font-bold transition-all transform active:scale-95 ${
                gripperOpen 
                  ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {gripperOpen ? 'Close Gripper' : 'Open Gripper'}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-6">
           <div>
             <label className="text-xs text-gray-400 font-mono mb-2 block">SHAPE</label>
             <div className="grid grid-cols-3 gap-2">
               {OBJECT_SHAPES.map(s => (
                 <button
                   key={s.id}
                   onClick={() => setSelectedShape(s.id as ObjectShape)}
                   className={`p-2 rounded border text-sm flex flex-col items-center gap-1 transition-all ${
                     selectedShape === s.id 
                     ? 'bg-orange-500/20 border-orange-500 text-orange-300' 
                     : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                   }`}
                 >
                   <Shapes size={16} />
                   {s.label}
                 </button>
               ))}
             </div>
           </div>

           <div>
             <label className="text-xs text-gray-400 font-mono mb-2 block">COLOR</label>
             <div className="grid grid-cols-4 gap-2">
               {OBJECT_COLORS.map(c => (
                 <button
                   key={c}
                   onClick={() => setSelectedColor(c)}
                   className={`w-full h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                     selectedColor === c ? 'border-white scale-110' : 'border-transparent'
                   }`}
                   style={{ backgroundColor: c }}
                 />
               ))}
             </div>
           </div>

           <button
             onClick={() => onAddObject(selectedShape, selectedColor)}
             className="w-full py-3 bg-gray-100 hover:bg-white text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
           >
             <Plus size={18} />
             Add Object
           </button>

           <div className="p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
             Objects are spawned in the Pick Area.
           </div>
        </div>
      )}
    </div>
  );
};