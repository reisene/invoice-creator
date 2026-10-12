import { auth } from '@/lib/auth/server';
import { Badge, Card, Table } from 'react-bootstrap';
import { SessionActionButton } from './SessionActions';

function describeDevice(userAgent?: string | null) {
  if (!userAgent) return 'Nieznane urządzenie';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Przeglądarka';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  return os ? `${browser} (${os})` : browser;
}

export default async function SessionsCard() {
  const [{ data: sessions }, { data: current }] = await Promise.all([
    auth.listSessions(),
    auth.getSession(),
  ]);
  const currentId = current?.session?.id;
  const list = [...(sessions ?? [])].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <Card body className='shadow-sm mb-4'>
      <h2 className='h5 mb-3'>Aktywne sesje</h2>
      <Table responsive className='align-middle'>
        <thead>
          <tr>
            <th>Urządzenie</th>
            <th>Adres IP</th>
            <th>Zalogowano</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id}>
              <td>
                {describeDevice(item.userAgent)}{' '}
                {item.id === currentId && <Badge bg='success'>Ta sesja</Badge>}
              </td>
              <td>{item.ipAddress ?? '—'}</td>
              <td>{item.createdAt.toLocaleString('pl-PL')}</td>
              <td className='text-end'>
                {item.id !== currentId && (
                  <SessionActionButton
                    kind='one'
                    sessionId={item.id}
                    label='Wyloguj'
                    variant='outline-danger'
                    size='sm'
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className='d-flex flex-wrap gap-2'>
        {list.length > 1 && (
          <SessionActionButton
            kind='others'
            label='Wyloguj z pozostałych urządzeń'
            variant='outline-secondary'
          />
        )}
        <SessionActionButton
          kind='all'
          label='Wyloguj ze wszystkich urządzeń'
          variant='outline-danger'
        />
      </div>
    </Card>
  );
}
