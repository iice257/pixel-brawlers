// BRICK "THE HEADLINER": blond tank-top homage. Authored facing RIGHT (three-quarter front).
// Grids use the shared glyph legend (docs/ART_BIBLE.md section 1). No outer outline: the baker adds it.
export const palette = {
  skin: ['#80433d', '#ee8b75', '#f6b09a', '#fecbb2', '#fdefe1'],
  hair: ['#9d9250', '#d3c148', '#edea90', '#fcfbce'],
  clothA: ['#60605f', '#a9a9a9', '#d7d7d7', '#fefefe'],
  clothB: ['#14213f', '#23407a', '#3866b8', '#6f9be0'],
  trim: ['#2a1a14', '#6a4a20', '#c88a20', '#ffd84a'],
  iris: '#4f8fc0',
  prop: ['#1d3e5d', '#5ea0c1'],
  fx: '#ffd84a',
};

export const parts = {
  head_neutral: [
    '................................',
    '.......a...cc...ca...c....a.....',
    '..d...cca..cba..ca..cba..ca.....',
    '..aa..cbbccbbaccbbccbba.cba..a..',
    '...ca.cbbabbbabbbbabbbbcaba.ca..',
    '...cacdbbabcbabbcbabbbbbabccba..',
    '..ccabbbbacbbabcbbabbbcbacbbbaa.',
    '.cbcbabbbcabbacbbbabbcbabbbbaba.',
    '.cbcbabbbbabbabbbbabcbbabbbbaba.',
    '.cbcbabbba.ababaababbababbbabba.',
    '.cbbbaaba444aba44abba4abbaaaba..',
    '.abba.4a33335a5333aa333aa32aba..',
    '..aa.43333335533333333333332aa..',
    '.....44444444O333333O3333332....',
    '..44434OOOOOOOO3333OOOOOOOOO442.',
    '..433344111111O3333O31111113332.',
    '..4333444wwwyy3355222wwyy333332.',
    '..43334442222233532222222333332.',
    '..2333445554443353222335533332..',
    '...22344554444333322233333332...',
    '.....24244444432222223333322....',
    '......433333333O222O2333332.....',
    '......432333333333333332222.....',
    '......233333322222223r22222.....',
    '.......23231xxxxxxxxxsr222......',
    '........23333222222222sr22......',
    '.........22333322222222sr.......',
    '..........42334444422222sr......',
    '..........4333222222222..ss.....',
    '......hhhhh22222222222hhhg......',
    '..hhhhhhhhhO22222222hOhhhhhhhg..',
    '.hhhhhggghhhO222222hOhhhhhggggg.',
    'hhhhhffhhhhhO33333hhOhhhfffhhhhg',
    '2gffffffffgggO2222gOggffggggggg2',
  ],
};

// Neck pivot: where the head attaches to the torso (x,y inside the grid).
export const pivots = {
  head_neutral: [16, 30],
};
