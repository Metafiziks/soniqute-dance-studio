export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 24" aria-label="SoniQute">
      <text x="0" y="18" fontFamily="inherit" fontSize="18" fill="currentColor">SoniQute</text>
    </svg>
  );
}
