import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const EmptyState = ({ 
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className
}) => {
  return (
    <div className={clsx("text-center py-12", className)}>
      {Icon && (
        <div className="mb-4">
          <Icon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <Link to={actionHref} className="btn-primary px-6 py-3 inline-block">
            {actionLabel}
          </Link>
        ) : (
          <button onClick={onAction} className="btn-primary px-6 py-3">
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
};

export default EmptyState;
