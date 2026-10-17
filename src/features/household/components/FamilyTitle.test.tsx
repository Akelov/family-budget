import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FamilyTitle } from './FamilyTitle';

describe('FamilyTitle', () => {
  it('показывает название семьи', () => {
    render(<FamilyTitle name="Тестовая семья" />);
    expect(screen.getByText('Тестовая семья')).toBeInTheDocument();
  });

  it('длинное название обрезается многоточием, а не ломает строку', () => {
    render(<FamilyTitle name={'Очень длинное название семьи '.repeat(4)} />);
    expect(screen.getByText(/Очень длинное/)).toHaveClass('truncate');
  });
});
