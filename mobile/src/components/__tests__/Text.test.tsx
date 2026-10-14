import { render, screen } from '@testing-library/react-native';

import { MAX_FONT_SCALE, Text } from '../Text';

it('plafonne la taille de police dynamique à ×1,3', async () => {
  await render(<Text>Ma liste</Text>);
  expect(screen.getByText('Ma liste').props.maxFontSizeMultiplier).toBe(MAX_FONT_SCALE);
});

it('garde une valeur passée explicitement', async () => {
  await render(<Text maxFontSizeMultiplier={1}>Ma liste</Text>);
  expect(screen.getByText('Ma liste').props.maxFontSizeMultiplier).toBe(1);
});
