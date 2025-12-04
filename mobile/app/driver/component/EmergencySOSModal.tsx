import React from 'react';
import { Feather } from '@expo/vector-icons';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmergencySOSModal({ isOpen, onClose }: EmergencySOSModalProps) {
  const emergencyTypes = [
    { id: 'medical', label: 'Medical Emergency', icon: 'activity' as const, color: 'border-red-500' },
    { id: 'accident', label: 'Accident', icon: 'alert-triangle' as const, color: 'border-yellow-500' },
    { id: 'breakdown', label: 'Vehicle Breakdown', icon: 'tool' as const, color: 'border-blue-500' },
    { id: 'security', label: 'Security Threat', icon: 'shield' as const, color: 'border-purple-500' },
  ];

  const handleEmergency = (type: string) => {
    console.log('Emergency triggered:', type);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-3xl w-full max-w-md animate-scale-in">
        
        {/* Header */}
        <div className="p-6 text-center border-b border-gray-200">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Feather name="alert-circle" size={32} color="#DC2626" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Emergency SOS</h2>
          <p className="text-sm text-gray-600">
            Select the type of emergency. Help will be dispatched immediately.
          </p>
        </div>

        {/* Emergency Buttons */}
        <div className="p-6 space-y-3">
          {emergencyTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleEmergency(type.id)}
              className={`w-full flex items-center gap-3 p-4 border-2 ${type.color} rounded-xl text-left active:scale-95 transition-transform`}
            >
              <div
                className={`w-12 h-12 ${type.color.replace('border', 'bg').replace('500', '50')} 
                  rounded-full flex items-center justify-center`}
              >
                <Feather
                  name={type.icon}
                  size={22}
                  color={
                    type.color.includes('red') ? '#DC2626' :
                    type.color.includes('yellow') ? '#CA8A04' :
                    type.color.includes('blue') ? '#2563EB' :
                    '#7C3AED'
                  }
                />
              </div>

              <span className="flex-1 font-semibold text-gray-900">{type.label}</span>

              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </button>
          ))}
        </div>

        {/* Warning + Cancel */}
        <div className="px-6 pb-4">
          <div className="flex gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
            <Feather name="info" size={16} color="#854D0E" />
            <p className="text-xs text-yellow-900">
              False alarms may result in penalties. Only use in real emergencies.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 active:scale-95 transition-transform"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
