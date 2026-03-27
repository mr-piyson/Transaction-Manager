// lib/server.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from './env';

export type ApiResponseType<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  validation?: Record<string, string[]>;
};

export class ApiResponse {
  static success<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
  }

  static unauthorized() {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  static notFound() {
    return NextResponse.json({ success: false, error: 'Not Found' }, { status: 404 });
  }

  static forbidden() {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  static conflict() {
    return NextResponse.json({ success: false, error: 'Conflict' }, { status: 409 });
  }

  static tooManyRequests() {
    return NextResponse.json({ success: false, error: 'Too Many Requests' }, { status: 429 });
  }

  static validationError(errors: z.ZodError) {
    const validationTree = z.treeifyError(errors);
    return NextResponse.json(
      {
        success: false,
        validation: validationTree,
        error: 'Validation Failed',
      },
      { status: 400 },
    );
  }

  static serverError(message: any = 'Internal Server Error', status = 500) {
    if (env.NODE_ENV === 'development') {
      console.log(message);
    }
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
