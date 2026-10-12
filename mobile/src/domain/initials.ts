/**
 * Initiales d'un nom : les deux premiers mots qui commencent par une lettre
 * (prototype : `ini` dans specs/reference/app.js).
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /[A-Za-zÀ-ÿ]/.test(word[0] ?? ''))
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Initiale décorative d'une affiche de remplacement : 1er caractère du titre,
 * sans préfixe « L' », « Le », « La », « Les », « The », « Une » (prototype : `A.pv`).
 */
export function posterInitial(title: string): string {
  return title
    .replace(/^(L'|Le |La |Les |The |Une )/, '')
    .charAt(0)
    .toUpperCase();
}
