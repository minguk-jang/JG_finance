
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`surface-card p-6 rounded-lg shadow-lg ${className}`}>
      {title && <h3 className="text-xl font-semibold surface-text mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;
