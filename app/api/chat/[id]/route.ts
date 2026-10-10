import { NextRequest, NextResponse } from 'next/server'; import { currentUser } from '@/lib/auth'; import { db } from '@/lib/db'; import { jsonError } from '@/lib/http';
type Ctx={params:Promise<{id:string}>};
export async function GET(_:NextRequest,{params}:Ctx){const u=await currentUser();if(!u||u.banned)return jsonError('Please sign in',401);const {id}=await params;const chat=await db.chat.findFirst({where:{id,userId:u.id},select:{id:true,title:true,pinned:true,favorite:true,createdAt:true,updatedAt:true,messages:{select:{id:true,role:true,content:true,createdAt:true,tokens:true},orderBy:{createdAt:'asc'}}}});if(!chat)return jsonError('Chat not found',404);return NextResponse.json({chat});}
export async function PUT(req:NextRequest,{params}:Ctx){const u=await currentUser();if(!u||u.banned)return jsonError('Please sign in',401);const {id}=await params;const body=await req.json();const data:Record<string,unknown>={};if(typeof body.title==='string')data.title=body.title.trim().slice(0,100);if(typeof body.pinned==='boolean')data.pinned=body.pinned;if(typeof body.favorite==='boolean')data.favorite=body.favorite;const r=await db.chat.updateMany({where:{id,userId:u.id},data});if(!r.count)return jsonError('Chat not found',404);return NextResponse.json({ok:true});}
export async function DELETE(_:NextRequest,{params}:Ctx){
  const u=await currentUser();
  if(!u||u.banned)return jsonError('Please sign in',401);
  const {id}=await params;
  const chat=await db.chat.findFirst({where:{id,userId:u.id},select:{id:true}});
  if(!chat)return jsonError('Chat not found',404);
  await db.message.deleteMany({where:{sessionId:id}});
  await db.chat.delete({where:{id}});
  return NextResponse.json({ok:true});
}
