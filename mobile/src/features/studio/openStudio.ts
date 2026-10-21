import { router } from 'expo-router';

export type StudioPreview = { id: number; name: string };

export function openStudio(studio: StudioPreview): void {
  router.push({ pathname: '/studio/[id]', params: { id: String(studio.id), name: studio.name } });
}
