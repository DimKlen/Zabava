import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { CheckButton } from '../CheckButton';

beforeEach(() => jest.clearAllMocks());

describe('CheckButton', () => {
  it('coche un épisode non vu avec un retour haptique Light', async () => {
    const onPress = jest.fn();
    await render(<CheckButton watched={false} onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Marquer comme vu'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('décoche sans retour haptique', async () => {
    const onPress = jest.fn();
    await render(<CheckButton watched onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Marquer comme non vu'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('expose son état aux lecteurs d’écran', async () => {
    await render(<CheckButton watched onPress={jest.fn()} />);
    expect(screen.getByTestId('check-button')).toHaveProp('accessibilityState', { checked: true });
  });

  it.each([44, 48] as const)('a une zone tactile de %i pt', async (zone) => {
    await render(<CheckButton watched={false} onPress={jest.fn()} zone={zone} />);
    expect(screen.getByTestId('check-button')).toHaveStyle({ width: zone, height: zone });
  });
});
