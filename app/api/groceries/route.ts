import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'toBuy';
  
  try {
    const items = await prisma.groceryItem.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const item = await prisma.groceryItem.create({
      data: {
        name: json.name,
        status: 'toBuy',
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error('POST /api/groceries error:', error);
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