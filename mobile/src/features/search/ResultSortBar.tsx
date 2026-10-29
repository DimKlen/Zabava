import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import {
  RESULT_SORTS,
  resultDirectionLabel,
  type ResultOrder,
  type ResultSort,
} from '@/domain/resultSort';
import { openActionSheet } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  order: ResultOrder;
  onChange: (order: ResultOrder) => void;
};

/** Tri des résultats, même geste que la liste de films : critère (feuille) · sens (un toucher l'inverse). */
export function ResultSortBar({ order, onChange }: Props) {
  const { sort, reversed } = order;
  const sortLabel = RESULT_SORTS.find((option) => option.value === sort)?.label ?? '';
  const directionLabel = resultDirectionLabel(sort, reversed);

  // Choisir un autre critère repart du sens par défaut ; choisir le même ne change rien.
  const pick = (value: ResultSort) =>
    onChange(value === sort ? order : { sort: value, reversed: false });

  const openSort = () =>
    openActionSheet({
      title: 'Trier par',
      options: RESULT_SORTS.map((option) => ({
        label: option.value === sort ? `${option.label} · ${directionLabel}` : option.label,
        icon: option.value === sort ? (reversed ? ArrowUpIcon : ArrowDownIcon) : CircleIcon,
        onPress: () => pick(option.value),
      })),
    });

  return (
    <View style={styles.bar}>
      <Button
        variant="ghost"
        height={36}
        fontSize={13}
        icon={reversed ? SortAscendingIcon : SortDescendingIcon}
        iconSize={16}
        color={colors.neutral300}
        label={sortLabel}
        accessibilityLabel={`Trier par : ${sortLabel}`}
        onPress={openSort}
        style={styles.button}
      />
      <Text style={styles.dot}>·</Text>
      <Button
        variant="ghost"
        height={36}
        fontSize={13}
        color={colors.neutral300}
        label={directionLabel}
        accessibilityLabel={`${directionLabel}, toucher pour inverser`}
        onPress={() => onChange({ sort, reversed: !reversed })}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  button: {
    paddingHorizontal: 4,
  },
  dot: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.3,
    color: colors.neutral300,
  },
});
