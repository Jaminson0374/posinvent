export function typeLabel(type: string): string {
  switch (type) {
    case 'DECOMISO_SANITARIO':
      return 'Decomiso sanitario';
    case 'RESIDUO_VENDIBLE':
      return 'Residuo vendible';
    case 'MERMA_PROCESO':
      return 'Merma proceso';
    default:
      return type;
  }
}

export function typeClass(type: string): string {
  switch (type) {
    case 'DECOMISO_SANITARIO':
      return 'chip-sanitario';
    case 'RESIDUO_VENDIBLE':
      return 'chip-residuo';
    case 'MERMA_PROCESO':
      return 'chip-merma';
    default:
      return '';
  }
}
