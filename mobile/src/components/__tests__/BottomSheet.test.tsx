import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { shadows } from '@/theme/tokens';

import { BottomSheet } from '../BottomSheet';

describe('BottomSheet', () => {
  it('place la couche du dessus (toast) au-dessus du panneau, même sur Android', async () => {
    await render(
      <BottomSheet visible onClose={jest.fn()} enterDuration={250} overlay={<Text>Toast</Text>}>
        <Text>Contenu</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('Toast')).toBeTruthy();
    const style = StyleSheet.flatten(screen.getByTestId('sheet-overlay').props.style);
    // L'élévation Android l'emporte sur l'ordre de rendu : le panneau (shadowLg)
    // captait le tap destiné à « Annuler ».
    expect(style.elevation).toBeGreaterThan(shadows.shadowLg.elevation);
  });
});
