import React from 'react';

interface BrandMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  title?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className, title, ...props }) => {
  return (
    <span
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={['inline-flex shrink-0 items-center justify-center overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <img
        src="/favicon.svg"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
};

export default BrandMark;
