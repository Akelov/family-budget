import { LuCalendar, LuMessageSquare, LuTag, LuX } from 'react-icons/lu';
import { EXPENSE_CATEGORIES } from '../data';
import { iconOf, Seg } from '../ui';

export function AddOperation() {
  const cat = EXPENSE_CATEGORIES.find((c) => c.name === 'Автомобиль');
  return (
    <div className="overlay">
      <div className="sheet" role="dialog" aria-label="Новая операция">
        <div className="sheet-head">
          <h2 className="h2" style={{ fontSize: 20 }}>Новая операция</h2>
          <a className="icon-btn" href="#ops" aria-label="Закрыть"><LuX /></a>
        </div>
        <Seg items={['Расход', 'Доход']} on={0} green />

        <div className="amount-input num">2 500 <span className="cur">₽</span></div>
        <div className="amount-cap">Сумма</div>

        <div className="label-row"><span>Категория <span className="req">*</span></span></div>
        <div className="cat-grid">
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c.name} className={c.name === 'Автомобиль' ? 'on' : ''}>
              <span className="cat-ico">{iconOf(c.icon)}</span>{c.name}
            </button>
          ))}
        </div>

        <div className="label-row"><span>Подкатегория <span className="req">*</span></span><span>Автомобиль</span></div>
        <div className="chips subcats">
          {cat?.subs.map((s) => <span key={s} className={`chip lg outline${s === 'Топливо' ? ' on' : ''}`}>{s}</span>)}
        </div>

        <div className="label-row"><span>Детали</span></div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="field"><LuTag /><div style={{ flex: 1 }}><span className="chip lg" style={{ padding: '4px 12px', fontSize: 13 }}>Отпуск в Сочи ×</span>
            <span className="muted" style={{ marginLeft: 8, fontSize: 14 }}>Добавить тег…</span></div></div>
          <div className="field"><LuCalendar /><div style={{ flex: 1 }}><div className="lbl">Дата</div>Сегодня, 17 октября</div></div>
          <div className="field"><LuMessageSquare /><div style={{ flex: 1 }}><div className="lbl">Комментарий</div>АЗС</div></div>
        </div>

        <div style={{ marginTop: 20 }}><button className="btn block">Сохранить</button></div>
      </div>
    </div>
  );
}
