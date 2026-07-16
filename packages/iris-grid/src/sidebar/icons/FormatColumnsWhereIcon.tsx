import * as React from 'react';

function FormatColumnsWhereIcon(
  props: JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>
): JSX.Element {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <rect width="48" height="48" fill="none" />
      {/* Left column */}
      <rect x="5" y="10" width="15" height="4" fill="#9FDE70" />
      <rect x="5" y="22" width="15" height="4" fill="#9FDE70" />
      <rect x="5" y="28" width="15" height="4" fill="#FFD95C" />
      <rect x="5" y="34" width="15" height="4" fill="#9FDE70" />
      {/* Right column */}
      <rect x="27" y="10" width="15" height="4" fill="#9FDE70" />
      <rect x="27" y="22" width="15" height="4" fill="#9FDE70" />
      <rect x="27" y="28" width="15" height="4" fill="#FFD95C" />
      <rect x="27" y="34" width="15" height="4" fill="#9FDE70" />
    </svg>
  );
}

export default FormatColumnsWhereIcon;
