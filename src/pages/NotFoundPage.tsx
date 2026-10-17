import { Compass } from 'lucide-react';
import { Link } from 'react-router';

import { EmptyState } from '@/shared/ui/EmptyState';

/** Неизвестный адрес (ERR-7). */
export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass />}
      title="Страница не найдена"
      description="Возможно, ссылка устарела"
      action={
        <Link to="/" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
          К операциям
        </Link>
      }
    />
  );
}
