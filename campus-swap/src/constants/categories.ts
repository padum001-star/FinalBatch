export interface Category {
  id: string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { id: 'bakery', label: 'Bakery' },
  { id: 'produce', label: 'Produce' },
  { id: 'prepared_food', label: 'Prepared food' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'other', label: 'Other' },
];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
