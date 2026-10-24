import { fireEvent, render, screen } from '@testing-library/react-native';

import { InfoRows } from '../InfoSection';

const mockOpenStudio = jest.fn();
jest.mock('../../studio/openStudio', () => ({
  openStudio: (studio: unknown) => mockOpenStudio(studio),
}));

const studios = [
  { id: 1, name: 'TMS Entertainment' },
  { id: 2, name: 'Kyokuichi-Tokyo Movie' },
];

describe('InfoRows', () => {
  it('affiche les studios dans un seul paragraphe, séparés par des virgules', async () => {
    await render(<InfoRows rows={[{ key: 'Studio', value: '', studios }]} />);

    expect(screen.getByText('TMS Entertainment, Kyokuichi-Tokyo Movie')).toBeTruthy();
  });

  it('ouvre la page du studio touché', async () => {
    await render(<InfoRows rows={[{ key: 'Studio', value: '', studios }]} />);

    await fireEvent.press(screen.getByText('Kyokuichi-Tokyo Movie'));

    expect(mockOpenStudio).toHaveBeenCalledWith(studios[1]);
  });
});
