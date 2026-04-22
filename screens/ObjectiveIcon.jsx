// Objective node icon — a distinct painterly SVG glyph per objective type
const ObjectiveIcon = ({ type, size = 28, color = 'var(--bone)' }) => {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 48 48', fill: 'none',
    stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'exterminate': // twin crossed skull-fangs
      return (
        <svg {...props}>
          <path d="M12 14 L24 38 L36 14" />
          <path d="M12 38 L24 14 L36 38" />
          <circle cx="24" cy="24" r="4" fill={color} stroke="none"/>
        </svg>
      );
    case 'eliminate_leader': // bleeding crown
      return (
        <svg {...props}>
          <path d="M10 30 L14 16 L20 24 L24 14 L28 24 L34 16 L38 30 Z"/>
          <line x1="14" y1="34" x2="34" y2="34"/>
          <path d="M18 36 L18 42 M24 36 L24 44 M30 36 L30 42" stroke={color}/>
        </svg>
      );
    case 'purge': // Leviathan eye + jaws
      return (
        <svg {...props}>
          <circle cx="24" cy="24" r="14"/>
          <circle cx="24" cy="24" r="6" fill={color} stroke="none"/>
          <circle cx="24" cy="24" r="2" fill="var(--abyss-0)" stroke="none"/>
          <path d="M6 24 Q12 18 16 24 M32 24 Q36 18 42 24" />
        </svg>
      );
    case 'escort': // shepherd staff + ward
      return (
        <svg {...props}>
          <path d="M18 8 Q28 8 28 18 Q28 26 18 26 L18 40" />
          <circle cx="32" cy="36" r="4"/>
          <path d="M12 42 L36 42"/>
        </svg>
      );
    case 'retrieve': // chalice / vein
      return (
        <svg {...props}>
          <path d="M14 10 L34 10 L32 24 Q24 30 16 24 Z"/>
          <line x1="24" y1="30" x2="24" y2="38"/>
          <path d="M18 40 L30 40"/>
          <circle cx="24" cy="18" r="2" fill={color} stroke="none"/>
        </svg>
      );
    case 'seize': // spire with radius ring
      return (
        <svg {...props}>
          <circle cx="24" cy="26" r="14" strokeDasharray="3 3"/>
          <path d="M24 10 L20 22 L28 22 Z"/>
          <rect x="20" y="22" width="8" height="14"/>
          <line x1="24" y1="6" x2="24" y2="10"/>
        </svg>
      );
    case 'advance': // flag with king glyph
      return (
        <svg {...props}>
          <line x1="14" y1="6" x2="14" y2="42"/>
          <path d="M14 10 L36 10 L32 18 L36 26 L14 26 Z"/>
          <path d="M22 14 L22 22 M26 14 L26 22" stroke={color}/>
          <circle cx="24" cy="13" r="1.6" fill={color} stroke="none"/>
        </svg>
      );
    default:
      return <svg {...props}><circle cx="24" cy="24" r="10"/></svg>;
  }
};

window.ObjectiveIcon = ObjectiveIcon;
