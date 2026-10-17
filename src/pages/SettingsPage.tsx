import {
  ArrowLeft,
  Bug,
  ChevronRight,
  House,
  type LucideIcon,
  Tag,
  Tags,
  UserRound,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useParams } from 'react-router';

import { CategoriesSection } from '@/features/settings/components/CategoriesSection';
import { DeveloperSection } from '@/features/settings/components/DeveloperSection';
import { FamilySection } from '@/features/settings/components/FamilySection';
import { MembersSection } from '@/features/settings/components/MembersSection';
import { ProfileSection } from '@/features/settings/components/ProfileSection';
import { TagsSection } from '@/features/settings/components/TagsSection';
import { cn } from '@/shared/lib/cn';
import { PageHeader } from '@/shared/ui/PageHeader';

interface Section {
  slug: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  render: () => ReactNode;
}

const SECTIONS: readonly Section[] = [
  {
    slug: 'profile',
    title: 'Профиль',
    hint: 'Имя, мой вид периода',
    icon: UserRound,
    render: () => <ProfileSection />,
  },
  {
    slug: 'family',
    title: 'Семья',
    hint: 'Название, период семьи',
    icon: House,
    render: () => <FamilySection />,
  },
  {
    slug: 'categories',
    title: 'Категории',
    hint: 'Расходы и доходы',
    icon: Tags,
    render: () => <CategoriesSection />,
  },
  {
    slug: 'tags',
    title: 'Теги',
    hint: 'Переименовать, объединить',
    icon: Tag,
    render: () => <TagsSection />,
  },
  {
    slug: 'members',
    title: 'Участники',
    hint: 'Роли и приглашения',
    icon: Users,
    render: () => <MembersSection />,
  },
  {
    slug: 'developer',
    title: 'Для разработчика',
    hint: 'Вход как, ошибки, сброс',
    icon: Bug,
    render: () => <DeveloperSection />,
  },
];

/** Экран «Настройки»: на телефоне — список разделов и раздел отдельно, на десктопе — две колонки. */
export default function SettingsPage() {
  const { section: slug } = useParams();
  const active = SECTIONS.find((s) => s.slug === slug);
  const desktopActive = active ?? SECTIONS[0];

  return (
    <>
      <PageHeader title="Настройки" />
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-6">
        <nav
          aria-label="Разделы настроек"
          className={cn(
            'overflow-hidden rounded-2xl bg-card shadow-card',
            active && 'hidden lg:block',
          )}
        >
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.slug} className="border-t border-border first:border-t-0">
                <NavLink
                  to={`/settings/${s.slug}`}
                  className={() =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 hover:bg-background',
                      desktopActive?.slug === s.slug && 'lg:bg-accent lg:text-accent-foreground',
                    )
                  }
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground">
                    <s.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.title}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {s.hint}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground lg:hidden"
                    aria-hidden
                  />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {active && (
          <div className="lg:hidden">
            <Link
              to="/settings"
              className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-primary hover:bg-accent"
            >
              <ArrowLeft className="size-4" aria-hidden /> Все настройки
            </Link>
          </div>
        )}
        <div className={cn(!active && 'hidden lg:block')}>{desktopActive?.render()}</div>
      </div>
    </>
  );
}
