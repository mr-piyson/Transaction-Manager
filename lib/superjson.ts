import superjson from 'superjson';
import { ENABLE_SUPERJSON } from '@/lib/config';

export const superSerialize = (data: any) => {
  if (!ENABLE_SUPERJSON) return data;
  return superjson.serialize(data);
};

export const superDeserialize = (data: any) => {
  if (!ENABLE_SUPERJSON) return data;

  // Safety check: ensure the payload actually contains SuperJSON metadata
  // before attempting to deserialize it.
  if (data && typeof data === 'object' && 'meta' in data) {
    return superjson.deserialize(data);
  }

  return data; // Fallback to raw data if it wasn't serialized
};
