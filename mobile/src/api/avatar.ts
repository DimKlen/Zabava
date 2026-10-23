/**
 * Photo de profil choisie dans la bibliothèque (specs/social/docs/04 §4.3) : recadrage carré,
 * 512 × 512, JPEG 80 %, envoi vers Supabase Storage `avatars/{userId}.jpg`.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { config } from './config';
import { supabase } from './supabase';

const SIZE = 512;
const QUALITY = 0.8;
const BUCKET = 'avatars';

/** Préfixe public des photos envoyées par l'app (le serveur n'accepte que celles-là). */
export const AVATAR_PREFIX = `${config.supabaseUrl}/storage/v1/object/public/${BUCKET}/`;

export function isUploadedAvatar(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith(AVATAR_PREFIX));
}

/** Ouvre la bibliothèque ; renvoie l'adresse publique de la photo envoyée, ou null si annulé. */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = picked.canceled ? undefined : picked.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: SIZE, height: SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });

  const path = `${userId}.jpg`;
  const form = new FormData();
  // Fichier local : React Native envoie le contenu désigné par l'URI.
  form.append('file', { uri: saved.uri, name: path, type: 'image/jpeg' } as unknown as Blob);
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(path, form, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;
  // Même nom à chaque envoi : le paramètre force le rechargement des caches d'images.
  return `${AVATAR_PREFIX}${path}?v=${Date.now()}`;
}
