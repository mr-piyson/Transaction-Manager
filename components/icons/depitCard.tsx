import type * as React from "react";

type DebitCardProps = {
  children?: React.ReactNode;
  className?: string;
  width?: number | string;
  height?: number | string;
};

export default function DebitCard({
  children,
  className,
}: DebitCardProps) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 269 175"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Debit card illustration"
    >
      {/* Card body */}
      <path
        d="M248.825 174.85H20.175C9.07875 174.85 0 165.771 0 154.675V20.175C0 9.07875 9.07875 0 20.175 0H248.825C259.921 0 269 9.07875 269 20.175V154.675C269 165.771 259.921 174.85 248.825 174.85Z"
        className="fill-[#2388B9] stroke-border"
        strokeWidth="1"
      />

      {/* Right-side depth */}
      <path
        d="M248.825 0H215.2C226.296 0 235.375 9.07875 235.375 20.175V154.675C235.375 165.771 226.296 174.85 215.2 174.85H248.825C259.921 174.85 269 165.771 269 154.675V20.175C269 9.07875 259.921 0 248.825 0Z"
        className="fill-[#2388B9]/10"
      />

      {/* Magnetic stripe */}
      <path
        d="M269 40.35H0V80.7H269V40.35Z"
        className="fill-[#17324E]/90"
      />
      <path
        d="M269 40.35H235.375V80.7H269V40.35Z"
        className="fill-[#17324E]/70"
      />

      {/* Mastercard-style circles */}
      <path
        d="M47.075 147.95C58.2173 147.95 67.25 138.917 67.25 127.775C67.25 116.633 58.2173 107.6 47.075 107.6C35.9326 107.6 26.9 116.633 26.9 127.775C26.9 138.917 35.9326 147.95 47.075 147.95Z"
        className="fill-[#E40119]"
      />
      <path
        d="M73.975 147.95C85.1173 147.95 94.15 138.917 94.15 127.775C94.15 116.633 85.1173 107.6 73.975 107.6C62.8326 107.6 53.8 116.633 53.8 127.775C53.8 138.917 62.8326 147.95 73.975 147.95Z"
        className="fill-[#F0991A]/80"
      />

      {/* Card details */}
      <path
        d="M230.331 119.369H122.731C119.946 119.369 117.688 117.111 117.688 114.325C117.688 111.539 119.946 109.281 122.731 109.281H230.331C233.117 109.281 235.375 111.539 235.375 114.325C235.375 117.111 233.117 119.369 230.331 119.369Z"
        className="fill-[#17324E]/60"
      />
      <path
        d="M216.881 139.544H122.731C119.946 139.544 117.688 137.286 117.688 134.5C117.688 131.714 119.946 129.456 122.731 129.456H216.881C219.667 129.456 221.925 131.714 221.925 134.5C221.925 137.286 219.667 139.544 216.881 139.544Z"
        className="fill-[#17324E]/60"
      />

      {children}
    </svg>
  );
}
