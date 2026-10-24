import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import { UnderlineTabs } from '../UnderlineTabs';

const TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'person', label: 'Personnes' },
] as const;

const layout = (x: number, width: number) => ({
  nativeEvent: { layout: { x, y: 0, width, height: 40 } },
});

describe('UnderlineTabs', () => {
  it('recherche : un tap change d’onglet même clavier ouvert', async () => {
    await render(<UnderlineTabs tabs={TABS} value="all" onChange={jest.fn()} variant="search" />);
    // Remonte de l'onglet jusqu'au conteneur défilant.
    let node = screen.getByText('Tout').parent;
    while (node && node.props.keyboardShouldPersistTaps === undefined) node = node.parent;
    expect(node?.props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('recherche : l’onglet actif hors champ est ramené dans le champ', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const tabs = (value: 'all' | 'person') => (
      <UnderlineTabs tabs={TABS} value={value} onChange={jest.fn()} variant="search" />
    );
    await render(tabs('all'));
    let list = screen.getByText('Tout').parent;
    while (list && list.props.keyboardShouldPersistTaps === undefined) list = list.parent;
    await fireEvent(list!, 'layout', layout(0, 200));
    await fireEvent(screen.getByRole('tab', { name: 'Tout' }), 'layout', layout(16, 40));
    await fireEvent(screen.getByRole('tab', { name: 'Personnes' }), 'layout', layout(200, 90));
    // « Tout » est visible : rien ne bouge.
    expect(scrollTo).not.toHaveBeenCalled();

    // « @ » passe sur Personnes, qui dépasse à droite (200 + 90 + 16 de marge - 200).
    await screen.rerender(tabs('person'));
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 106 });
    scrollTo.mockRestore();
  });
});
