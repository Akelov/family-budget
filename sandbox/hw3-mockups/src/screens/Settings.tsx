import { LuArchive, LuChevronDown, LuChevronRight, LuEllipsis, LuFolderTree, LuLink, LuPlus, LuTag, LuUser, LuUsers, LuWallet } from 'react-icons/lu';
import { CAT_COLORS, EXPENSE_CATEGORIES, MEMBERS } from '../data';
import { Avatar, iconOf, Seg } from '../ui';

type Section = 'list' | 'categories' | 'members' | 'family';
const MENU = [
  { id: 'profile', label: 'Профиль', icon: <LuUser />, hint: 'Алексей · личный вид периода' },
  { id: 'family', label: 'Семья', icon: <LuWallet />, hint: 'Семья Ивановых · цикл с 29 числа' },
  { id: 'categories', label: 'Категории', icon: <LuFolderTree />, hint: '12 расходов · 3 дохода' },
  { id: 'tags', label: 'Теги', icon: <LuTag />, hint: '7 тегов' },
  { id: 'members', label: 'Участники', icon: <LuUsers />, hint: '3 участника' },
];

function Menu({ active }: { active?: string }) {
  return (
    <div className="card menu">
      {MENU.map((m) => (
        <a key={m.id} className={`row${m.id === active ? ' on' : ''}`} href={`#settings-${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="cat-ico" style={{ width: 34, height: 34 }}>{m.icon}</span>
          <span className="main"><div className="title">{m.label}</div><div className="sub">{m.hint}</div></span>
          <LuChevronRight className="chev" />
        </a>
      ))}
    </div>
  );
}

function Categories() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 240 }}><Seg items={['Расходы', 'Доходы']} on={0} /></div>
        <button className="btn" style={{ padding: '9px 14px' }}><LuPlus /> Категория</button>
      </div>
      <div className="card">
        {EXPENSE_CATEGORIES.slice(0, 6).map((c) => {
          const open = c.name === 'Автомобиль';
          return (
            <div key={c.name}>
              <div className="row">
                <span className="cat-ico" style={{ width: 34, height: 34 }}>{iconOf(c.icon)}</span>
                <span className="color-dot" style={{ background: CAT_COLORS[c.name] ?? '#9aa59f' }} />
                <span className="main"><div className="title">{c.name}</div><div className="sub">{c.subs.length} подкатегорий</div></span>
                <button className="icon-btn" aria-label="Действия"><LuEllipsis /></button>
                {open ? <LuChevronDown className="chev" /> : <LuChevronRight className="chev" />}
              </div>
              {open && (
                <>
                  {c.subs.map((s) => (
                    <div className="row child" key={s} style={{ paddingLeft: 62 }}>
                      <span className="main">{s}</span>
                      <button className="icon-btn" aria-label="Действия"><LuEllipsis /></button>
                    </div>
                  ))}
                  <div className="row" style={{ paddingLeft: 62, color: 'var(--primary)', fontWeight: 500 }}><LuPlus /> Подкатегория</div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="row muted"><LuArchive /> <span className="main">Архив (2)</span><LuChevronRight className="chev" /></div>
      </div>
    </div>
  );
}

function Members() {
  return (
    <div>
      <div className="card">
        {MEMBERS.map((m) => (
          <div className="row" key={m.id}>
            <Avatar name={m.name} color={m.color} />
            <span className="main"><div className="title">{m.name}</div><div className="sub">{m.role === 'Владелец' ? 'создатель семьи' : 'приглашён 2 октября'}</div></span>
            {m.role === 'Владелец'
              ? <span className="badge ok">Владелец</span>
              : <span className="select">{m.role} <LuChevronDown /></span>}
          </div>
        ))}
      </div>
      <button className="btn ghost block" style={{ marginTop: 12, fontSize: 15 }}><LuLink /> Пригласить по ссылке</button>
      <p className="note">Ссылка одноразовая и действует 7 дней. Роль выбирается при создании ссылки.</p>
    </div>
  );
}

export function Settings({ section }: { section: Section }) {
  const content = section === 'members' ? <Members /> : <Categories />;
  const title = section === 'members' ? 'Участники' : 'Категории';
  return (
    <main className="page">
      <h1 className="h1">{section === 'list' ? 'Настройки' : <><span className="desk-hide">{title}</span><span className="mob-hide">Настройки</span></>}</h1>
      <div className="settings-layout">
        <div className={section === 'list' ? '' : 'mob-hide'}>
          <div className="card card-pad desk-hide" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <Avatar name="Алексей" color="#33875c" size={44} /><div><div style={{ fontWeight: 600 }}>Алексей</div><div className="muted" style={{ fontSize: 13 }}>Владелец · Семья Ивановых</div></div>
          </div>
          <Menu active={section === 'list' ? 'categories' : section} />
        </div>
        <div className={section === 'list' ? 'mob-hide' : ''}>{content}</div>
      </div>
    </main>
  );
}
