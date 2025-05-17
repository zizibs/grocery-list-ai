import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'toBuy';

  try {
    console.log('Fetching items with status:', status); // <-- Log search param

    const items = await prisma.groceryItem.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    console.log('Fetched items:', items); // <-- Log DB result
    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/groceries error:', error); // <-- Actual error
    return NextResponse.json(
      { error: 'Failed to fetch items', details: String(error) },
      { status: 500 }
    );
  }
}


export async function POST(request: Request) {
  try {
    const json = await request.json();
    console.log('Incoming POST data:', json); // <-- Log input

    const item = await prisma.groceryItem.create({
      data: {
        name: json.name,
        status: 'toBuy',
      },
    });

    console.log('Item created:', item); // <-- Log DB result
    return NextResponse.json(item);
  } catch (error) {
    console.error('POST /api/groceries error:', error); // <-- Actual error
    return NextResponse.json(
      { error: 'Failed to create item', details: String(error) },
      { status: 500 }
    );
  }
}



export async function PUT(request: Request) {
  try {
    const json = await request.json();
    const item = await prisma.groceryItem.update({
      where: { id: json.id },
      data: { status: json.status },
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const json = await request.json();
    await prisma.groceryItem.delete({
      where: { id: json.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
} 