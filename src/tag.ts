export const Tags = ['__', 'OG','DS','FS','WS','MC','LD','S1','S2','S3','W1','W2','W3','VA','WK',
    'A1','A2','B1','B2','C1','L1','L2','L3','L4','L5','GL','GS','AW','TL','BL','DL','FE',
    'CA','WB','BN','ZK','GK','KY','T4','T6','TF','IS','ST','GR','GM','BE','LH'] as const;
export type Tag = typeof Tags[number];

export const TagName: Record<Tag, string> = {
    __: 'ALL',
    OG: 'Ogden',
    DS: 'DolchSight',
    FS: 'FrySight',
    WS: 'WrittenSight',
    MC: 'Macmillan',
    LD: 'LangmanD',
    S1: 'LangmanS1',
    S2: 'LangmanS2',
    S3: 'LangmanS3',
    W1: 'LangmanW1',
    W2: 'LangmanW2',
    W3: 'LangmanW3',
    VA: 'VOA1500',
    WK: 'Wik1000',
    A1: 'OxfordA1',
    A2: 'OxfordA2',
    B1: 'OxfordB1',
    B2: 'OxfordB2',
    C1: 'OxfordC1',
    L1: 'Collins1',
    L2: 'Collins2',
    L3: 'Collins3',
    L4: 'Collins4',
    L5: 'Collins5',
    GL: 'NGSL',
    GS: 'NGSLS',
    AW: 'NAWL',
    TL: 'TSL',
    BL: 'BSL',
    DL: 'NDL',
    FE: 'FEL',
    CA: 'COCA',
    WB: 'iWeb',
    BN: 'BNC',
    ZK: 'HSEE',
    GK: 'NECC',
    KY: 'NPEE',
    T4: 'CET4',
    T6: 'CET6',
    TF: 'Toefl',
    IS: 'Ietls',
    ST: 'SAT',
    GR: 'GRE',
    GM: 'GMAT',
    BE: 'BEC',
    LH: 'Lorhur'
}

export const TagCode: Record<string, Tag> = {
    ogden:      'OG',
    fry:        'FS',
    macmillan:  'MC',
    longmand:   'LD',
    longmanS1:  'S1',
    longmanS2:  'S2',
    longmanS3:  'S3',
    longmanW1:  'W1',
    longmanW2:  'W2',
    longmanW3:  'W3',
    voa:        'VA',
    wik:        'WK',
    oxfordA1:   'A1',
    oxfordA2:   'A2',
    oxfordB1:   'B1',
    oxfordB2:   'B2',
    oxfordC1:   'C1',
    collins1:   'L1',
    collins2:   'L2',
    collins3:   'L3',
    collins4:   'L4',
    collins5:   'L5',
    ngsl:       'GL',
    ngsls:      'GS',
    nawl:       'AW',
    tsl:        'TL',
    bsl:        'BL',
    ndl:        'DL',
    fel:        'FE',
    coca:       'CA',
    iweb:       'WB',
    bnc:        'BN',
    hsee:       'ZK',
    ncee:       'GK',
    npee:       'KY',
    cet4:       'T4',
    cet6:       'T6',
    toefl:      'TF',
    ielts:      'IS',
    sat:        'ST',
    gre:        'GR',
    gmat:       'GM',
    bec:        'BE',
    lorhur:     'LH'
}

export class TagSet extends Set<Tag> {
    attach(tags: Iterable<Tag>) {
        for (const tag of tags) this.add(tag);
    }
    remove(tags: Iterable<Tag>) {
        for (const tag of tags) this.delete(tag);
    }
    override toString() {
        return Array.from(this).sort().join(',');
    }
}