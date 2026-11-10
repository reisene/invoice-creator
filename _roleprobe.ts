import { authClient } from '@/lib/auth/client';
const s = authClient.useSession();
export const r: string | null | undefined = s.data?.user.role;
