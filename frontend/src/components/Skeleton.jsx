import React from 'react';
import clsx from 'clsx';

const Skeleton = ({ className, variant = 'text', ...props }) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'h-4 rounded',
    title: 'h-8 w-3/4 rounded',
    avatar: 'h-12 w-12 rounded-full',
    thumbnail: 'h-48 w-full rounded-lg',
    card: 'h-64 w-full rounded-lg',
    button: 'h-10 w-24 rounded-md',
    input: 'h-10 w-full rounded-md',
  };

  return (
    <div 
      className={clsx(baseClasses, variantClasses[variant], className)} 
      {...props}
    />
  );
};

export const DatabaseCardSkeleton = () => (
  <div className="card p-6">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <Skeleton variant="title" className="mb-2" />
        <Skeleton variant="text" className="w-1/2 mb-4" />
        <div className="flex gap-2">
          <Skeleton variant="text" className="w-20" />
          <Skeleton variant="text" className="w-20" />
        </div>
      </div>
      <Skeleton variant="avatar" />
    </div>
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-3 gap-4">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
    </div>
  </div>
);

export const MetricCardSkeleton = () => (
  <div className="card p-6">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton variant="text" className="w-20 mb-2" />
        <Skeleton variant="title" className="w-16" />
      </div>
      <Skeleton variant="avatar" className="w-12 h-12" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3">
    <div className="grid gap-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="w-24" />
          <Skeleton variant="text" className="w-24" />
        </div>
      ))}
    </div>
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4">
    <div>
      <Skeleton variant="text" className="w-24 mb-2" />
      <Skeleton variant="input" />
    </div>
    <div>
      <Skeleton variant="text" className="w-24 mb-2" />
      <Skeleton variant="input" />
    </div>
    <Skeleton variant="button" className="w-full mt-6" />
  </div>
);

export default Skeleton;
