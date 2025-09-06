import React from 'react';

const SimpleAIButton = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button 
        className="bg-blue-500 text-white rounded-full w-16 h-16 shadow-lg hover:bg-blue-600"
        onClick={() => alert('AI Assistant Clicked!')}
      >
        🤖
      </button>
    </div>
  );
};

export default SimpleAIButton;
