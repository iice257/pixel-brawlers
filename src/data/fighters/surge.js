// SURGE "THE TIDE": teal profile homage. Authored facing RIGHT.
// Grids use the shared glyph legend (docs/ART_BIBLE.md section 1). No outer outline: the baker adds it.
export const palette = {
  skin: ['#80433d', '#ee8b75', '#f6b09a', '#fecbb2', '#fdefe1'],
  hair: ['#0c2250', '#0b4c80', '#1e92a0', '#3cbcc2'],
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
    '.............cd.................',
    '.......d....cbca.....a..........',
    '.......cca.cbdbba..ccc..........',
    '.d....cbbbcdbcbbbcaccba.........',
    '..dca.cbbbbbcbbbbcabbba.........',
    '..cbbcbabbbbccbbcbabbbbacca.....',
    '...cbbbbabccbabcbbabbbabbcc.....',
    '...cbbccacbbbabbbbabbbabcbba....',
    '..cbccbbbabbbbabbbabbabbbbba....',
    '.cbbbbbbbabbbbabbbbbbabbbbbba...',
    '.abbbbbbbbabbbbbbbbbaaaaaaaaaa..',
    '.cabbbbbbbbbbbbbbaaa55544.......',
    '.cbccbbbbbbbbbaaa3333OOOOO......',
    'cbbbaccbbbbbaa33333331wwy1O.....',
    'cbbbbbabbbbb333344444422245.....',
    'cabbbbbabbbb3OOO4445543333354...',
    'cbabbbbbabbb323O34454533333344..',
    'cbbaabbbbbbb33OO34444433333OO2..',
    'cbbccccbbbbb323322223333333222..',
    'cbbbbbabbbba3333222223333332....',
    'cbabbbbaabb33333322222333234....',
    'cbbabbbbaab3332O333333331xxx....',
    'cbbbabba.ab33332O3333333322.....',
    'cbbbbaa..4a33332O33333333113....',
    'cbbbba...43333322O2233333324....',
    'cbbbba..433333222211223322......',
    'aaaaa..443332222222O1122........',
    '......4443322222222O221.........',
    '.....444433O22222222O2..........',
    '...444444432O2222222224.........',
    '.45544444422O222222222344O......',
    '4455544444333O333333333333O44...',
    '2222222222222O2222222222222O2222',
  ],
};

// Neck pivot: where the head attaches to the torso (x,y inside the grid).
export const pivots = {
  head_neutral: [16, 30],
};
