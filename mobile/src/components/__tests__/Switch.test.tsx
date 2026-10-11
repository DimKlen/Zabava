import { fireEvent, render, screen } from '@testing-library/react-native';

import { Switch } from '../Switch';

describe('Switch', () => {
  it('bascule la valeur au tap', async () => {
    const onValueChange = jest.fn();
    await render(
      <Switch value={false} onValueChange={onValueChange} accessibilityLabel="Anti-spoiler" />,
    );
    await fireEvent.press(screen.getByRole('switch', { name: 'Anti-spoiler' }));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('repasse à false depuis la position active', async () => {
    const onValueChange = jest.fn();
    await render(<Switch value onValueChange={onValueChange} accessibilityLabel="Anti-spoiler" />);
    await fireEvent.press(screen.getByRole('switch'));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('expose son état', async () => {
    await render(<Switch value onValueChange={jest.fn()} accessibilityLabel="Anti-spoiler" />);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('ne réagit pas quand il est désactivé', async () => {
    const onValueChange = jest.fn();
    await render(
      <Switch
        value={false}
        onValueChange={onValueChange}
        accessibilityLabel="Anti-spoiler"
        disabled
      />,
    );
    await fireEvent.press(screen.getByRole('switch'));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
