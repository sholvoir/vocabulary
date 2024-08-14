import { type Tag, TagSet } from './tag.ts';

export const delimiter = /[,:] */;

export class Vocabulary extends Map<string, TagSet> {
    addWord(word: string, tags: Iterable<Tag>) {
        if (this.has(word)) this.get(word)!.attach(tags);
        else this.set(word, new TagSet(tags));
    }
    addItem(item: string) {
        const [word, ...tags] = item.split(delimiter).map(w => w.trim());
        if (word) this.addWord(word, tags as Array<Tag>);
    }
    removeTags(word: string, tags: Iterable<Tag>) {
        const otags = this.get(word);
        if (otags) otags.remove(tags);
    }
    removeWordsWithoutTags() {
        for (const [word, tags] of this) if (!tags.size)
            this.delete(word) && console.log(`Without Tags remove word "${word}".`);
    }
    toArray() {
        return Array.from(this).map(([word, tags]) => `${word}${tags.size ? `: ${tags.toString()}` : ''}`);
    }
}