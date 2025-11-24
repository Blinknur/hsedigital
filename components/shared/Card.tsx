
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-white rounded-lg border border-slate-200/80 shadow-sm p-4 sm:p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;