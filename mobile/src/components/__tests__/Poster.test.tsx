import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { Poster } from '../Poster';

const title = { id: 'movie-odyssey', title: "L'Odyssée" };

async function setup(props: Partial<Parameters<typeof Poster>[0]> = {}) {
  const onPress = jest.fn();
  const onToggle = jest.fn();
  const onLongPress = jest.fn();
  await render(
    <Poster
      title={title}
      showAdd
      inList={false}
      onPress={onPress}
      onToggle={onToggle}
      onLongPress={onLongPress}
      {...props}
    />,
  );
  return { onPress, onToggle, onLongPress };
}

beforeEach(() => jest.clearAllMocks());

describe('Poster', () => {
  it('pop du « + » au passage à coché seulement, pas au premier affichage', async () => {
    const { rerender } = await render(<Poster title={title} showAdd inList />);
    expect(screen.queryByTestId('poster-add-pop')).toBeNull();
    await rerender(<Poster title={title} showAdd inList={false} />);
    expect(screen.queryByTestId('poster-add-pop')).toBeNull();
    await rerender(<Poster title={title} showAdd inList />);
    expect(screen.getByTestId('poster-add-pop')).toBeTruthy();
  });

  it('ouvre la fiche au tap', async () => {
    const { onPress, onToggle, onLongPress } = await setup();
    await fireEvent.press(screen.getByTestId('poster'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("le tap sur le + bascule l'ajout sans ouvrir la fiche", async () => {
    const { onPress, onToggle } = await setup();
    await fireEvent.press(screen.getByTestId('poster-add'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("l'appui long ouvre l'action sheet avec un retour haptique Medium", async () => {
    const { onPress, onLongPress } = await setup();
    await fireEvent(screen.getByTestId('poster'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("libelle le bouton selon l'état", async () => {
    await setup({ inList: false });
    expect(screen.getByLabelText("Ajouter L'Odyssée")).toBeTruthy();
    await screen.rerender(<Poster title={title} showAdd inList />);
    expect(screen.getByLabelText("Retirer L'Odyssée")).toBeTruthy();
  });

  it('affiche le titre et l’initiale sur l’affiche de remplacement', async () => {
    await setup();
    // Masqués aux lecteurs d'écran : le conteneur porte déjà le titre.
    const hidden = { includeHiddenElements: true };
    expect(screen.getByText("L'Odyssée", hidden)).toBeTruthy();
    expect(screen.getByText('O', hidden)).toBeTruthy();
  });

  it('masque le titre en mode compact', async () => {
    await setup({ showTitle: false });
    expect(screen.queryByText("L'Odyssée", { includeHiddenElements: true })).toBeNull();
  });

  it('affiche le badge', async () => {
    await setup({ badge: { text: 'Au cinéma', highlight: true } });
    expect(screen.getByText('Au cinéma')).toBeTruthy();
  });

  it("sans onLongPress, l'appui long ne fait rien", async () => {
    const onPress = jest.fn();
    await render(<Poster title={title} onPress={onPress} />);
    await fireEvent(screen.getByTestId('poster'), 'longPress');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
