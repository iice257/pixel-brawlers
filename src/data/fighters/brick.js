// BRICK "THE HEADLINER": blond tank-top homage. Authored facing RIGHT (three-quarter front).
// Grids use the shared glyph legend (docs/ART_BIBLE.md section 1). No outer outline: the baker adds it.
export const palette = {
  skin: ['#80433d', '#ee8b75', '#f6b09a', '#fecbb2', '#fdefe1'],
  hair: ['#9d7a1a', '#d9a82a', '#ffd84a', '#fff59a'],
  hairHi: '#fffbd0',
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
    '................a...............',
    '......za........za..............',
    '......da...a...cda...a..........',
    '......cc..cbz..cbc..cbz.........',
    '..z..cbcccbcc..cbcccbca.........',
    '.cca.cbcbabccacbbbcbbca......a..',
    '.cbccabbcabccabbbbacdcaa..ccz...',
    '.abcdabbcbdcbabbbbacbbabccda....',
    '..cbbbabcbabbabcbbabbbabcaa.....',
    '..ccbaabcbaababbcaabbaababa.....',
    '..abc4abca55abba33aba33aaa......',
    '...a433aa3553aa3333a3333a.......',
    '....444444443333333333332.......',
    '.4443OOOOOOOO3333OOOOOOOO.......',
    '.43334111111OO53OO122222242.....',
    '.433344wwyy4335333wyy222232.....',
    '.4333442wyy4335333wy2422232.....',
    '.2333322222233353322222222......',
    '..22332555443332333322222.......',
    '....234554443332233322222.......',
    '.....42444443O1213332222........',
    '.....4333333322222333222........',
    '.....2323333322223333322........',
    '......2233331xxxxxr3332.........',
    '.......22333322222sr322.........',
    '........22233333333sr2..........',
    '.........22244444442sr..........',
    '..........43333333332s..........',
    '........hhh2222222222hhg........',
    '.....hhgghOh22222222hOhhhhg.....',
    '..hhhgghhhhOh222222hOhhhgggghg..',
    '.hhhhhhggghhO33333hOhhhhhggghhg.',
    '.3gggggggggggO3333Oggggggggggg3.',
  ],
};

// Joint pivots per part: name -> [x,y] inside the grid (where it hangs off its parent / children attach).
export const pivots = {'head_neutral': {'neck': [16, 32]}};
