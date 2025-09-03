import React from 'react';

const ProfileAvatar = ({ size = "32", className = "" }) => {
  return (
    <div 
      className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold ${className}`}
      style={{ 
        width: size === "32" ? '128px' : size === "16" ? '64px' : size === "8" ? '32px' : `${size}px`,
        height: size === "32" ? '128px' : size === "16" ? '64px' : size === "8" ? '32px' : `${size}px`,
        fontSize: size === "32" ? '2.5rem' : size === "16" ? '1.5rem' : size === "8" ? '1rem' : '2rem'
      }}
    >
      AG
    </div>
  );
};

export default ProfileAvatar;
