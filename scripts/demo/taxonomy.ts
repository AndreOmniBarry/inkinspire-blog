import type { CategoryColour } from "../../src/styles/tokens";

/** The eight categories from blueprint §3.5, with colours for typographic covers. Real, not demo. */
export const seedCategories: Array<{ slug: string; name: string; description: string; colour: CategoryColour }> = [
  { slug: "life-and-lessons", name: "Life and Lessons", colour: "ochre", description: "What ordinary days teach, if we let them." },
  { slug: "personal-growth", name: "Personal Growth", colour: "moss", description: "On becoming, slowly and on purpose." },
  { slug: "human-experiences", name: "Human Experiences", colour: "slate", description: "Small, true moments that say something larger about being alive." },
  { slug: "relationships-and-emotions", name: "Relationships and Emotions", colour: "plum", description: "Love, friendship, family, and everything we feel and rarely say." },
  { slug: "inspirational-stories", name: "Inspirational Stories", colour: "teal", description: "Stories of courage, kindness and turning points." },
  { slug: "poetry-and-creative-writing", name: "Poetry and Creative Writing", colour: "oxblood", description: "Poems and imaginative pieces, typeset with care." },
  { slug: "thought-provoking-reflections", name: "Thought-provoking Reflections", colour: "indigo", description: "Essays that sit with a question a little longer." },
  { slug: "uncomfortable-truths", name: "Uncomfortable Truths", colour: "rust", description: "The things we know, and find it hard to say out loud." },
];

export const seedCollections = [
  {
    slug: "letters-to-my-younger-self",
    name: "Letters to My Younger Self",
    description: "A series of letters to the girl I used to be, about the things nobody told her.",
  },
];
