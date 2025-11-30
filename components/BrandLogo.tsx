import clsx from 'clsx';

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-baseline font-semibold tracking-tight',
        className,
      )}
    >
      Dorm
      <span className="text-[#990000]">Up</span>
    </span>
  );
}

