import { LuSearch, LuSlidersHorizontal } from 'react-icons/lu';
import { DAYS, signed } from '../data';
import { CatIcon, PeriodSwitcher, Seg } from '../ui';

function Summary() {
  return (
    <>
      <div className="summary">
        <div className="card"><div className="k">Доход</div><div className="v num inc">{signed(185000)}</div></div>
        <div className="card"><div className="k">Расход</div><div className="v num exp">{signed(-112340)}</div></div>
        <div className="card"><div className="k">Остаток</div><div className="v num">{signed(72660).replace('+', '')}</div></div>
      </div>
      <div className="spent-bar"><div className="bar"><i style={{ width: '61%' }} /></div><div className="cap">Потрачено <b>61%</b> от дохода</div></div>
    </>
  );
}

function Toolbar() {
  return (
    <div className="toolbar">
      <div className="search"><LuSearch /> Поиск</div>
      <button className="pill-btn"><LuSlidersHorizontal /> Фильтры</button>
    </div>
  );
}

function MobileList() {
  return (
    <div className="desk-hide">
      {DAYS.map((d) => (
        <div key={d.title}>
          <div className="section-title"><span>{d.title}</span><span className="num">{signed(d.total)}</span></div>
          <div className="card">
            {d.items.map((t) => (
              <div className="row" key={t.id}>
                <CatIcon icon={t.icon} income={t.amount > 0} />
                <div className="main">
                  <div className="title">{t.cat}<span className="sep">›</span>{t.sub}</div>
                  <div className="sub">{[t.comment, t.author].filter(Boolean).join(' · ')}</div>
                  {t.tags?.map((g) => <span className="chip" key={g}>{g}</span>)}
                </div>
                <div className={`amt num ${t.amount > 0 ? 'inc' : 'exp'}`}>{signed(t.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopTable() {
  const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', padding: '12px 16px' };
  const td: React.CSSProperties = { padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 14 };
  return (
    <div className="card mob-hide" style={{ marginTop: 16, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>Дата</th><th style={th}>Категория › Подкатегория</th><th style={th}>Комментарий</th>
          <th style={th}>Теги</th><th style={th}>Автор</th><th style={{ ...th, textAlign: 'right' }}>Сумма</th>
        </tr></thead>
        <tbody>
          {DAYS.map((d) => [
            <tr key={d.title} style={{ background: 'var(--background)' }}>
              <td colSpan={5} style={{ ...td, fontSize: 12, color: 'var(--muted-foreground)', padding: '8px 16px' }}>{d.title}</td>
              <td style={{ ...td, fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'right', padding: '8px 16px' }} className="num">{signed(d.total)}</td>
            </tr>,
            ...d.items.map((t) => (
              <tr key={t.id}>
                <td style={{ ...td, color: 'var(--muted-foreground)', width: 90 }}>{t.date}</td>
                <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ transform: 'scale(0.8)', display: 'inline-flex' }}><CatIcon icon={t.icon} income={t.amount > 0} /></span>
                  <span><span className="muted">{t.cat} ›</span> <b style={{ fontWeight: 600 }}>{t.sub}</b></span></span></td>
                <td style={{ ...td, color: t.comment ? undefined : 'var(--muted-foreground)' }}>{t.comment ?? '—'}</td>
                <td style={td}>{t.tags?.map((g) => <span className="chip" style={{ marginTop: 0 }} key={g}>{g}</span>)}</td>
                <td style={td}>{t.author}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }} className={`num ${t.amount > 0 ? 'inc' : 'exp'}`}>{signed(t.amount)}</td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}

export function Operations() {
  return (
    <main className="page">
      <p className="eyebrow desk-hide">Семейный бюджет</p>
      <h1 className="h1">Операции</h1>
      <div className="desk-hide"><PeriodSwitcher /><Summary /></div>
      <div className="mob-hide" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
        <div><PeriodSwitcher compact /><div style={{ width: 280 }}><Seg items={['Месяц', 'Свой цикл', 'Диапазон']} on={1} /></div></div>
        <div style={{ marginTop: -16 }}><Summary /></div>
      </div>
      <Toolbar />
      <MobileList />
      <DesktopTable />
    </main>
  );
}
