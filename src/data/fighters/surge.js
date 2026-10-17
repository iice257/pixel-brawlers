// SURGE "THE TIDE": teal profile homage. Authored facing RIGHT.
// Grids use the shared glyph legend (docs/ART_BIBLE.md section 1). No outer outline: the baker adds it.
export const palette = {
  skin: ['#80433d', '#ee8b75', '#f6b09a', '#fecbb2', '#fdefe1'],
  hair: ['#0c2250', '#0b4c80', '#1e92a0', '#3cbcc2'],
  hairHi: '#8ff0f0',
  clothA: ['#5c1420', '#a42a2a', '#e0553a', '#ff9a64'],
  clothB: ['#6e7080', '#aab0c0', '#e8ecf4', '#ffffff'],
  trim: ['#0b4a66', '#1788ac', '#35c8e0', '#b8f6ff'],
  iris: '#3b82c4',
  prop: ['#1d3e5d', '#5ea0c1'],
  fx: '#35e0ff',
};

export const parts = {
  head_neutral: [
    '................................',
    '..a....cz....cz.................',
    '..za...cda..cbd....a............',
    '...ca.cbcbcccbba..cbz...........',
    '...cccbbcbabcbbbcccbd...........',
    '..cbcbdbbczdbcabbbcbba.ca.......',
    '.cbzbbabbccbbzabbdbcbbcbbc......',
    '.cbbbcbbbacbbabcbbbcbcbdcbd.....',
    '.cbbbacbbabcbabcbbabbbcabbbza...',
    'cbbbbabcbabcbabbcbabbbcbbbbbda..',
    'cbbbabbzcbbbcbbbccabbbabbbcca...',
    'abbbabbbcbbbacbbbcbbaaabbaaa....',
    '.abbbbbbabbbbbcbbaaa555bb3......',
    '..cbbbbbbbbbbbbbaa34OOOOOOO.....',
    '.abcczbbbbbbbbba3333311111......',
    'cbabbcbbbbbbbba3444442wwy224....',
    'cbbaabbbbbbbaaa3444555222235....',
    'abbcbabbbbbabb33O245544333335...',
    '.abbccabbbbbbb3334444444333234..',
    '..cbzbcaabbcbb3322223333333312..',
    '.cabbbbbbabbcb33322222233333....',
    'cbbacbbbbbbbcb331322222223234...',
    'cbbbaccbbbbbbb33211333221xxxx...',
    'abbbbbacbcbbbb322221133333222...',
    '.abbbbbabbcbba222222213333323...',
    '..aabccbabcbb22222222211333334..',
    '...caabccbbba32222222223113354..',
    'aacbbbaabbaa3333322222222212....',
    '..abbbbaaa3333333323212.........',
    '...abba43333333333323311........',
    'aaa.aa44433333333332331.........',
    '43444444433333333333334.........',
    '435554444333333333333334444.....',
    '33353333333333333333333333333333',
  ],
};

// Attach pivots: where each part joins its parent (x,y inside the grid).
export const pivots = {'head_neutral': [16, 30]};
