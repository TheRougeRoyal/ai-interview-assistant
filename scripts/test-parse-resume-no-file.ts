import { POST } from '../app/api/parse-resume/route'

async function run(){
  const req = new Request('http://localhost/api/parse-resume', { method: 'POST' })
  const res = await POST(req as any)
  console.log('Status:', res.status)
  const body = await res.json()
  console.log('Body:', JSON.stringify(body, null, 2))
}

run().catch(e=>{ console.error(e); process.exit(1) })
