export const PoSes = ['n', 'v', 'art', 'adj','adv', 'pron', 'prep','conj','interj'] as const;
export type PoS = typeof PoSes[number];

export const PoSabbrs: Record<PoS, string> = {
    'n': 'noun',
    'v': 'verb',
    'art': 'article',
    'adj': 'adjective',
    'adv': 'adverb',
    'pron': 'pronoun',
    'prep': 'preposition',
    'conj': 'conjunction',
    'interj': 'interjection'
}