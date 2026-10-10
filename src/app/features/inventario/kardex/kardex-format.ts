export function typeLabel(type: string): string {
  switch (type) {
    case 'ENTRY':
      return 'Entrada';
    case 'EXIT':
      return 'Salida';
    case 'ADJUSTMENT':
      return 'Ajuste';
    case 'TRANSFER_IN':
      return 'Traslado +';
    case 'TRANSFER_OUT':
      return 'Traslado −';
    case 'DISPOSAL':
      return 'Decomiso';
    case 'RETURN':
      return 'Devolución';
    case 'PRODUCTION_CONSUMPTION':
      return 'Cons. Prod.';
    case 'PRODUCTION_OUTPUT':
      return 'Salida Prod.';
    case 'PRODUCTION_SHRINKAGE':
      return 'Merma Prod.';
    default:
      return type;
  }
}

export function typeClass(type: string): string {
  switch (type) {
    case 'ENTRY':
      return 'chip-entry';
    case 'EXIT':
      return 'chip-exit';
    case 'ADJUSTMENT':
      return 'chip-adj';
    case 'TRANSFER_IN':
    case 'TRANSFER_OUT':
      return 'chip-transfer';
    case 'DISPOSAL':
      return 'chip-disposal';
    case 'RETURN':
      return 'chip-return';
    case 'PRODUCTION_CONSUMPTION':
      return 'chip-prod-consume';
    case 'PRODUCTION_OUTPUT':
      return 'chip-prod-output';
    case 'PRODUCTION_SHRINKAGE':
      return 'chip-prod-shrink';
    default:
      return '';
  }
}
