import { AppLogo } from '@/shared/ui/AppLogo';

export interface FamilyTitleProps {
  name: string;
}

/** Значок приложения и название семьи — над заголовком экрана на телефоне. */
export function FamilyTitle({ name }: FamilyTitleProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <AppLogo size="sm" />
      <span className="truncate text-[15px] font-semibold text-foreground">{name}</span>
    </span>
  );
}
