
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`surface-card p-3 sm:p-4 md:p-6 rounded-lg shadow-lg ${className}`}>
      {title && <h3 className="text-base sm:text-lg md:text-xl font-semibold surface-text mb-2 sm:mb-3 md:mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;
