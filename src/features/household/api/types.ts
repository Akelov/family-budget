import type { Household, Member } from '@/shared/types/domain';

/** Семья, текущий участник и все участники (включая бывших — для имён авторов). */
export interface Session {
  household: Household;
  member: Member;
  members: Member[];
}
