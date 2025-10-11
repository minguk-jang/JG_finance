
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-gray-800 p-6 rounded-lg shadow-lg ${className}`}>
      {title && <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;
