import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-deploy-token');
  const expectedToken = process.env.DEPLOY_WEBHOOK_SECRET;

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const artifactUrl = body.artifact_url as string | undefined;

  const appDir = process.env.JINO_APP_DIR || '/home/users/j/j97915155/domains/30-0.xn--p1ai';

  try {
    // Run deploy in background so we can respond immediately
    const deployScript = artifactUrl
      ? `cd ${appDir} && curl -L -o /tmp/deploy.tar.gz "${artifactUrl}" && tar -xzf /tmp/deploy.tar.gz -C . && rm -f /tmp/deploy.tar.gz && echo 'Deploy complete'`
      : `cd ${appDir} && git pull origin main && echo 'Git pull complete'`;

    // Execute in background
    exec(deployScript, (error, stdout, stderr) => {
      if (error) {
        console.error('Deploy error:', error);
        console.error('stderr:', stderr);
      } else {
        console.log('Deploy success:', stdout);
      }
    });

    return NextResponse.json({
      status: 'ok',
      message: 'Deploy triggered',
      mode: artifactUrl ? 'artifact' : 'git-pull',
    });
  } catch (error) {
    console.error('Deploy webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'deploy-webhook' });
}
