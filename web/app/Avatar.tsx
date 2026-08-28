/**
 * Avatar con las iniciales de la persona.
 *
 * El color se deriva del nombre, así cada usuario tiene siempre el mismo
 * y se distinguen de un vistazo sin necesidad de fotos reales.
 */
const PALETTE = [
  ['#22c55e', '#0d9488'],
  ['#3b82f6', '#1d4ed8'],
  ['#a855f7', '#7c3aed'],
  ['#f59e0b', '#d97706'],
  ['#ec4899', '#be185d'],
  ['#06b6d4', '#0e7490'],
];

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function colorFor(name: string): string[] {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return PALETTE[sum % PALETTE.length];
}

export default function Avatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const [from, to] = colorFor(name);
  return (
    <div
      className="avatar-i"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: size * 0.36,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
