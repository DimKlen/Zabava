import { useEffect, useState } from 'react';
import { Dimensions, Keyboard } from 'react-native';

/**
 * Hauteur que le clavier ouvert recouvre depuis le bas de l'écran (0 fermé), barre de navigation
 * comprise. Une bottom sheet (Modal plein écran, sous la barre de navigation) n'est pas
 * redimensionnée par Android : elle ajoute cette marge sous son contenu pour le garder visible.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', ({ endCoordinates }) =>
      setHeight(Math.max(0, Dimensions.get('screen').height - endCoordinates.screenY)),
    );
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}
