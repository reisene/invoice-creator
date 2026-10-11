import { auth } from '@/lib/auth/server';
import { Badge, Button, Card, Table } from 'react-bootstrap';
import {
  revokeAllSessions,
  revokeOtherSessions,
  revokeSessionById,
} from './actions';

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
                  <form action={revokeSessionById}>
                    <input type='hidden' name='id' value={item.id} />
                    <Button size='sm' variant='outline-danger' type='submit'>
                      Wyloguj
                    </Button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className='d-flex gap-2'>
        {list.length > 1 && (
          <form action={revokeOtherSessions}>
            <Button variant='outline-secondary' type='submit'>
              Wyloguj z pozostałych urządzeń
            </Button>
          </form>
        )}
        <form action={revokeAllSessions}>
          <Button variant='outline-danger' type='submit'>
            Wyloguj ze wszystkich urządzeń
          </Button>
        </form>
      </div>
    </Card>
  );
}
