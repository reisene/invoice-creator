'use client';

import { authClient } from '@/lib/auth/client';
import type { UserWithRole } from 'better-auth/plugins/admin';
import { use, useCallback, useState } from 'react';
import { Alert, Button, Form, Modal, Table } from 'react-bootstrap';

let usersPromise: Promise<UserWithRole[]> | null = null;

async function fetchUsersList(): Promise<UserWithRole[]> {
  const { data, error: fetchError } = await authClient.admin.listUsers({
    query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' },
  });
  if (fetchError) {
    throw new Error('Nie udało się pobrać listy użytkowników.');
  }
  return data?.users ?? [];
}

function getUsersPromise(): Promise<UserWithRole[]> {
  if (usersPromise === null) {
    usersPromise = fetchUsersList().finally(() => {
      usersPromise = null;
    });
  }
  return usersPromise;
}

export default function UserList() {
  const fetchedUsers = use(getUsersPromise());

  const [users, setUsers] = useState<UserWithRole[]>(fetchedUsers);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal stanu
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banPending, setBanPending] = useState(false);

  const refreshUsers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await authClient.admin.listUsers({
        query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' },
      });
      if (fetchError) {
        setError('Nie udało się pobrać listy użytkowników.');
      } else if (data?.users) {
        setUsers(data.users);
      }
    } catch {
      setError('Wystąpił błąd podczas pobierania użytkowników.');
    }
  }, []);

  const openBanModal = (user: UserWithRole) => {
    setSelectedUser(user);
    setBanReason('');
    setShowModal(true);
  };

  const handleBanConfirm = async () => {
    if (!selectedUser || !banReason.trim()) return;
    setBanPending(true);

    try {
      // Zbanuj użytkownika
      const { error: banError } = await authClient.admin.banUser({
        userId: selectedUser.id,
        banReason,
      });

      if (banError) {
        setError('Nie udało się zbanować użytkownika.');
        setBanPending(false);
        return;
      }

      // Wyślij powiadomienie e-mail (nie blokuj — ban już wykonany)
      fetch('/api/admin/ban-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: selectedUser.email,
          userName: selectedUser.name || 'Użytkowniku',
          banReason,
        }),
      }).catch(() => {
        // Mail nie przeszedł — ban już wykonany
      });

      await refreshUsers();
      setShowModal(false);
      setBanReason('');
      setSelectedUser(null);
    } catch {
      setError('Wystąpił błąd podczas banowania użytkownika.');
    } finally {
      setBanPending(false);
    }
  };

  const handleUnban = async (userId: string) => {
    setActionLoading(userId);
    const { error: unbanError } = await authClient.admin.unbanUser({ userId });
    setActionLoading(null);
    if (unbanError) {
      setError('Nie udało się odblokować użytkownika.');
    } else {
      await refreshUsers();
    }
  };

  if (users.length === 0 && !error) {
    return <div className='text-center py-4'>Ładowanie...</div>;
  }

  return (
    <>
      {error && (
        <Alert variant='danger' className='mb-3' role='alert'>
          {error}
        </Alert>
      )}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Imię</th>
            <th>Email</th>
            <th>Rola</th>
            <th>Status</th>
            <th>Data rejestracji</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name || '—'}</td>
              <td>{user.email}</td>
              <td>{user.role || '—'}</td>
              <td>
                {user.banned ? (
                  <span className='badge bg-danger'>Zbanowany</span>
                ) : (
                  <span className='badge bg-success'>Aktywny</span>
                )}
              </td>
              <td>{new Date(user.createdAt).toLocaleDateString('pl-PL')}</td>
              <td>
                {user.banned ? (
                  <Button
                    variant='outline-success'
                    size='sm'
                    onClick={() => handleUnban(user.id)}
                    disabled={actionLoading === user.id}
                  >
                    {actionLoading === user.id
                      ? 'Odblokowywanie...'
                      : 'Odblokuj'}
                  </Button>
                ) : (
                  <Button
                    variant='outline-danger'
                    size='sm'
                    onClick={() => openBanModal(user)}
                  >
                    Zbanuj
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className='text-center text-body-secondary'>
                Brak użytkowników.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* Modal potwierdzenia banu */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Zbanuj użytkownika</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div className='mb-3'>
              <strong>{selectedUser.name || selectedUser.email}</strong>
              <br />
              <small className='text-body-secondary'>
                {selectedUser.email}
              </small>
            </div>
          )}
          <Form.Group className='mb-3' controlId='banReason'>
            <Form.Label>Powód zablokowania</Form.Label>
            <Form.Control
              as='textarea'
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder='Podaj powód zablokowania konta...'
            />
            <Form.Text className='text-body-secondary'>
              Powód zostanie zapisany w systemie i wysłany do użytkownika
              e-mailem.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant='secondary'
            onClick={() => setShowModal(false)}
            disabled={banPending}
          >
            Anuluj
          </Button>
          <Button
            variant='danger'
            onClick={handleBanConfirm}
            disabled={banPending || !banReason.trim()}
          >
            {banPending ? 'Banowanie...' : 'Zbanuj i wyślij powiadomienie'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
