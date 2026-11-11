import { sendBanNotification } from '@/lib/email';
import { logServerError } from '@/lib/serverLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, userName, banReason } = body as {
      userEmail: string;
      userName: string;
      banReason: string;
    };

    if (!userEmail || !banReason) {
      return NextResponse.json(
        { error: 'Brak wymaganych danych.' },
        { status: 400 },
      );
    }

    await sendBanNotification({
      userName: userName || 'Użytkowniku',
      userEmail,
      banReason,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError('ban-notification.api', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera.' },
      { status: 500 },
    );
  }
}
