import { NextResponse } from 'next/server';

export async function POST() {
  // Clear the authentication cookie by setting it to expire immediately
  const response = NextResponse.json(
    { message: 'Logout successful' },
    { status: 200 }
  );

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/'
  });

  return response;
} 