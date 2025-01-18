# Vocabulary

词书生成工具，使用TypeScript编写, 运行环境为Deno。

if you want to build all data by youself, you need run it use [Deno](https://deno.land/).  
You can download **vocabulary.txt** directly.

How to run:
```bash
deno task run[ -d][ name]
deno task release
```
-d: debug.  
name: run "name" section only.

## Ogdens
奥格登基础英语850词 Odgen's BASIC ENGLISH VOCABULARY  
数据来自 <http://ogden.basic-english.org/words.html>

## Wik
维基词典1000基础词汇 Appendix: 1000 basic English words  
数据来自 <https://en.wiktionary.org/wiki/Appendix:1000_basic_English_words>

## VOA
VOA慢速英语1500基础词汇 VOA Special English Word Book  
数据来自 <https://simple.wikipedia.org/wiki/Wikipedia:VOA_Special_English_Word_Book>

## Macmillan
麦克米伦词典2500释义词汇 Clear Definitions From Macmillan Dictionary  
数据来自 <https://www.macmillandictionary.com/learn/clear_definitions/>

## LongmanD
朗文词典2500释义词汇 The Longman American Defining Vocabulary  
数据来自 <http://www.longmandictionariesusa.com/res/shared/vocab_definitions.pdf>

## LongmanC
朗文通讯3000词 Longman Communication 3000  
数据来自 <https://www.lextutor.ca/freq/lists_download/longman_3000_list.pdf>

## Oxford
牛津5000词汇, Oxford 5000, 分为A1,A2,B1,B2,C1五个级别  
数据来自 <https://www.oxfordlearnersdictionaries.com/wordlists/>

## Collins
柯林斯词典词频分级词汇1-5星  
数据来自 <https://pan.baidu.com/s/1Eu2kfAIdMwy_mM6Wokllrw> 提取码:2suj

## NGSL NAWL TSL BSL NDL FEL NGSL-S
新GSL词汇 NEW GENERAL SERVICE LIST (NGSL)  
新学术词汇 NEW ACADEMIC WORD LIST (NAWL)  
托业词汇 TOEIC(Test of English for International Communication) SERVICE LIST (TSL)  
商业词汇 BUSINESS SERVICE LIST (BSL)  
健身词汇 FITNESS ENGLISH LIST (FEL)  
新Dolch词汇 NEW DOLCH LIST (NDL)  
新GSL词汇口语版 NEW GENERAL SERVICE LIST-SPOKEN (NGSL-S)  
数据来自 <http://www.newgeneralservicelist.org/>

## COCA
当代美国英语语料库 Corpus of Contemporary American English (COCA) top5000  
iWeb语料库 top5000
数据来自 <https://www.wordfrequency.info/>

## BNC
英国国家语料库 British National Corpus (BNC) top5000  
数据来自 <http://ucrel.lancs.ac.uk/bncfreq/flists.html>

## HSEE NCEE NPEE CET4 CET6 TOEFL Ietls SAT GRE GMAT BEC
中考英语考试大纲 High School Entrance Examination (HSEE)  
高考英语考试大纲 National College Entrance Examination (NCEE)  
研究生入学考试英语考试大纲 National Postgraduate Entrance Examination (NPEE)  
大学生英语水平测试4级 College English Test Level 4 (CET4)  
大学生英语水平测试6级 College English Test Level 6 (CET6)  
非英语母语英语能力考试(托福) Test of English as a Foreign Language (TOEFL)  
国际英语测试系统(雅思) International English Language Testing System (IELTS)  
美国学术评估测试 Scholastic Assessment Test (SAT)  
美国研究生入学考试 Graduate Record Examinations (GRE)  
研究生管理科入学考试 Graduate Management Admission Test (GMAT)  
商业环境与概念注册会计师考试 Business Environment and Concepts (BEC) CPA Exam Section  
数据来自 https://github.com/kajweb/dict

## vocabulary.txt
上述所有单词加标签, all words above with tags:
```JavaScript
{
    OG: 'Ogden',
    MC: 'Macmillan',
    LD: 'LongmanD',
    S1: 'LongmanS1',
    S2: 'LongmanS2',
    S3: 'LongmanS3',
    W1: 'LongmanW1',
    W2: 'LongmanW2',
    W3: 'LongmanW3',
    VA: 'VOA1500',
    WK: 'Wik1000',
    A1: 'OxfordA1',
    A2: 'OxfordA2',
    B1: 'OxfordB1',
    B2: 'OxfordB2',
    C1: 'OxfordC1',
    C2: 'OxfordC2',
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
    BS: 'BNCS',
    BW: 'BNCW',
    ZK: 'HSEE',
    GK: 'NCEE',
    KY: 'NPEE',
    T4: 'CET4',
    T6: 'CET6',
    TF: 'Toefl',
    IS: 'Ietls',
    ST: 'SAT',
    GR: 'GRE',
    GM: 'GMAT',
    BE: 'BEC'
}
```

欢迎提供更加权威的词表 <sovar.he@gmail.com>，以更新数据版本。