export function typeLabel(type: string): string {
  switch (type) {
    case 'PHYSICAL_COUNT':
      return 'Conteo físico';
    case 'DAMAGE':
      return 'Daño';
    case 'EXPIRATION':
      return 'Vencimiento';
    case 'THEFT':
      return 'Hurto';
    case 'OTHER':
      return 'Otro';
    default:
      return type;
  }
}

export function typeClass(type: string): string {
  switch (type) {
    case 'PHYSICAL_COUNT':
      return 'chip-physical';
    case 'DAMAGE':
      return 'chip-damage';
    case 'EXPIRATION':
      return 'chip-expiration';
    case 'THEFT':
      return 'chip-theft';
    default:
      return 'chip-other';
  }
}
