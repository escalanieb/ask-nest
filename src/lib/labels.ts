/**
 * Plain-language names for values the app stores in a technical form.
 * Only the visible text changes; stored values stay as they are.
 */

/** What each record in a dataset represents (stored as `entity_type`). */
export const recordKindLabel: Record<string, string> = {
  person: "Person",
  establishment: "Business or establishment",
  location: "Place",
  event: "Event",
};

/** How a spreadsheet column is stored (stored as the column `type`). */
export const columnFormatLabel: Record<string, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  category: "Filter category",
  select: "Pick from options",
  email: "Email",
  url: "Web link",
};

export const labelFor = (labels: Record<string, string>, value: string): string =>
  labels[value] ?? value;
