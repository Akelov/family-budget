import { LuCheck, LuChevronDown, LuChevronRight, LuPlus, LuX } from 'react-icons/lu';
import { BUDGETS, EXPENSE_CATEGORIES, rub } from '../data';
import { iconOf } from '../ui';

function status(spent: number, limit: number) {
  if (spent > limit) return { cls: 'over', text: `Превышен на ${rub(spent - limit)}` };
  if (spent * 100 >= limit * 80) return { cls: 'warn', text: 'Почти у лимита' };
  return { cls: 'ok', text: 'В норме' };
}

function CreateBudget() {
  const picked: Record<string, string[] | 'all'> = { 'Продукты': ['Супермаркет', 'Рынок'], 'Кафе': ['Кофе', 'Обеды'], 'Автомобиль': 'all' };
  return (
    <div className="overlay">
      <div className="sheet" role="dialog" aria-label="Новый бюджет">
        <div className="sheet-head"><h2 className="h2" style={{ fontSize: 20 }}>Новый бюджет</h2><a className="icon-btn" href="#plan"><LuX /></a></div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="field"><div style={{ flex: 1 }}><div className="lbl">Название</div>Ежедневные траты</div></div>
          <div className="field"><div style={{ flex: 1 }}><div className="lbl">Сумма на период</div><span className="num">80 000 ₽</span></div></div>
        </div>
        <div className="label-row"><span>Что входит в бюджет <span className="req">*</span></span><span>6 подкатегорий</span></div>
        <div className="card tree">
          {EXPENSE_CATEGORIES.slice(0, 5).map((c) => {
            const p = picked[c.name];
            const isOpen = c.name === 'Продукты' || c.name === 'Кафе';
            const state = p === 'all' ? 'on' : p ? 'part' : '';
            return (
              <div key={c.name}>
                <div className="row">
                  <span className={`check ${state}`}>{state === 'on' && <LuCheck />}</span>
                  <span className="cat-ico" style={{ width: 32, height: 32 }}>{iconOf(c.icon)}</span>
                  <span className="main title">{c.name}{p === 'all' && <span className="muted" style={{ fontWeight: 400 }}> · вся категория</span>}</span>
                  {isOpen ? <LuChevronDown className="chev" /> : <LuChevronRight className="chev" />}
                </div>
                {isOpen && c.subs.map((s) => {
                  const on = Array.isArray(p) && p.includes(s);
                  return (
                    <div className="row child" key={s}>
                      <span className={`check ${on ? 'on' : ''}`}>{on && <LuCheck />}</span>
                      <span className="main">{s}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 18 }}><button className="btn block">Сохранить</button></div>
      </div>
    </div>
  );
}

export function Plan({ create }: { create?: boolean }) {
  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="h1">План</h1>
        <a className="btn" href="#plan-new" style={{ textDecoration: 'none', padding: '9px 16px', marginBottom: 18 }}><LuPlus /> Бюджет</a>
      </div>
      <p className="muted" style={{ margin: '-8px 2px 14px', fontSize: 13 }}>Бюджеты считаются по периоду семьи: 29 сентября – 28 октября 2026</p>
      <div className="budget-list">
        {BUDGETS.map((b) => {
          const s = status(b.spent, b.limit);
          const pct = Math.floor((b.spent * 100) / b.limit);
          return (
            <div className="card card-pad budget" key={b.name}>
              <div className="top">
                <div><div className="name">{b.name}</div><div className="subs">{b.subs}</div></div>
                <span className={`badge ${s.cls}`}>{s.text}</span>
              </div>
              <div className="line">
                <span>Потрачено <b className="num">{rub(b.spent)}</b> <span className="muted">из {rub(b.limit)}</span></span>
                <span className="num muted">{pct}%</span>
              </div>
              <div className={`bar ${s.cls === 'ok' ? '' : s.cls}`}><i style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>Осталось <b className="num" style={{ color: 'var(--foreground)' }}>{rub(Math.max(0, b.limit - b.spent))}</b></div>
            </div>
          );
        })}
      </div>
      {create && <CreateBudget />}
    </main>
  );
}
