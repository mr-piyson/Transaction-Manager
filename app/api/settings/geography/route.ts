import db from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/settings/geography'>,
) {
  try {
    // GET logic here
    const countries = await db.country.findMany({
      include: {
        translations: true, // Gets all language versions (en, ar, etc.)
        cities: {
          include: {
            // If cities also have translations, include them here
            translations: true,
          },
        },
      },
    });
    const formattedData = countries.map((country) => ({
      id: country.id,
      isoCode: country.isoCode,
      // Convert the array of translations into a key-value object
      names: country.translations.reduce(
        (acc, curr) => {
          acc[curr.languageCode] = curr.name;
          return acc;
        },
        {} as Record<string, string>,
      ),

      cities: country.cities.map((city) => ({
        id: city.id,
        names: city.translations.reduce(
          (acc, curr) => {
            acc[curr.languageCode] = curr.name;
            return acc;
          },
          {} as Record<string, string>,
        ),
      })),
    }));

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
