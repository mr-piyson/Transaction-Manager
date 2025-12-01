export default function Logo({
  primaryColor = "#4A7BF5",
  width = "100%",
  height = "100%",
  className = "",
  ...props
}) {
  // Helper function to convert hex to HSL
  const hexToHSL = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 210, s: 90, l: 60 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
        default:
          h = 0;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  // Generate color variations based on primary color
  const { h, s, l } = hexToHSL(primaryColor);

  const colors = {
    darkest: `hsl(${h}, ${s}%, ${Math.max(l - 30, 15)}%)`,
    darker: `hsl(${h}, ${s}%, ${Math.max(l - 20, 25)}%)`,
    base: `hsl(${h}, ${s}%, ${l}%)`,
    lighter: `hsl(${h}, ${Math.max(s - 10, 70)}%, ${Math.min(l + 10, 75)}%)`,
    lightest: `hsl(${h}, ${Math.max(s - 20, 50)}%, ${Math.min(l + 25, 90)}%)`,
    highlight: `hsl(${h}, ${Math.max(s - 30, 30)}%, ${Math.min(l + 35, 97)}%)`,
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 186 249"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top left section - darkest facet */}
      <path
        d="M99,0 L0,155.5 L65.5,101 Z"
        fill="url(#paint0_linear)"
        stroke="none"
      />

      {/* Top middle section - brightest top facet */}
      <path
        d="M95,95.5 L65.5,101 L99,0 Z"
        fill="url(#paint1_linear)"
        stroke="none"
      />

      {/* Middle left section - medium facet */}
      <path
        d="M95,95.5 L65.5,101 L0,155.5 Z"
        fill={colors.base}
        stroke="none"
      />

      {/* Middle horizontal section - transitional facet */}
      <path
        d="M95,95.5 L0,155.5 L185.5,95.5 Z"
        fill="url(#paint2_linear)"
        stroke="none"
      />

      {/* Bottom horizontal section - darker middle */}
      <path
        d="M91,155.5 L185.5,95.5 L0,155.5 Z"
        fill={colors.darker}
        stroke="none"
      />

      {/* Bottom right large section - main bright facet */}
      <path
        d="M87.5,249 L121,149.5 L185.5,95.5 Z"
        fill="url(#paint3_linear)"
        stroke="none"
      />

      {/* Bottom middle section - bright highlight */}
      <path
        d="M91,155.5 L121,149.5 L87.5,249 Z"
        fill={colors.lighter}
        stroke="none"
      />

      {/* Bottom left section - complementary facet */}
      <path
        d="M91,155.5 L121,149.5 L185.5,95.5 Z"
        fill={colors.lighter}
        stroke="none"
      />

      <defs>
        {/* Top left - dark to light gradient for depth */}
        <linearGradient
          id="paint0_linear"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={colors.darkest} />
          <stop offset="50%" stopColor={colors.base} />
          <stop offset="100%" stopColor={colors.highlight} />
        </linearGradient>

        {/* Top center - bright reflective surface */}
        <linearGradient
          id="paint1_linear"
          x1="0%"
          y1="50%"
          x2="100%"
          y2="50%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={colors.base} />
          <stop offset="100%" stopColor={colors.lightest} />
        </linearGradient>

        {/* Middle horizontal - vertical depth gradient */}
        <linearGradient
          id="paint2_linear"
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={colors.lighter} />
          <stop offset="100%" stopColor={colors.base} />
        </linearGradient>

        {/* Bottom - largest facet with dramatic light */}
        <linearGradient
          id="paint3_linear"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={colors.darkest} />
          <stop offset="60%" stopColor={colors.base} />
          <stop offset="100%" stopColor={colors.highlight} />
        </linearGradient>
      </defs>
    </svg>
  );
};
