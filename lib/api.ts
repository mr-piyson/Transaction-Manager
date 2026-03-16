// lib/api-utils.ts
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
