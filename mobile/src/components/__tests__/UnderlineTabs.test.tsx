import { render, screen } from '@testing-library/react-native';

import { UnderlineTabs } from '../UnderlineTabs';

const TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'person', label: 'Personnes' },
] as const;

describe('UnderlineTabs', () => {
  it('recherche : un tap change d’onglet même clavier ouvert', async () => {
    await render(<UnderlineTabs tabs={TABS} value="all" onChange={jest.fn()} variant="search" />);
    // Remonte de l'onglet jusqu'au conteneur défilant.
    let node = screen.getByText('Tout').parent;
    while (node && node.props.keyboardShouldPersistTaps === undefined) node = node.parent;
    expect(node?.props.keyboardShouldPersistTaps).toBe('handled');
  });
});
