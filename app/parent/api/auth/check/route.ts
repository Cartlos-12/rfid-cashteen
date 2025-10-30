import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Check if the parent session cookie exists
    const parentSession = (await cookies()).get('parent_session');

    if (!parentSession) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    // Optionally, verify the token/session from your DB if you have one
    // const valid = await verifySession(parentSession.value);
    // if (!valid) throw new Error('Invalid session');

    return NextResponse.json({ success: true, message: 'Authenticated' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Auth check failed' }, { status: 401 });
  }
}
