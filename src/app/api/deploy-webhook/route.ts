import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-deploy-token');
  const expectedToken = process.env.DEPLOY_WEBHOOK_SECRET;

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appDir = process.env.JINO_APP_DIR || '/home/users/j/j97915155/domains/30-0.xn--p1ai';

  try {
    // Safe: execFile does NOT use shell interpolation
    const { stdout } = await execFileAsync('git', ['pull', 'origin', 'main'], { cwd: appDir });
    
    return NextResponse.json({
      status: 'ok',
      message: 'Git pull triggered',
      output: stdout,
    });
  } catch (error) {
    console.error('Deploy webhook error:', error);
    return NextResponse.json({ error: 'Deploy failed' }, { status: 500 });
  }
}
